/**
 * Paper, as the renderer draws it. Faces are painted on offscreen canvases,
 * then lit as stock: their colour gently mottled, fibres raised by a fine
 * noise bump, and foil pressed into the paper, where it turns metallic, a
 * little brushed, and stands up at its edges so the light catches them.
 */
import {
  bumpMap,
  color,
  float,
  min,
  mix,
  mx_fractal_noise_float,
  mx_noise_float,
  positionLocal,
  smoothstep,
  texture,
  uv,
  vec2,
} from "three/tsl";
import {
  CanvasTexture,
  MeshStandardNodeMaterial,
  NoColorSpace,
  SRGBColorSpace,
  type Side,
  VideoTexture,
} from "three/webgpu";
import type { Paper } from "../designs/define.ts";
import type { PaintedFace } from "../designs/faces.ts";
import { placedVideo } from "../designs/paint.ts";

/** Slow, faint variation in the stock's colour, as real paper has. */
const mottle = mx_noise_float(positionLocal.xy.mul(3.5)).mul(0.035).add(1);

/** The fibres' height, fine and irregular. */
const fibres = mx_fractal_noise_float(positionLocal.xy.mul(70), 3, 2, 0.5);

export interface PaperOptions {
  readonly paper: Paper;
  readonly side?: Side;
}

/** Plain paper in one colour, such as a card's edge. */
export const plainPaper = (colour: string, { paper, side }: PaperOptions) => {
  const material = new MeshStandardNodeMaterial();

  material.colorNode = color(colour).mul(mottle);
  material.roughnessNode = float(paper.roughness);
  material.metalnessNode = float(0);
  material.normalNode = bumpMap(fibres, float(paper.grain * 0.012));

  if (side !== undefined) material.side = side;

  return material;
};

/**
 * What's printed on a face. A video shows wherever the design left the paper
 * clear for it, under anything painted over it, such as a wash or the title.
 */
const printing = (
  colourMap: CanvasTexture<OffscreenCanvas>,
  canvas: OffscreenCanvas,
) => {
  const painted = texture(colourMap);
  const placed = placedVideo(canvas);

  if (placed === undefined) {
    return { printed: painted.rgb.mul(mottle), videoMap: undefined };
  }

  const videoMap = new VideoTexture(placed.video);

  videoMap.colorSpace = SRGBColorSpace;

  const frame = texture(
    videoMap,
    uv()
      .mul(vec2(placed.scale[0], placed.scale[1]))
      .add(vec2(placed.offset[0], placed.offset[1])),
  );

  return {
    printed: mix(frame.rgb, painted.rgb.mul(mottle), painted.a),
    videoMap,
  };
};

/** A painted face of paper with its foil. */
export const facePaper = (
  face: PaintedFace,
  foilColour: string,
  { paper, side }: PaperOptions,
) => {
  const colourMap = new CanvasTexture(face.colourCanvas);
  const foilMap = new CanvasTexture(face.foilCanvas);

  colourMap.colorSpace = SRGBColorSpace;
  colourMap.anisotropy = 8;
  foilMap.colorSpace = NoColorSpace;
  foilMap.anisotropy = 8;

  const foil = texture(foilMap).r;
  const { printed, videoMap } = printing(colourMap, face.colourCanvas);
  // Brushing: noise stretched long one way and fine the other, kept faint
  const brushed = mx_noise_float(positionLocal.xy.mul(vec2(3, 160))).mul(0.03);

  // Paper darkens a touch at its very edge, so light stock reads on a light page
  const fromEdge = min(
    min(uv().x, uv().x.oneMinus()),
    min(uv().y, uv().y.oneMinus()),
  );

  const edge = mix(float(0.9), float(1), smoothstep(0, 0.012, fromEdge));
  const material = new MeshStandardNodeMaterial();

  material.colorNode = mix(printed, color(foilColour), foil).mul(edge);
  material.roughnessNode = mix(
    float(paper.roughness),
    float(0.3).add(brushed),
    foil,
  );
  material.metalnessNode = foil;
  // Foil is pressed in: it stands up from the fibres, so its edges catch light
  material.normalNode = bumpMap(
    fibres.mul(paper.grain * 0.35).add(foil.mul(0.9)),
    float(0.014),
  );

  if (side !== undefined) material.side = side;

  return {
    material,
    textures:
      videoMap === undefined
        ? [colourMap, foilMap]
        : [colourMap, foilMap, videoMap],
  };
};
