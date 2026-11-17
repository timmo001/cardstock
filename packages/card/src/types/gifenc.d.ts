/** The parts of gifenc Cardstock uses; the package ships no types of its own. */
declare module "gifenc" {
  export type Palette = number[][];

  export interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        readonly palette?: Palette;
        readonly delay?: number;
        readonly repeat?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(options?: { readonly auto?: boolean }): Encoder;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { readonly format?: "rgb565" | "rgb444" | "rgba4444" },
  ): Palette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;
}
