/**
 * The timeline's stages, without a renderer: sealed leaves everything as
 * built, `out` has the flap open, the envelope gone and the cover still shut,
 * and `open` has the cover open with the spread centred. A card that grows,
 * a letter and a page each end in the full view.
 */
import { describe, expect, test } from "bun:test";
import { sizeDimensions } from "../size.ts";
import { flapDepth } from "./stage.ts";
import { buildTimeline, nextStage, openAngle } from "./timeline.ts";

const movable = (
  position: { x?: number; y?: number; z?: number } = {},
  rotation: { x?: number; y?: number; z?: number } = {},
) => ({
  position: { x: 0, y: 0, z: 0, ...position },
  rotation: { x: 0, y: 0, z: 0, ...rotation },
});

const stage = () => ({
  envelope: movable(),
  flap: movable({ z: flapDepth.closed }, { x: Math.PI }),
  turn: movable({ y: -0.05 }),
  card: movable(),
  hinge: movable(),
  full: { progress: 0 },
});

describe("timeline", () => {
  test("goes sealed, out, open, and stays open", () => {
    expect(nextStage("sealed")).toBe("out");
    expect(nextStage("out")).toBe("open");
    expect(nextStage("open")).toBe("open");
  });

  test("each opening goes through its own stages", () => {
    expect(nextStage("open", "grow")).toBe("full");
    expect(nextStage("full", "grow")).toBe("full");
    expect(nextStage("sealed", "letter")).toBe("full");
    expect(nextStage("full", "page")).toBe("full");
  });

  test("out has the card clear of a closed cover, and the envelope gone", () => {
    const targets = stage();

    buildTimeline(targets).seek("out");

    expect(targets.flap.rotation.x).toBeCloseTo(0);
    expect(targets.flap.position.z).toBeCloseTo(flapDepth.open);
    expect(targets.envelope.position.y).toBeLessThan(-2.5);
    expect(targets.turn.position.y).toBeCloseTo(0);
    expect(targets.hinge.rotation.y).toBeCloseTo(0);
  });

  test("open turns the cover over and centres the spread", () => {
    const targets = stage();

    buildTimeline(targets).seek("open");

    expect(targets.hinge.rotation.y).toBeCloseTo(openAngle);
    expect(targets.card.position.x).toBeCloseTo(
      sizeDimensions.portrait.width / 2,
    );
    expect(targets.full.progress).toBe(0);
  });

  test("a landscape card centres by half its own width", () => {
    const targets = stage();

    buildTimeline(targets, sizeDimensions.landscape).seek("open");

    expect(targets.card.position.x).toBeCloseTo(
      sizeDimensions.landscape.width / 2,
    );
  });

  test("a growing card opens, then goes all the way into its full view", () => {
    const targets = stage();
    const timeline = buildTimeline(targets, sizeDimensions.portrait, "grow");

    timeline.seek("open");
    expect(targets.full.progress).toBe(0);
    timeline.seek("full");
    expect(targets.hinge.rotation.y).toBeCloseTo(openAngle);
    expect(targets.full.progress).toBeCloseTo(1);
  });

  test("a letter never opens its cover on the way to its full view", () => {
    const targets = stage();

    buildTimeline(targets, sizeDimensions.portrait, "letter").seek("full");

    expect(targets.hinge.rotation.y).toBeCloseTo(0);
    expect(targets.full.progress).toBeCloseTo(1);
  });

  test("a page starts in its full view", () => {
    const targets = stage();

    buildTimeline(targets, sizeDimensions.portrait, "page");

    expect(targets.full.progress).toBe(1);
  });
});
