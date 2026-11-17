/**
 * Painting a card in 2D: paper, set type, a cropped picture, the message as
 * if written by hand, and the credits on the back. Designs paint their own
 * fronts and liners with these, and most share the inside and the back.
 */
import { credits } from "../schema.ts";
import { sizeDimensions } from "../size.ts";
import type { Build, Face, MovingPicture, Paint, Picture } from "./define.ts";
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

/** Whether the front's picture fills it edge to edge, with the title over it. */
export const filled = (build: Build) =>
  build.image !== undefined && build.card.front.fit === "fill";

/** What a design paints over the front once `frontPicture` has laid it. */
export interface FrontPicture {
  /** The picture the design sets in its own frame, if it has one to frame. */
  readonly framed: Picture | undefined;
  /** Whether the design's ornaments go on: not over a full-bleed picture. */
  readonly ornaments: boolean;
}

/**
 * Lays the front's picture under everything else when it fills the front or
 * sits behind the design, after the paper. Filled, it darkens towards the
 * foot so the title reads over it; behind, it's washed with the paper's
 * colour so the design prints over it as if on tinted stock.
 */
export const frontPicture = (face: Face, build: Build): FrontPicture => {
  const { image } = build;
  const fit = build.card.front.fit ?? "frame";

  if (image === undefined || fit === "frame") {
    return { framed: image, ornaments: image === undefined };
  }

  const { colour, width, height } = face;

  cover(colour, image, { x: 0, y: 0, width, height });

  if (fit === "behind") {
    colour.save();
    colour.globalAlpha = 0.74;
    colour.fillStyle = build.colours.paper;
    colour.fillRect(0, 0, width, height);
    colour.restore();

    return { framed: undefined, ornaments: true };
  }

  const shade = colour.createLinearGradient(0, height * 0.4, 0, height);

  shade.addColorStop(0, "rgba(10, 8, 12, 0)");
  shade.addColorStop(0.55, "rgba(10, 8, 12, 0.42)");
  shade.addColorStop(1, "rgba(10, 8, 12, 0.72)");
  colour.fillStyle = shade;
  colour.fillRect(0, 0, width, height);

  return { framed: undefined, ornaments: false };
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
 * The inside picture on the inside cover, painted after the design's own
 * marks there: framed in its upper part with a fine foil rule, or filling it
 * edge to edge over everything. A picture behind the message is painted by
 * `handwritten` instead.
 */
export const insidePicture = (face: Face, build: Build) => {
  const image = build.insideImage;
  const fit = build.card.inside.fit ?? "frame";

  if (image === undefined || fit === "behind") return;

  const { colour, foil, width, height } = face;

  if (fit === "fill") {
    cover(colour, image, { x: 0, y: 0, width, height });
    foil.save();
    foil.fillStyle = "#000";
    foil.fillRect(0, 0, width, height);
    foil.restore();

    return;
  }

  const box = {
    x: width * 0.14,
    y: width * 0.14,
    width: width * 0.72,
    height: height * 0.6,
  };

  cover(colour, image, box);
  foiled(face, build.colours.foil, (paint) => {
    paint.lineWidth = width * 0.004;
    paint.strokeRect(
      box.x - width * 0.012,
      box.y - width * 0.012,
      box.width + width * 0.024,
      box.height + width * 0.024,
    );
  });
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

  fill(face, colours.inside);

  // A picture behind the message is washed pale, so the pen still reads
  if (build.insideImage !== undefined && card.inside.fit === "behind") {
    cover(colour, build.insideImage, { x: 0, y: 0, width, height });
    colour.save();
    colour.globalAlpha = 0.8;
    colour.fillStyle = colours.inside;
    colour.fillRect(0, 0, width, height);
    colour.restore();
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
    lines: 13,
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
