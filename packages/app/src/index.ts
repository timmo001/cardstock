/**
 * The page script, the app's shell: the fonts, the theme and the components,
 * the app bar's mode picker, and the PWA. The service worker keeps the shell
 * so the app starts offline.
 */
import "@fontsource-variable/figtree";
import "@fontsource-variable/geist-mono";
import "@timmo001/groundwork-tokens/themes.css";
import "./index.css";
import "@timmo001/groundwork-ui";
import { connectPwa } from "@timmo001/groundwork-pwa/view";
import { pageTheme } from "@timmo001/groundwork-tokens/page";
import { on } from "@timmo001/groundwork-ui";
import config from "../pwa.config.ts";
import { phCards, phGear, phStorefront } from "./icons.ts";
import { themeDocuments, themeModes, themeSettings, themes } from "./theme.ts";

const theme = pageTheme({
  ...themeSettings,
  themes,
  documents: themeDocuments,
});

// Each app bar link leads with its page's icon, as each page's heading does
const navIcons = {
  cards: phCards,
  browse: phStorefront,
  settings: phGear,
} satisfies Readonly<Record<string, string>>;

for (const link of document.querySelectorAll("gw-app-bar a[data-nav]")) {
  const nav = link.getAttribute("data-nav");
  const icon = Object.entries(navIcons).find(([name]) => name === nav)?.[1];

  if (icon !== undefined) link.parentElement?.setAttribute("icon", icon);
}

const themePicker = document.querySelector("gw-theme-picker");

const showTheme = () => {
  if (themePicker === null) return;

  const { mode, theme: current } = theme.state();

  // A Darker pick stored from elsewhere shows as plain Dark
  themePicker.mode = mode === "darker" ? "dark" : mode;
  themePicker.theme = current;
};

theme.subscribe(showTheme);

showTheme();

if (themePicker !== null) {
  on(themePicker, "mode", (event) => {
    const mode = themeModes.find((entry) => entry === event.detail.mode);

    if (mode !== undefined) theme.setMode(mode);
  });
}

if (theme.state().mode === "darker") theme.setMode("dark");

connectPwa(config);

/**
 * The app's own pages, by path, each with its section, the app bar link it
 * sits under and its code.
 */
const pages = [
  {
    matches: (path: string) => path.startsWith("/cards/"),
    section: "card",
    nav: "cards",
    load: () => import("./editor.ts"),
  },
  {
    matches: (path: string) => path === "/browse",
    section: "browse",
    nav: "browse",
    load: () => import("./browse.ts"),
  },
  {
    matches: (path: string) => path === "/settings",
    section: "settings",
    nav: "settings",
    load: () => import("./settings.ts"),
  },
  {
    matches: (path: string) => path === "/export",
    section: "export",
    nav: "cards",
    load: () => import("./export-page.ts"),
  },
  {
    matches: () => true,
    section: "cards",
    nav: "cards",
    load: () => import("./cards.ts"),
  },
] as const;

const path = location.pathname.replace(/\/+$/u, "") || "/";

// A card's link loads the viewer, and with it the renderer
if (path === "/c" || path.startsWith("/c/")) {
  void import("./viewer.ts");
} else {
  const shown = pages.find((each) => each.matches(path)) ?? pages[4];

  document
    .querySelector(`gw-stack.${shown.section}`)
    ?.removeAttribute("hidden");

  // The card editor needs more room than a form, the app bar's own width
  if (shown.section === "card") {
    document.querySelector("gw-page")?.removeAttribute("narrow");
  }

  for (const link of document.querySelectorAll("gw-app-bar a[data-nav]")) {
    if (link.getAttribute("data-nav") === shown.nav) {
      link.setAttribute("aria-current", "page");
    }
  }

  void shown.load();
}
