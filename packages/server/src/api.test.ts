/**
 * The API end to end, through the same layer the Worker runs, with a web
 * the tests make up. It's public with nothing stored: the Worker answers
 * with its version, and the picture fetcher gives back only what a card
 * shows, from https addresses.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { Effect, Option } from "effect";
import { localApi } from "./local.ts";

const picture = new Uint8Array([137, 80, 78, 71]);

/** The web, as the tests see it: one picture and one page. */
const web = new Map([
  ["https://example.com/photo", { type: "image/png", bytes: picture }],
  ["https://example.com/page.html", { type: "text/html", bytes: picture }],
]);

const app = localApi((url) =>
  Effect.succeed(Option.fromNullishOr(web.get(url.href))),
);

const call = (method: string, path: string) =>
  app.handler(
    new Request(`https://cards.timmo.dev${path}`, {
      method,
      headers: { "cf-connecting-ip": "192.0.2.1" },
    }),
  );

afterAll(() => app.dispose());

describe("health", () => {
  test("answers anyone, with the version", async () => {
    const health = await call("GET", "/api/health");

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({
      version: { id: "local", timestamp: null },
    });
  });

  test("there's nothing else: no cards, devices, pairing or presets", async () => {
    for (const path of [
      "/api/cards",
      "/api/devices",
      "/api/presets",
      "/api/status",
    ]) {
      expect((await call("GET", path)).status).toBe(404);
    }

    expect((await call("POST", "/api/pair")).status).toBe(404);
  });
});

describe("fetch", () => {
  const fetchFrom = (url: string) =>
    call("GET", `/api/fetch?url=${encodeURIComponent(url)}`);

  test("needs no Turnstile key locally", async () => {
    const response = await call("GET", "/api/fetch/key");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sitekey: null });
  });

  test("a picture comes back with its type", async () => {
    const response = await fetchFrom("https://example.com/photo");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(picture);
  });

  test("only https, and only what a card shows", async () => {
    expect((await fetchFrom("http://example.com/photo")).status).toBe(400);
    expect((await fetchFrom("not an address")).status).toBe(400);
    expect((await fetchFrom("https://example.com/page.html")).status).toBe(404);
    expect((await fetchFrom("https://example.com/missing.png")).status).toBe(
      404,
    );
  });
});
