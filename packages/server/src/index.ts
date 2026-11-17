/**
 * The `cardstock` Worker: serves the web app and the API on cards.timmo.dev,
 * with a rate limit and a Turnstile widget guarding the picture fetcher. It
 * stores nothing: each card travels sealed in its own link. This file is its
 * own entry, so the root `alchemy.run.ts` deploys it from here. Requests that
 * match a built app file get the file; `/api/*` always reaches the Worker.
 */
import * as Cloudflare from "@alchemy.run/cloudflare";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { ApiLive } from "./app.ts";
import { Fetcher, workerFetcher } from "./fetcher.ts";
import { inRequest } from "./runtime.ts";
import { Version } from "./version.ts";

export default class Server extends Cloudflare.Worker<Server>()(
  "Server",
  {
    main: import.meta.url,
    name: "cardstock",
    domain: "cards.timmo.dev",
    workersDev: false,
    compatibility: { date: "2026-11-01" },
    assets: {
      directory: new URL("../../app/dist", import.meta.url).pathname,
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
  },
  Effect.gen(function* () {
    const versionMetadata = yield* Cloudflare.Workers.VersionMetadata();
    const env = yield* Cloudflare.Workers.WorkerEnvironment;

    // Fetches from the web, per address: a few a minute is plenty for a card
    const fetchLimit = yield* Cloudflare.RateLimit("FETCH_LIMIT", {
      namespaceId: 1001,
      simple: { limit: 10, period: 60 },
    });

    const version = inRequest(versionMetadata).pipe(
      Effect.map((metadata) => ({
        id: metadata.id,
        timestamp: metadata.timestamp,
      })),
    );

    return {
      fetch: yield* HttpRouter.toHttpEffect(
        ApiLive.pipe(
          Layer.provide([
            Layer.succeed(Version, version),
            Layer.succeed(Fetcher, workerFetcher(env, fetchLimit)),
          ]),
        ),
      ),
    };
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        Cloudflare.Workers.VersionMetadataBinding,
        Cloudflare.Workers.RateLimitBinding,
      ),
    ),
  ),
) {}
