/**
 * The page behind the card: a picture or looping video filling it, as the
 * viewer, the editor's preview and the exports all show it. It's dimmed a
 * little, the same on a page as in a saved file, so the card stands out.
 */
import type { MovingPicture, Picture } from "../designs/define.ts";
import type { Card } from "../schema.ts";

/** How bright the background shows, so the card in front stands out. */
const brightness = 0.7;

const isMoving = (picture: Picture): picture is MovingPicture =>
  "video" in picture;

/** The card's background, decoded, if it has one. */
export const backdropOf = (
  card: Card,
  images: ReadonlyMap<string, Picture> | undefined,
) => (card.background === undefined ? undefined : images?.get(card.background));

/** Paints `picture` over a `width` by `height` canvas, cropping what overflows. */
export const paintBackdrop = (
  paint: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  picture: Picture,
  width: number,
  height: number,
) => {
  const scale = Math.max(width / picture.width, height / picture.height);
  const drawnWidth = picture.width * scale;
  const drawnHeight = picture.height * scale;

  paint.drawImage(
    isMoving(picture) ? picture.video : picture,
    (width - drawnWidth) / 2,
    (height - drawnHeight) / 2,
    drawnWidth,
    drawnHeight,
  );
  paint.fillStyle = `rgb(0 0 0 / ${1 - brightness})`;
  paint.fillRect(0, 0, width, height);
};

/**
 * Shows `picture` filling `container`, behind everything else in it, until
 * the returned function takes it away. A video plays on as it is, so the
 * same one can be on the card too.
 */
export const showBackdrop = (container: HTMLElement, picture: Picture) => {
  const element = isMoving(picture)
    ? picture.video
    : document.createElement("canvas");

  if (element instanceof HTMLCanvasElement && !isMoving(picture)) {
    element.width = picture.width;
    element.height = picture.height;
    element.getContext("2d")?.drawImage(picture, 0, 0);
  }

  element.classList.add("card-backdrop");
  element.setAttribute("aria-hidden", "true");
  Object.assign(element.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: `brightness(${brightness})`,
    pointerEvents: "none",
  });
  container.prepend(element);

  return () => {
    element.remove();
  };
};
