/**
 * A Turnstile token for the picture fetcher, from Cloudflare's invisible
 * widget. Its script only loads when a site won't let the app load a file
 * itself, so most cards never fetch it. Each token is good for one fetch, so
 * each fetch renders its own widget and removes it once it has the token.
 */
import { Deferred, Duration, Effect, Schema } from "effect";

export class TurnstileError extends Schema.TaggedError<TurnstileError>()(
  "TurnstileError",
  {},
) {}

interface RenderOptions {
  readonly sitekey: string;
  readonly callback: (token: string) => void;
  readonly "error-callback": () => void;
}

interface Turnstile {
  readonly render: (
    container: HTMLElement,
    options: RenderOptions,
  ) => string | undefined;
  readonly remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const scriptUrl =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const loadScript = Effect.callback<Turnstile, TurnstileError>((resume) => {
  const ready = () =>
    window.turnstile === undefined
      ? Effect.fail(new TurnstileError())
      : Effect.succeed(window.turnstile);

  if (window.turnstile !== undefined) {
    resume(ready());

    return;
  }

  const script = document.createElement("script");

  script.src = scriptUrl;
  script.async = true;
  script.addEventListener("load", () => resume(ready()));
  script.addEventListener("error", () =>
    resume(Effect.fail(new TurnstileError())),
  );
  document.head.append(script);
});

/** The script, loaded once for the page. */
const loaded = Effect.runSync(Effect.cached(loadScript));

/** A fresh token for the site key, or a `TurnstileError` within 30 seconds. */
export const turnstileToken = (sitekey: string) =>
  Effect.gen(function* () {
    const turnstile = yield* loaded;
    const token = yield* Deferred.make<string, TurnstileError>();

    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const container = document.createElement("div");

        document.body.append(container);

        const id = turnstile.render(container, {
          sitekey,
          callback: (value) =>
            Deferred.doneUnsafe(token, Effect.succeed(value)),
          "error-callback": () =>
            Deferred.doneUnsafe(token, Effect.fail(new TurnstileError())),
        });

        return { container, id };
      }),
      ({ container, id }) =>
        Effect.sync(() => {
          if (id !== undefined) turnstile.remove(id);

          container.remove();
        }),
    );

    return yield* Deferred.await(token).pipe(
      Effect.timeoutOrElse({
        duration: Duration.seconds(30),
        orElse: () => Effect.fail(new TurnstileError()),
      }),
    );
  }).pipe(Effect.scoped);
