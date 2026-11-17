/**
 * A card's picture, from its opened bytes to what the renderer paints with:
 * an `ImageBitmap` for a still, or a muted, looping video element for a
 * video. Shared by the viewer and the editor's preview, so a picture looks
 * the same in both.
 */
import { loadVideo, type Picture } from "@timmo001/cardstock-card/render";
import { Effect, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { turnstileToken } from "./turnstile.ts";

/** Runs a web call with the browser's fetch, stopping it when `signal` aborts. */
export const run = <A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  signal?: AbortSignal,
) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(FetchHttpClient.layer)),
    signal === undefined ? undefined : { signal },
  );

/** The size a drawn SVG is painted at, sharp on the card's front. */
const svgSize = 1024;

/**
 * Paints an SVG through an image element, since `createImageBitmap` can't
 * decode one from a blob. An SVG shown as an image runs no scripts and loads
 * nothing, so a drawn picture stays data.
 */
const rasterise = async (blob: Blob) => {
  const url = URL.createObjectURL(blob);

  try {
    const element = new Image();

    element.src = url;
    await element.decode();

    // Keep the drawing's shape, with its longest side at svgSize
    const ratio = (element.naturalWidth || 1) / (element.naturalHeight || 1);
    const width = ratio >= 1 ? svgSize : Math.round(svgSize * ratio);
    const height = ratio >= 1 ? Math.round(svgSize / ratio) : svgSize;

    return await createImageBitmap(element, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Decodes a picture's or video's bytes, of the MIME type its media entry gives. */
export const decodePicture = (bytes: Uint8Array, type: string) =>
  Effect.tryPromise((): Promise<Picture> => {
    const blob = new Blob([new Uint8Array(bytes)], { type });

    if (type.startsWith("video/")) return loadVideo(blob);

    return type === "image/svg+xml" ? rasterise(blob) : createImageBitmap(blob);
  });

/**
 * The bytes of a file that loads from its own public web address, or an
 * Unsplash photo, as Unsplash's rules ask.
 */
export const webBytes = (url: string) =>
  webFile(url).pipe(Effect.map((file) => file.bytes));

/**
 * A file from its web address, with the MIME type the site gave it. It goes
 * without trace headers, which would need a preflight most sites refuse.
 * When the site won't let other sites load it, the Worker fetches it
 * instead, behind a Turnstile check.
 */
export const webFile = (url: string) =>
  direct(url).pipe(Effect.catch(() => throughWorker(url)));

const fileOf = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.map(response.arrayBuffer, (buffer) => ({
    bytes: new Uint8Array(buffer),
    type: (response.headers["content-type"] ?? "").split(";")[0] ?? "",
  }));

const direct = (url: string) =>
  HttpClient.get(url).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(fileOf),
    Effect.provideService(HttpClient.TracerPropagationEnabled, false),
  );

const FetchKey = Schema.Struct({ sitekey: Schema.NullOr(Schema.String) });

/** The fetcher's Turnstile site key, asked once for the page. */
const sitekey = Effect.runSync(
  Effect.cached(
    HttpClient.get("/api/fetch/key").pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(FetchKey)),
      Effect.map((key) => key.sitekey),
      Effect.provide(FetchHttpClient.layer),
    ),
  ),
);

const throughWorker = Effect.fnUntraced(function* (url: string) {
  const key = yield* sitekey;
  const token = key === null ? "" : yield* turnstileToken(key);

  const response = yield* HttpClientRequest.get("/api/fetch").pipe(
    HttpClientRequest.setUrlParam("url", url),
    HttpClientRequest.setHeader("x-turnstile-token", token),
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.filterStatusOk),
  );

  return yield* fileOf(response);
});
