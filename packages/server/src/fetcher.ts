/**
 * What `/api/fetch` needs from where it runs: Turnstile and a rate limit in
 * the Worker, neither locally, and the web itself either way. The tests give
 * their own `load`, so they never reach the web.
 */
import type * as Cloudflare from "@alchemy.run/cloudflare";
import { Context, Effect, Option, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { inRequest } from "./runtime.ts";

/** The largest file a card takes, as the app and the CLI allow. */
export const largest = 20 * 1024 * 1024;

/** A file from the web, with the MIME type its site gave it. */
export interface WebFile {
  readonly type: string;
  readonly bytes: Uint8Array;
}

export class Fetcher extends Context.Service<
  Fetcher,
  {
    /** Turnstile's public site key, or `null` where no check is needed. */
    readonly sitekey: Effect.Effect<string | null>;
    /** Whether a Turnstile token passes, for the address it came from. */
    readonly verify: (token: string, address: string) => Effect.Effect<boolean>;
    /** Whether an address, by its hash, may fetch again now. */
    readonly allow: (addressHash: string) => Effect.Effect<boolean>;
    /** A file from the web, or `None` when it doesn't load or is too large. */
    readonly load: (url: URL) => Effect.Effect<Option.Option<WebFile>>;
  }
>()("cardstock/Fetcher") {}

/** A file from the web, read only when its site says it isn't too large. */
export const loadWeb = (url: URL) =>
  Effect.gen(function* () {
    const response = yield* HttpClient.get(url.href).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
    );

    if (Number(response.headers["content-length"] ?? "0") > largest) {
      return Option.none<WebFile>();
    }

    const buffer = yield* response.arrayBuffer;
    const given = response.headers["content-type"] ?? "";

    // A site that gives no length is only caught once it's read
    if (buffer.byteLength > largest) return Option.none<WebFile>();

    return Option.some<WebFile>({
      type: (given.split(";")[0] ?? "").trim().toLowerCase(),
      bytes: new Uint8Array(buffer),
    });
  }).pipe(
    Effect.orElseSucceed(() => Option.none<WebFile>()),
    Effect.provideService(HttpClient.TracerPropagationEnabled, false),
    Effect.provide(FetchHttpClient.layer),
  );

const siteverify = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const Siteverify = Schema.Struct({ success: Schema.Boolean });

/** Asks Turnstile whether a token passes; any trouble is a no. */
const verifyWith = (secret: string, token: string, address: string) =>
  HttpClientRequest.post(siteverify).pipe(
    HttpClientRequest.bodyUrlParams({
      secret,
      response: token,
      remoteip: address,
    }),
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Siteverify)),
    Effect.map((reply) => reply.success),
    Effect.orElseSucceed(() => false),
    Effect.provideService(HttpClient.TracerPropagationEnabled, false),
    Effect.provide(FetchHttpClient.layer),
  );

const readText = Schema.decodeUnknownOption(Schema.NonEmptyString);

/** The env a Worker runs with, as Alchemy gives it. */
type WorkerEnv = Cloudflare.WorkerEnvironment["Service"];

/**
 * The Worker's: the widget's keys come from its env, which Alchemy fills on
 * deploy, and each address gets the rate limit's share.
 */
export const workerFetcher = (
  env: WorkerEnv,
  limit: Cloudflare.RateLimitClient,
) =>
  Fetcher.of({
    sitekey: Effect.sync(() =>
      Option.getOrNull(readText(env["TURNSTILE_SITEKEY"])),
    ),
    verify: (token, address) =>
      Effect.suspend(() =>
        Option.match(readText(env["TURNSTILE_SECRET"]), {
          onNone: () => Effect.succeed(false),
          onSome: (secret) =>
            token === ""
              ? Effect.succeed(false)
              : verifyWith(secret, token, address),
        }),
      ),
    allow: (addressHash) =>
      inRequest(
        limit.limit({ key: addressHash }).pipe(
          Effect.map((outcome) => outcome.success),
          Effect.orElseSucceed(() => false),
        ),
      ),
    load: loadWeb,
  });

/** Off Cloudflare: no Turnstile and no limit, for the dev server and tests. */
export const localFetcher = (load: Fetcher["Service"]["load"] = loadWeb) =>
  Fetcher.of({
    sitekey: Effect.succeed(null),
    verify: () => Effect.succeed(true),
    allow: () => Effect.succeed(true),
    load,
  });
