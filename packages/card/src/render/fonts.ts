/**
 * The card's own fonts, bundled with it so a card looks the same in every
 * browser: Fraunces for printed type, with its optical sizes, Bricolage
 * Grotesque for bold, playful type, Cormorant Garamond for fine, formal type,
 * and Caveat for the handwritten message. They load under their own names, so
 * the app's fonts can't stand in for them.
 */
import bricolage from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2";
import bricolageExt from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2";
import caveatLatin from "@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2";
import caveatLatinExt from "@fontsource-variable/caveat/files/caveat-latin-ext-wght-normal.woff2";
import cormorantItalic from "@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2";
import cormorantItalicExt from "@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-ext-wght-italic.woff2";
import cormorant from "@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2";
import cormorantExt from "@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-ext-wght-normal.woff2";
import frauncesItalic from "@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2";
import frauncesItalicExt from "@fontsource-variable/fraunces/files/fraunces-latin-ext-full-italic.woff2";
import fraunces from "@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2";
import frauncesExt from "@fontsource-variable/fraunces/files/fraunces-latin-ext-full-normal.woff2";
import { Effect } from "effect";

/** CSS families for designs to paint with. */
export const cardFonts = {
  serif: '"Cardstock Fraunces", Georgia, serif',
  grotesque: '"Cardstock Bricolage", "Arial Black", sans-serif',
  garamond: '"Cardstock Cormorant", Garamond, Georgia, serif',
  hand: '"Cardstock Caveat", "Segoe Print", cursive',
} as const;

const latin =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

const latinExt =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const files = [
  ["Cardstock Fraunces", fraunces, "normal", latin],
  ["Cardstock Fraunces", frauncesExt, "normal", latinExt],
  ["Cardstock Fraunces", frauncesItalic, "italic", latin],
  ["Cardstock Fraunces", frauncesItalicExt, "italic", latinExt],
  ["Cardstock Bricolage", bricolage, "normal", latin],
  ["Cardstock Bricolage", bricolageExt, "normal", latinExt],
  ["Cardstock Cormorant", cormorant, "normal", latin],
  ["Cardstock Cormorant", cormorantExt, "normal", latinExt],
  ["Cardstock Cormorant", cormorantItalic, "italic", latin],
  ["Cardstock Cormorant", cormorantItalicExt, "italic", latinExt],
  ["Cardstock Caveat", caveatLatin, "normal", latin],
  ["Cardstock Caveat", caveatLatinExt, "normal", latinExt],
] as const;

let loading: Promise<unknown> | undefined;

/** Loads the card's fonts once per page; a font that fails falls back. */
export const loadCardFonts = Effect.promise(() => {
  loading ??= Promise.allSettled(
    files.map(([family, url, style, unicodeRange]) => {
      const face = new FontFace(family, `url(${url}) format("woff2")`, {
        weight: "100 900",
        style,
        unicodeRange,
      });

      document.fonts.add(face);

      return face.load();
    }),
  );

  return loading;
});
