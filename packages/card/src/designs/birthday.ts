/**
 * Birthday: warm white stock thrown with printed confetti and a few foil
 * stars, the title set large and heavy in Bricolage Grotesque, printed in ink
 * over a foil shadow. A cobalt envelope lined with pink and cream stripes.
 */
import { cardFonts } from "../render/fonts.ts";
import { defineDesign } from "./define.ts";
import { confetti, flourish, seeded, star } from "./ornaments.ts";
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

export const birthday = defineDesign({
  id: "birthday",
  paper: { roughness: 0.8, grain: 0.55 },
  colours: {
    paper: "#fbf5ea",
    inside: "#fbf5ea",
    ink: "#2b2340",
    pen: "#1d2747",
    accent: "#e85d75",
    foil: "#e2b15f",
    envelope: "#2f4fc4",
    liner: "#f6c6cf",
  },
  palettes: {
    blush: {
      paper: "#f7d9dd",
      inside: "#fdf3f2",
      ink: "#4a2233",
      pen: "#1d2747",
      accent: "#d1495b",
      foil: "#e2b15f",
      envelope: "#3fa7a0",
      liner: "#fbe4e7",
    },
    midnight: {
      paper: "#1f2347",
      inside: "#fbf5ea",
      ink: "#f4ecda",
      pen: "#1d2747",
      accent: "#f2a541",
      foil: "#e2b15f",
      envelope: "#e85d75",
      liner: "#2c3166",
    },
  },
  fonts: { display: cardFonts.grotesque, hand: cardFonts.hand },
  build: (faces, build) => {
    const { colours } = build;
    const { front, insideLeft, insideRight, liner } = faces;
    const { width, height } = front;
    const unit = measure(front);
    const inks = ["#e85d75", "#f2a541", "#3fa7a0", "#4361ee", "#9b5de5"];

    fill(front, colours.paper);

    const picture = frontPicture(front, build);

    if (picture.ornaments) {
      confetti(front.colour, front, inks, 48, 7);

      const random = seeded(11);

      foiled(front, colours.foil, (paint) => {
        for (let index = 0; index < 8; index++) {
          star(
            paint,
            random() * width,
            random() * height * 0.55,
            unit * (0.012 + random() * 0.018),
          );
        }
      });
    } else if (picture.framed !== undefined) {
      confetti(front.colour, front, inks, 40, 7);
      cover(front.colour, picture.framed, {
        x: width / 2 - unit * 0.38,
        y: unit * 0.12,
        width: unit * 0.76,
        height: height * 0.5,
      });
    }

    const end = title(front, build, {
      top: picture.framed === undefined ? height * 0.6 : height * 0.68,
      largest: Math.round(unit * 0.14),
      weight: 800,
      ink: colours.ink,
      shadow: unit * 0.008,
    });

    foiled(front, colours.foil, (paint) =>
      flourish(paint, width / 2, end + unit * 0.06, unit * 0.26),
    );

    fill(insideLeft, colours.inside);
    confetti(insideLeft.colour, insideLeft, inks, 18, 3);
    insidePicture(insideLeft, build);
    handwritten(insideRight, build);
    back(faces.back, build);

    // The liner: pink and cream stripes
    fill(liner, colours.liner);
    liner.colour.fillStyle = "#fff6ef";

    for (let x = -liner.height; x < liner.width; x += liner.width * 0.08) {
      liner.colour.beginPath();
      liner.colour.moveTo(x, 0);
      liner.colour.lineTo(x + liner.width * 0.035, 0);
      liner.colour.lineTo(x + liner.width * 0.035 + liner.height, liner.height);
      liner.colour.lineTo(x + liner.height, liner.height);
      liner.colour.fill();
    }
  },
});
