/**
 * Every design and effect a card can name. The schema's `DesignId` and
 * `EffectId` are built from these lists, so a card can only name one that
 * exists. The renderer adds each one's drawing code under `designs/` and
 * `effects/`, keyed by the same ids.
 */
export const designIds = [
  "christmas",
  "birthday",
  "anniversary",
  "any",
] as const;

export type DesignIdValue = (typeof designIds)[number];

/**
 * Each design's colourways, the first its own. A card names one with
 * `palette`, or takes the first without it.
 */
export const paletteIds = {
  christmas: ["green", "red", "midnight"],
  birthday: ["cream", "blush", "midnight"],
  anniversary: ["blush", "sage", "navy"],
  any: ["white", "kraft", "sky", "ink"],
} as const satisfies {
  readonly [Id in DesignIdValue]: readonly [string, ...string[]];
};

export type PaletteIdValue<Id extends DesignIdValue = DesignIdValue> =
  (typeof paletteIds)[Id][number];

/** The card's size, the first the one a card without `size` takes. */
export const cardSizes = ["portrait", "landscape", "square", "tall"] as const;

export type CardSizeValue = (typeof cardSizes)[number];

/**
 * How a card opens, the first the one a card without `opening` takes: as a
 * card from its envelope; as a card that then grows into a full view of its
 * message; straight from the envelope into the full view, as a letter; or as
 * the full view from the start, with no card at all.
 */
export const openings = ["card", "grow", "letter", "page"] as const;

export type OpeningValue = (typeof openings)[number];

/** `none` is a card without particles, such as one for a sad occasion. */
export const effectIds = [
  "none",
  "snow",
  "confetti",
  "hearts",
  "sparkle",
] as const;

export type EffectIdValue = (typeof effectIds)[number];
