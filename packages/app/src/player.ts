/**
 * Playing a card as its link plays it, shared by the viewer and the editor's
 * preview so the two never differ: the card from its first stage, a ripple
 * where to tap once it's sat a while, the hint under it
 * for screen readers, Back to the stage before, the card's sounds on the way
 * forward, and the mute button.
 */
import type { Card } from "@timmo001/cardstock-card";
import {
  type CardStage,
  mountCard,
  nextStage,
  type Picture,
  stagesFor,
} from "@timmo001/cardstock-card/render";
import type { SoundBoard } from "@timmo001/cardstock-card/sounds";
import { h } from "@timmo001/groundwork-ui";
import { Effect } from "effect";
import {
  phArrowCounterClockwise,
  phSpeakerHigh,
  phSpeakerSlash,
} from "./icons.ts";
import { saveMuted } from "./sound.ts";

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

/** How long the tap mark waits for a move to settle before it shows again. */
const settle = 1600;

/**
 * How long the card sits untouched before the tap mark shows, so it's a
 * reminder rather than an answer to every tap.
 */
const quiet = 3000;

export interface PlayOptions {
  readonly images: ReadonlyMap<string, Picture>;
  /** The card's sounds and music, when the browser can play them. */
  readonly sounds?: SoundBoard | undefined;
  /**
   * Where to start instead of the card's first stage, such as an editor
   * that stays on the inside while its message changes.
   */
  readonly at?: CardStage | undefined;
  /** Called as the card reaches each stage, either way. */
  readonly onStage?: (stage: CardStage) => void;
}

/**
 * Mounts a card in `box`, on `canvas`, as its link plays it. Everything it
 * adds to the box goes when its scope closes.
 */
export const playCard = Effect.fnUntraced(function* (
  box: HTMLElement,
  canvas: HTMLCanvasElement,
  card: Card,
  options: PlayOptions,
) {
  const opening = card.opening ?? "card";
  const order: readonly CardStage[] = stagesFor[opening];
  const first = order[0] ?? "full";
  // A letter's flap and the card's cover make their sounds on the way to
  // whichever stage comes after them
  const opened = order.includes("open") ? "open" : "full";
  const { sounds } = options;

  const hint = h("p", { class: "player-hint", "aria-live": "polite" });

  const prompt = h("span", {
    class: "player-prompt",
    "aria-hidden": "true",
    hidden: true,
  });

  const back = h(
    "gw-button",
    {
      class: "player-back",
      appearance: "filled",
      variant: "neutral",
      size: "small",
      icon: phArrowCounterClockwise,
      hidden: true,
    },
    "Back a step",
  );

  const mute =
    sounds === undefined
      ? undefined
      : h("gw-button", {
          class: "player-mute",
          appearance: "plain",
          variant: "neutral",
          labels: "hide",
          toggle: true,
        });

  const layer = h(
    "div",
    { class: "player", "data-backdrop": card.background !== undefined },
    prompt,
    h("div", { class: "player-foot" }, hint, back),
    mute,
  );

  box.append(layer);

  let waiting: ReturnType<typeof setTimeout> | undefined;

  /** Shows what the stage asks for: the hint, Back, and the tap mark once it settles. */
  const show = (stage: CardStage, delay: number) => {
    hint.textContent = hintAt(stage, order);
    back.toggleAttribute("hidden", stage === first);
    prompt.setAttribute("hidden", "");
    clearTimeout(waiting);

    if (nextStage(stage, opening) !== stage) {
      waiting = setTimeout(() => {
        prompt.removeAttribute("hidden");
      }, delay);
    }
  };

  const view = yield* mountCard(canvas, card, {
    images: options.images,
    onStage: (stage, direction) => {
      show(stage, settle + quiet);
      options.onStage?.(stage);

      if (direction !== "forward") return;

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

  const start =
    options.at !== undefined && order.includes(options.at) ? options.at : first;

  if (start !== first) view.seek(start);

  // A page has nothing to open, so its music waits only for a first tap, as
  // does a card already shown open
  if (start === opened || start === "full") sounds?.startMusic();

  show(start, quiet);

  back.addEventListener("click", () => {
    view.back();
  });

  // A video's own sound follows the card's, once a tap lets it play
  const videos = [...options.images.values()].flatMap((picture) =>
    "video" in picture ? [picture.video] : [],
  );

  const hearVideos = () => {
    if (sounds === undefined) return;

    for (const video of videos) video.muted = sounds.muted();
  };

  // Browsers only let sound play after a tap or a key press
  const wake = () => {
    sounds?.wake();
    hearVideos();
  };

  box.addEventListener("pointerdown", wake);
  box.addEventListener("keydown", wake);

  if (mute !== undefined && sounds !== undefined) {
    const showMute = () => {
      const muted = sounds.muted();

      mute.toggleAttribute("pressed", muted);
      mute.setAttribute("icon", muted ? phSpeakerSlash : phSpeakerHigh);
      mute.setAttribute("label", muted ? "Turn sound on" : "Mute");
    };

    mute.addEventListener("click", () => {
      sounds.setMuted(!sounds.muted());
      Effect.runFork(saveMuted(sounds.muted()));
      hearVideos();
      showMute();
    });

    showMute();
  }

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      clearTimeout(waiting);
      box.removeEventListener("pointerdown", wake);
      box.removeEventListener("keydown", wake);
      layer.remove();
    }),
  );

  return view;
});
