/**
 * `/api/fetch`: loads a picture, video or track for the app when its site
 * won't let other sites load it. Each fetch needs a Turnstile token and
 * counts against the address's limit, and only the kinds of file a card
 * shows come back, so it can't be used as a general proxy.
 */
import { hashKey } from "@timmo001/groundwork-auth";
import { Effect, Option } from "effect";
import { HttpServerResponse } from "effect/http";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { Api, TooManyRequests } from "./api.ts";
import { Fetcher } from "./fetcher.ts";

/** The MIME type of each file a card shows, by extension, as the CLI has it. */
const types = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
  ["avif", "image/avif"],
  ["svg", "image/svg+xml"],
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mp3", "audio/mpeg"],
  ["ogg", "audio/ogg"],
  ["oga", "audio/ogg"],
  ["opus", "audio/ogg"],
  ["m4a", "audio/mp4"],
  ["wav", "audio/wav"],
  ["flac", "audio/flac"],
]);

const known = new Set(types.values());

/** The file's type by its extension, then by the type its site gave. */
const typeOf = (url: URL, given: string) => {
  const extension = url.pathname.split(".").at(-1)?.toLowerCase() ?? "";

  return types.get(extension) ?? (known.has(given) ? given : undefined);
};

export const FetchLive = HttpApiBuilder.group(Api, "fetch", (handlers) =>
  Effect.gen(function* () {
    const fetcher = yield* Fetcher;

    return handlers
      .handle("key", () =>
        fetcher.sitekey.pipe(Effect.map((sitekey) => ({ sitekey }))),
      )
      .handle("fetch", ({ request, query, headers }) =>
        Effect.gen(function* () {
          const url = URL.parse(query.url);

          if (url === null || url.protocol !== "https:") {
            return yield* new HttpApiError.BadRequest();
          }

          const address = request.headers["cf-connecting-ip"] ?? "";
          const addressHash = yield* Effect.promise(() => hashKey(address));

          if (!(yield* fetcher.allow(addressHash))) {
            return yield* new TooManyRequests();
          }

          const token = headers["x-turnstile-token"] ?? "";

          if (!(yield* fetcher.verify(token, address))) {
            return yield* new HttpApiError.Forbidden();
          }

          const file = yield* fetcher.load(url);

          const type = Option.flatMap(file, (found) =>
            Option.fromNullishOr(typeOf(url, found.type)),
          );

          if (Option.isNone(file) || Option.isNone(type)) {
            return yield* new HttpApiError.NotFound();
          }

          // Served from the app's own origin, so a drawing can't run as a page
          return HttpServerResponse.uint8Array(file.value.bytes.slice(), {
            contentType: type.value,
            headers: {
              "cache-control": "no-store",
              "content-security-policy": "default-src 'none'; sandbox",
              "x-content-type-options": "nosniff",
            },
          });
        }),
      );
  }),
);
