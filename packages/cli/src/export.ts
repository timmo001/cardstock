/**
 * `cardstock export`: saves a card for a chat as a PNG of its front, or an
 * MP4 or GIF of it opening, with the same code as the web app's Save for a
 * chat. A card only draws in a browser, so this seals the spec into its
 * link, opens the app's export page with that link's fragment in headless
 * Chromium through Playwright, and writes the files it hands back. The card
 * stays in the fragment, so the server never sees it.
 */
import { wholeCardUrl } from "@timmo001/cardstock-card";
import { Effect, FileSystem, Path, Result, Schema } from "effect";
import * as Base64 from "effect/encoding/Base64";
import { chromium } from "playwright-core";
import {
  CardstockError,
  describe,
  linkOrigin,
  readSpecText,
} from "./operations.ts";

export const exportKinds = ["still", "mp4", "gif"] as const;

export type ExportKind = (typeof exportKinds)[number];

const Made = Schema.Struct({ name: Schema.String, data: Schema.String });

const PageState = Schema.Struct({
  state: Schema.Literals(["ready", "failed"]),
  message: Schema.String,
});

const browserStep = <A>(message: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new CardstockError({ message, cause }),
  });

export const cardExport = Effect.fn("cardExport")(
  function* (options: {
    /** The card spec, as JSON. */
    readonly spec: string;
    /** What to save; all three when empty. */
    readonly kinds: ReadonlyArray<ExportKind>;
    /** The folder to save in. */
    readonly out: string;
  }) {
    const card = yield* readSpecText(options.spec);
    const origin = yield* linkOrigin;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const kinds = options.kinds.length === 0 ? exportKinds : options.kinds;
    const out = path.resolve(options.out);
    const link = new URL(yield* wholeCardUrl(card, origin));

    const browser = yield* Effect.acquireRelease(
      browserStep(
        "Couldn't start Chromium. Install it with `bunx playwright-core install chromium-headless-shell`",
        () => chromium.launch(),
      ),
      (opened) => Effect.promise(() => opened.close()),
    );

    // A local server's certificate is its own, so it's taken as it is
    const context = yield* browserStep("Couldn't open a browser tab", () =>
      browser.newContext({
        serviceWorkers: "block",
        ignoreHTTPSErrors: link.hostname.endsWith(".localhost"),
      }),
    );

    // The page plays no sound while it records
    yield* browserStep("Couldn't open a browser tab", () =>
      context.addInitScript(() => {
        localStorage.setItem("cardstock:muted", "true");
      }),
    );

    const page = yield* browserStep("Couldn't open a browser tab", () =>
      context.newPage(),
    );

    yield* browserStep(`Couldn't reach ${link.origin}`, () =>
      page.goto(`${link.origin}/export${link.hash}`),
    );

    const opened = yield* browserStep("The export page didn't open", () =>
      page
        .waitForFunction(
          "document.documentElement.dataset.export !== undefined",
          undefined,
          { timeout: 60_000 },
        )
        .then(() =>
          page.evaluate(
            "({ state: document.documentElement.dataset.export, message: document.querySelector('.export-status')?.textContent ?? '' })",
          ),
        ),
    ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(PageState)));

    if (opened.state === "failed") {
      return yield* new CardstockError({ message: opened.message });
    }

    yield* fs.makeDirectory(out, { recursive: true });

    const files = [];

    for (const kind of kinds) {
      const made = yield* browserStep(`Couldn't make the ${kind}`, () =>
        page.evaluate(`cardstockExport(${JSON.stringify(kind)})`),
      ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Made)));

      const bytes = Base64.decode(made.data);

      if (Result.isFailure(bytes)) {
        return yield* new CardstockError({
          message: `The ${kind} came back damaged`,
        });
      }

      const file = path.join(out, made.name);

      yield* fs.writeFile(file, bytes.success);
      files.push({ kind, path: file, bytes: bytes.success.length });
    }

    return { occasion: card.occasion, files };
  },
  Effect.scoped,
  Effect.mapError(describe),
);
