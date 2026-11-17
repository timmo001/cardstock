/**
 * Every effect, by the id a card names: falling snow and confetti, rising
 * hearts and slow sparkle, or none. Typed against the registry's ids, so an id
 * without an effect doesn't compile.
 */
import type { EffectIdValue } from "../registry.ts";
import { defineEffect, type Effect } from "./define.ts";

const softDot = (paint: OffscreenCanvasRenderingContext2D, size: number) => {
  const glow = paint.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );

  glow.addColorStop(0, "rgba(255, 255, 255, 1)");
  glow.addColorStop(0.45, "rgba(255, 255, 255, 0.8)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  paint.fillStyle = glow;
  paint.fillRect(0, 0, size, size);
};

export const effects = {
  none: defineEffect({
    id: "none",
    count: 0,
    colours: ["#ffffff"],
    size: [0, 0],
    speed: 0,
    drift: 0,
    spin: 0,
    twinkle: false,
    draw: () => undefined,
  }),
  snow: defineEffect({
    id: "snow",
    count: 260,
    colours: ["#ffffff", "#f3f7ff", "#e8effa"],
    size: [0.014, 0.055],
    speed: 0.15,
    drift: 0.08,
    spin: 0.3,
    twinkle: false,
    // A soft flake with a faint cool rim, so it shows on light pages too
    draw: (paint, size) => {
      const middle = size / 2;

      const flake = paint.createRadialGradient(
        middle,
        middle,
        0,
        middle,
        middle,
        middle,
      );

      flake.addColorStop(0, "rgba(255, 255, 255, 1)");
      flake.addColorStop(0.35, "rgba(252, 253, 255, 0.92)");
      flake.addColorStop(0.62, "rgba(178, 192, 216, 0.5)");
      flake.addColorStop(1, "rgba(196, 208, 226, 0)");
      paint.fillStyle = flake;
      paint.fillRect(0, 0, size, size);
    },
  }),
  confetti: defineEffect({
    id: "confetti",
    count: 170,
    colours: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#f78c6b"],
    size: [0.024, 0.05],
    speed: 0.32,
    drift: 0.14,
    spin: 4,
    twinkle: false,
    draw: (paint, size) => {
      paint.fillStyle = "#fff";
      paint.fillRect(size * 0.2, size * 0.35, size * 0.6, size * 0.3);
    },
  }),
  hearts: defineEffect({
    id: "hearts",
    count: 70,
    colours: ["#ff4d6d", "#ff8fa3", "#c9184a", "#ffb3c1"],
    size: [0.04, 0.085],
    speed: -0.11,
    drift: 0.1,
    spin: 0.4,
    twinkle: false,
    draw: (paint, size) => {
      const s = size / 32;

      paint.fillStyle = "#fff";
      paint.beginPath();
      paint.moveTo(16 * s, 27 * s);
      paint.bezierCurveTo(4 * s, 19 * s, 3 * s, 8 * s, 10 * s, 6 * s);
      paint.bezierCurveTo(13 * s, 5 * s, 15 * s, 7 * s, 16 * s, 9 * s);
      paint.bezierCurveTo(17 * s, 7 * s, 19 * s, 5 * s, 22 * s, 6 * s);
      paint.bezierCurveTo(29 * s, 8 * s, 28 * s, 19 * s, 16 * s, 27 * s);
      paint.fill();
    },
  }),
  sparkle: defineEffect({
    id: "sparkle",
    count: 140,
    // Warm golds as well as white, so it still shows on cream stock
    colours: ["#ffd25e", "#f0a92e", "#fff3c4", "#ffffff"],
    size: [0.024, 0.085],
    speed: 0.035,
    drift: 0.03,
    spin: 0.6,
    twinkle: true,
    draw: (paint, size) => {
      const middle = size / 2;

      softDot(paint, size);
      paint.fillStyle = "#fff";
      paint.beginPath();
      paint.moveTo(middle, 0);
      paint.quadraticCurveTo(middle, middle, size, middle);
      paint.quadraticCurveTo(middle, middle, middle, size);
      paint.quadraticCurveTo(middle, middle, 0, middle);
      paint.quadraticCurveTo(middle, middle, middle, 0);
      paint.fill();
    },
  }),
} satisfies { readonly [Id in EffectIdValue]: Effect & { readonly id: Id } };

export * from "./define.ts";
