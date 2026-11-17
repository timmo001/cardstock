/**
 * `/api/health`, open to anyone: whether the Worker answers and which
 * version it is. It says nothing about what's stored.
 */
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api } from "./api.ts";
import { Version } from "./version.ts";

export const HealthLive = HttpApiBuilder.group(Api, "health", (handlers) =>
  Effect.succeed(
    handlers.handle("health", () =>
      Effect.flatten(Version).pipe(Effect.map((version) => ({ version }))),
    ),
  ),
);
