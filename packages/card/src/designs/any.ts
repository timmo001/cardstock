/**
 * Any occasion: bright white stock inside a fine foil frame, a pair of sprigs
 * and the title printed in Fraunces, with one more sprig on the inside cover.
 * A kraft envelope lined in navy with foil dots.
 */
import { cardFonts } from "../render/fonts.ts";
import { defineDesign } from "./define.ts";
import { flourish, frame, pattern, sprig } from "./ornaments.ts";
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

export const any = defineDesign({
  id: "any",
  paper: { roughness: 0.88, grain: 0.6 },
  colours: {
    paper: "#f8f6f1",
    inside: "#f8f6f1",
    ink: "#26262b",
    pen: "#1d2747",
    accent: "#3a5a78",
    foil: "#c2a46e",
    envelope: "#c9a77c",
    liner: "#233a5c",
  },
  palettes: {
    kraft: {
      paper: "#c4a079",
      inside: "#f6f0e4",
      ink: "#3a2a1a",
      pen: "#1d2747",
      accent: "#6b4a2b",
      foil: "#f1ebdf",
      envelope: "#f6f0e4",
      liner: "#8a6a46",
    },
    sky: {
      paper: "#d3e3ef",
      inside: "#f8fafc",
      ink: "#1f3550",
      pen: "#1d2747",
      accent: "#3a5a78",
      foil: "#4a6a92",
      envelope: "#f8f6f1",
      liner: "#9fbcd6",
    },
    ink: {
      paper: "#202026",
      inside: "#f6f4ef",
      ink: "#ecebe6",
      pen: "#1d2747",
      accent: "#c2a46e",
      foil: "#dcbc7c",
      envelope: "#c9a77c",
      liner: "#202026",
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

    foiled(front, colours.foil, (paint) => frame(paint, front, unit * 0.06));

    if (picture.ornaments) {
      foiled(front, colours.foil, (paint) => {
        sprig(
          paint,
          width / 2 - unit * 0.03,
          height * 0.48,
          unit * 0.26,
          -0.45,
        );
        sprig(paint, width / 2 + unit * 0.03, height * 0.48, unit * 0.22, 0.45);
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
      top: height * 0.6,
      largest: Math.round(unit * 0.11),
      weight: 500,
      ink: colours.ink,
    });

    foiled(front, colours.foil, (paint) =>
      flourish(paint, width / 2, end + unit * 0.06, unit * 0.26),
    );

    fill(insideLeft, colours.inside);
    foiled(insideLeft, colours.foil, (paint) =>
      sprig(
        paint,
        insideLeft.width / 2,
        insideLeft.height * 0.88,
        measure(insideLeft) * 0.14,
        0,
      ),
    );
    insidePicture(insideLeft, build);
    handwritten(insideRight, build);
    back(faces.back, build);

    fill(liner, colours.liner);
    foiled(liner, colours.foil, (paint) => {
      pattern(paint, liner, liner.width * 0.06, (draw, x, y) => {
        draw.beginPath();
        draw.arc(x, y, liner.width * 0.005, 0, Math.PI * 2);
        draw.fill();
      });
    });
  },
});
