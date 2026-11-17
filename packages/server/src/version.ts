/**
 * Which version of the server is answering. The Worker reads its deployed
 * version from Cloudflare's version metadata on each request; anywhere else,
 * such as the tests and the app's dev server, it's `local`.
 */
import { Context, Effect } from "effect";

export interface VersionInfo {
  readonly id: string;
  readonly timestamp: string | null;
}

export const Version = Context.Reference<Effect.Effect<VersionInfo>>(
  "cardstock/Version",
  {
    defaultValue: () => Effect.succeed({ id: "local", timestamp: null }),
  },
);
