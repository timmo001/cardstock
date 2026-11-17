/**
 * Anniversary: blush stock with two linked rings in rose-gold foil between
 * fine sprigs, and the title printed in Cormorant Garamond italic. Small rings
 * on the inside cover. An ivory envelope lined in blush printed with small
 * foil diamonds.
 */
import { cardFonts } from "../render/fonts.ts";
import { defineDesign } from "./define.ts";
import { flourish, frame, pattern, rings, sprig } from "./ornaments.ts";
import {
  back,
  cover,
  fill,
  foiled,
  frontPicture,
  handwritten,
  insidePicture,
  measure,
  title,
} from "./paint.ts";

export const anniversary = defineDesign({
  id: "anniversary",
  paper: { roughness: 0.74, grain: 0.5 },
  colours: {
    paper: "#f2e1dc",
    inside: "#faf4ef",
    ink: "#3d2b2f",
    pen: "#2a2340",
    accent: "#9d4b5b",
    foil: "#d39f84",
    envelope: "#f4efe6",
    liner: "#e9cfc8",
  },
  palettes: {
    sage: {
      paper: "#dce4d4",
      inside: "#f8f7f1",
      ink: "#2f3a2f",
      pen: "#2a2340",
      accent: "#5b7a5a",
      foil: "#c9a96e",
      envelope: "#f4efe6",
      liner: "#c6d4bd",
    },
    navy: {
      paper: "#1e2a44",
      inside: "#f7f4ee",
      ink: "#e8e2d4",
      pen: "#2a2340",
      accent: "#c4a46a",
      foil: "#d8b878",
      envelope: "#efe7da",
      liner: "#2c3a5a",
    },
  },
  fonts: { display: cardFonts.garamond, hand: cardFonts.hand },
  build: (faces, build) => {
    const { colours } = build;
    const { front, insideLeft, insideRight, liner } = faces;
    const { width, height } = front;
    const unit = measure(front);

    fill(front, colours.paper);

    const picture = frontPicture(front, build);

    foiled(front, colours.foil, (paint) => frame(paint, front, unit * 0.06));

    if (picture.ornaments) {
      foiled(front, colours.foil, (paint) => {
        rings(paint, width / 2, height * 0.36, unit * 0.12);
        sprig(paint, width / 2 - unit * 0.24, height * 0.46, unit * 0.2, -0.9);
        sprig(paint, width / 2 + unit * 0.24, height * 0.46, unit * 0.2, 0.9);
      });
    } else if (picture.framed !== undefined) {
      cover(front.colour, picture.framed, {
        x: width / 2 - unit * 0.35,
        y: unit * 0.15,
        width: unit * 0.7,
        height: height * 0.5,
      });
    }

    const end = title(front, build, {
      top: height * 0.62,
      largest: Math.round(unit * 0.125),
      italic: true,
      weight: 500,
      ink: colours.accent,
    });

    foiled(front, colours.foil, (paint) =>
      flourish(paint, width / 2, end + unit * 0.06, unit * 0.28),
    );

    fill(insideLeft, colours.inside);
    foiled(insideLeft, colours.foil, (paint) =>
      rings(
        paint,
        insideLeft.width / 2,
        insideLeft.height * 0.84,
        measure(insideLeft) * 0.045,
      ),
    );
    insidePicture(insideLeft, build);
    handwritten(insideRight, build);
    back(faces.back, build);

    fill(liner, colours.liner);
    foiled(liner, colours.foil, (paint) => {
      pattern(paint, liner, liner.width * 0.07, (draw, x, y) => {
        const size = liner.width * 0.008;

        draw.beginPath();
        draw.moveTo(x, y - size);
        draw.lineTo(x + size, y);
        draw.lineTo(x, y + size);
        draw.lineTo(x - size, y);
        draw.fill();
      });
    });
  },
});
