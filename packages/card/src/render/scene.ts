/**
 * A card's scene, ready to draw: its faces painted with its design, the
 * paper and envelope, the light, its effect's particles and a camera, on
 * three's WebGPURenderer, which falls back to WebGL 2 by itself. The live
 * card and the exports both draw with it: the live card from its animation
 * loop, the exports one fixed step at a time. Everything is released when
 * the scope closes.
 */
import { Effect, Schema } from "effect";
import {
  NeutralToneMapping,
  PerspectiveCamera,
  VSMShadowMap,
  WebGPURenderer,
} from "three/webgpu";
import {
  buildFor,
  coloursOf,
  designs,
  type Picture,
} from "../designs/index.ts";
import { blankFaces } from "../designs/faces.ts";
import { effects } from "../effects/index.ts";
import type { Card } from "../schema.ts";
import { type Dimensions, dimensionsOf } from "../size.ts";
import { backdropOf } from "./backdrop.ts";
import { roomLight } from "./environment.ts";
import { loadCardFonts } from "./fonts.ts";
import { buildFullView } from "./full-view.ts";
import { particlesFor } from "./particles.ts";
import { buildStage } from "./stage.ts";
import { buildTimeline, type FullView } from "./timeline.ts";
import { holdVideo } from "./video.ts";

export class RenderError extends Schema.TaggedError<RenderError>()(
  "RenderError",
  {
    reason: Schema.String,
  },
) {}

export interface SceneOptions {
  /** The card's pictures, decoded, by media id. */
  readonly images?: ReadonlyMap<string, Picture> | undefined;
  /** Draws with WebGL 2 even where WebGPU is there, to check the fallback. */
  readonly forceWebGL?: boolean;
}

/** What the camera keeps in view, in the scene's units. */
export interface Framing {
  readonly width: number;
  readonly height: number;
}

/** The open card, with room around it: 2.5 by 1.9 for the portrait card. */
export const wholeCard = (size: Dimensions): Framing => ({
  width: size.width * 2 + 0.5,
  height: size.height + 0.5,
});

/** The closed card alone, filling the frame, for a still of its front. */
export const frontOnly = (size: Dimensions): Framing => ({
  width: size.width * 1.12,
  height: size.height * 1.12,
});

export const buildCardScene = Effect.fnUntraced(function* (
  canvas: HTMLCanvasElement,
  card: Card,
  options: SceneOptions = {},
) {
  const design = designs[card.design];
  const size = dimensionsOf(card);
  const backdrop = backdropOf(card, options.images);

  yield* loadCardFonts;

  const faces = blankFaces(size);
  const colours = coloursOf(card);
  const build = buildFor(card, options.images);
  const opening = card.opening ?? "card";

  design.build(faces, build);

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    forceWebGL: options.forceWebGL ?? false,
  });

  yield* Effect.tryPromise({
    try: () => renderer.init(),
    catch: (cause) =>
      new RenderError({ reason: `No GPU to draw with: ${String(cause)}` }),
  });

  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;

  const stage = buildStage(design, colours, faces, size);
  const environment = roomLight(renderer);

  stage.scene.environment = environment.texture;
  stage.scene.environmentIntensity = 0.75;

  const particles = particlesFor(effects[card.effect]);

  if (particles !== undefined) {
    // Drawn after the full view, so it falls in front of that too
    particles.sprite.renderOrder = 2;
    stage.scene.add(particles.sprite);
  }

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  const full: FullView = { progress: 0 };
  const timeline = buildTimeline({ ...stage, full }, size, opening);
  const sheet = opening === "card" ? undefined : buildFullView(camera, build);

  // The full view hangs in front of the camera, so the camera joins the scene
  stage.scene.add(camera);

  let distance = 5;

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      void renderer.setAnimationLoop(null);
      timeline.kill();
      particles?.dispose();
      sheet?.dispose();
      environment.dispose();
      stage.dispose();
      void renderer.dispose();
    }),
  );

  /** Sizes the drawing to `width` by `height` CSS pixels, keeping `framing` in view. */
  const fit = (
    width: number,
    height: number,
    framing: Framing = wholeCard(size),
    pixelRatio = Math.min(devicePixelRatio, 2),
  ) => {
    const slope = Math.tan((camera.fov * Math.PI) / 360);

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    distance = Math.max(
      framing.height / 2 / slope,
      framing.width / 2 / (slope * camera.aspect),
    );
    camera.updateProjectionMatrix();
    sheet?.fit(width, height, pixelRatio);
  };

  /**
   * Moves the card on into its full view, by how far the timeline has it:
   * the card comes towards the camera as the full view fades in over it,
   * and it's gone, envelope and all, once that's all there is.
   */
  const grow = () => {
    if (sheet === undefined) return;

    const { progress } = full;
    const there = progress >= 1;

    stage.card.position.z = progress * progress * distance * 0.55;
    stage.turn.visible = !there;
    stage.envelope.visible = !there;
    sheet.show(Math.min(Math.max((progress - 0.15) / 0.6, 0), 1));
  };

  /**
   * Draws a frame at `seconds` since the card was shown, with the particles
   * moved on by `step` seconds since the last one.
   */
  const draw = (seconds: number, step: number) => {
    // The camera drifts a little, so the paper and foil catch the light as
    // they would in a hand; the whole scene moves together, so nothing clips
    camera.position.set(
      Math.sin((seconds * 1000) / 1900) * distance * 0.05,
      Math.cos((seconds * 1000) / 2700) * distance * 0.025,
      distance,
    );
    camera.lookAt(0, 0, 0);
    grow();

    if (particles !== undefined) {
      particles.tick(step);
      void renderer.compute(particles.step);
    }

    renderer.render(stage.scene, camera);
  };

  /** Builds every shader before the first frame, so none is drawn half made. */
  const ready = Effect.promise(() =>
    renderer.compileAsync(stage.scene, camera),
  );

  /**
   * Holds every video on the frame `seconds` in, the background's too, so an
   * export draws the same card each time, however fast the device decodes.
   */
  const holdVideos = (seconds: number) =>
    Effect.promise(async () => {
      const moving = backdrop !== undefined && "video" in backdrop;

      await Promise.all(
        stage.videos.map(async (map) => {
          await holdVideo(map.image, seconds);
          map.needsUpdate = true;
        }),
      );

      if (sheet?.videoMap !== undefined) sheet.videoMap.needsUpdate = true;

      if (moving) await holdVideo(backdrop.video, seconds);
    });

  const backend: "webgpu" | "webgl" =
    "isWebGPUBackend" in renderer.backend ? "webgpu" : "webgl";

  return {
    backend,
    renderer,
    stage,
    timeline,
    size,
    /** How the card opens, so a viewer knows its stages. */
    opening,
    fit,
    draw,
    ready,
    holdVideos,
    /** The picture or video behind the card, if it has one. */
    backdrop,
  };
});

export type CardScene = Effect.Success<ReturnType<typeof buildCardScene>>;
