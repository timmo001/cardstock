/**
 * Serves the renderer's preview page, bundled by Bun on each load. The
 * `serve:card` task runs it through Pitchfork.
 */
import page from "./index.html";

const port = Number(process.env["PORT"] ?? 7480);

Bun.serve({
  port,
  hostname: "127.0.0.1",
  development: true,
  routes: { "/": page },
});

console.log(`The card preview is at http://127.0.0.1:${port}/`);
