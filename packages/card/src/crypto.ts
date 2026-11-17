/**
 * Sealing with AES-GCM through WebCrypto, the same in browsers, Bun and
 * Workers, each time with a fresh IV. A card in its link is sealed with its
 * own random 256-bit key, which rides beside it in the link's fragment, so
 * whoever holds the link can open the card and nobody else can.
 */
import { Effect, Schema } from "effect";

const ivLength = 12;
const keyLength = 32;

/** Opening failed: the wrong key, or bytes that were cut short or changed. */
export class OpenError extends Schema.TaggedError<OpenError>()("OpenError", {
  reason: Schema.String,
}) {}

/** A raw key's bytes weren't a 256-bit key. */
export class KeyError extends Schema.TaggedError<KeyError>()("KeyError", {
  reason: Schema.String,
}) {}

/** A key ready to seal and open, with its raw bytes to hand out. */
export interface SealKey {
  readonly key: CryptoKey;
  readonly raw: Uint8Array<ArrayBuffer>;
}

/** Reads a 256-bit AES-GCM key from its raw bytes. */
export const importKey = Effect.fnUntraced(function* (raw: Uint8Array) {
  if (raw.length !== keyLength) {
    return yield* new KeyError({
      reason: `A key is ${keyLength} bytes, not ${raw.length}`,
    });
  }

  const bytes = new Uint8Array(raw);

  const key = yield* Effect.promise(() =>
    crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]),
  );

  return { key, raw: bytes } satisfies SealKey;
});

/** A new random key, for a card's link. */
export const generateKey = Effect.suspend(() =>
  importKey(crypto.getRandomValues(new Uint8Array(keyLength))),
).pipe(Effect.orDie);

/** Seals bytes: a fresh IV, then the AES-GCM ciphertext and its tag. */
export const seal = Effect.fnUntraced(function* (
  key: SealKey,
  bytes: Uint8Array,
) {
  const iv = crypto.getRandomValues(new Uint8Array(ivLength));

  const sealed = yield* Effect.promise(() =>
    crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key.key,
      new Uint8Array(bytes),
    ),
  );

  const out = new Uint8Array(ivLength + sealed.byteLength);

  out.set(iv);
  out.set(new Uint8Array(sealed), ivLength);

  return out;
});

/** Opens what `seal` made, failing with `OpenError` on the wrong key or changed bytes. */
export const open = Effect.fnUntraced(function* (
  key: SealKey,
  sealed: Uint8Array,
) {
  // The IV and at least the 16-byte tag
  if (sealed.length < ivLength + 16) {
    return yield* new OpenError({ reason: "Too short to be sealed" });
  }

  const plain = yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(sealed.subarray(0, ivLength)) },
        key.key,
        new Uint8Array(sealed.subarray(ivLength)),
      ),
    catch: () =>
      new OpenError({ reason: "The key doesn't open it, or it was changed" }),
  });

  return new Uint8Array(plain);
});

const text = { encode: new TextEncoder(), decode: new TextDecoder() };

/** Seals text, such as a card's JSON. */
export const sealText = (key: SealKey, value: string) =>
  seal(key, text.encode.encode(value));

/** Opens sealed text. */
export const openText = Effect.fnUntraced(function* (
  key: SealKey,
  sealed: Uint8Array,
) {
  return text.decode.decode(yield* open(key, sealed));
});
