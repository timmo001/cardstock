/**
 * A card's dimensions by its size: in the scene's units, where the portrait
 * card is 1 wide, and in pixels for its painted faces. The stage, the faces,
 * the timeline and the exports all measure the card from here, so a new size
 * only needs its dimensions added.
 */
import type { CardSizeValue } from "./registry.ts";
import type { Card } from "./schema.ts";

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/** Each size in the scene's units, near enough the same area of paper. */
export const sizeDimensions = {
  portrait: { width: 1, height: 1.4 },
  landscape: { width: 1.4, height: 1 },
  square: { width: 1.2, height: 1.2 },
  tall: { width: 0.8, height: 1.6 },
} as const satisfies { readonly [Size in CardSizeValue]: Dimensions };

/** A face's pixels for each scene unit: the portrait card's 1024 by 1434. */
export const pixelsPerUnit = 1024;

export const sizeOf = (card: Card): CardSizeValue => card.size ?? "portrait";

export const dimensionsOf = (card: Card): Dimensions =>
  sizeDimensions[sizeOf(card)];
