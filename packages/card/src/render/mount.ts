/**
 * Mounts a card on a canvas, live: the card's scene, drawn every frame. A
 * tap moves the card to its next stage; once it's open, a drag turns it. The
 * card always plays in full: the motion is the point of it. Everything is
 * released when the mount's scope closes.
 */
import { Effect } from "effect";
import { buildCardScene, type SceneOptions } from "./scene.ts";
import { type CardStage, nextStage, stagesFor } from "./timeline.ts";
import type { Card } from "../schema.ts";

export { RenderError } from "./scene.ts";

export interface MountOptions extends SceneOptions {
  /** Called as the card reaches each stage, such as to play a sound. */
  readonly onStage?: (stage: CardStage) => void;
}

export interface CardView {
  /** Which GPU API is drawing it. */
  readonly backend: "webgpu" | "webgl";
  /** The stages it passes through, in order, by how it opens. */
  readonly stages: readonly CardStage[];
  readonly stage: () => CardStage;
  /** Moves to the next stage, as a tap does. */
  readonly advance: () => CardStage;
  /** Jumps straight to a stage, without playing the way there. */
  readonly seek: (stage: CardStage) => void;
  /** Plays to a stage, backwards too, such as an editor showing the inside. */
  readonly playTo: (stage: CardStage) => void;
}

/** A press that moves less than this is a tap, not a drag. */
const tapSlop = 8;

export const mountCard = Effect.fnUntraced(function* (
  canvas: HTMLCanvasElement,
  card: Card,
  options: MountOptions = {},
) {
  const scene = yield* buildCardScene(canvas, card, options);
  const { stage, timeline, opening } = scene;

  const fit = () => {
    scene.fit(
      Math.max(canvas.clientWidth, 1),
      Math.max(canvas.clientHeight, 1),
    );
  };

  const resize = new ResizeObserver(fit);

  resize.observe(canvas);
  fit();

  const order: readonly CardStage[] = stagesFor[opening];

  let current: CardStage = stagesFor[opening][0];

  /** Whether this card passes through `stage`, as a card that never opens has no `open`. */
  const ownStage = (stage: CardStage) => order.includes(stage);

  // Turning: a drag sets where the card should face, and it eases there
  const aim = { x: 0, y: 0 };

  /** A move waiting for the card to turn back flat before it plays. */
  let afterFlat: (() => void) | undefined;

  /** How near facing you counts as flat, in radians. */
  const flatEnough = 0.02;

  /**
   * Turns the card back to face you, the short way round, then runs `then`;
   * at once when it's already flat or `now` asks, as seeking does.
   */
  const straighten = (then: () => void, now = false) => {
    aim.x = 0;
    aim.y = 0;

    const { rotation } = stage.turn;

    rotation.y -= Math.PI * 2 * Math.round(rotation.y / (Math.PI * 2));

    if (now) {
      rotation.x = 0;
      rotation.y = 0;
    }

    if (Math.max(Math.abs(rotation.x), Math.abs(rotation.y)) < flatEnough) {
      afterFlat = undefined;
      then();

      return;
    }

    afterFlat = then;
  };

  const advance = () => {
    const next = nextStage(current, opening);

    if (next === current) return current;

    current = next;
    straighten(() => {
      timeline.tweenTo(next);
      options.onStage?.(next);
    });

    return current;
  };

  let press: { x: number; y: number; aimX: number; aimY: number } | undefined;

  const onDown = (event: PointerEvent) => {
    press = { x: event.clientX, y: event.clientY, aimX: aim.x, aimY: aim.y };
    canvas.setPointerCapture(event.pointerId);
  };

  const onMove = (event: PointerEvent) => {
    if (press === undefined || current !== "open") return;

    aim.y =
      press.aimY +
      ((event.clientX - press.x) / canvas.clientWidth) * Math.PI * 2;
    aim.x = Math.min(
      0.5,
      Math.max(
        -0.5,
        press.aimX +
          ((event.clientY - press.y) / canvas.clientHeight) * Math.PI,
      ),
    );
  };

  const onUp = (event: PointerEvent) => {
    if (press === undefined) return;

    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);

    press = undefined;

    if (moved < tapSlop) advance();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    advance();
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("keydown", onKey);

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      resize.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("keydown", onKey);
    }),
  );

  let last: number | undefined;

  yield* Effect.promise(() =>
    scene.renderer.setAnimationLoop((now) => {
      stage.turn.rotation.y += (aim.y - stage.turn.rotation.y) * 0.12;
      stage.turn.rotation.x += (aim.x - stage.turn.rotation.x) * 0.12;

      const waiting = afterFlat;

      if (
        waiting !== undefined &&
        Math.max(
          Math.abs(stage.turn.rotation.x),
          Math.abs(stage.turn.rotation.y),
        ) < flatEnough
      ) {
        afterFlat = undefined;
        stage.turn.rotation.set(0, 0, 0);
        waiting();
      }

      // A frame after a long pause, such as a hidden tab, moves on one frame
      const step = last === undefined ? 0 : Math.min((now - last) / 1000, 0.1);

      last = now;
      scene.draw(now / 1000, step);
    }),
  );

  return {
    backend: scene.backend,
    stages: order,
    stage: () => current,
    advance,
    seek: (next) => {
      if (!ownStage(next)) return;

      current = next;
      straighten(() => {
        timeline.seek(next);
      }, true);
    },
    playTo: (next) => {
      if (!ownStage(next)) return;

      current = next;
      straighten(() => {
        timeline.tweenTo(next);
      });
    },
  } satisfies CardView;
});
