/**
 * Christmas: deep green stock inside a fine foil frame, a line-drawn foil
 * wreath with red berries and a bow, and the title set in Fraunces italic.
 * Cream pages inside, and a red envelope lined in green printed with gold.
 */
import { cardFonts } from "../render/fonts.ts";
import { defineDesign } from "./define.ts";
import {
  bow,
  flourish,
  frame,
  pattern,
  sprig,
  star,
  wreath,
} from "./ornaments.ts";
import {
  back,
  framePictures,
  fill,
  foiled,
  frontPicture,
  handwritten,
  insidePicture,
  measure,
  title,
} from "./paint.ts";

export const christmas = defineDesign({
  id: "christmas",
  paper: { roughness: 0.86, grain: 0.7 },
  colours: {
    paper: "#163b2f",
    inside: "#f7f3ea",
    ink: "#e9dfc8",
    pen: "#1d2747",
    accent: "#b3322c",
    foil: "#e3bf6b",
    envelope: "#7a1c21",
    liner: "#1d4636",
  },
  palettes: {
    red: {
      paper: "#7d1d24",
      inside: "#f7f3ea",
      ink: "#f3e6cc",
      pen: "#1d2747",
      accent: "#f2e3c2",
      foil: "#e3bf6b",
      envelope: "#1d4636",
      liner: "#5e151b",
    },
    midnight: {
      paper: "#172038",
      inside: "#f5f2ec",
      ink: "#e6e1d3",
      pen: "#1d2747",
      accent: "#c0392b",
      foil: "#d5dbe4",
      envelope: "#2a3550",
      liner: "#0f1628",
    },
  },
  fonts: { display: cardFonts.serif, hand: cardFonts.hand },
  build: (faces, build) => {
    const { colours } = build;
    const { front, insideLeft, insideRight, liner } = faces;
    const { width, height } = front;
    const unit = measure(front);

    fill(front, colours.paper);

    const picture = frontPicture(front, build);

    foiled(front, colours.foil, (paint) => frame(paint, front, unit * 0.055));

    if (picture.ornaments) {
      const middle = { x: width / 2, y: height * 0.37 };
      const radius = unit * 0.25;

      // Ink first: the leaves in three greens and the bow in red ribbon
      wreath(front.colour, middle.x, middle.y, radius, 24, [
        "#2f6d4f",
        "#3d7f5d",
        "#255a41",
      ]);

      front.colour.fillStyle = colours.accent;
      front.colour.strokeStyle = colours.accent;
      bow(
        front.colour,
        middle.x,
        middle.y + radius * 1.05,
        radius * 0.42,
        true,
      );

      // Then the foil outlines over them; the wreath is seeded, so this pass
      // lays the leaves out the same way and returns the same berry spots
      let berries: [number, number][] = [];

      foiled(front, colours.foil, (paint) => {
        berries = wreath(paint, middle.x, middle.y, radius, 24);
        bow(paint, middle.x, middle.y + radius * 1.05, radius * 0.42);
        star(paint, middle.x, middle.y, radius * 0.16);
      });

      // Berries are printed in red ink, three to a cluster
      front.colour.fillStyle = colours.accent;

      for (const [x, y] of berries) {
        for (const [dx, dy] of [
          [0, 0],
          [0.9, 0.5],
          [0.1, 1],
        ] as const) {
          front.colour.beginPath();
          front.colour.arc(
            x + dx * unit * 0.012,
            y + dy * unit * 0.012,
            unit * 0.009,
            0,
            Math.PI * 2,
          );
          front.colour.fill();
        }
      }
    } else if (picture.framed.length > 0) {
      framePictures(
        front,
        build,
        picture.framed,
        {
          x: width / 2 - unit * 0.36,
          y: unit * 0.14,
          width: unit * 0.72,
          height: height * 0.5,
        },
        unit * 0.004,
      );
    }

    const end = title(front, build, {
      top: picture.framed.length === 0 ? height * 0.66 : height * 0.68,
      largest: Math.round(unit * 0.105),
      italic: true,
      weight: 400,
    });

    foiled(front, colours.foil, (paint) =>
      flourish(paint, width / 2, end + unit * 0.06, unit * 0.3),
    );

    // Inside left: cream, with a small sprig low down
    fill(insideLeft, colours.inside);
    foiled(insideLeft, colours.foil, (paint) => {
      paint.globalAlpha = 0.85;
      sprig(
        paint,
        insideLeft.width / 2 - unit * 0.02,
        insideLeft.height * 0.86,
        unit * 0.16,
        -0.5,
      );
      sprig(
        paint,
        insideLeft.width / 2 + unit * 0.02,
        insideLeft.height * 0.86,
        unit * 0.14,
        0.5,
      );
    });

    insidePicture(insideLeft, build);
    handwritten(insideRight, build);
    back(faces.back, build);

    // The liner: green printed with small gold stars
    fill(liner, colours.liner);
    foiled(liner, colours.foil, (paint) => {
      pattern(paint, liner, liner.width * 0.09, (draw, x, y) =>
        star(draw, x, y, liner.width * 0.012),
      );
    });
  },
});
