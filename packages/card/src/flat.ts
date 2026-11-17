/**
 * A card's front, painted flat on a 2D canvas, as a shop would show it on a
 * shelf. It uses the same designs as the 3D card, without three.js, so a page
 * of fronts loads quickly and doesn't need a GPU.
 */
import { Effect } from "effect";
import { buildFor, designs, type Picture } from "./designs/index.ts";
import { blankFaces } from "./designs/faces.ts";
import { loadCardFonts } from "./render/fonts.ts";
import type { Card } from "./schema.ts";
import { dimensionsOf } from "./size.ts";

/** Paints `card`'s front `width` pixels wide onto a new canvas. */
export const paintFront = Effect.fnUntraced(function* (
  card: Card,
  width: number,
  images?: ReadonlyMap<string, Picture>,
) {
  yield* loadCardFonts;

  const faces = blankFaces(dimensionsOf(card), width);

  designs[card.design].build(faces, buildFor(card, images));

  return faces.front.colourCanvas;
});
