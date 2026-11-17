/**
 * Fine line work the designs are drawn from: frames, a wreath with its bow,
 * sprigs, flourishes, linked rings, stars and liner patterns. Each draws with
 * the paint's current style, so the same drawing works in ink or in foil.
 * Scattered pieces use a seeded sequence, so a card looks the same every time.
 */
import type { Face, Paint } from "./define.ts";

/** A repeatable sequence of numbers from 0 to 1. */
export const seeded = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;

    return state / 2 ** 32;
  };
};

/** Two fine rules, one inside the other, `inset` pixels in from the edge. */
export const frame = (paint: Paint, face: Face, inset: number) => {
  paint.lineWidth = Math.max(2, face.width * 0.0032);
  paint.strokeRect(
    inset,
    inset,
    face.width - inset * 2,
    face.height - inset * 2,
  );
  paint.lineWidth = Math.max(1, face.width * 0.0014);

  const inner = inset + face.width * 0.014;

  paint.strokeRect(
    inner,
    inner,
    face.width - inner * 2,
    face.height - inner * 2,
  );
};

/**
 * One leaf, as an almond, its base at (x, y), pointing at `angle`: outlined
 * with its vein, or `filled` solid, to print in ink under a foil outline.
 */
export const leaf = (
  paint: Paint,
  x: number,
  y: number,
  length: number,
  angle: number,
  filled = false,
) => {
  const width = length * 0.36;

  paint.save();
  paint.translate(x, y);
  paint.rotate(angle);
  paint.beginPath();
  paint.moveTo(0, 0);
  paint.quadraticCurveTo(length * 0.5, -width, length, 0);
  paint.quadraticCurveTo(length * 0.5, width, 0, 0);

  if (filled) {
    paint.fill();
    paint.restore();

    return;
  }

  paint.stroke();
  paint.beginPath();
  paint.moveTo(length * 0.08, 0);
  paint.lineTo(length * 0.82, 0);
  paint.stroke();
  paint.restore();
};

/**
 * A ring of leaves, as a wreath: outlined, or filled in turn with `tones` to
 * print under the same wreath outlined in foil, since the same seed lays the
 * leaves out the same way. Returns where its berries could sit.
 */
export const wreath = (
  paint: Paint,
  x: number,
  y: number,
  radius: number,
  seed: number,
  tones?: readonly string[],
) => {
  const random = seeded(seed);
  const count = 88;
  const berries: [number, number][] = [];

  paint.lineWidth = Math.max(1.5, radius * 0.012);
  paint.lineJoin = "round";
  paint.lineCap = "round";

  for (let index = 0; index < count; index++) {
    const around = (index / count) * Math.PI * 2 + random() * 0.05;
    const reach = radius * (0.86 + random() * 0.28);
    const baseX = x + Math.cos(around) * reach;
    const baseY = y + Math.sin(around) * reach;
    // Leaves lean along the ring, alternately out and in
    const lean = around + Math.PI / 2 + (index % 2 === 0 ? 0.65 : -0.65);

    const length = radius * (0.22 + random() * 0.11);

    if (tones === undefined) {
      leaf(paint, baseX, baseY, length, lean);
    } else {
      paint.fillStyle = tones[index % tones.length] ?? "#000";
      leaf(paint, baseX, baseY, length, lean, true);
    }

    if (index % 9 === 4) {
      berries.push([
        x + Math.cos(around) * radius * 1.02,
        y + Math.sin(around) * radius * 1.02,
      ]);
    }
  }

  return berries;
};

/**
 * A ribbon bow, centred at (x, y): outlined, or `filled` as solid ribbon to
 * print under the same bow outlined in foil.
 */
export const bow = (
  paint: Paint,
  x: number,
  y: number,
  size: number,
  filled = false,
) => {
  paint.lineWidth = filled ? size * 0.16 : Math.max(1.5, size * 0.035);
  paint.lineCap = filled ? "butt" : "round";
  paint.lineJoin = "round";

  for (const side of [-1, 1]) {
    paint.beginPath();
    paint.moveTo(x, y);
    paint.bezierCurveTo(
      x + side * size * 0.9,
      y - size * 0.75,
      x + side * size * 1.05,
      y + size * 0.35,
      x,
      y,
    );

    if (filled) paint.fill();
    else paint.stroke();

    paint.beginPath();
    paint.moveTo(x, y);
    paint.bezierCurveTo(
      x + side * size * 0.2,
      y + size * 0.5,
      x + side * size * 0.45,
      y + size * 0.9,
      x + side * size * 0.6,
      y + size * 1.25,
    );
    paint.stroke();
  }

  paint.beginPath();
  paint.ellipse(x, y, size * 0.12, size * 0.1, 0, 0, Math.PI * 2);
  paint.fill();
};

/** A small sprig: a curved stem with leaves along it, rising from (x, y). */
export const sprig = (
  paint: Paint,
  x: number,
  y: number,
  size: number,
  angle: number,
) => {
  paint.save();
  paint.translate(x, y);
  paint.rotate(angle);
  paint.lineWidth = Math.max(1.5, size * 0.02);
  paint.lineCap = "round";
  paint.beginPath();
  paint.moveTo(0, 0);
  paint.quadraticCurveTo(size * 0.15, -size * 0.5, 0, -size);
  paint.stroke();

  for (let index = 1; index <= 4; index++) {
    const along = -size * index * 0.22;
    const side = index % 2 === 0 ? 1 : -1;

    leaf(paint, size * 0.05, along, size * 0.3, -Math.PI / 2 + side * 0.9);
  }

  paint.restore();
};

/** A short rule with a diamond in the middle, under a title. */
export const flourish = (paint: Paint, x: number, y: number, width: number) => {
  const half = width / 2;
  const diamond = width * 0.035;

  paint.lineWidth = Math.max(1, width * 0.006);
  paint.beginPath();
  paint.moveTo(x - half, y);
  paint.lineTo(x - diamond * 2, y);
  paint.moveTo(x + diamond * 2, y);
  paint.lineTo(x + half, y);
  paint.stroke();
  paint.beginPath();
  paint.moveTo(x, y - diamond);
  paint.lineTo(x + diamond, y);
  paint.lineTo(x, y + diamond);
  paint.lineTo(x - diamond, y);
  paint.closePath();
  paint.fill();
};

/** A five-pointed star, filled. */
export const star = (paint: Paint, x: number, y: number, size: number) => {
  paint.beginPath();

  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? size : size * 0.42;
    const angle = (point * Math.PI) / 5 - Math.PI / 2;

    paint.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }

  paint.closePath();
  paint.fill();
};

/** Two rings, linked, side by side. */
export const rings = (paint: Paint, x: number, y: number, radius: number) => {
  paint.lineWidth = radius * 0.09;

  for (const offset of [-0.55, 0.55]) {
    paint.beginPath();
    paint.arc(x + radius * offset, y, radius, 0, Math.PI * 2);
    paint.stroke();
  }
};

/** Confetti: small turned slips and dots, in the given colours. */
export const confetti = (
  paint: Paint,
  face: Face,
  colours: readonly string[],
  count: number,
  seed: number,
) => {
  const random = seeded(seed);

  for (let index = 0; index < count; index++) {
    const x = random() * face.width;
    const y = random() * face.height;
    const size = face.width * (0.008 + random() * 0.014);

    paint.fillStyle = colours[index % colours.length] ?? "#000";
    paint.save();
    paint.translate(x, y);
    paint.rotate(random() * Math.PI);

    if (index % 3 === 0) {
      paint.beginPath();
      paint.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      paint.fill();
    } else {
      paint.fillRect(-size, -size * 0.3, size * 2, size * 0.6);
    }

    paint.restore();
  }
};

/** A repeating pattern of small marks on a grid, as a liner's print. */
export const pattern = (
  paint: Paint,
  face: Face,
  spacing: number,
  mark: (paint: Paint, x: number, y: number) => void,
) => {
  for (let row = 0; row * spacing < face.height + spacing; row++) {
    const shift = row % 2 === 0 ? 0 : spacing / 2;

    for (let x = -spacing; x < face.width + spacing; x += spacing) {
      mark(paint, x + shift, row * spacing);
    }
  }
};
