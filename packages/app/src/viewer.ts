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
  type CardStage,
  mountCard,
  type Picture,
  showBackdrop,
  stagesFor,
} from "@timmo001/cardstock-card/render";
import { soundBoard } from "@timmo001/cardstock-card/sounds";
import { Effect, Exit, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { leaveCopy } from "./copy.ts";
import { phPencilSimple, phSpeakerHigh, phSpeakerSlash } from "./icons.ts";
import { decodePicture, webBytes } from "./picture.ts";
import { readMuted, saveMuted } from "./sound.ts";

export class NotAvailable extends Schema.TaggedError<NotAvailable>()(
  "NotAvailable",
  {},
) {}

/** A line under the card saying what a tap does next. */
const hints = {
  sealed: "Tap the envelope to open it",
  out: "Tap the card to open it",
  open: "Drag to turn it over",
  full: "",
} satisfies { readonly [Stage in CardStage]: string };

/** The hint at `stage`, for a card that might grow into its full view after it. */
const hintAt = (stage: CardStage, order: readonly CardStage[]) =>
  stage === "open" && order.includes("full")
    ? "Tap to see it all, or drag to turn it"
    : hints[stage];

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
  const hint = page?.querySelector(".viewer-hint");
  const missing = page?.querySelector(".viewer-missing");
  const mute = page?.querySelector(".viewer-mute");
  const edit = page?.querySelector(".viewer-edit");

  if (
    !(canvas instanceof HTMLCanvasElement) ||
    hint === null ||
    hint === undefined
  ) {
    return;
  }

  document.body.classList.add("viewing");
  page?.removeAttribute("hidden");
  hint.textContent = "Opening your card…";

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

    const first = stagesFor[card.opening ?? "card"][0];
    const order: readonly CardStage[] = stagesFor[card.opening ?? "card"];
    // A letter's flap and the card's cover make their sounds on the way to
    // whichever stage comes after them
    const opened = order.includes("open") ? "open" : "full";

    yield* mountCard(canvas, card, {
      images,
      onStage: (stage) => {
        hint.textContent = hintAt(stage, order);

        if (stage === order[1] && first === "sealed") {
          sounds?.play("flap");
          sounds?.play("slide", 0.65);
        }

        if (stage === opened) {
          sounds?.play("open");
          sounds?.startMusic();
        }
      },
    });

    // A page has nothing to open, so its music waits only for a first tap
    if (first === "full") sounds?.startMusic();

    const backdrop = backdropOf(card, images);

    if (backdrop !== undefined && page instanceof HTMLElement) {
      showBackdrop(page, backdrop);
      page.dataset["backdrop"] = "";
    }

    const videos = [...images.values()].flatMap((picture) =>
      "video" in picture ? [picture.video] : [],
    );

    return { card, sounds, videos, first, order };
  }).pipe(Effect.provide(FetchHttpClient.layer), Effect.exit);

  // Any failure at all, a defect included, reads the same to the person
  if (Exit.isFailure(shown)) {
    canvas.hidden = true;
    hint.textContent = "";
    missing?.removeAttribute("hidden");

    return;
  }

  const { card, sounds, videos, first, order } = shown.value;

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

  if (sounds !== undefined) {
    // A video's own sound follows the card's, once a tap lets it play
    const hearVideos = () => {
      for (const video of videos) video.muted = sounds.muted();
    };

    // Browsers only let sound play after a tap or a key press
    const wake = () => {
      sounds.wake();
      hearVideos();
    };

    addEventListener("pointerdown", wake);
    addEventListener("keydown", wake);

    if (mute !== null && mute !== undefined) {
      const show = () => {
        const muted = sounds.muted();

        mute.toggleAttribute("pressed", muted);
        mute.setAttribute("icon", muted ? phSpeakerSlash : phSpeakerHigh);
        mute.setAttribute("label", muted ? "Turn sound on" : "Mute");
      };

      mute.addEventListener("click", () => {
        sounds.setMuted(!sounds.muted());
        Effect.runFork(saveMuted(sounds.muted()));
        hearVideos();
        show();
      });

      show();
      mute.removeAttribute("hidden");
    }
  }

  document.title = "A card for you";
  hint.textContent = hintAt(first, order);
  canvas.focus();

  return yield* Effect.never;
});

Effect.runFork(Effect.scoped(program));
