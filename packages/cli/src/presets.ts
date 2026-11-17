/**
 * Presets: what someone reuses from card to card, saved under a name, such
 * as the design and sign-off for family birthdays. They're kept in a file on
 * this device, readable only by you, and never sent anywhere. Saving under a
 * name that's taken replaces that preset.
 */
import { decodePreset, Preset } from "@timmo001/cardstock-card";
import { Effect, FileSystem, Path, Schema } from "effect";
import { describe, fail } from "./operations.ts";
import { Settings } from "./settings.ts";

const PresetsJson = Schema.fromJsonString(Schema.Array(Preset));

/** Every preset kept on this device; none before the first is saved. */
const readAll = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const { presets } = yield* Settings;

  if (!(yield* fs.exists(presets))) return [];

  const text = yield* fs.readFileString(presets);

  return yield* Schema.decodeUnknownEffect(PresetsJson)(text).pipe(
    Effect.mapError(() => fail(`The presets in ${presets} aren't readable`)),
  );
}).pipe(
  Effect.catchTag("PlatformError", (error) =>
    Effect.fail(fail(`Couldn't read your presets: ${error.message}`)),
  ),
);

export const presetList = Effect.fn("presetList")(function* () {
  const presets = yield* readAll;

  return presets.toSorted((a, b) => a.name.localeCompare(b.name));
}, Effect.mapError(describe));

export const presetSave = Effect.fn("presetSave")(function* (specText: string) {
  const preset = yield* decodePreset(specText).pipe(
    Effect.mapError((error) => fail(`That isn't a preset: ${error.message}`)),
  );

  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { presets: file } = yield* Settings;
  const all = yield* readAll;
  const name = preset.name.toLowerCase();
  const replaced = all.some((saved) => saved.name.toLowerCase() === name);

  const next = [
    ...all.filter((saved) => saved.name.toLowerCase() !== name),
    preset,
  ];

  const text = JSON.stringify(
    yield* Schema.encodeEffect(Schema.Array(Preset))(next),
    null,
    2,
  );

  yield* Effect.gen(function* () {
    yield* fs.makeDirectory(path.dirname(file), {
      recursive: true,
      mode: 0o700,
    });
    yield* fs.writeFileString(file, `${text}\n`, { mode: 0o600 });
    // The mode only applies to a new file, so set it on an old one too
    yield* fs.chmod(file, 0o600);
  }).pipe(
    Effect.mapError((error) =>
      fail(`Couldn't save your presets in ${file}: ${error.message}`),
    ),
  );

  return { name: preset.name, replaced, file };
}, Effect.mapError(describe));
