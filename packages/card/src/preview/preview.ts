/**
 * The preview page's script: mounts a card in each design and effect, picked
 * with the page's controls or `?design=…&effect=…`, `&stage=out` or
 * `&stage=open` to start there, `&webgl` to draw with the WebGL 2 fallback,
 * `&og` to size it as the 1200 by 630 link preview, and
 * `&picture=frame|fill|behind` to put a painted test picture on the front
 * that way, `&inside=frame|fill|behind` to put it inside, and
 * `&size=landscape|square|tall` for a card that isn't portrait, `&backdrop`
 * to put the test picture on the page behind the card, with `&video`
 * to make the test picture a moving one, and
 * `&opening=grow|letter|page` for a card that opens into a full view
 * (`&stage=full` to start there). The page's body
 * carries the GPU API as `data-backend` and the card's stage as `data-stage`,
 * so a browser check can read both from the DOM.
 */
import { Effect, Schema } from "effect";
import { cardSizes, designIds, effectIds, openings } from "../registry.ts";
import {
  backdropOf,
  mountCard,
  showBackdrop,
  stages,
} from "../render/index.ts";
import { Card, WebSource } from "../schema.ts";

const params = new URLSearchParams(location.search);
const form = document.querySelector("form");
const canvas = document.querySelector("canvas");

/** Fills a picker with `options`, choosing the one the address names. */
const pick = (name: string, options: readonly string[]) => {
  const select = form?.querySelector(`select[name="${name}"]`);

  const chosen =
    options.find((option) => option === params.get(name)) ?? options[0];

  if (select instanceof HTMLSelectElement) {
    for (const option of options) {
      select.add(new Option(option, option, false, option === chosen));
    }

    select.addEventListener("change", () => form?.requestSubmit());
  }

  return chosen;
};

if (params.has("og")) document.body.dataset["og"] = "";

const design = pick("design", designIds);
const effect = pick("effect", effectIds);
const fits = ["frame", "fill", "behind"] as const;
const pictureId = "preview-picture-000000";

/** A dusk sky over hills, painted here so the preview needs no file. */
const testPicture = Effect.promise(() => {
  const canvas = new OffscreenCanvas(1200, 900);
  const paint = canvas.getContext("2d");

  if (paint !== null) {
    const sky = paint.createLinearGradient(0, 0, 0, 900);

    sky.addColorStop(0, "#28305e");
    sky.addColorStop(0.55, "#d9776b");
    sky.addColorStop(1, "#f4c27a");
    paint.fillStyle = sky;
    paint.fillRect(0, 0, 1200, 900);
    paint.fillStyle = "#fff3cf";
    paint.beginPath();
    paint.arc(820, 420, 90, 0, Math.PI * 2);
    paint.fill();

    for (const [y, colour] of [
      [560, "#3b3f6e"],
      [650, "#2a2d52"],
      [740, "#1b1d38"],
    ] as const) {
      paint.fillStyle = colour;
      paint.beginPath();
      paint.moveTo(0, 900);
      paint.lineTo(0, y);

      for (let x = 0; x <= 1200; x += 60) {
        paint.lineTo(x, y - Math.sin(x / 170 + y) * 50);
      }

      paint.lineTo(1200, 900);
      paint.fill();
    }
  }

  return createImageBitmap(canvas).then(
    (bitmap) => new Map([[pictureId, bitmap]]),
  );
});

/**
 * A moving test picture: a sun crossing the dusk sky, drawn on a canvas and
 * streamed into a video element, so the preview needs no video file.
 */
const testVideo = Effect.promise(async () => {
  const canvas = document.createElement("canvas");

  canvas.width = 640;
  canvas.height = 480;

  const paint = canvas.getContext("2d");
  const started = performance.now();

  const frame = () => {
    if (paint === null) return;

    const t = (performance.now() - started) / 1000;
    const sky = paint.createLinearGradient(0, 0, 0, 480);

    sky.addColorStop(0, "#28305e");
    sky.addColorStop(0.55, "#d9776b");
    sky.addColorStop(1, "#f4c27a");
    paint.fillStyle = sky;
    paint.fillRect(0, 0, 640, 480);
    paint.fillStyle = "#fff3cf";
    paint.beginPath();
    paint.arc(
      320 + Math.sin(t) * 220,
      220 + Math.cos(t) * 60,
      48,
      0,
      Math.PI * 2,
    );
    paint.fill();
    paint.fillStyle = "#1b1d38";
    paint.fillRect(0, 380, 640, 100);
    requestAnimationFrame(frame);
  };

  frame();

  const video = document.createElement("video");

  video.muted = true;
  video.playsInline = true;
  video.srcObject = canvas.captureStream(30);
  await video.play();

  return new Map([[pictureId, { video, width: 640, height: 480 }]]);
});

const program = Effect.gen(function* () {
  if (canvas === null) return;

  const fit = fits.find((each) => each === params.get("picture"));
  const insideFit = fits.find((each) => each === params.get("inside"));
  const moving = params.has("video");
  const behind = params.has("backdrop");

  const images =
    fit === undefined && insideFit === undefined && !behind
      ? undefined
      : yield* moving ? testVideo : testPicture;

  const words = {
    to: "Dear Sam,",
    message:
      "Wishing you a calm, bright end to the year, and plenty of good things in the next one.\n\nSee you soon.",
    from: "Alex",
  };

  const spec = {
    version: 1,
    occasion: "Preview",
    design,
    size: cardSizes.find((each) => each === params.get("size")) ?? "portrait",
    opening: openings.find((each) => each === params.get("opening")) ?? "card",
    effect,
    front:
      fit === undefined
        ? { title: "Season's Greetings" }
        : { title: "Season's Greetings", image: pictureId, fit },
    inside:
      insideFit === undefined
        ? words
        : { ...words, image: pictureId, fit: insideFit },
    media:
      images === undefined
        ? []
        : [
            {
              id: pictureId,
              kind: moving ? "video" : "image",
              type: moving ? "video/webm" : "image/png",
              source: WebSource.make({ url: "https://example.com/preview" }),
            },
          ],
  };

  const card = yield* Schema.decodeUnknownEffect(Card)(
    behind ? { ...spec, background: pictureId } : spec,
  );

  const backdrop = backdropOf(card, images);

  if (backdrop !== undefined) showBackdrop(document.body, backdrop);

  const showStage = (stage: string) => {
    document.body.dataset["stage"] = stage;
  };

  const view = yield* mountCard(canvas, card, {
    images,
    onStage: showStage,
    forceWebGL: params.has("webgl"),
  });

  const start = stages.find((stage) => stage === params.get("stage"));

  if (start !== undefined) view.seek(start);

  document.body.dataset["backend"] = view.backend;
  showStage(view.stage());
  canvas.focus();

  return yield* Effect.never;
});

Effect.runFork(Effect.scoped(program));
