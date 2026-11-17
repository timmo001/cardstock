/**
 * A card sealed whole into its link: `https://cards.timmo.dev/c#<sealed>`.
 * The card's JSON is deflated and sealed with a fresh key, and the version,
 * key and sealed bytes ride together in the fragment, which browsers never
 * send. So the server stores nothing and sees nothing; like a Drive link,
 * whoever holds it can open the card.
 */
import { Effect, Option, Result, Schema } from "effect";
import * as Base64Url from "effect/encoding/Base64Url";
import { generateKey, importKey, open, seal } from "./crypto.ts";
import { type Card, decodeCard, encodeCard } from "./schema.ts";

/** Where cards open, unless a link says otherwise. */
export const cardOrigin = "https://cards.timmo.dev";

/** The first byte of every sealed link, so the format can change later. */
const linkVersion = 1;

const keyLength = 32;

/** A link whose bytes don't make a card. */
export class WholeLinkError extends Schema.TaggedError<WholeLinkError>()(
  "WholeLinkError",
  { reason: Schema.String },
) {}

/** Runs bytes through a compression or decompression stream. */
const through = (
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
) =>
  Effect.tryPromise({
    try: async () =>
      new Uint8Array(
        await new Response(
          new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream),
        ).arrayBuffer(),
      ),
    catch: (cause) =>
      new WholeLinkError({
        reason: `The link's bytes are broken: ${String(cause)}`,
      }),
  });

/**
 * The link for a card, with the whole card sealed in it. Its pictures, video
 * and music go as their web addresses, and load from there when it opens.
 */
export const wholeCardUrl = Effect.fn("wholeCardUrl")(function* (
  card: Card,
  origin: string = cardOrigin,
) {
  const json = new TextEncoder().encode(yield* encodeCard(card));
  const key = yield* generateKey;

  const sealed = yield* seal(
    key,
    yield* through(json, new CompressionStream("deflate-raw")),
  );

  const bytes = new Uint8Array(1 + keyLength + sealed.length);

  bytes.set([linkVersion]);
  bytes.set(key.raw, 1);
  bytes.set(sealed, 1 + keyLength);

  return `${origin}/c#${Base64Url.encode(bytes)}`;
});

/**
 * Opens the card sealed in a link, or a page's own address. `None` for
 * anything that isn't one, or that doesn't open as a whole card.
 */
export const openWholeCardUrl = Effect.fn("openWholeCardUrl")(function* (
  url: string,
) {
  const parsed = URL.parse(url);

  if (parsed === null || !/^\/c\/?$/u.test(parsed.pathname)) {
    return Option.none<Card>();
  }

  const bytes = Base64Url.decode(parsed.hash.slice(1));

  if (Result.isFailure(bytes) || bytes.success[0] !== linkVersion) {
    return Option.none<Card>();
  }

  return yield* Effect.gen(function* () {
    const key = yield* importKey(bytes.success.subarray(1, 1 + keyLength));
    const deflated = yield* open(key, bytes.success.subarray(1 + keyLength));

    const json = yield* through(
      deflated,
      new DecompressionStream("deflate-raw"),
    );

    return Option.some(yield* decodeCard(new TextDecoder().decode(json)));
  }).pipe(Effect.orElseSucceed(() => Option.none<Card>()));
});
