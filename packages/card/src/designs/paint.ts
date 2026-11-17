/**
 * Painting a card in 2D: paper, set type, a cropped picture, the message as
 * if written by hand, and the credits on the back. Designs paint their own
 * fronts and liners with these, and most share the inside and the back.
 */
import { credits, type PicturePage } from "../schema.ts";
import { sizeDimensions } from "../size.ts";
import type {
  Build,
  Face,
  MovingPicture,
  Paint,
  Picture,
  Placed,
} from "./define.ts";
import { seeded } from "./ornaments.ts";

/**
 * The face's measure for lettering and marks: its width on a portrait or
 * taller card, and on a wider one the width a portrait face of its height
 * would have, so nothing outgrows the face's height.
 */
export const measure = (face: Face) =>
  Math.min(face.width, face.height / sizeDimensions.portrait.height);

export const fill = (face: Face, colour: string) => {
  face.colour.fillStyle = colour;
  face.colour.fillRect(0, 0, face.width, face.height);
};

/** The lines `text` takes at `width`, breaking at spaces and line breaks. */
export const wrap = (paint: Paint, text: string, width: number) =>
  text.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";

    for (const word of paragraph.split(/\s+/u)) {
      if (word === "") continue;

      const next = line === "" ? word : `${line} ${word}`;

      if (line !== "" && paint.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    return [...lines, line];
  });

/**
 * The largest font, up to `largest` pixels, at which `text` fits in `lines`
 * lines of `width`. Leaves `paint.font` set to it.
 */
export const fitText = (
  paint: Paint,
  text: string,
  options: {
    readonly font: (size: number) => string;
    readonly largest: number;
    readonly width: number;
    readonly lines: number;
  },
) => {
  let size = options.largest;

  for (; size > 12; size -= 2) {
    paint.font = options.font(size);

    const lines = wrap(paint, text, options.width);

    // A single long word can't wrap, so it has to fit on its own line too
    if (
      lines.length <= options.lines &&
      lines.every((line) => paint.measureText(line).width <= options.width)
    ) {
      break;
    }
  }

  paint.font = options.font(size);

  return size;
};

/** Writes lines centred on `x`, the first line's baseline at `y`. */
export const centred = (
  paint: Paint,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
) => {
  paint.textAlign = "center";
  paint.textBaseline = "alphabetic";

  for (const [index, line] of lines.entries()) {
    paint.fillText(line, x, y + index * lineHeight);
  }
};

/**
 * Where a video shows on a face: the face's texture coordinates turned into
 * the video's, as `uv * scale + offset`, both with 0 at the bottom.
 */
export interface VideoPlacement {
  readonly video: HTMLVideoElement;
  readonly scale: readonly [number, number];
  readonly offset: readonly [number, number];
}

const placements = new WeakMap<OffscreenCanvas, VideoPlacement>();

/** The video `cover` placed on a face's colour canvas, if it placed one. */
export const placedVideo = (canvas: OffscreenCanvas) => placements.get(canvas);

const isMoving = (picture: Picture): picture is MovingPicture =>
  "video" in picture;

/**
 * Draws a picture to fill a box, cropping whatever overflows. A video can't
 * be painted, so its box is cut out of the paper instead and the video is
 * placed there, for the renderer to show through whatever's painted over it.
 */
export const cover = (
  paint: Paint,
  image: Picture,
  box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
) => {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  const width = box.width / scale;
  const height = box.height / scale;

  if (isMoving(image)) {
    const across = width / image.width;
    const down = height / image.height;
    const scaleX = (paint.canvas.width / box.width) * across;
    const scaleY = (paint.canvas.height / box.height) * down;

    paint.clearRect(box.x, box.y, box.width, box.height);
    placements.set(paint.canvas, {
      video: image.video,
      scale: [scaleX, scaleY],
      offset: [
        (image.width - width) / 2 / image.width - (box.x / box.width) * across,
        1 -
          scaleY +
          (box.y / box.height) * down -
          (image.height - height) / 2 / image.height,
      ],
    });

    return;
  }

  paint.drawImage(
    image,
    (image.width - width) / 2,
    (image.height - height) / 2,
    width,
    height,
    box.x,
    box.y,
    box.width,
    box.height,
  );
};

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The pictures placed on one page, in the order they're laid. */
export const picturesOn = (build: Build, page: PicturePage) =>
  build.pictures.filter((placed) => placed.on === page);

/**
 * The picture a full view shows behind its words: the first one inside, or
 * the front's when there's none inside.
 */
export const leadPicture = (build: Build): Picture | undefined =>
  (
    build.pictures.find((placed) => placed.on !== "front") ??
    build.pictures.at(0)
  )?.picture;

/**
 * Splits a box into `count` equal boxes with `gap` between them: in a row
 * when the box is wider than tall, otherwise in a column.
 */
export const shareBox = (
  box: Box,
  count: number,
  gap: number,
): readonly Box[] => {
  const across = box.width > box.height;
  const room = (across ? box.width : box.height) - gap * (count - 1);
  const size = room / count;

  return Array.from({ length: count }, (_, index) =>
    across
      ? { ...box, x: box.x + index * (size + gap), width: size }
      : { ...box, y: box.y + index * (size + gap), height: size },
  );
};

/** Sets each picture in its share of a box, cropped to fill it. */
export const coverShared = (
  paint: Paint,
  pictures: readonly Picture[],
  box: Box,
  gap: number,
) => {
  for (const [index, each] of shareBox(box, pictures.length, gap).entries()) {
    const picture = pictures[index];

    if (picture !== undefined) cover(paint, picture, each);
  }
};

/**
 * Sets each picture in its share of a box, each under a fine foil rule, as
 * a design frames its pictures.
 */
export const framePictures = (
  face: Face,
  build: Build,
  pictures: readonly Picture[],
  box: Box,
  rule: number,
) => {
  for (const [index, each] of shareBox(
    box,
    pictures.length,
    rule * 6,
  ).entries()) {
    const picture = pictures[index];

    if (picture === undefined) continue;

    cover(face.colour, picture, each);
    foiled(face, build.colours.foil, (paint) => {
      paint.lineWidth = rule;
      paint.strokeRect(
        each.x - rule * 3,
        each.y - rule * 3,
        each.width + rule * 6,
        each.height + rule * 6,
      );
    });
  }
};

/** Washes the face in `colour`, so what's under it reads as tinted stock. */
const washed = (face: Face, colour: string, alpha: number) => {
  face.colour.save();
  face.colour.globalAlpha = alpha;
  face.colour.fillStyle = colour;
  face.colour.fillRect(0, 0, face.width, face.height);
  face.colour.restore();
};

/**
 * Lays a page's full and behind pictures over its paper, in order: full
 * ones edge to edge, behind ones washed with `paper` at `wash`. Returns the
 * framed ones, for the page to set where it frames pictures.
 */
const layPage = (
  face: Face,
  placed: readonly Placed[],
  paper: string,
  wash: number,
) => {
  const whole = { x: 0, y: 0, width: face.width, height: face.height };

  for (const each of placed) {
    if (each.fit === "frame") continue;

    cover(face.colour, each.picture, whole);

    if (each.fit === "behind") washed(face, paper, wash);
  }

  return placed.flatMap((each) => (each.fit === "frame" ? [each.picture] : []));
};

/** Whether a picture fills the front edge to edge, with the title over it. */
export const filled = (build: Build) =>
  picturesOn(build, "front").some((placed) => placed.fit === "fill");

/** What a design paints over the front once `frontPicture` has laid it. */
export interface FrontPicture {
  /** The pictures the design sets in its own frame, sharing it. */
  readonly framed: readonly Picture[];
  /** Whether the design's ornaments go on: not over a picture filling it or in its frame. */
  readonly ornaments: boolean;
}

/**
 * Lays the front's pictures under everything else when they fill the front
 * or sit behind the design, after the paper, in order. Filled, the front
 * darkens towards the foot so the title reads over it; behind, a picture is
 * washed with the paper's colour so the design prints over it as if on
 * tinted stock.
 */
export const frontPicture = (face: Face, build: Build): FrontPicture => {
  const placed = picturesOn(build, "front");
  const framed = layPage(face, placed, build.colours.paper, 0.74);

  if (!filled(build)) {
    return { framed, ornaments: framed.length === 0 };
  }

  const { colour, height } = face;
  const shade = colour.createLinearGradient(0, height * 0.4, 0, height);

  shade.addColorStop(0, "rgba(10, 8, 12, 0)");
  shade.addColorStop(0.55, "rgba(10, 8, 12, 0.42)");
  shade.addColorStop(1, "rgba(10, 8, 12, 0.72)");
  colour.fillStyle = shade;
  colour.fillRect(0, 0, face.width, height);

  return { framed, ornaments: false };
};

/** Paints on the colour canvas in `colour`, then on the foil in white. */
export const foiled = (
  face: Face,
  colour: string,
  draw: (paint: Paint) => void,
) => {
  face.colour.save();
  face.colour.strokeStyle = colour;
  face.colour.fillStyle = colour;
  draw(face.colour);
  face.colour.restore();
  face.foil.save();
  face.foil.strokeStyle = "#fff";
  face.foil.fillStyle = "#fff";
  draw(face.foil);
  face.foil.restore();
};

/**
 * The card's title, set in the design's display face and centred in a band
 * of the face: foiled, or printed in `ink` where foil would be too faint on
 * light stock, with `shadow` laying foil a little below and right of the ink.
 * Returns where its last line sits.
 */
export const title = (
  face: Face,
  build: Build,
  band: {
    readonly top: number;
    readonly largest: number;
    readonly italic?: boolean;
    readonly weight?: number;
    readonly ink?: string;
    readonly shadow?: number;
  },
) => {
  const { colour, width } = face;
  const textWidth = width * 0.78;
  const style = band.italic === true ? "italic" : "normal";
  const weight = band.weight ?? 500;

  const size = fitText(colour, build.card.front.title, {
    font: (pixels) => `${style} ${weight} ${pixels}px ${build.fonts.display}`,
    largest: band.largest,
    width: textWidth,
    lines: 3,
  });

  const lines = wrap(colour, build.card.front.title, textWidth);
  const lineHeight = size * 1.08;
  const font = colour.font;
  const overPicture = filled(build);

  // Over a full-bleed picture, the title sits low, in the shade at the foot
  const top = overPicture
    ? face.height * 0.84 - size - (lines.length - 1) * lineHeight
    : band.top;

  const ink = overPicture ? "#fbf7ef" : band.ink;
  const shadow = band.shadow ?? 0;

  if (ink === undefined || shadow > 0) {
    foiled(face, build.colours.foil, (paint) => {
      paint.font = font;
      centred(
        paint,
        lines,
        width / 2 + shadow,
        top + size + shadow,
        lineHeight,
      );
    });
  }

  if (ink !== undefined) {
    colour.save();
    colour.font = font;
    colour.fillStyle = ink;

    if (overPicture) {
      colour.shadowColor = "rgba(0, 0, 0, 0.45)";
      colour.shadowBlur = size * 0.18;
      colour.shadowOffsetY = size * 0.03;
    }

    centred(colour, lines, width / 2, top + size, lineHeight);
    colour.restore();
    // Ink printed over foil hides it there, so the foil only shows as a shadow
    face.foil.save();
    face.foil.globalCompositeOperation = "destination-out";
    face.foil.font = font;
    centred(face.foil, lines, width / 2, top + size, lineHeight);
    face.foil.restore();
  }

  return top + size + (lines.length - 1) * lineHeight;
};

/**
 * The pictures on the inside cover, painted after the design's own marks
 * there, in order: filling it edge to edge, washed pale behind, or framed in
 * its upper part with a fine foil rule, sharing the room.
 */
export const insidePicture = (face: Face, build: Build) => {
  const placed = picturesOn(build, "left");

  if (placed.length === 0) return;

  const { foil, width, height } = face;
  const framed = layPage(face, placed, build.colours.inside, 0.8);

  // The design's foil marks would shine through a picture filling the page
  if (placed.some((each) => each.fit === "fill")) {
    foil.save();
    foil.fillStyle = "#000";
    foil.fillRect(0, 0, width, height);
    foil.restore();
  }

  if (framed.length === 0) return;

  framePictures(
    face,
    build,
    framed,
    {
      x: width * 0.14,
      y: width * 0.14,
      width: width * 0.72,
      height: height * 0.6,
    },
    width * 0.004,
  );
};

/**
 * The message, written by hand: the greeting, the message and the sign-off
 * in the design's pen, each line set a touch off true as a real hand would.
 */
export const handwritten = (face: Face, build: Build) => {
  const { card, colours, fonts } = build;
  const { colour, width, height } = face;
  const unit = measure(face);
  const margin = unit * 0.12;
  const textWidth = width - margin * 2;
  const wobble = seeded(card.inside.message.length + 7);
  let y = height * 0.17;
  let lines = 13;

  fill(face, colours.inside);

  // Pictures behind the message are washed pale, so the pen still reads
  const placed = picturesOn(build, "right");
  const framed = layPage(face, placed, colours.inside, 0.8);

  // Over a picture filling the page, the words sit on a pale panel of paper
  if (placed.some((each) => each.fit === "fill")) {
    colour.save();
    colour.globalAlpha = 0.84;
    colour.fillStyle = colours.inside;
    colour.beginPath();
    colour.roundRect(
      margin * 0.5,
      margin * 0.5,
      width - margin,
      height - margin,
      margin * 0.3,
    );
    colour.fill();
    colour.restore();
  }

  // Framed pictures share a band at the top, and the words start under it
  if (framed.length > 0) {
    const band = {
      x: margin,
      y: margin,
      width: textWidth,
      height: height * 0.3,
    };

    framePictures(face, build, framed, band, width * 0.004);
    y = band.y + band.height + unit * 0.14;
    lines = 8;
  }

  colour.fillStyle = colours.pen;
  colour.textAlign = "left";
  colour.textBaseline = "alphabetic";

  const line = (text: string, x: number, at: number) => {
    colour.save();
    colour.translate(x, at + (wobble() - 0.5) * width * 0.006);
    colour.rotate((wobble() - 0.5) * 0.02);
    colour.fillText(text, 0, 0);
    colour.restore();
  };

  if (card.inside.to !== undefined) {
    colour.font = `600 ${Math.round(unit * 0.085)}px ${fonts.hand}`;
    line(card.inside.to, margin, y);
    y += unit * 0.12;
  }

  const size = fitText(colour, card.inside.message, {
    font: (pixels) => `500 ${pixels}px ${fonts.hand}`,
    largest: Math.round(unit * 0.074),
    width: textWidth,
    lines,
  });

  for (const text of wrap(colour, card.inside.message, textWidth)) {
    if (text !== "") line(text, margin + (wobble() - 0.5) * unit * 0.008, y);

    y += size * 1.22;
  }

  colour.font = `600 ${Math.round(unit * 0.095)}px ${fonts.hand}`;
  colour.textAlign = "right";
  line(
    card.inside.from,
    width - margin,
    Math.max(y + size * 0.6, height * 0.8),
  );
};

/** The back: the credits, small, and a foiled mark at the foot. */
export const back = (face: Face, build: Build) => {
  const { card, colours, fonts } = build;
  const { colour, width, height } = face;
  const size = Math.round(width * 0.024);
  const lines = credits(card).map((credit) => credit.text);

  fill(face, colours.paper);
  colour.fillStyle = colours.ink;
  colour.globalAlpha = 0.75;
  colour.font = `400 ${size}px ${fonts.display}`;
  centred(
    colour,
    lines,
    width / 2,
    height * 0.78 - lines.length * size * 1.5,
    size * 1.5,
  );
  colour.globalAlpha = 1;

  foiled(face, colours.foil, (paint) => {
    paint.font = `italic 500 ${Math.round(width * 0.034)}px ${fonts.display}`;
    centred(paint, ["Cardstock"], width / 2, height * 0.9, 0);
  });
};
