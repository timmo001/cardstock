/**
 * The card's one timeline, its stages set by how it opens. From `sealed`, a
 * tap opens the flap, the card slides out and the envelope drops away, to
 * `out`. A second tap opens the cover, to `open`. A card that grows goes on
 * to `full`, its full view; a letter goes from `sealed` straight there, and a
 * page starts there. It only moves the stage's groups and the full view's
 * progress, so it runs without a renderer.
 */
import { gsap } from "gsap";
import type { OpeningValue } from "../registry.ts";
import { type Dimensions, sizeDimensions } from "../size.ts";
import { envelopeFor, flapDepth } from "./stage.ts";

export const stages = ["sealed", "out", "open", "full"] as const;

export type CardStage = (typeof stages)[number];

/** The stages a card passes through, in order, by how it opens. */
export const stagesFor = {
  card: ["sealed", "out", "open"],
  grow: ["sealed", "out", "open", "full"],
  letter: ["sealed", "full"],
  page: ["full"],
} as const satisfies {
  readonly [Opening in OpeningValue]: readonly [CardStage, ...CardStage[]];
};

interface Movable {
  readonly position: { x: number; y: number; z: number };
  readonly rotation: { x: number; y: number; z: number };
}

/** How far into the full view a card is, from 0 (the card) to 1 (all of it). */
export interface FullView {
  progress: number;
}

export interface TimelineTargets {
  readonly envelope: Movable;
  readonly flap: Movable;
  readonly turn: Movable;
  readonly card: Movable;
  readonly hinge: Movable;
  readonly full: FullView;
}

/** The cover stops just short of flat, so the open card stands like a real one. */
export const openAngle = -0.94 * Math.PI;

/** How long the card takes to grow into its full view, in seconds. */
const growing = 1.8;

/**
 * The timeline for a card of `size` that opens as `opening`: the card rises
 * by enough to clear its envelope, and the open spread centres by half its
 * width.
 */
export const buildTimeline = (
  targets: TimelineTargets,
  size: Dimensions = sizeDimensions.portrait,
  opening: OpeningValue = "card",
) => {
  const { envelope, flap, turn, card: cardGroup, hinge, full } = targets;
  const timeline = gsap.timeline({ paused: true });

  if (opening === "page") {
    full.progress = 1;

    return timeline.addLabel("full");
  }

  // How far the card rises and the envelope drops, scaled from the portrait
  // card's, so a tall card still clears its envelope and a wide one isn't flung
  const lift =
    envelopeFor(size).height / envelopeFor(sizeDimensions.portrait).height;

  timeline
    .addLabel("sealed")
    .to(flap.rotation, { x: 0, duration: 0.8, ease: "power2.inOut" }, "sealed")
    .to(
      flap.position,
      { z: flapDepth.open, duration: 0.8, ease: "power2.inOut" },
      "sealed",
    )
    .addLabel("flapOpen")
    // The card rises while the envelope drops, so it clears the envelope
    // without leaving the frame
    .to(
      turn.position,
      { y: 0.4 * lift, duration: 1, ease: "power2.inOut" },
      "flapOpen-=0.1",
    )
    .to(
      envelope.position,
      { y: -1.14 * lift, duration: 1, ease: "power2.inOut" },
      "<",
    )
    // It falls at least as far as the portrait card's, so a wide spread
    // never shows it below the card
    .to(envelope.position, {
      y: -3 * Math.max(lift, 1),
      duration: 0.8,
      ease: "power2.in",
    })
    .to(
      turn.position,
      { y: 0, z: 0.2, duration: 0.9, ease: "power2.inOut" },
      "<",
    )
    .addLabel("out");

  if (opening !== "letter") {
    timeline
      .to(
        hinge.rotation,
        { y: openAngle, duration: 1.2, ease: "power2.inOut" },
        "out",
      )
      .to(
        cardGroup.position,
        { x: size.width / 2, duration: 1.2, ease: "power2.inOut" },
        "out",
      )
      .addLabel("open");
  }

  if (opening === "card") return timeline;

  // The scene eases the card towards the camera from this, so it's linear
  return timeline
    .to(full, { progress: 1, duration: growing, ease: "none" })
    .addLabel("full");
};

export type CardTimeline = ReturnType<typeof buildTimeline>;

/** The stage after `current` for a card that opens as `opening`, staying at its last. */
export const nextStage = (
  current: CardStage,
  opening: OpeningValue = "card",
): CardStage => {
  const order: readonly CardStage[] = stagesFor[opening];
  const last = order.at(-1) ?? current;
  const at = order.indexOf(current);

  return at === -1 ? last : (order[at + 1] ?? last);
};
