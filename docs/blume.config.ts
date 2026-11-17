/** The Cardstock docs site, built on the shared docs-kit defaults. */
import { docsConfig } from "@timmo001/docs-kit/blume";
import { defineConfig } from "blume";

export default defineConfig(
  docsConfig({
    title: "Cardstock",
    description:
      "Greeting cards an agent makes from a description, opened by link as a 3D paper card.",
    site: "cardstock.timmo.dev",
    github: { owner: "timmo001", repo: "cardstock" },
    navigation: {
      sidebar: [
        "/",
        "/making-a-card",
        "/pictures",
        "/links-and-privacy",
        "/web-app",
        "/cli",
        "/agents",
        "/designs",
      ],
    },
  }),
);
