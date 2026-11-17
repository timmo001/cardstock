/**
 * The app's PWA config: what `@timmo001/groundwork-pwa` gives it. The build
 * writes the manifest from it, and the page and service worker read it.
 */
import { definePwaConfig } from "@timmo001/groundwork-pwa";

export default definePwaConfig({
  name: "Cardstock",
  shortName: "Cardstock",
  description: "Greeting cards your agent makes, opened as a 3D paper card",
  // The manifest's colours come from a Groundwork theme by id. Cardstock's
  // surfaces are Slate's, since it shares Slate's background
  theme: "slate",
  mode: "dark",
  // Cards come in through the agent and the CLI, not the share sheet
  shareTarget: false,
  manifest: {
    categories: ["lifestyle", "social"],
    launch_handler: { client_mode: "navigate-existing" },
  },
});
