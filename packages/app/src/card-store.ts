/**
 * Your cards on this device: the editor's card list, kept in this browser's
 * localStorage and never sent anywhere. A card goes out only as its link,
 * with the whole card sealed in it, and its pictures, video and music load
 * from their web addresses.
 */
import {
  Card,
  CardId,
  pictureMedia,
  webAddress,
} from "@timmo001/cardstock-card";
import type { Picture } from "@timmo001/cardstock-card/render";
import { Effect, Option, Schema } from "effect";
import { decodePicture, webBytes } from "./picture.ts";

const storageKey = "cardstock:cards";

/** A card as this device keeps it, with when it was last saved. */
export const StoredCard = Schema.Struct({
  id: CardId,
  updatedAt: Schema.Int,
  card: Card,
});

export interface StoredCard extends Schema.Schema.Type<typeof StoredCard> {}

const StoredCards = Schema.fromJsonString(Schema.Array(StoredCard));

const decodeCards = Schema.decodeUnknownOption(StoredCards);

const encodeCards = Schema.encodeEffect(StoredCards);

/** Every card on this device, the most recently changed first. */
export const listCards = Effect.try(() =>
  localStorage.getItem(storageKey),
).pipe(
  Effect.map((text) =>
    text === null
      ? []
      : Option.getOrElse(decodeCards(text), (): readonly StoredCard[] => []),
  ),
  Effect.orElseSucceed((): readonly StoredCard[] => []),
  Effect.map((cards) => cards.toSorted((a, b) => b.updatedAt - a.updatedAt)),
);

const writeCards = (cards: readonly StoredCard[]) =>
  encodeCards(cards).pipe(
    Effect.flatMap((text) =>
      Effect.try(() => localStorage.setItem(storageKey, text)),
    ),
  );

/** One card on this device, or `None`. */
export const findCard = (id: CardId) =>
  listCards.pipe(
    Effect.map((cards) =>
      Option.fromUndefinedOr(cards.find((stored) => stored.id === id)),
    ),
  );

/** Keeps a card on this device, replacing the one with the same id. */
export const saveCard = Effect.fnUntraced(function* (id: CardId, card: Card) {
  const cards = yield* listCards;

  yield* writeCards([
    { id, updatedAt: Date.now(), card },
    ...cards.filter((stored) => stored.id !== id),
  ]);
});

/** Drops a card from this device. Links already sent still open it. */
export const deleteCard = (id: CardId) =>
  listCards.pipe(
    Effect.flatMap((cards) =>
      writeCards(cards.filter((stored) => stored.id !== id)),
    ),
  );

/** The card's pictures, loaded from their web addresses and decoded, by media id. */
export const cardPictures = Effect.fnUntraced(function* (card: Card) {
  const decoded = yield* Effect.forEach(
    pictureMedia(card),
    Effect.fnUntraced(function* (media) {
      const bytes = yield* webBytes(webAddress(media));

      return [media.id, yield* decodePicture(bytes, media.type)] as const;
    }),
    { concurrency: "unbounded" },
  );

  return new Map<string, Picture>(decoded);
});
