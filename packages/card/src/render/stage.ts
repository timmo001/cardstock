/**
 * The scene: an envelope with a printed pocket, a lined inside and a rounded
 * flap, and the card inside it, two panels joined at a
 * hinge on the left. Behind them, a backdrop that only shows their shadows,
 * so the card stands in front of the page it's on. Sizes are in scene units,
 * from the card's size, with the portrait card 1 wide and 1.4 tall; the
 * envelope is a little larger than the card all round. `turn` holds the card
 * so a drag can turn it about its middle once it's open.
 */
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  HemisphereLight,
  type Material,
  Mesh,
  PlaneGeometry,
  Scene,
  ShadowNodeMaterial,
  type Side,
  type Texture,
  VideoTexture,
} from "three/webgpu";
import type { Colours, Design } from "../designs/define.ts";
import {
  blankFace,
  type PaintedFace,
  type PaintedFaces,
} from "../designs/faces.ts";
import type { Dimensions } from "../size.ts";
import { facePaper, plainPaper } from "./paper.ts";

/** How thick the card's stock is, in scene units. */
export const thickness = 0.006;

/** Where the closed flap and the open one sit, in front of and behind the card. */
export const flapDepth = { closed: 0.022, open: -0.02 } as const;

/**
 * The envelope for a card of `size`: 0.12 larger each way, with a flap that
 * reaches about halfway down, shorter on a wide envelope.
 */
export const envelopeFor = (size: Dimensions) => {
  const width = size.width + 0.12;
  const height = size.height + 0.12;

  return { width, height, flap: Math.min(width * 0.625, height * 0.46) };
};

type Envelope = ReturnType<typeof envelopeFor>;

export interface Stage {
  readonly scene: Scene;
  readonly envelope: Group;
  /** The flap's hinge along the envelope's top edge. */
  readonly flap: Group;
  readonly turn: Group;
  readonly card: Group;
  /** The front cover's hinge along the card's left edge. */
  readonly hinge: Group;
  /** The videos on the card's faces, if it has any. */
  readonly videos: readonly VideoTexture[];
  readonly dispose: () => void;
}

const edges = (envelope: Envelope) => ({
  left: -envelope.width / 2,
  right: envelope.width / 2,
  top: envelope.height / 2,
  bottom: -envelope.height / 2,
});

/**
 * A flat piece of paper from its corners and the triangles between them,
 * each anticlockwise from the front. Its texture spans the envelope's width,
 * and `height` from `base` up.
 */
const flat = (
  envelope: Envelope,
  corners: readonly (readonly [number, number])[],
  triangles: readonly (readonly [number, number, number])[],
  base: number,
  height: number,
) => {
  const { left } = edges(envelope);
  const geometry = new BufferGeometry();

  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      corners.flatMap(([x, y]) => [x, y, 0]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(
      corners.flatMap(([x, y]) => [
        (x - left) / envelope.width,
        (y - base) / height,
      ]),
      2,
    ),
  );
  geometry.setIndex(triangles.flat());
  geometry.computeVertexNormals();

  return geometry;
};

/** The flap's outline: straight sides meeting in a softly rounded point. */
const flapCorners = (envelope: Envelope) => {
  const { left, right } = edges(envelope);

  const corners: [number, number][] = [
    [0, 0],
    [right, 0],
  ];

  const round = 0.16;
  const steps = 12;
  // Where the straight edges stop and the rounding starts
  const start: [number, number] = [right * round, envelope.flap * (1 - round)];
  const end: [number, number] = [left * round, envelope.flap * (1 - round)];

  // A quadratic curve from `start` to `end`, pulled towards the point
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const inverse = 1 - t;

    corners.push([
      inverse * inverse * start[0] + t * t * end[0],
      inverse * inverse * start[1] +
        2 * inverse * t * envelope.flap +
        t * t * end[1],
    ]);
  }

  corners.push([left, 0]);

  return corners;
};

/** Triangles fanning out from the first corner, for a convex outline. */
const fan = (count: number) =>
  Array.from(
    { length: count - 2 },
    (_, index) => [0, index + 1, index + 2] as const,
  );

/** The back of the envelope as it's seen: its colour, with the folded seams. */
const paintPocket = (envelope: Envelope, colour: string) => {
  const face = blankFace(
    1024,
    Math.round((1024 * envelope.height) / envelope.width),
  );

  const { colour: paint, width, height } = face;
  const seam = height * 0.47;

  paint.fillStyle = colour;
  paint.fillRect(0, 0, width, height);

  // The bottom flap lies over the sides: a soft shadow along its edges
  const shade = paint.createLinearGradient(
    0,
    seam - height * 0.04,
    0,
    seam + height * 0.1,
  );

  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.07)");
  paint.fillStyle = shade;
  paint.beginPath();
  paint.moveTo(0, height);
  paint.lineTo(width / 2, seam);
  paint.lineTo(width, height);
  paint.fill();
  paint.strokeStyle = "rgba(0, 0, 0, 0.22)";
  paint.lineWidth = 3;
  paint.beginPath();
  paint.moveTo(0, height);
  paint.lineTo(width / 2, seam);
  paint.lineTo(width, height);
  paint.stroke();

  return face;
};

/**
 * The flap's outside: its colour, a little lighter towards the point where it
 * lifts to the light, with a fine dark edge so it reads against the pocket.
 */
const paintFlap = (envelope: Envelope, colour: string) => {
  const face = blankFace(
    1024,
    Math.round((1024 * envelope.flap) / envelope.width),
  );

  const { colour: paint, width, height } = face;
  const { left } = edges(envelope);

  // The texture's bottom is the hinge and its top the point
  const toCanvas = ([x, y]: readonly [number, number]) =>
    [
      ((x - left) / envelope.width) * width,
      (1 - y / envelope.flap) * height,
    ] as const;

  paint.fillStyle = colour;
  paint.fillRect(0, 0, width, height);

  const sheen = paint.createLinearGradient(0, height, 0, 0);

  sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0.07)");
  paint.fillStyle = sheen;
  paint.fillRect(0, 0, width, height);
  paint.strokeStyle = "rgba(0, 0, 0, 0.3)";
  paint.lineWidth = 5;
  paint.lineJoin = "round";
  paint.beginPath();

  for (const [index, corner] of flapCorners(envelope).slice(1).entries()) {
    const [x, y] = toCanvas(corner);

    if (index === 0) paint.moveTo(x, y);
    else paint.lineTo(x, y);
  }

  paint.stroke();

  return face;
};

export const buildStage = (
  design: Design,
  colours: Colours,
  faces: PaintedFaces,
  card: Dimensions,
): Stage => {
  const envelope = envelopeFor(card);
  const { left, right, top, bottom } = edges(envelope);
  const scene = new Scene();
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const geometries: BufferGeometry[] = [];
  const options = { paper: design.paper };

  const painted = (face: PaintedFace, side?: Side) => {
    const made = facePaper(
      face,
      colours.foil,
      side === undefined ? options : { ...options, side },
    );

    materials.push(made.material);
    textures.push(...made.textures);

    return made.material;
  };

  const plain = (colour: string, side?: Side) => {
    const material = plainPaper(
      colour,
      side === undefined ? options : { ...options, side },
    );

    materials.push(material);

    return material;
  };

  // Light: a soft key from the upper left, a fill from the sky, and a cool
  // rim from behind that edges the card as it turns
  const key = new DirectionalLight("#fff7ee", 2.1);

  key.position.set(-1.6, 2.2, 3);
  key.castShadow = true;
  // A small map blurred wide gives the soft shadow of a window, not a lamp
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 22;
  key.shadow.blurSamples = 24;
  key.shadow.bias = -0.0006;
  Object.assign(key.shadow.camera, {
    left: -2.5,
    right: 2.5,
    top: 2.5,
    bottom: -2.5,
    near: 0.5,
    far: 10,
  });

  const rim = new DirectionalLight("#dbe6ff", 0.9);

  rim.position.set(2.4, 1.2, -2);
  scene.add(key, rim, new HemisphereLight("#f6f3ff", "#6b5a4e", 0.85));

  // The backdrop only shows shadows, so the card casts one onto the page
  const backdropGeometry = new PlaneGeometry(14, 10);
  const backdropMaterial = new ShadowNodeMaterial({ opacity: 0.2 });
  const backdrop = new Mesh(backdropGeometry, backdropMaterial);

  geometries.push(backdropGeometry);
  materials.push(backdropMaterial);
  backdrop.position.z = -0.22;
  backdrop.receiveShadow = true;
  scene.add(backdrop);

  // The card: the page with the message, and the cover on its hinge
  const edge = plain(colours.inside);
  const panel = new BoxGeometry(card.width, card.height, thickness);

  geometries.push(panel);

  const page = new Mesh(panel, [
    edge,
    edge,
    edge,
    edge,
    painted(faces.insideRight),
    painted(faces.back),
  ]);

  const cover = new Mesh(panel, [
    edge,
    edge,
    edge,
    edge,
    painted(faces.front),
    painted(faces.insideLeft),
  ]);

  const hinge = new Group();
  const cardGroup = new Group();
  const turn = new Group();

  cover.position.set(card.width / 2, 0, thickness);
  hinge.position.x = -card.width / 2;
  hinge.add(cover);
  cardGroup.add(page, hinge);
  turn.add(cardGroup);

  // The envelope: its lined inside, the pocket with a V cut, and the flap
  const backGeometry = flat(
    envelope,
    [
      [left, bottom],
      [right, bottom],
      [right, top],
      [left, top],
    ],
    [
      [0, 1, 2],
      [0, 2, 3],
    ],
    bottom,
    envelope.height,
  );

  const pocketGeometry = flat(
    envelope,
    [
      [left, bottom],
      [right, bottom],
      [right, top],
      // The V's point rises past the flap's rounded tip, so the flap overlaps
      // the pocket and nothing shows between them
      [0, envelope.height * 0.1],
      [left, top],
    ],
    [
      [0, 1, 3],
      [1, 2, 3],
      [0, 3, 4],
    ],
    bottom,
    envelope.height,
  );

  const outline = flapCorners(envelope);

  const flapGeometry = flat(
    envelope,
    outline,
    fan(outline.length),
    0,
    envelope.flap,
  );

  geometries.push(backGeometry, pocketGeometry, flapGeometry);

  const back = new Mesh(backGeometry, painted(faces.liner));

  const pocket = new Mesh(
    pocketGeometry,
    painted(paintPocket(envelope, colours.envelope)),
  );

  // The flap's outside faces away from it while it's closed, so it's the back side
  const flapOutside = new Mesh(
    flapGeometry,
    painted(paintFlap(envelope, colours.envelope), BackSide),
  );

  const flapLining = new Mesh(flapGeometry, painted(faces.liner, FrontSide));
  const flapHinge = new Group();
  const envelopeGroup = new Group();

  back.position.z = -0.016;
  pocket.position.z = 0.016;

  // Every piece of paper casts a soft shadow on the ones behind it
  for (const mesh of [page, cover, back, pocket, flapOutside, flapLining]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  flapHinge.add(flapOutside, flapLining);
  flapHinge.position.set(0, top, flapDepth.closed);
  flapHinge.rotation.x = Math.PI;
  envelopeGroup.add(back, pocket, flapHinge);

  // Sealed: the card sits in the pocket, a little below the envelope's top
  turn.position.y = -0.05;
  scene.add(envelopeGroup, turn);

  return {
    scene,
    envelope: envelopeGroup,
    flap: flapHinge,
    turn,
    card: cardGroup,
    hinge,
    videos: textures.filter((map) => map instanceof VideoTexture),
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();

      for (const material of materials) material.dispose();

      for (const map of textures) map.dispose();
    },
  };
};
