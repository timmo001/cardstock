/**
 * The card format's round trip: a card sealed with its key opens with it
 * and no other, and a whole card comes back out of its own link.
 */
import { describe, expect, test } from "bun:test";
import { Effect, Option } from "effect";
import {
  cardOrigin,
  credits,
  decodeCard,
  encodeCard,
  generateKey,
  layersOf,
  makeCard,
  type MediaSource,
  missingMedia,
  occasionNames,
  open,
  openText,
  openWholeCardUrl,
  pictureMedia,
  sealText,
  shuffleCard,
  templates,
  tones,
  WebSource,
  wholeCardUrl,
} from "./index.ts";

const spec = {
  version: 1,
  occasion: "Christmas",
  design: "christmas",
  effect: "snow",
  front: { title: "Merry Christmas" },
  inside: { message: "Have a lovely one", from: "Alex" },
  media: [],
};

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe("card", () => {
  test("seals and opens with its key, and not with another", async () => {
    const result = await run(
      Effect.gen(function* () {
        const card = yield* makeCard(spec);
        const key = yield* generateKey;
        const other = yield* generateKey;
        const sealed = yield* sealText(key, yield* encodeCard(card));
        const opened = yield* decodeCard(yield* openText(key, sealed));
        const wrong = yield* Effect.flip(open(other, sealed));

        return { card, opened, wrong };
      }),
    );

    expect(result.opened).toEqual(result.card);
    expect(result.wrong._tag).toBe("OpenError");
  });

  test("a changed byte doesn't open", async () => {
    const error = await run(
      Effect.gen(function* () {
        const key = yield* generateKey;
        const sealed = yield* sealText(key, "hello");

        sealed[sealed.length - 1] = (sealed.at(-1) ?? 0) ^ 1;

        return yield* Effect.flip(open(key, sealed));
      }),
    );

    expect(error._tag).toBe("OpenError");
  });

  test("every template is a card, with its own id", async () => {
    for (const each of templates) {
      await run(makeCard(each.card));
    }

    expect(new Set(templates.map((each) => each.id)).size).toBe(
      templates.length,
    );
  });

  test("Shuffle makes a card for every occasion and tone", async () => {
    for (const occasion of occasionNames) {
      for (const tone of tones) {
        const { card } = await run(shuffleCard({ occasion, tone }));

        await run(makeCard(card));
        expect(card.occasion).toBe(occasion);
      }
    }
  });

  test("Shuffle keeps a typed occasion and reads what it means", async () => {
    const { card, tone } = await run(
      shuffleCard({ occasion: "Mum's 60th", tone: "cheeky" }),
    );

    expect(card.occasion).toBe("Mum's 60th");
    expect(card.design === "birthday" || card.design === "any").toBe(true);
    expect(tone).toBe("cheeky");
  });

  test("Shuffle keeps sad occasions heartfelt", async () => {
    const { tone, card } = await run(
      shuffleCard({ occasion: "Sympathy", tone: "funny" }),
    );

    expect(tone).toBe("heartfelt");
    expect(card.effect).toBe("none");
  });

  test("rejects a card naming a design that doesn't exist", async () => {
    const error = await run(
      Effect.flip(makeCard({ ...spec, design: "halloween" })),
    );

    expect(error._tag).toBe("SchemaError");
  });

  test("a whole card rides in its link and opens from it alone", async () => {
    const result = await run(
      Effect.gen(function* () {
        const card = yield* makeCard({ ...spec, opening: "grow" });
        const url = yield* wholeCardUrl(card);
        const opened = yield* openWholeCardUrl(url);
        const broken = yield* openWholeCardUrl(url.slice(0, -4));
        const stored = yield* openWholeCardUrl(`${cardOrigin}/c/abc#def`);

        return { card, url, opened, broken, stored };
      }),
    );

    expect(result.url.startsWith(`${cardOrigin}/c#`)).toBe(true);
    expect(result.url.length).toBeLessThan(400);
    expect(Option.getOrThrow(result.opened)).toEqual(result.card);
    expect(Option.isNone(result.broken)).toBe(true);
    expect(Option.isNone(result.stored)).toBe(true);
  });

  test("a card takes files from the web, and no stored ones", async () => {
    const picture = (source: MediaSource) => ({
      ...spec,
      front: { title: "Merry Christmas", image: "AAAAAAAAAAAAAAAAAAAAAA" },
      media: [
        {
          id: "AAAAAAAAAAAAAAAAAAAAAA",
          kind: "image",
          type: "image/jpeg",
          source,
        },
      ],
    });

    const result = await run(
      Effect.gen(function* () {
        const web = yield* makeCard(
          picture(WebSource.make({ url: "https://example.com/tree.jpg" })),
        );

        const opened = yield* openWholeCardUrl(yield* wholeCardUrl(web));
        // A file of your own, as cards that were stored had, isn't a card
        const own = JSON.stringify(web).replace('"_tag":"Web"', '"_tag":"Own"');
        const refused = yield* Effect.flip(decodeCard(own));

        return { web, opened, refused };
      }),
    );

    expect(Option.getOrThrow(result.opened)).toEqual(result.web);
    expect(result.refused._tag).toBe("SchemaError");
  });

  test("the back lists web addresses only with its footnote on", async () => {
    const card = (footnote: boolean) => ({
      ...spec,
      front: { title: "Merry Christmas", image: "AAAAAAAAAAAAAAAAAAAAAA" },
      footnote,
      media: [
        {
          id: "AAAAAAAAAAAAAAAAAAAAAA",
          kind: "image",
          type: "image/jpeg",
          source: WebSource.make({ url: "https://example.com/tree.jpg" }),
        },
      ],
    });

    const [off, on] = await run(
      Effect.all([makeCard(card(false)), makeCard(card(true))]),
    );

    expect(credits(off)).toEqual([]);
    expect(credits(on)).toEqual([
      { text: "example.com/tree.jpg", url: "https://example.com/tree.jpg" },
    ]);
  });

  test("a card's pictures lay in order, after the ones older cards name", async () => {
    const id = (letter: string) => letter.repeat(22);

    const media = ["A", "B", "C", "D"].map((letter) => ({
      id: id(letter),
      kind: "image",
      type: "image/jpeg",
      source: WebSource.make({ url: `https://example.com/${letter}.jpg` }),
    }));

    const card = await run(
      makeCard({
        ...spec,
        // An older card's own front and inside pictures
        front: { title: "Merry Christmas", image: id("A"), fit: "fill" },
        inside: { ...spec.inside, image: id("B"), fit: "behind" },
        pictures: [
          { image: id("C"), on: "left", fit: "fill" },
          { image: id("D"), on: "front" },
        ],
        media,
      }),
    );

    // Compared as plain data, without the ids' brand
    const laid: unknown = layersOf(card);

    expect(laid).toEqual([
      { image: id("A"), on: "front", fit: "fill" },
      { image: id("B"), on: "right", fit: "behind" },
      { image: id("C"), on: "left", fit: "fill" },
      { image: id("D"), on: "front" },
    ]);
    expect(missingMedia(card)).toEqual([]);
    expect(pictureMedia(card)).toHaveLength(4);

    // Music can't be laid on a page
    const music = { ...media[3], kind: "audio", type: "audio/mpeg" };

    const refused = await run(
      Effect.flip(
        makeCard({
          ...spec,
          pictures: [{ image: id("D"), on: "front" }],
          media: [music],
        }),
      ),
    );

    expect(refused._tag).toBe("SchemaError");
  });
});
