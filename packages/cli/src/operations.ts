/**
 * What the CLI and the MCP server can do, as Effect operations that return
 * plain data: list the ready-made templates, shuffle a card, put a card in
 * its link, and say whether the server answers. A card is a spec, JSON you
 * keep where you like; it goes out only as its link, with the whole card
 * sealed in it, so nothing is stored anywhere and there's nothing to sign
 * in to.
 */
import {
  decodeCard,
  missingMedia,
  type ShuffleOptions,
  shuffleCard,
  templates,
  wholeCardUrl,
} from "@timmo001/cardstock-card";
import { Api } from "@timmo001/cardstock-server/api";
import { Effect, Option, Predicate, Schema } from "effect";
import { HttpApiClient } from "effect/http-api";
import { Settings } from "./settings.ts";

export class CardstockError extends Schema.TaggedError<CardstockError>()(
  "CardstockError",
  { message: Schema.String, cause: Schema.optionalKey(Schema.Defect()) },
) {}

export const fail = (message: string) => new CardstockError({ message });

/** Any of the failures an operation can meet, each tagged. */
interface Failure {
  readonly _tag: string;
}

/** A failure, in words a person or an agent can act on. */
export const describe = (error: Failure) => {
  // Our own failures already say what to do
  if (
    Predicate.isTagged(error, "CardstockError") &&
    Predicate.hasProperty(error, "message")
  ) {
    return fail(String(error.message));
  }

  const detail = Predicate.hasProperty(error, "message")
    ? `${error._tag}: ${String(error.message)}`
    : error._tag;

  return new CardstockError({
    message: `Something went wrong (${detail})`,
    cause: error,
  });
};

/** Reads a card spec's JSON, checking it against the card format. */
export const readSpecText = (text: string) =>
  decodeCard(text).pipe(
    Effect.mapError((error) =>
      fail(`That isn't a card spec: ${error.message}`),
    ),
    Effect.flatMap((card) => {
      const missing = missingMedia(card);

      return missing.length === 0
        ? Effect.succeed(card)
        : Effect.fail(
            fail(`The card names media it doesn't list: ${missing.join(", ")}`),
          );
    }),
  );

/** Where links open: cards.timmo.dev, or `CARDSTOCK_SERVER`. */
export const linkOrigin = Effect.gen(function* () {
  return (yield* Settings).server;
});

/** The ready-made cards, each with the spec a card made from it starts as. */
export const templateList = () =>
  templates.map((template) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    tone: template.tone,
    spec: template.card,
  }));

/**
 * A card picked at random from what suits the occasion, as a spec to change
 * and put in its link, with the tone its words came out in.
 */
export const cardShuffle = (options: ShuffleOptions) =>
  shuffleCard(options).pipe(
    Effect.map(({ card, tone }) => ({ tone, spec: card })),
  );

/** The card's link, with the whole card sealed in it, made here and stored nowhere. */
export const cardLink = Effect.fn("cardLink")(function* (spec: string) {
  const card = yield* readSpecText(spec);

  const url = yield* wholeCardUrl(card, yield* linkOrigin).pipe(
    Effect.mapError(() => fail("That card doesn't go into a link")),
  );

  return { occasion: card.occasion, url };
}, Effect.mapError(describe));

/** Whether the server answers, and which version. */
export const status = Effect.fn("status")(function* () {
  const { server } = yield* Settings;
  const client = yield* HttpApiClient.make(Api, { baseUrl: server });
  const health = yield* client.health.health().pipe(Effect.option);

  return {
    server,
    reachable: Option.isSome(health),
    version: Option.match(health, {
      onNone: () => null,
      onSome: (answer) => answer.version,
    }),
  };
});
