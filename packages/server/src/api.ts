/**
 * The API under `/api`, as a schema: what each route takes and gives. It's
 * public, with no accounts or keys: a card travels sealed whole in its own
 * link, so all that's here is whether the Worker answers, and the picture
 * fetcher for sites that won't let other sites load their files.
 */
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/http-api";

/** A file from the web, as raw bytes. */
const Bytes = Schema.Uint8Array.pipe(
  HttpApiSchema.asUint8Array({ contentType: "application/octet-stream" }),
);

/** The Worker version that's answering, or `local` off Cloudflare. */
export const ServerVersion = Schema.Struct({
  id: Schema.String,
  timestamp: Schema.NullOr(Schema.String),
});

export const Health = Schema.Struct({ version: ServerVersion });

/** Too many fetches from one address in a minute. */
export class TooManyRequests extends Schema.TaggedError<TooManyRequests>()(
  "TooManyRequests",
  {},
  { httpApiStatus: 429 },
) {}

export const FetchKey = Schema.Struct({
  /** Turnstile's public site key, or `null` where no check is needed. */
  sitekey: Schema.NullOr(Schema.String),
});

/**
 * Loading a picture, video or track for the app when its site won't let
 * other sites load it. Each fetch needs a fresh Turnstile token, and an
 * address gets only so many a minute.
 */
export class FetchGroup extends HttpApiGroup.make("fetch").add(
  HttpApiEndpoint.get("key", "/fetch/key", { success: FetchKey }),
  HttpApiEndpoint.get("fetch", "/fetch", {
    query: { url: Schema.String },
    headers: { "x-turnstile-token": Schema.optional(Schema.String) },
    success: Bytes,
    error: [
      HttpApiError.BadRequestNoContent,
      HttpApiError.ForbiddenNoContent,
      HttpApiError.NotFoundNoContent,
      TooManyRequests,
    ],
  }),
) {}

/** Whether the Worker answers, and which version, for anyone to ask. */
export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("health", "/health", { success: Health }),
) {}

export const Api = HttpApi.make("cardstock")
  .add(HealthGroup)
  .add(FetchGroup)
  .prefix("/api");
