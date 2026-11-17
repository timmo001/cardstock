/**
 * Builds the app into `dist/`, which the Worker serves: the page script and
 * its CSS, then the page with Cardstock's solved theme and the theme boot
 * script inlined, so the theme applies before the first paint. `buildPwa`
 * then adds the manifest, the icons from the logo, the service worker and
 * the head tags.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { buildPwa } from "@timmo001/groundwork-pwa/build";
import { themeBootScript } from "@timmo001/groundwork-tokens/page";
import { parseTheme, runtimeTheme } from "@timmo001/groundwork-tokens/runtime";
import config from "../pwa.config.ts";
import { themeSettings } from "./theme.ts";

const root = path.join(import.meta.dir, "..");
const outDir = path.join(root, "dist");

await rm(outDir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [path.join(root, "src/index.ts")],
  outdir: outDir,
  target: "browser",
  minify: true,
  // The viewer, with the renderer, is its own chunk, loaded on card pages
  splitting: true,
  naming: {
    entry: "[name].[ext]",
    chunk: "chunks/[name]-[hash].[ext]",
    asset: "assets/[name]-[hash].[ext]",
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);

  process.exit(1);
}

// Cardstock's theme, solved into light and dark. It's the only theme, so a
// contrast miss fails the build rather than ship
const parsed = parseTheme(
  await Bun.file(path.join(root, "src/theme/cardstock.json")).text(),
);

// A plain script, so the decode's failure is read as data, not with Effect
if ("failure" in parsed) {
  console.error(`cardstock.json doesn't decode: ${String(parsed.failure)}`);
  process.exit(1);
}

const solved = runtimeTheme(parsed.success);
const misses = solved.checks.filter((check) => !check.passes);

if (misses.length > 0) {
  for (const miss of misses) {
    console.error(
      `Cardstock theme, ${miss.mode}: ${miss.role} at ${miss.ratio.toFixed(2)}, under ${miss.target}`,
    );
  }

  process.exit(1);
}

// The link preview every card shares, rendered from the preview page with `&og`
await Bun.write(
  path.join(outDir, "og-envelope.png"),
  Bun.file(path.join(root, "src/og-envelope.png")),
);

const html = await Bun.file(path.join(root, "src/index.html")).text();

await Bun.write(
  path.join(outDir, "index.html"),
  html.replace(
    "<!-- cardstock:theme -->",
    `<style id="cardstock-theme">${solved.css}</style>\n    <script>${themeBootScript(themeSettings)}</script>`,
  ),
);

const built = await buildPwa(config, {
  outDir,
  worker: path.join(root, "src/sw.ts"),
  logo: path.join(root, "src/logo.svg"),
});

console.log(
  `Built ${built.version} into ${path.relative(process.cwd(), outDir)}/`,
);
