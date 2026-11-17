/**
 * An effect's particles: one sprite drawn many times over, with each one's
 * position kept in a GPU buffer that a TSL compute pass moves every frame.
 * They fall or rise through a box around the card, sway, spin and wrap round
 * from bottom to top, so they never run out. Their clock is their own, moved
 * by `tick`, so an export can step it frame by frame however long each frame
 * takes to draw.
 */
import {
  float,
  Fn,
  If,
  instancedArray,
  instanceIndex,
  mix,
  sin,
  smoothstep,
  texture,
  uniform,
  vec3,
} from "three/tsl";
import {
  CanvasTexture,
  Color,
  type ComputeNode,
  Sprite,
  SpriteNodeMaterial,
  SRGBColorSpace,
} from "three/webgpu";
import type { Effect } from "../effects/define.ts";

/** The space the particles move through, around the open card. */
export const particleBox = { width: 4.2, height: 3, depth: 0.9 } as const;

export interface Particles {
  readonly sprite: Sprite;
  /** Moves every particle by one frame, as far as the last `tick` says. */
  readonly step: ComputeNode;
  /** Moves the particles' clock on by `seconds`, before the next `step`. */
  readonly tick: (seconds: number) => void;
  readonly dispose: () => void;
}

/** Each particle's picture, in pixels. */
const spriteSize = 64;

export const particlesFor = (effect: Effect): Particles | undefined => {
  const { count } = effect;

  if (count === 0) return undefined;

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const tints = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const tint = new Color();

  for (let index = 0; index < count; index++) {
    const seed = Math.random();
    // A few drift in front of the card, more behind it, and none through it,
    // so they frame the card without covering the message
    const side = Math.random() < 0.35 ? 1 : -1;

    positions.set(
      [
        (Math.random() - 0.5) * particleBox.width,
        (Math.random() - 0.5) * particleBox.height,
        side * (0.3 + Math.random() * particleBox.depth),
      ],
      index * 3,
    );
    velocities.set([0, -effect.speed * (0.6 + seed * 0.8), 0], index * 3);
    tint.set(effect.colours[index % effect.colours.length] ?? "#ffffff");
    tints.set([tint.r, tint.g, tint.b], index * 3);
    seeds[index] = seed;
  }

  const position = instancedArray(positions, "vec3");
  const velocity = instancedArray(velocities, "vec3");
  const colour = instancedArray(tints, "vec3");
  const seed = instancedArray(seeds, "float");
  const half = particleBox.height / 2;
  const time = uniform(0);
  const deltaTime = uniform(0);

  const step = Fn(() => {
    const at = position.element(instanceIndex);
    const own = seed.element(instanceIndex);
    const sway = sin(time.mul(0.9).add(own.mul(6.2832))).mul(effect.drift);

    at.addAssign(
      velocity
        .element(instanceIndex)
        .add(vec3(sway, 0, 0))
        .mul(deltaTime),
    );

    If(at.y.lessThan(-half), () => {
      at.y.addAssign(particleBox.height);
    });

    If(at.y.greaterThan(half), () => {
      at.y.subAssign(particleBox.height);
    });
  })().compute(count);

  const canvas = new OffscreenCanvas(spriteSize, spriteSize);
  const paint = canvas.getContext("2d");

  if (paint !== null) effect.draw(paint, spriteSize);

  const spriteMap = new CanvasTexture(canvas);

  spriteMap.colorSpace = SRGBColorSpace;

  const look = texture(spriteMap);
  const ownSeed = seed.toAttribute();

  const material = new SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
  });

  const at = position.toAttribute();
  // Further back is fainter, as if through the air
  const nearness = mix(float(0.35), float(1), smoothstep(-1.2, 0.9, at.z));

  const glint = sin(time.mul(2.4).add(ownSeed.mul(40)))
    .mul(0.5)
    .add(0.5);

  material.positionNode = at;
  // Most are small and a few are large, as snow and confetti fall
  material.scaleNode = mix(
    float(effect.size[0]),
    float(effect.size[1]),
    ownSeed.pow(2.5),
  );
  material.rotationNode = time.mul(effect.spin).mul(ownSeed.sub(0.5).mul(2));
  material.colorNode = look.rgb.mul(colour.toAttribute());
  material.opacityNode = look.a.mul(nearness).mul(effect.twinkle ? glint : 1);

  const sprite = new Sprite(material);

  sprite.count = count;
  sprite.frustumCulled = false;

  return {
    sprite,
    step,
    tick: (seconds) => {
      time.value += seconds;
      deltaTime.value = seconds;
    },
    dispose: () => {
      material.dispose();
      spriteMap.dispose();
    },
  };
};
