/**
 * The card's sounds, through Web Audio: the envelope's flap, the card sliding
 * out and the cover turning, as short CC0 samples (see README.md), and the
 * card's own music, which loops once the card is open. Browsers keep audio
 * silent until a tap, so `wake` is called from the first one. A mute turns
 * the whole board down at once.
 */
import { Effect, Option } from "effect";
import flapUrl from "./flap.mp3";
import openUrl from "./open.mp3";
import slideUrl from "./slide.mp3";

export type CardSound = "flap" | "slide" | "open";

const urls = { flap: flapUrl, slide: slideUrl, open: openUrl } satisfies {
  readonly [Sound in CardSound]: string;
};

export interface SoundBoardOptions {
  /** The card's music, as encoded audio, when it has some. */
  readonly music?: ArrayBuffer | undefined;
  readonly muted: boolean;
}

export interface SoundBoard {
  /** Lets audio play; call it from a tap or a key press. */
  readonly wake: () => void;
  /** Plays a sound, `delay` seconds from now. */
  readonly play: (sound: CardSound, delay?: number) => void;
  /** Starts the card's music, fading in, looping until the page closes. */
  readonly startMusic: () => void;
  readonly muted: () => boolean;
  readonly setMuted: (muted: boolean) => void;
}

/** How long the music takes to fade in, and the level it settles at. */
const musicFade = { seconds: 2.5, level: 0.6 };

export const soundBoard = Effect.fnUntraced(function* (
  options: SoundBoardOptions,
) {
  const context = new AudioContext();
  const master = context.createGain();
  let muted = options.muted;

  master.gain.value = muted ? 0 : 1;
  master.connect(context.destination);

  /** Decodes audio, or `undefined` when the browser can't, so it's skipped. */
  const decode = (bytes: ArrayBuffer) =>
    Effect.tryPromise(() => context.decodeAudioData(bytes)).pipe(
      Effect.option,
      Effect.map(Option.getOrUndefined),
    );

  const load = (url: string) =>
    Effect.tryPromise(() =>
      fetch(url).then((response) => response.arrayBuffer()),
    ).pipe(
      Effect.flatMap(decode),
      Effect.orElseSucceed(() => undefined),
    );

  const [flap, slide, open] = yield* Effect.all(
    [load(urls.flap), load(urls.slide), load(urls.open)],
    { concurrency: "unbounded" },
  );

  const samples = { flap, slide, open };

  const music =
    options.music === undefined ? undefined : yield* decode(options.music);

  let musicStarted = false;

  yield* Effect.addFinalizer(() =>
    Effect.promise(() => context.close()).pipe(Effect.ignore),
  );

  return {
    wake: () => {
      if (context.state === "suspended") void context.resume();
    },
    play: (sound, delay = 0) => {
      const buffer = samples[sound];

      if (buffer === undefined) return;

      const source = context.createBufferSource();

      source.buffer = buffer;
      source.connect(master);
      source.start(context.currentTime + delay);
    },
    startMusic: () => {
      if (musicStarted || music === undefined) return;

      musicStarted = true;

      const source = context.createBufferSource();
      const fade = context.createGain();
      const now = context.currentTime;

      source.buffer = music;
      source.loop = true;
      fade.gain.setValueAtTime(0, now);
      fade.gain.linearRampToValueAtTime(
        musicFade.level,
        now + musicFade.seconds,
      );
      source.connect(fade);
      fade.connect(master);
      source.start(now);
    },
    muted: () => muted,
    setMuted: (next) => {
      muted = next;
      master.gain.setTargetAtTime(next ? 0 : 1, context.currentTime, 0.05);
    },
  } satisfies SoundBoard;
});
