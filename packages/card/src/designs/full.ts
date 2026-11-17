/**
 * A card's full view: its message filling the screen, over its picture or
 * video, as a card that grows, a letter or a page shows it. It's painted for
 * the screen it's on, so its type stays sharp on a phone and a wide monitor
 * alike. Every design shares it, in the design's own colours and fonts.
 */
import type { Build, Paint } from "./define.ts";
import { cover, fitText, leadPicture, wrap } from "./paint.ts";

/** How dark the wash over a picture is, so white type reads on any photo. */
const wash = 0.42;

/**
 * Paints the full view over a `width` by `height` canvas. The inside picture
 * fills it, or the front's; without either, it's the card's paper, or left
 * clear over a page background so that shows through.
 */
export const paintFullView = (
  paint: Paint,
  build: Build,
  width: number,
  height: number,
) => {
  const { card, colours, fonts } = build;
  const picture = leadPicture(build);
  const unit = Math.min(width, height * 0.8);
  const column = Math.min(width * 0.84, unit * 0.92);
  const onPicture = picture !== undefined || card.background !== undefined;

  paint.clearRect(0, 0, width, height);

  if (picture !== undefined) {
    cover(paint, picture, { x: 0, y: 0, width, height });
  }

  if (onPicture) {
    // Darker towards the middle, where the words are
    const shade = paint.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.hypot(width, height) / 2,
    );

    shade.addColorStop(0, `rgb(0 0 0 / ${wash + 0.12})`);
    shade.addColorStop(1, `rgb(0 0 0 / ${wash - 0.12})`);
    paint.fillStyle = shade;
  } else {
    // The card's own paper, edged with its printed outside like a mat
    const edge = unit * 0.028;

    const shade = paint.createRadialGradient(
      width / 2,
      height * 0.45,
      Math.min(width, height) * 0.3,
      width / 2,
      height / 2,
      Math.hypot(width, height) / 2,
    );

    shade.addColorStop(0, "rgb(0 0 0 / 0)");
    shade.addColorStop(1, "rgb(0 0 0 / 0.1)");
    paint.fillStyle = colours.paper;
    paint.fillRect(0, 0, width, height);
    paint.fillStyle = colours.inside;
    paint.fillRect(edge, edge, width - edge * 2, height - edge * 2);
    paint.fillStyle = shade;
  }

  paint.fillRect(0, 0, width, height);

  // Printed on the inside in the pen, which always reads on the inside paper
  const pen = onPicture ? "#fff" : colours.pen;

  paint.textBaseline = "alphabetic";
  paint.shadowColor = onPicture ? "rgb(0 0 0 / 0.45)" : "transparent";
  paint.shadowBlur = onPicture ? unit * 0.02 : 0;

  // The words, measured first so the block sits in the middle
  const titleSize = fitText(paint, card.front.title, {
    font: (pixels) => `600 ${pixels}px ${fonts.display}`,
    largest: Math.round(unit * 0.07),
    width: column,
    lines: 2,
  });

  const titleLines =
    card.front.title === "" ? [] : wrap(paint, card.front.title, column);

  const toSize = Math.round(unit * 0.065);

  const messageSize = fitText(paint, card.inside.message, {
    font: (pixels) => `500 ${pixels}px ${fonts.hand}`,
    largest: Math.round(unit * 0.085),
    width: column,
    lines: 9,
  });

  const messageLines = wrap(paint, card.inside.message, column);
  const fromSize = Math.round(unit * 0.075);
  const titleHeight = titleLines.length * titleSize * 1.15;
  const gap = unit * 0.07;

  const blockHeight =
    (titleHeight === 0 ? 0 : titleHeight + gap) +
    (card.inside.to === undefined ? 0 : toSize * 1.5) +
    messageLines.length * messageSize * 1.25 +
    fromSize * 1.9;

  const left = (width - column) / 2;
  let y = Math.max(unit * 0.08, (height - blockHeight) / 2);

  paint.textAlign = "center";
  paint.fillStyle = pen;
  paint.font = `600 ${titleSize}px ${fonts.display}`;

  for (const line of titleLines) {
    y += titleSize;
    paint.fillText(line, width / 2, y);
    y += titleSize * 0.15;
  }

  if (titleLines.length > 0) {
    paint.fillStyle = onPicture ? "rgb(255 255 255 / 0.7)" : colours.accent;
    paint.fillRect(width / 2 - unit * 0.05, y + gap * 0.45, unit * 0.1, 2);
    y += gap;
  }

  paint.textAlign = "left";
  paint.fillStyle = pen;

  if (card.inside.to !== undefined) {
    paint.font = `600 ${toSize}px ${fonts.hand}`;
    y += toSize;
    paint.fillText(card.inside.to, left, y);
    y += toSize * 0.5;
  }

  paint.font = `500 ${messageSize}px ${fonts.hand}`;
  paint.textAlign = "center";

  for (const line of messageLines) {
    y += messageSize * 1.25;
    paint.fillText(line, width / 2, y);
  }

  paint.font = `600 ${fromSize}px ${fonts.hand}`;
  paint.textAlign = "right";
  paint.fillText(card.inside.from, left + column, y + fromSize * 1.6);
  paint.shadowColor = "transparent";
};
