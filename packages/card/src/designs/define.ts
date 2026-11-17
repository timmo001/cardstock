/**
 * What a design is: its paper, colourways and fonts, and `build`, which paints
 * the card's faces, the envelope's liner and the foil that shines on them. A
 * design paints in 2D, onto canvases the renderer turns into the paper's
 * textures, so a new design needs no 3D code.
 */
import type { DesignIdValue } from "../registry.ts";
import type { Card, PictureFit, PicturePage } from "../schema.ts";

export type Paint = OffscreenCanvasRenderingContext2D;

export interface Colours {
  /** The printed outside of the card: its front and back. */
  readonly paper: string;
  /** The inside pages, and the paper's core that shows at its edges. */
  readonly inside: string;
  /** Printed text and line work. */
  readonly ink: string;
  /** The pen the message is written in. */
  readonly pen: string;
  readonly accent: string;
  /** The foil's colour where it catches the light. */
  readonly foil: string;
  readonly envelope: string;
  /** The envelope's printed lining, behind the card. */
  readonly liner: string;
}

/** CSS font families, such as `"Cardstock Fraunces", serif`. */
export interface Fonts {
  /** Printed titles. */
  readonly display: string;
  /** The handwritten message. */
  readonly hand: string;
}

export interface Paper {
  /** 0 is glossy, 1 is chalky. */
  readonly roughness: number;
  /** How strongly the paper's fibres catch the light. */
  readonly grain: number;
}

/**
 * One face of paper: its colour and its foil, where white is fully foiled.
 * Both are the same size, in pixels.
 */
export interface Face {
  readonly colour: Paint;
  readonly foil: Paint;
  readonly width: number;
  readonly height: number;
}

export interface Faces {
  readonly front: Face;
  /** The inside of the front cover, on the left once the card opens. */
  readonly insideLeft: Face;
  /** The page with the message, on the right once the card opens. */
  readonly insideRight: Face;
  /** The back, with the credits. */
  readonly back: Face;
  /** The envelope's lining, seen inside it and under its flap. */
  readonly liner: Face;
}

/**
 * A video on the paper: its element, playing, and its frame's size. A design
 * places it as it would a picture; the renderer shows it through the place.
 */
export interface MovingPicture {
  readonly video: HTMLVideoElement;
  readonly width: number;
  readonly height: number;
}

/** A picture on the card: a still, or a video. */
export type Picture = ImageBitmap | MovingPicture;

/** A decoded picture on a page, as a card's layer places it. */
export interface Placed {
  readonly picture: Picture;
  readonly on: PicturePage;
  readonly fit: PictureFit;
}

export interface Build {
  readonly card: Card;
  /**
   * The card's pictures, once they're decoded, in the order they're laid.
   * A page shows one video at most: the first one placed on it.
   */
  readonly pictures: readonly Placed[];
  readonly colours: Colours;
  readonly fonts: Fonts;
}

export interface Design {
  readonly id: DesignIdValue;
  readonly paper: Paper;
  /** Its own colourway, which a card without a `palette` takes. */
  readonly colours: Colours;
  /** Its other colourways, by the palette id a card names. */
  readonly palettes: Readonly<Record<string, Colours>>;
  readonly fonts: Fonts;
  readonly build: (faces: Faces, build: Build) => void;
}

/** Declares a design, checking it against `Design`. */
export const defineDesign = <const D extends Design>(design: D): D => design;
