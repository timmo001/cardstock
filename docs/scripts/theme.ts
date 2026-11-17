/**
 * Writes the Cardstock theme into `theme.css`, between its marker comments.
 * It reads the app's theme document, so the site and the app share one
 * source, and fails on a missed contrast check, so a theme that reads badly
 * never ships. Runs before `dev`, `build` and `check`.
 *
 * @module
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  blumeThemeCss,
  parseTheme,
  runtimeTheme,
} from "@timmo001/groundwork-tokens/runtime";
import { format, resolveConfig } from "prettier";

const start = "/* cardstock.json, rendered by scripts/theme.ts: start */";
const end = "/* cardstock.json, rendered by scripts/theme.ts: end */";

const parsed = parseTheme(
  await readFile("../packages/app/src/theme/cardstock.json", "utf8"),
);

if ("failure" in parsed) throw new Error(String(parsed.failure));

const { theme, css: tokens, checks } = runtimeTheme(parsed.success);
const misses = checks.filter((check) => !check.passes);

if (misses.length > 0) {
  throw new Error(
    `The Cardstock theme misses its contrast in ${misses.map((miss) => `${miss.mode} ${miss.role}`).join(", ")}`,
  );
}

const css = await readFile("theme.css", "utf8");
const from = css.indexOf(start);
const to = css.indexOf(end);

if (from === -1 || to < from) throw new Error("theme.css has no markers");

// Formatted as the repository formats CSS, so a run changes nothing unless
// the theme does. The tokens give the mode picker's controls their surfaces,
// since Groundwork only has `[data-gw-theme]` rules for its own themes
const rendered = await format(
  `${css.slice(0, from + start.length)}\n${blumeThemeCss(theme)}\n${tokens}\n${css.slice(to)}`,
  { ...(await resolveConfig("theme.css")), filepath: "theme.css" },
);

if (rendered !== css) await writeFile("theme.css", rendered);
