/**
 * The whole API as one layer, given a `Fetcher`: Turnstile and a rate limit
 * in the Worker, no checks in the tests and the dev server. A Worker has no
 * filesystem, and the API never serves a file from one, so its filesystem
 * is a no-op.
 */
import { FileSystem, Layer, Path } from "effect";
import { Etag, HttpPlatform } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { Api } from "./api.ts";
import { FetchLive } from "./fetch.ts";
import { HealthLive } from "./health.ts";

const PlatformLive = Layer.mergeAll(
  Etag.layer,
  Path.layer,
  HttpPlatform.layer,
).pipe(Layer.provideMerge(FileSystem.layerNoop({})));

export const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide([HealthLive, FetchLive]),
  Layer.provide(PlatformLive),
);
