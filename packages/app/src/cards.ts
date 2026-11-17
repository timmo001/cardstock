/**
 * The Cards page at `/`: every card made on this device, the most recently
 * changed first, each opening in the editor, and New card. The list lives in
 * this browser alone; a card goes out only as its link.
 */
import { animateLayout, h } from "@timmo001/groundwork-ui";
import { Effect } from "effect";
import { listCards } from "./card-store.ts";
import { when } from "./dates.ts";
import { phCards, phPlus } from "./icons.ts";

const page = document.querySelector("gw-stack.cards");
const list = page?.querySelector(".cards-list");
const empty = page?.querySelector(".cards-empty");
const newButton = page?.querySelector(".cards-new");

for (const [element, icon] of [
  [page?.querySelector("gw-page-header"), phCards],
  [empty, phCards],
  [newButton, phPlus],
] as const) {
  element?.setAttribute("icon", icon);
}

const cards = await Effect.runPromise(listCards);

empty?.toggleAttribute("hidden", cards.length > 0);

if (list !== null && list !== undefined) {
  await animateLayout(list, () => {
    list.replaceChildren(
      ...cards.map((stored) =>
        h("gw-card", {
          role: "listitem",
          href: `cards/${stored.id}`,
          heading: stored.card.occasion,
          description: `Changed ${when(stored.updatedAt)}`,
        }),
      ),
    );
  });
}
