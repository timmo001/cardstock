/**
 * Saving a card for chats: a still of its front as a PNG, or the card
 * opening as an MP4 or a GIF. Each draws the card offscreen at a fixed size
 * and steps the timeline and the particles one frame at a time, so the file
 * comes out the same however fast the device is. Browser only: the CLI runs
 * it in headless Chromium.
 */
import { Effect, Schema } from "effect";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import {
  BufferTarget,
  CanvasSource,
  canEncodeVideo,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";
import type { Picture } from "./designs/define.ts";
import { paintBackdrop } from "./render/backdrop.ts";
import {
  buildCardScene,
  type CardScene,
  type Framing,
  frontOnly,
  wholeCard,
} from "./render/scene.ts";
import type { Card } from "./schema.ts";
import { type CardStage, stagesFor } from "./render/timeline.ts";
import { dimensionsOf, type Dimensions } from "./size.ts";

export class ExportError extends Schema.TaggedError<ExportError>()(
  "ExportError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {}

export const exportKinds = ["still", "mp4", "gif"] as const;

export type ExportKind = (typeof exportKinds)[number];

export interface ExportOptions {
  /** The card's pictures, decoded, by media id. */
  readonly images?: ReadonlyMap<string, Picture> | undefined;
  /** The colour behind the card. Defaults to Cardstock's own plum. */
  readonly background?: string;
  /** Called as frames are made, from 0 to 1. */
  readonly onProgress?: (done: number) => void;
}

interface Size {
  readonly width: number;
  readonly height: number;
  readonly framing: (card: Dimensions) => Framing;
  /** Frames a second; a still has one frame. */
  readonly fps: number;
}

/**
 * A still is a phone-sized picture of the front, turned to suit a wide card,
 * or of the full view for a card with no card to show. Videos are square, so
 * the envelope and the open card both fit; a GIF is smaller and slower, as
 * every frame is a whole picture.
 */
const sizes = {
  still: { width: 1080, height: 1350, framing: frontOnly, fps: 1 },
  mp4: { width: 720, height: 720, framing: wholeCard, fps: 30 },
  gif: { width: 480, height: 480, framing: wholeCard, fps: 15 },
} satisfies { readonly [Kind in ExportKind]: Size };

/** `kind`'s size for `card`: a still of a wider-than-tall card lies on its side. */
const sizeFor = (forCard: Card, kind: ExportKind): Size => {
  const size = sizes[kind];
  const card = dimensionsOf(forCard);

  if (kind !== "still" || card.width <= card.height) return size;

  return card.width === card.height
    ? { ...size, height: size.width }
    : { ...size, width: size.height, height: size.width };
};

export const exportTypes = {
  still: { extension: "png", type: "image/png" },
  mp4: { extension: "mp4", type: "video/mp4" },
  gif: { extension: "gif", type: "image/gif" },
} as const satisfies {
  readonly [Kind in ExportKind]: {
    readonly extension: string;
    readonly type: string;
  };
};

const backdrop = "#221b25";

/** The pauses in a video, in seconds, at each stage on the way through. */
const holds = { sealed: 0.6, out: 1, open: 1.4, full: 2.5 } as const;

/** The pause at the end, on the inside or the full view. */
const lastHold = 2.5;

const attempt = <A>(message: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new ExportError({ message, cause }),
  });

/** The card's scene at `kind`'s size, and a 2D copy of each frame to save. */
const record = Effect.fnUntraced(function* (
  card: Card,
  kind: ExportKind,
  options: ExportOptions,
) {
  const size = sizeFor(card, kind);
  const canvas = document.createElement("canvas");

  const scene = yield* buildCardScene(canvas, card, {
    images: options.images,
  });

  scene.fit(size.width, size.height, size.framing(scene.size), 1);
  yield* scene.ready;

  const copy = new OffscreenCanvas(size.width, size.height);
  const paint = copy.getContext("2d", { willReadFrequently: kind === "gif" });

  if (paint === null) {
    return yield* new ExportError({ message: "This browser can't draw it" });
  }

  // The scene is see-through, as on the page, so its shadows fall on the
  // background behind it exactly as they do there
  const capture = () => {
    if (scene.backdrop === undefined) {
      paint.fillStyle = options.background ?? backdrop;
      paint.fillRect(0, 0, size.width, size.height);
    } else {
      paintBackdrop(paint, scene.backdrop, size.width, size.height);
    }

    paint.drawImage(canvas, 0, 0, size.width, size.height);
  };

  return { scene, size, copy, paint, capture };
});

/** The video's frames: how many, and how to draw each one. */
const reel = (scene: CardScene, fps: number) => {
  const order: readonly CardStage[] = stagesFor[scene.opening];
  const at = (stage: CardStage) => scene.timeline.labels[stage] ?? 0;

  // A pause at each stage, then the way to the next, the last held longest
  const parts = order.flatMap((stage, index) => {
    const next = order[index + 1];

    const pause = {
      from: at(stage),
      to: at(stage),
      seconds: next === undefined ? lastHold : holds[stage],
    };

    return next === undefined
      ? [pause]
      : [
          pause,
          { from: at(stage), to: at(next), seconds: at(next) - at(stage) },
        ];
  });

  const seconds = parts.reduce((total, part) => total + part.seconds, 0);

  /** Where the timeline is `elapsed` seconds in. */
  const playhead = (elapsed: number) => {
    let start = 0;

    for (const part of parts) {
      if (elapsed < start + part.seconds) {
        return part.from === part.to ? part.from : part.from + elapsed - start;
      }

      start += part.seconds;
    }

    return parts.at(-1)?.to ?? 0;
  };

  return {
    count: Math.ceil(seconds * fps),
    draw: Effect.fnUntraced(function* (frame: number) {
      const elapsed = frame / fps;

      yield* scene.holdVideos(elapsed);
      scene.timeline.seek(playhead(elapsed), false);
      scene.draw(elapsed, frame === 0 ? 0 : 1 / fps);
    }),
  };
};

const still = Effect.fnUntraced(function* (card: Card, options: ExportOptions) {
  const { scene, copy, capture } = yield* record(card, "still", options);

  // The front, or the full view of a card that's only ever that
  scene.timeline.seek(scene.opening === "page" ? "full" : "out", false);
  yield* scene.holdVideos(0);
  // A moment in, so the particles have spread and the light sits straight
  scene.draw(Math.PI * 0.95, 0);
  capture();
  options.onProgress?.(1);

  return yield* attempt("Couldn't save the picture", () =>
    copy.convertToBlob({ type: exportTypes.still.type }),
  );
});

const mp4 = Effect.fnUntraced(function* (card: Card, options: ExportOptions) {
  const { width, height, fps } = sizes.mp4;

  const supported = yield* attempt("Couldn't check for MP4", () =>
    canEncodeVideo("avc", { width, height }),
  );

  if (!supported) {
    return yield* new ExportError({
      message: "This browser can't make an MP4. Try a GIF.",
    });
  }

  const { scene, copy, capture } = yield* record(card, "mp4", options);
  const target = new BufferTarget();

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const source = new CanvasSource(copy, {
    codec: "avc",
    quality: QUALITY_HIGH,
  });

  output.addVideoTrack(source, { frameRate: fps });
  yield* attempt("Couldn't start the video", () => output.start());

  const frames = reel(scene, fps);

  for (let frame = 0; frame < frames.count; frame++) {
    yield* frames.draw(frame);
    capture();
    yield* attempt("Couldn't add a frame", () =>
      source.add(frame / fps, 1 / fps),
    );
    options.onProgress?.((frame + 1) / frames.count);
  }

  yield* attempt("Couldn't finish the video", () => output.finalize());

  if (target.buffer === null) {
    return yield* new ExportError({ message: "The video came out empty" });
  }

  return new Blob([target.buffer], { type: exportTypes.mp4.type });
});

const gif = Effect.fnUntraced(function* (card: Card, options: ExportOptions) {
  const { scene, size, paint, capture } = yield* record(card, "gif", options);
  const { width, height, fps } = size;
  const encoder = GIFEncoder();
  const frames = reel(scene, fps);

  for (let frame = 0; frame < frames.count; frame++) {
    yield* frames.draw(frame);
    capture();

    const { data } = paint.getImageData(0, 0, width, height);
    const palette = quantize(data, 256);

    encoder.writeFrame(applyPalette(data, palette), width, height, {
      palette,
      delay: 1000 / fps,
    });
    options.onProgress?.((frame + 1) / frames.count);
    // Lets the page draw between frames, such as the progress
    yield* Effect.sleep(0);
  }

  encoder.finish();

  return new Blob([encoder.bytes().slice()], { type: exportTypes.gif.type });
});

const makers = { still, mp4, gif } as const;

/** Saves `card` as `kind`: a PNG of its front, or an MP4 or GIF of it opening. */
export const exportCard = (
  card: Card,
  kind: ExportKind,
  options: ExportOptions = {},
) => Effect.scoped(makers[kind](card, options));

/** A file name for the export, from the card's occasion. */
export const exportName = (card: Card, kind: ExportKind) => {
  const name = card.occasion
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

  return `${name === "" ? "card" : name}.${exportTypes[kind].extension}`;
};
