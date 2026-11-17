/**
 * Renders the PNG branding (social preview, logo and Apple touch icon) from
 * `src/assets/logo.svg`. Run it with `bun run brand`.
 *
 * @module
 */
import { writeBrandImages } from "@timmo001/docs-kit";

const written = await writeBrandImages({
  logo: "src/assets/logo.svg",
  title: "Cardstock",
  tagline: ["Greeting cards from a description,", "opened by link as paper."],
  site: "cardstock.timmo.dev",
  // The Cardstock theme's purple-grey background and marker pink
  background: "#221b25",
  accent: "#ea74b1",
  outputs: {
    socialPreview: "../.github/social-preview.png",
    logo: "public/logo.png",
    appleTouchIcon: "public/apple-touch-icon.png",
  },
});

for (const file of written) console.log(`Wrote ${file}`);
