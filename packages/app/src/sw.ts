/**
 * The service worker, bundled to `sw.js`: keeps the app shell so the app
 * starts offline. `buildPwa` gives it the build's version and the page's
 * hashed files, so each build replaces the last one's cache. API calls always
 * go to the network: the shell's cache would answer them with an old reply,
 * such as a picture the fetcher loaded once.
 */
import {
  serveShell,
  type ShellWorkerScope,
} from "@timmo001/groundwork-pwa/worker";
import config from "../pwa.config.ts";

declare const self: ShellWorkerScope;

serveShell(self, config, {
  routes: [
    ({ request }) =>
      new URL(request.url).pathname.startsWith("/api/")
        ? fetch(request)
        : undefined,
  ],
});
