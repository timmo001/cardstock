/**
 * Serves the built app from `dist/` for development, with any other path
 * falling back to the page, as the Worker does in production. `bun run dev`
 * builds first; the `serve:app` task runs it through Pitchfork. The API is
 * the real one, with a picture fetcher that needs no Turnstile; the demo
 * card opens from its own link, with the whole card sealed in it.
 */
import path from "node:path";
import { localApi } from "@timmo001/cardstock-server/local";
import { demoCard } from "./demo.ts";

const dist = path.join(import.meta.dir, "..", "dist");
const port = Number(process.env.PORT ?? 7470);
const origin = "https://app.cardstock.localhost";
const demo = await demoCard(origin);
const api = localApi();

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch: async (request) => {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/api/")) return api.handler(request);

    const file = Bun.file(path.join(dist, path.normalize(pathname)));

    if (!pathname.endsWith("/") && (await file.exists())) {
      return new Response(file, {
        headers: pathname.endsWith(".webmanifest")
          ? { "content-type": "application/manifest+json" }
          : {},
      });
    }

    return new Response(Bun.file(path.join(dist, "index.html")));
  },
});

console.log(
  [
    `Cardstock's app is at http://127.0.0.1:${port}/`,
    `The demo card is at ${demo.url}`,
  ].join("\n"),
);
