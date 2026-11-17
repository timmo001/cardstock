/**
 * Videos on the paper: loading one into a playing element the renderer can
 * draw from, and holding them all on one moment, so an export draws the same
 * frame every time.
 */
import type { MovingPicture } from "../designs/define.ts";

/**
 * A video, loaded and playing. It starts muted, as browsers only play a
 * muted video before a tap, and loops, so the card never stops moving.
 */
export const loadVideo = async (blob: Blob): Promise<MovingPicture> => {
  const video = document.createElement("video");

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener(
      "error",
      () => reject(new Error("That video couldn't be read")),
      { once: true },
    );
  });

  // A browser that won't play it by itself still shows its first frame
  await video.play().catch(() => undefined);

  return { video, width: video.videoWidth, height: video.videoHeight };
};

/** Stops `video` on the frame `seconds` in, looping round as it plays. */
export const holdVideo = async (video: HTMLVideoElement, seconds: number) => {
  video.pause();

  // A live stream has no frames to seek to, so it holds where it is
  if (!Number.isFinite(video.duration) || video.duration <= 0) return;

  const at = seconds % video.duration;

  if (Math.abs(video.currentTime - at) < 0.001) return;

  const seeked = new Promise<void>((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
  });

  video.currentTime = at;
  await seeked;
};
