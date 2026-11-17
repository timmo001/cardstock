/**
 * Whether cards play sound on this device: the viewer's mute button and the
 * Settings page's switch, kept in localStorage so the choice stays here.
 */
import { Effect } from "effect";

const mutedKey = "cardstock:muted";

export const readMuted = Effect.try(
  () => localStorage.getItem(mutedKey) === "true",
).pipe(Effect.orElseSucceed(() => false));

export const saveMuted = (muted: boolean) =>
  Effect.try(() => localStorage.setItem(mutedKey, String(muted))).pipe(
    Effect.ignore,
  );
