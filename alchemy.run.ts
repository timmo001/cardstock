/**
 * Cardstock's infrastructure as one Alchemy stack: the `cardstock` Worker
 * with the rate limit and Turnstile widget guarding its picture fetcher, and
 * the `cardstock-docs` Worker. It stores nothing. Deploy
 * it with `mise run deploy`, which builds the app and the docs first.
 */
import * as Cloudflare from "@alchemy.run/cloudflare";
import { blumeWorker } from "@timmo001/docs-kit/blume/worker";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";
import Server from "./packages/server/src/index.ts";

export default Alchemy.Stack(
  "cardstock",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const server = yield* Server;

    // Guards the picture fetcher; the Worker reads both keys from its env
    const widget = yield* Cloudflare.Turnstile.Widget("FetchCheck", {
      name: "cardstock-fetch",
      domains: ["cards.timmo.dev"],
      mode: "invisible",
    });

    yield* server.bind`FetchCheck`({
      env: {
        TURNSTILE_SITEKEY: widget.sitekey,
        TURNSTILE_SECRET: widget.secret,
      },
    });

    const built = yield* Effect.promise(() =>
      blumeWorker(new URL("./docs/dist", import.meta.url)),
    );

    const docs = yield* Cloudflare.Worker("Docs", {
      ...built,
      name: "cardstock-docs",
      domain: "cardstock.timmo.dev",
      workersDev: false,
      compatibility: {
        ...built.compatibility,
        // Blume only writes flags from a root wrangler config, so keep this
        // one whatever the build left
        flags: [...new Set([...built.compatibility.flags, "nodejs_compat"])],
      },
    });

    return { app: server.url, docs: docs.url };
  }),
);
