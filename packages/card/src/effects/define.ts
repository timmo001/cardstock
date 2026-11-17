/**
 * What an effect is: how many particles, their colours, sizes and motion, and
 * the shape each one is drawn as. The renderer moves them on the GPU, so an
 * effect is data plus one small 2D drawing.
 */
import type { EffectIdValue } from "../registry.ts";

export interface Effect {
  readonly id: EffectIdValue;
  /** How many particles; 0 is no effect at all. */
  readonly count: number;
  /** Each particle takes one of these. */
  readonly colours: readonly string[];
  /** The smallest and largest particle, in scene units, where the card is 1 wide. */
  readonly size: readonly [number, number];
  /** How fast they fall, in scene units a second. Below 0, they rise. */
  readonly speed: number;
  /** How far they sway from side to side. */
  readonly drift: number;
  /** How fast they turn, in radians a second. */
  readonly spin: number;
  /** Whether they glint on and off. */
  readonly twinkle: boolean;
  /** Draws one particle in white on a clear square canvas of `size` pixels. */
  readonly draw: (
    paint: OffscreenCanvasRenderingContext2D,
    size: number,
  ) => void;
}

/** Declares an effect, checking it against `Effect`. */
export const defineEffect = <const E extends Effect>(effect: E): E => effect;
