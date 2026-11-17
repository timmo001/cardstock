/**
 * Every design, by the id a card names. Checked against the registry's ids
 * and colourways, so adding an id or a palette without its design, or a
 * design without an id, doesn't compile.
 */
import type { DesignIdValue, paletteIds } from "../registry.ts";
import type { Card } from "../schema.ts";
import { anniversary } from "./anniversary.ts";
import { any } from "./any.ts";
import { birthday } from "./birthday.ts";
import { christmas } from "./christmas.ts";
import type { Build, Colours, Design, Picture } from "./define.ts";

/** A design's colourways after its own, as the registry names them. */
type OtherPalettes<Id extends DesignIdValue> =
  (typeof paletteIds)[Id] extends readonly [
    string,
    ...infer Rest extends string[],
  ]
    ? Rest[number]
    : never;

export const designs = {
  christmas,
  birthday,
  anniversary,
  any,
} satisfies {
  readonly [Id in DesignIdValue]: Design & {
    readonly id: Id;
    readonly palettes: { readonly [P in OtherPalettes<Id>]: Colours };
  };
};

/** The colours a card is printed in: its palette, or its design's own. */
export const coloursOf = (card: Pick<Card, "design" | "palette">): Colours => {
  const design: Design = designs[card.design];

  return (
    (card.palette === undefined ? undefined : design.palettes[card.palette]) ??
    design.colours
  );
};

/** What a design paints from: the card, its pictures and its colours. */
export const buildFor = (
  card: Card,
  images: ReadonlyMap<string, Picture> | undefined,
): Build => {
  const picture = (id: string | undefined) =>
    id === undefined ? undefined : images?.get(id);

  return {
    card,
    image: picture(card.front.image),
    insideImage: picture(card.inside.image),
    colours: coloursOf(card),
    fonts: designs[card.design].fonts,
  };
};

export * from "./define.ts";
