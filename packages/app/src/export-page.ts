/**
 * The export page at `/export#<sealed card>`, for `cardstock export`: the
 * CLI opens it in headless Chromium with the same fragment a card's link
 * has, and it opens the card as the viewer does, then offers
 * `cardstockExport(kind)`, which makes the file with the same code as the
 * editor's Save for a chat and hands it back, named, as Base64. The card
 * stays in the fragment, so the server never sees it.
 */
import { openWholeCardUrl } from "@timmo001/cardstock-card";
import {
  exportCard,
  exportKinds,
  type ExportKind,
  exportName,
} from "@timmo001/cardstock-card/export";
import { Effect, Exit, Option, Schema } from "effect";
import * as Base64 from "effect/encoding/Base64";
import { cardPictures } from "./card-store.ts";
import { run } from "./picture.ts";

const page = document.querySelector("gw-stack.export");
const status = page?.querySelector(".export-status");
const isExportKind = Schema.is(Schema.Literals(exportKinds));

/** Says where the page is, for the CLI to wait on and for anyone looking. */
const show = (state: "ready" | "failed", message: string) => {
  document.documentElement.dataset["export"] = state;

  if (status !== null && status !== undefined) status.textContent = message;
};

const prepare = async () => {
  // The same fragment as the card's own link, read as that link
  const opened = await Effect.runPromise(
    openWholeCardUrl(`${location.origin}/c${location.hash}`),
  );

  if (Option.isNone(opened)) {
    show("failed", "This card couldn't be opened");

    return;
  }

  const card = opened.value;
  const pictures = await run(cardPictures(card).pipe(Effect.exit));
  const images = Exit.isSuccess(pictures) ? pictures.value : undefined;

  const make = async (kind: ExportKind) => {
    const blob = await Effect.runPromise(exportCard(card, kind, { images }));

    return {
      name: exportName(card, kind),
      data: Base64.encode(new Uint8Array(await blob.arrayBuffer())),
    };
  };

  Object.assign(globalThis, {
    cardstockExport: (kind: string) =>
      isExportKind(kind)
        ? make(kind)
        : Promise.reject(new Error(`No export called ${kind}`)),
  });

  show("ready", `Ready to save ${card.occasion}`);
};

await prepare();
