/**
 * The whole API off Cloudflare, with a picture fetcher that has no
 * Turnstile or limit. The tests run against it, giving their own `load` so
 * they never reach the web, and the web app's dev server serves it, so the
 * app can be tried end to end without Cloudflare.
 */
import { Layer } from "effect";
import { HttpRouter } from "effect/http";
import { ApiLive } from "./app.ts";
import { Fetcher, localFetcher } from "./fetcher.ts";

export const localApi = (load?: Fetcher["Service"]["load"]) => {
  const app = HttpRouter.toWebHandler(
    ApiLive.pipe(Layer.provide(Layer.succeed(Fetcher, localFetcher(load)))),
    { disableLogger: true },
  );

  return { handler: app.handler, dispose: () => app.dispose() };
};
