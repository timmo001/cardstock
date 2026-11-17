/**
 * The viewer at `/c`: a card sealed whole in the page's address opens in the
 * browser, asking the server nothing, and mounts with its sounds and music,
 * which load from their web addresses. Anything that goes wrong with the
 * card shows the same "This card isn't available"; sound that can't play is
 * left out. It loads only on card pages, so the renderer never weighs down
 * the rest.
 */
import {
  type Card,
  type Media,
  openWholeCardUrl,
  pictureMedia,
  webAddress,
} from "@timmo001/cardstock-card";
import {
  backdropOf,
  type Picture,
  showBackdrop,
} from "@timmo001/cardstock-card/render";
import { soundBoard } from "@timmo001/cardstock-card/sounds";
import { Effect, Exit, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { leaveCopy } from "./copy.ts";
import { phPencilSimple } from "./icons.ts";
import { decodePicture, webBytes } from "./picture.ts";
import { playCard } from "./player.ts";
import { readMuted } from "./sound.ts";

export class NotAvailable extends Schema.TaggedError<NotAvailable>()(
  "NotAvailable",
  {},
) {}

/** The card's pictures, loaded from their web addresses and decoded, by media id. */
const pictures = Effect.fnUntraced(function* (media: readonly Media[]) {
  const decoded = yield* Effect.forEach(
    media,
    Effect.fnUntraced(function* (each) {
      const bytes = yield* webBytes(webAddress(each));

      return [each.id, yield* decodePicture(bytes, each.type)] as const;
    }),
    { concurrency: "unbounded" },
  );

  return new Map<string, Picture>(decoded);
});

/** The card's music, or nothing; a card plays without it. */
const music = (media: Media | undefined) =>
  media === undefined
    ? Effect.succeed(undefined)
    : webBytes(webAddress(media)).pipe(
        Effect.map((bytes) => new Uint8Array(bytes).buffer),
        Effect.orElseSucceed(() => undefined),
      );

/** The card's pictures and music, loaded beside each other. */
const filesOf = (card: Card) =>
  Effect.all(
    [
      pictures(pictureMedia(card)),
      music(card.media.find((media) => media.id === card.music)),
    ],
    { concurrency: "unbounded" },
  ).pipe(Effect.map(([images, track]) => ({ card, images, track })));

/** The card sealed whole in this page's address, which asks the server nothing. */
const loadCard = Effect.gen(function* () {
  const whole = yield* openWholeCardUrl(location.href);

  if (Option.isNone(whole)) return yield* new NotAvailable();

  return yield* filesOf(whole.value);
});

const program = Effect.gen(function* () {
  const page = document.querySelector("main.viewer");
  const canvas = page?.querySelector("canvas");
  const loading = page?.querySelector(".viewer-loading");
  const missing = page?.querySelector(".viewer-missing");
  const edit = page?.querySelector(".viewer-edit");

  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(page instanceof HTMLElement)
  ) {
    return;
  }

  document.body.classList.add("viewing");
  page.removeAttribute("hidden");

  const shown = yield* Effect.gen(function* () {
    const [{ card, images, track }, muted] = yield* Effect.all(
      [loadCard, readMuted],
      { concurrency: "unbounded" },
    );

    // Sound is a bonus: a browser without Web Audio still gets the card
    const sounds = yield* soundBoard({ music: track, muted }).pipe(
      Effect.exit,
      Effect.map((exit) => (Exit.isSuccess(exit) ? exit.value : undefined)),
    );

    loading?.setAttribute("hidden", "");
    yield* playCard(page, canvas, card, { images, sounds });

    const backdrop = backdropOf(card, images);

    if (backdrop !== undefined) showBackdrop(page, backdrop);

    return card;
  }).pipe(Effect.provide(FetchHttpClient.layer), Effect.exit);

  // Any failure at all, a defect included, reads the same to the person
  if (Exit.isFailure(shown)) {
    canvas.hidden = true;
    loading?.setAttribute("hidden", "");
    missing?.removeAttribute("hidden");

    return;
  }

  const card = shown.value;

  // Edit a copy starts a new card from this one in the editor, kept on this
  // device once it's saved
  if (edit !== null && edit !== undefined) {
    edit.setAttribute("icon", phPencilSimple);
    edit.addEventListener("click", () => {
      void Effect.runPromise(leaveCopy(card).pipe(Effect.exit)).then(() => {
        location.assign("/cards/new?copy");
      });
    });
    edit.removeAttribute("hidden");
  }

  document.title = "A card for you";
  canvas.focus();

  return yield* Effect.never;
});

Effect.runFork(Effect.scoped(program));
