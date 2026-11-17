/**
 * The full view in the scene: a sheet that fills the camera's view, hung just
 * in front of it and drawn over the card, so it fades in over the card as the
 * card comes towards you. The effect's particles are drawn after it, so they
 * still fall in front. It's painted with `paintFullView` at the size it's
 * drawn; a video shows wherever the painting leaves room for it, as it does
 * on the paper.
 */
import { mix, texture, uniform, uv } from "three/tsl";
import {
  CanvasTexture,
  Mesh,
  MeshBasicNodeMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Vector2,
  VideoTexture,
} from "three/webgpu";
import type { Build } from "../designs/define.ts";
import { paintFullView } from "../designs/full.ts";
import { placedVideo } from "../designs/paint.ts";

/** How far in front of the camera the sheet hangs. */
const depth = 0.5;

/** The longest side the sheet is painted at, in pixels. */
const largest = 2560;

/** A texture on a new canvas, since a texture keeps the size it's made at. */
const fresh = (width: number, height: number) => {
  const map = new CanvasTexture(new OffscreenCanvas(width, height));

  map.colorSpace = SRGBColorSpace;

  return map;
};

export const buildFullView = (camera: PerspectiveCamera, build: Build) => {
  let colourMap = fresh(2, 2);

  const painted = texture(colourMap);
  const fade = uniform(0);
  const videoScale = uniform(new Vector2(1, 1));
  const videoOffset = uniform(new Vector2(0, 0));
  const picture = build.insideImage ?? build.image;

  const videoMap =
    picture !== undefined && "video" in picture
      ? new VideoTexture(picture.video)
      : undefined;

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  material.toneMapped = false;

  if (videoMap === undefined) {
    material.colorNode = painted.rgb;
    material.opacityNode = painted.a.mul(fade);
  } else {
    videoMap.colorSpace = SRGBColorSpace;

    const frame = texture(videoMap, uv().mul(videoScale).add(videoOffset));

    material.colorNode = mix(frame.rgb, painted.rgb, painted.a);
    material.opacityNode = fade;
  }

  const geometry = new PlaneGeometry(1, 1);
  const sheet = new Mesh(geometry, material);

  sheet.visible = false;
  sheet.renderOrder = 1;
  sheet.position.set(0, 0, -depth);
  camera.add(sheet);

  /** Paints it for a `width` by `height` CSS pixel view, and sizes it to fill it. */
  const fit = (width: number, height: number, pixelRatio: number) => {
    const scale = Math.min(
      pixelRatio,
      largest / Math.max(width * pixelRatio, height * pixelRatio, 1),
    );

    const next = fresh(
      Math.max(Math.round(width * scale), 2),
      Math.max(Math.round(height * scale), 2),
    );

    const canvas = next.image;
    const paint = canvas.getContext("2d");

    if (paint === null) return;

    paintFullView(paint, build, canvas.width, canvas.height);
    colourMap.dispose();
    colourMap = next;
    painted.value = next;

    const placed = placedVideo(canvas);

    if (placed !== undefined) {
      videoScale.value.set(placed.scale[0], placed.scale[1]);
      videoOffset.value.set(placed.offset[0], placed.offset[1]);
    }

    const tall = 2 * depth * Math.tan((camera.fov * Math.PI) / 360);

    sheet.scale.set(tall * (width / height), tall, 1);
  };

  /** Shows it `amount` of the way in, from 0 (hidden) to 1. */
  const show = (amount: number) => {
    fade.value = amount;
    sheet.visible = amount > 0;
  };

  const dispose = () => {
    camera.remove(sheet);
    geometry.dispose();
    material.dispose();
    colourMap.dispose();
    videoMap?.dispose();
  };

  return { fit, show, videoMap, dispose };
};
