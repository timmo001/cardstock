/**
 * The dev server's demo card, sealed whole in its own link when the server
 * starts, so the viewer can be tried end to end. `CARDSTOCK_DESIGN` and
 * `CARDSTOCK_EFFECT` pick its look.
 */
import { makeCard, wholeCardUrl } from "@timmo001/cardstock-card";
import { Effect } from "effect";

export const demoCard = (origin: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const card = yield* makeCard({
        version: 1,
        occasion: "Demo",
        design: process.env["CARDSTOCK_DESIGN"] ?? "christmas",
        effect: process.env["CARDSTOCK_EFFECT"] ?? "snow",
        front: { title: "Season's Greetings" },
        inside: {
          to: "Dear Sam,",
          message:
            "Wishing you a calm, bright end to the year, and plenty of good things in the next one.\n\nSee you soon.",
          from: "Alex",
        },
        media: [],
      });

      return { url: yield* wholeCardUrl(card, origin) };
    }),
  );
