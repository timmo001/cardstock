/**
 * Blank faces of paper for a design to paint: a colour canvas and a foil
 * mask each, offscreen. Kept apart from the renderer so a card's front can
 * be painted flat, such as for the shelf, without loading three.js.
 */
import { type Dimensions, pixelsPerUnit, sizeDimensions } from "../size.ts";
import type { Face, Faces } from "./define.ts";

/** The portrait face's size in pixels: 5:7, sharp enough for a phone held close. */
export const faceSize = {
  width: pixelsPerUnit,
  height: Math.round(pixelsPerUnit * sizeDimensions.portrait.height),
} as const;

export interface PaintedFace extends Face {
  readonly colourCanvas: OffscreenCanvas;
  readonly foilCanvas: OffscreenCanvas;
}

const context = (canvas: OffscreenCanvas) => {
  const paint = canvas.getContext("2d");

  if (paint === null) throw new Error("This browser can't paint a card");

  return paint;
};

/** A blank face; foil starts black, which is no foil at all. */
export const blankFace = (
  width: number = faceSize.width,
  height: number = faceSize.height,
): PaintedFace => {
  const colourCanvas = new OffscreenCanvas(width, height);
  const foilCanvas = new OffscreenCanvas(width, height);
  const foil = context(foilCanvas);

  foil.fillStyle = "#000";
  foil.fillRect(0, 0, width, height);

  return {
    width,
    height,
    colourCanvas,
    foilCanvas,
    colour: context(colourCanvas),
    foil,
  };
};

/**
 * Five blank faces for a design to paint, for a card of `size`, at the
 * scene's pixels per unit or `width` wide.
 */
export const blankFaces = (
  size: Dimensions = sizeDimensions.portrait,
  width: number = Math.round(pixelsPerUnit * size.width),
) => {
  const height = Math.round((width * size.height) / size.width);

  return {
    front: blankFace(width, height),
    insideLeft: blankFace(width, height),
    insideRight: blankFace(width, height),
    back: blankFace(width, height),
    liner: blankFace(width, height),
  } satisfies Faces;
};

export type PaintedFaces = ReturnType<typeof blankFaces>;
