/**
 * The card in 3D, as its own entry so only the app and the exports load
 * three.js: `mountCard` with its stages, and the designs and effects it draws
 * with.
 */
export * from "../designs/index.ts";

export * from "../effects/index.ts";

export {
  type CardView,
  type MountOptions,
  mountCard,
  RenderError,
  type StageDirection,
} from "./mount.ts";

export { type CardStage, nextStage, stages, stagesFor } from "./timeline.ts";

export { loadVideo } from "./video.ts";

export { backdropOf, showBackdrop } from "./backdrop.ts";
