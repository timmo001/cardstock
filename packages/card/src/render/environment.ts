/**
 * What the foil reflects: a soft room, rendered once into an environment map.
 * A broad softbox sits behind the viewer, so a card facing them catches it,
 * and the camera's drift slides its edge across the foil as a glint; two
 * window lights at the sides catch the card as it turns. It's built from node
 * materials because three's own RoomEnvironment imports plain `three`, which
 * would bundle a second copy of it beside `three/webgpu`.
 */
import { color } from "three/tsl";
import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type WebGPURenderer,
} from "three/webgpu";

export const roomLight = (renderer: WebGPURenderer) => {
  const room = new Scene();
  const walls = new MeshBasicNodeMaterial({ side: BackSide });
  const lamp = new MeshBasicNodeMaterial({ side: BackSide });
  const box = new BoxGeometry(12, 7, 12);
  const plane = new PlaneGeometry(1, 1);

  walls.colorNode = color("#8d857b");
  lamp.colorNode = color("#fff6ea").mul(10);
  room.add(new Mesh(box, walls));

  // [x, y, z, width, height, turn about y]
  for (const [x, y, z, width, height, turn] of [
    // The softbox behind the viewer, a little above them
    [0.6, 1.4, 5.5, 5.5, 2.2, 0],
    [-5.5, 1.6, 1.5, 2.4, 2, -Math.PI / 2],
    [5.5, 1, -1.5, 2, 2.6, Math.PI / 2],
  ] as const) {
    const light = new Mesh(plane, lamp);

    light.position.set(x, y, z);
    light.scale.set(width, height, 1);
    light.rotation.y = turn;
    room.add(light);
  }

  const generator = new PMREMGenerator(renderer);
  const target = generator.fromScene(room, 0.03);

  generator.dispose();
  box.dispose();
  plane.dispose();
  walls.dispose();
  lamp.dispose();

  return target;
};
