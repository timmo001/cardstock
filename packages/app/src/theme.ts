/**
 * The page's theme settings, shared by the boot script the build inlines and
 * the page. Cardstock has one theme, its own, in Auto, Light and Dark, so the
 * picker offers the modes alone. The build solves the theme from
 * `theme/cardstock.json` and puts its CSS on the page.
 */
import type { ThemeChoice } from "@timmo001/groundwork-tokens/page";
import { Result } from "effect";
import cardstockTheme from "./theme/cardstock.json";

export const themeSettings = {
  key: "cardstock:theme",
  defaultTheme: cardstockTheme.id,
} as const;

/** The modes the picker offers: Darker is left out. */
export const themeModes = ["auto", "light", "dark"] as const;

export const themes: ReadonlyArray<ThemeChoice> = [
  { id: cardstockTheme.id, name: cardstockTheme.name },
];

/**
 * The theme's document, for agents reading it through the WebMCP theme
 * tools, so they see Cardstock's rather than the core themes. Loaded only
 * when the tools register.
 */
export const themeDocuments = async () => {
  const { parseTheme } = await import("@timmo001/groundwork-tokens/runtime");
  const parsed = parseTheme(JSON.stringify(cardstockTheme));

  return Result.isSuccess(parsed) ? [parsed.success] : [];
};
