/**
 * Edit a copy: the viewer leaves the card it opened here, and the editor
 * starts a new card from it. A card is data, so it goes as its JSON, in
 * sessionStorage so it stays in this tab and is taken once.
 */
import { type Card, decodeCard, encodeCard } from "@timmo001/cardstock-card";
import { Effect, Option } from "effect";

const copyKey = "cardstock:copy";

/** Leaves a card for the editor to start from. */
export const leaveCopy = (card: Card) =>
  encodeCard(card).pipe(
    Effect.flatMap((json) =>
      Effect.try(() => sessionStorage.setItem(copyKey, json)),
    ),
  );

/** The card the viewer left, taken so a reload starts afresh, or `None`. */
export const takeCopy = Effect.try(() => {
  const json = sessionStorage.getItem(copyKey);

  sessionStorage.removeItem(copyKey);

  return json;
}).pipe(
  Effect.flatMap((json) =>
    json === null
      ? Effect.succeed(Option.none<Card>())
      : Effect.map(decodeCard(json), Option.some),
  ),
  Effect.orElseSucceed(() => Option.none<Card>()),
);
