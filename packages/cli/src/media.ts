/**
 * Adding a picture, video or music to a card spec from its public web
 * address. The file is checked once here, that it loads and is a kind a
 * card shows, and the card loads it from that address each time it opens,
 * so it travels in the card's link. Nothing is stored anywhere.
 */
import {
  type Card,
  layersOf,
  type Media,
  type MediaId,
  newMediaId,
  type PictureFit,
  type PicturePage,
  WebSource,
} from "@timmo001/cardstock-card";
import { Effect, Option, Struct } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { describe, fail, readSpecText } from "./operations.ts";

/** The largest file a card takes, so a card still opens quickly on a phone. */
const largest = 20 * 1024 * 1024;

/** The MIME type of each file a card takes, by extension. */
const types = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".avif", "image/avif"],
  [".svg", "image/svg+xml"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".oga", "audio/ogg"],
  [".opus", "audio/ogg"],
  [".m4a", "audio/mp4"],
  [".wav", "audio/wav"],
  [".flac", "audio/flac"],
]);

/**
 * A file on the web, checked once here: it must load, be a kind a card
 * shows, by its extension or the type the site gives, and not be too large.
 */
const fromUrl = Effect.fnUntraced(function* (address: string) {
  const url = URL.parse(address);

  if (url === null || url.protocol !== "https:") {
    return yield* fail(`${address} isn't an https:// address`);
  }

  const response = yield* HttpClient.get(url.href).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.provideService(HttpClient.TracerPropagationEnabled, false),
    Effect.mapError(() => fail(`${url.href} didn't load`)),
  );

  const bytes = yield* response.arrayBuffer.pipe(
    Effect.mapError(() => fail(`${url.href} didn't load`)),
  );

  const given = (response.headers["content-type"] ?? "").split(";")[0] ?? "";
  const extension = url.pathname.match(/\.\w+$/u)?.[0]?.toLowerCase() ?? "";

  const type =
    types.get(extension) ??
    ([...types.values()].includes(given) ? given : undefined);

  if (type === undefined) {
    return yield* fail(
      `${url.href} isn't a picture, video or sound a card can show: use PNG, JPEG, WebP, GIF, AVIF, SVG, MP4, WebM, MP3, Ogg, M4A, WAV or FLAC`,
    );
  }

  if (bytes.byteLength > largest) {
    return yield* fail(
      `${url.href} is over 20 MB: use a smaller one, so the card opens quickly`,
    );
  }

  return { type, source: WebSource.make({ url: url.href }) };
});

/**
 * Where `media add` puts a file: the front's or the inside's own picture,
 * one more picture laid over the rest (`picture`, on the page `on` names),
 * the page background or the music.
 */
export type MediaAs = "front" | "inside" | "picture" | "background" | "music";

/** A file's kind from its MIME type: a video shows where a picture would. */
const kindOf = (type: string): Media["kind"] => {
  if (type.startsWith("audio/")) return "audio";

  return type.startsWith("video/") ? "video" : "image";
};

const kindNames = {
  image: "a picture",
  video: "a video",
  audio: "a sound",
} satisfies { readonly [Kind in Media["kind"]]: string };

/** The file each place on a card shows now; a laid picture replaces none. */
const placed = (card: Card) =>
  ({
    front: card.front.image,
    inside: card.inside.image,
    picture: undefined,
    background: card.background,
    music: card.music,
  }) satisfies { readonly [As in MediaAs]: MediaId | undefined };

/**
 * The card with a new media file set as its front or inside picture, laid
 * over its pictures, or set as its page background or its music, dropping
 * the one it replaces unless another place still shows it. A picture keeps
 * the fit it had unless a new one is given.
 */
const withMedia = (
  card: Card,
  media: Media,
  as: MediaAs,
  fit: PictureFit | undefined,
  on: PicturePage,
): Card => {
  const frontFit = fit ?? card.front.fit;
  const insideFit = fit ?? card.inside.fit;

  // Framed is how a laid picture without a fit sits
  const laid =
    as === "picture"
      ? Struct.assign(card, {
          pictures: [
            ...(card.pictures ?? []),
            fit === undefined || fit === "frame"
              ? { image: media.id, on }
              : { image: media.id, on, fit },
          ],
        })
      : card;

  const pictured = Struct.assign(laid, {
    front:
      as === "front"
        ? frontFit === undefined
          ? { title: card.front.title, image: media.id }
          : { title: card.front.title, image: media.id, fit: frontFit }
        : card.front,
    inside:
      as === "inside"
        ? insideFit === undefined
          ? { ...card.inside, image: media.id }
          : { ...card.inside, image: media.id, fit: insideFit }
        : card.inside,
  });

  const scored =
    as === "music" ? Struct.assign(pictured, { music: media.id }) : pictured;

  const updated: Card =
    as === "background"
      ? Struct.assign(scored, { background: media.id })
      : scored;

  const shown = new Set([
    ...layersOf(updated).map((layer) => layer.image),
    updated.background,
    updated.music,
  ]);

  return Struct.assign(updated, {
    media: [...card.media, media].filter((entry) => shown.has(entry.id)),
  });
};

/** The spec with a file from the web in it, and what was added. */
export const mediaAdd = Effect.fn("mediaAdd")(function* (options: {
  readonly spec: string;
  readonly url: string;
  readonly as: Option.Option<MediaAs>;
  /** Where a picture sits; it keeps the card's fit without it. */
  readonly fit: Option.Option<PictureFit>;
  /** The page a laid picture goes on; the front without it. */
  readonly on: Option.Option<PicturePage>;
}) {
  const card = yield* readSpecText(options.spec);
  const found = yield* fromUrl(options.url);
  const kind = kindOf(found.type);

  const as = Option.getOrElse(options.as, () =>
    kind === "audio" ? "music" : "front",
  );

  if ((as === "music") !== (kind === "audio")) {
    return yield* fail(`That's ${kindNames[kind]}, so it can't be the ${as}`);
  }

  const media: Media = {
    id: yield* newMediaId,
    kind,
    type: found.type,
    source: found.source,
  };

  return {
    mediaId: media.id,
    kind,
    as,
    replaced: placed(card)[as] ?? null,
    spec: withMedia(
      card,
      media,
      as,
      Option.getOrUndefined(options.fit),
      Option.getOrElse(options.on, () => "front" as const),
    ),
  };
}, Effect.mapError(describe));
