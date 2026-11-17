/**
 * The card format: what a card is, as data and never code. The CLI and the
 * app both decode a card through `Card`, so neither can be handed anything
 * the renderer doesn't know. Every picture, video and track loads from a web
 * address, and the back's credits come from each file's source, so they
 * can't be left off.
 */
import { Effect, Match, Schema } from "effect";
import * as Base64Url from "effect/encoding/Base64Url";
import {
  cardSizes,
  designIds,
  effectIds,
  openings,
  paletteIds,
} from "./registry.ts";

/** A random id: 16 bytes in base64url, as `randomId` makes. */
const idPattern = /^[\w-]{22}$/u;

export const CardId = Schema.String.check(Schema.isPattern(idPattern)).pipe(
  Schema.brand("CardId"),
);

export type CardId = typeof CardId.Type;

export const MediaId = Schema.String.check(Schema.isPattern(idPattern)).pipe(
  Schema.brand("MediaId"),
);

export type MediaId = typeof MediaId.Type;

export const DesignId = Schema.Literals(designIds);

export type DesignId = typeof DesignId.Type;

export const EffectId = Schema.Literals(effectIds);

export type EffectId = typeof EffectId.Type;

export const CardSize = Schema.Literals(cardSizes);

export type CardSize = typeof CardSize.Type;

export const Opening = Schema.Literals(openings);

export type Opening = typeof Opening.Type;

const HttpsUrl = Schema.String.check(Schema.isPattern(/^https:\/\/\S+$/u));

/**
 * A picture, video or track loaded from its own public web address. Every
 * file a card shows loads from the web, so nothing is stored beside the card
 * and the whole card travels in its link.
 */
export const WebSource = Schema.TaggedStruct("Web", { url: HttpsUrl });

// A photo an older card took from Unsplash, which Unsplash's rules have
// loaded from Unsplash, so it's a web address too, with its credit
export const UnsplashSource = Schema.TaggedStruct("Unsplash", {
  url: HttpsUrl,
  photographer: Schema.String,
  profileUrl: HttpsUrl,
  downloadLocation: HttpsUrl,
});

/** Where a picture or a track loads from. */
export const MediaSource = Schema.Union([WebSource, UnsplashSource]);

export type MediaSource = typeof MediaSource.Type;

export const Media = Schema.Struct({
  id: MediaId,
  /** A video shows where a picture would, looping, as a moving picture. */
  kind: Schema.Literals(["image", "video", "audio"]),
  /** The file's MIME type, such as `image/webp`, `video/mp4` or `audio/ogg`. */
  type: Schema.String.check(
    Schema.isPattern(/^(?:image|video|audio)\/[\w.+-]+$/u),
  ),
  source: MediaSource,
});

export interface Media extends Schema.Schema.Type<typeof Media> {}

/**
 * Where the front's picture sits: in the design's frame, filling the front
 * edge to edge with the title over it, or washed into the paper behind the
 * design and its title.
 */
export const PictureFit = Schema.Literals(["frame", "fill", "behind"]);

export type PictureFit = typeof PictureFit.Type;

/**
 * The page a picture is on: the front, the inside left (the inside of the
 * front cover) or the inside right (the page with the message).
 */
export const PicturePage = Schema.Literals(["front", "left", "right"]);

export type PicturePage = typeof PicturePage.Type;

/**
 * One picture or video on a page, laid over the ones before it. `fill` covers
 * the page edge to edge, `frame` sets it in a box (boxes on one page share
 * the room) and `behind` washes it pale into the paper, under the words.
 */
export const Layer = Schema.Struct({
  image: MediaId,
  on: PicturePage,
  /** How it sits; `frame` without it. */
  fit: Schema.optionalKey(PictureFit),
});

export interface Layer extends Schema.Schema.Type<typeof Layer> {}

export const Card = Schema.Struct({
  version: Schema.Literal(1),
  /** What it's for, in a word or two, such as `Christmas` or `Mum's 60th`. */
  occasion: Schema.NonEmptyString,
  design: DesignId,
  /** One of the design's colourways, such as `red` for Christmas; its first without it. */
  palette: Schema.optionalKey(Schema.String),
  /** The card's size: portrait, landscape, square or tall; `portrait` without it. */
  size: Schema.optionalKey(CardSize),
  /**
   * How it opens: `card` (from its envelope, then open; without it), `grow`
   * (then into a full view of its message), `letter` (from the envelope
   * straight into the full view) or `page` (the full view, with no card).
   */
  opening: Schema.optionalKey(Opening),
  effect: EffectId,
  front: Schema.Struct({
    title: Schema.String,
    image: Schema.optionalKey(MediaId),
    /** Where the picture sits; `frame` without it. */
    fit: Schema.optionalKey(PictureFit),
  }),
  inside: Schema.Struct({
    message: Schema.String,
    from: Schema.String,
    to: Schema.optionalKey(Schema.String),
    /** A picture inside: on the inside cover, or behind the message. */
    image: Schema.optionalKey(MediaId),
    /**
     * Where it sits: `frame` (framed on the inside cover; without a fit),
     * `fill` (the whole inside cover) or `behind` (washed under the message).
     */
    fit: Schema.optionalKey(PictureFit),
  }),
  /**
   * More pictures and videos, in the order they're laid, each on the front
   * or a page inside, after the front's and the inside's own `image`.
   */
  pictures: Schema.optionalKey(Schema.Array(Layer)),
  music: Schema.optionalKey(MediaId),
  /**
   * A picture or looping video filling the page behind the card, as well as
   * or instead of on it: it can name the front's or the inside's own file.
   */
  background: Schema.optionalKey(MediaId),
  /** Whether the back lists the web addresses its files load from; off without it. */
  footnote: Schema.optionalKey(Schema.Boolean),
  media: Schema.Array(Media),
}).check(
  Schema.makeFilter((card) =>
    card.palette === undefined ||
    paletteIds[card.design].some((id) => id === card.palette)
      ? undefined
      : {
          path: ["palette"],
          issue: `The ${card.design} design comes in ${paletteIds[card.design].join(", ")}`,
        },
  ),
  Schema.makeFilter((card) =>
    card.media.some(
      (media) => media.id === card.background && media.kind === "audio",
    )
      ? { path: ["background"], issue: "The background is a picture or video" }
      : undefined,
  ),
  Schema.makeFilter((card) =>
    (card.pictures ?? []).some((layer) =>
      card.media.some(
        (media) => media.id === layer.image && media.kind === "audio",
      ),
    )
      ? { path: ["pictures"], issue: "Each of pictures is a picture or video" }
      : undefined,
  ),
);

export interface Card extends Schema.Schema.Type<typeof Card> {}

/**
 * What someone reuses from card to card, such as how they sign off or the
 * design they pick for a sister's birthday, saved under a name. It's kept
 * on the device that saved it, and never sent anywhere.
 */
export const Preset = Schema.Struct({
  version: Schema.Literal(1),
  /** What it's for, such as `Family birthdays` or `Work Christmas`. */
  name: Schema.NonEmptyString,
  design: Schema.optionalKey(DesignId),
  effect: Schema.optionalKey(EffectId),
  /** The sign-off, such as `Love, Sam x`. */
  from: Schema.optionalKey(Schema.String),
  /** How the words should read, such as `warm, a little cheeky, no religion`. */
  tone: Schema.optionalKey(Schema.String),
});

export interface Preset extends Schema.Schema.Type<typeof Preset> {}

/** The preset as the JSON text that's sealed. */
export const PresetJson = Schema.fromJsonString(Preset);

/** Reads a preset's JSON text, failing on anything that isn't one. */
export const decodePreset = Schema.decodeUnknownEffect(PresetJson);

/** Writes a preset as JSON text. */
export const encodePreset = Schema.encodeEffect(PresetJson);

/** The card as the JSON text that's sealed. */
export const CardJson = Schema.fromJsonString(Card);

/** Reads a card's JSON text, failing on anything that isn't a card. */
export const decodeCard = Schema.decodeUnknownEffect(CardJson);

/** Writes a card as JSON text. */
export const encodeCard = Schema.encodeEffect(CardJson);

/** Makes a card from an agent's or editor's spec, checking it as it goes. */
export const makeCard = Schema.decodeUnknownEffect(Card);

/** The media ids a card names as a picture or its music without listing them in `media`. */
export const missingMedia = (card: Card): readonly MediaId[] => {
  const known = new Set(card.media.map((media) => media.id));

  return [
    ...layersOf(card).map((layer) => layer.image),
    card.music,
    card.background,
  ].filter((id): id is MediaId => id !== undefined && !known.has(id));
};

/**
 * Every picture on the card, in the order it's laid: the front's own
 * `image`, the inside's, then `pictures`. The inside's own picture is on the
 * inside left, unless it sits behind the message, on the right.
 */
export const layersOf = (card: Card): readonly Layer[] => [
  ...(card.front.image === undefined
    ? []
    : [
        {
          image: card.front.image,
          on: "front" as const,
          fit: card.front.fit ?? "frame",
        },
      ]),
  ...(card.inside.image === undefined
    ? []
    : [
        {
          image: card.inside.image,
          on:
            card.inside.fit === "behind"
              ? ("right" as const)
              : ("left" as const),
          fit: card.inside.fit ?? "frame",
        },
      ]),
  ...(card.pictures ?? []),
];

/**
 * The pictures and videos a card shows, on its front, inside and behind it,
 * without its music.
 */
export const pictureMedia = (card: Card): readonly Media[] => {
  const shown = new Set<MediaId | undefined>([
    ...layersOf(card).map((layer) => layer.image),
    card.background,
  ]);

  return card.media.filter(
    (media) => media.kind !== "audio" && shown.has(media.id),
  );
};

/** One line on the back of the card, crediting where a file came from. */
export interface Credit {
  readonly text: string;
  readonly url?: string;
}

/**
 * The credits for the back of the card, from each file's source. A file
 * from a web address is credited only when the card's footnote is on.
 */
export const credits = (card: Card): readonly Credit[] =>
  card.media.flatMap(({ source }) =>
    Match.valueTags(source, {
      Unsplash: (photo): readonly Credit[] => [
        {
          text: `Photo by ${photo.photographer} on Unsplash`,
          url: photo.profileUrl,
        },
      ],
      Web: (found): readonly Credit[] =>
        card.footnote === true
          ? [{ text: shortAddress(found.url), url: found.url }]
          : [],
    }),
  );

/** An address short enough for a line on the back: its host and path, cut at 56 characters. */
const shortAddress = (url: string) => {
  const parsed = URL.parse(url);

  const shown =
    parsed === null
      ? url.replace(/^https:\/\//u, "")
      : `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;

  return shown.length > 56 ? `${shown.slice(0, 55)}…` : shown;
};

/** The web address a file loads from. */
export const webAddress = (media: Media): string =>
  Match.valueTags(media.source, {
    Unsplash: (photo) => photo.url,
    Web: (found) => found.url,
  });

/** A new random id for a card or a media file. */
export const randomId = (): string =>
  Base64Url.encode(crypto.getRandomValues(new Uint8Array(16)));

export const newCardId = Effect.sync(() => CardId.make(randomId()));

export const newMediaId = Effect.sync(() => MediaId.make(randomId()));
