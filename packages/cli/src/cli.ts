#!/usr/bin/env bun
/**
 * The `cardstock` CLI: shuffles cards and puts a card spec in its link, with
 * the whole card sealed in it, adds pictures, video and music by web
 * address, saves a card for a chat, and keeps presets on this device. There
 * are no accounts or keys to set up. Every command that returns data takes
 * `--json` for scripts and agents; `agent tools` prints the Code Mode
 * manifest and `mcp` serves the same operations over MCP. Built to the
 * Groundwork cli-tool template.
 */
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { cardFormatVersion, tones } from "@timmo001/cardstock-card";
import { Console, Effect, FileSystem, Layer, Option } from "effect";
import { Command, Flag } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { cardExport, exportKinds } from "./export.ts";
import { mediaAdd } from "./media.ts";
import { serveMcp } from "./mcp.ts";
import {
  CardstockError,
  cardLink,
  cardShuffle,
  status,
  templateList,
} from "./operations.ts";
import { presetList, presetSave } from "./presets.ts";
import { Settings } from "./settings.ts";

const json = Flag.Boolean("json").pipe(
  Flag.withDescription("Print JSON for scripts and agents instead of text"),
  Flag.withDefault(false),
);

/** A card spec: `--spec` with the JSON itself, or `--file` with a path to it. */
const specFlags = {
  spec: Flag.String("spec").pipe(
    Flag.withDescription("The card spec, as JSON"),
    Flag.optional,
  ),
  file: Flag.String("file").pipe(
    Flag.withDescription("A file holding the card spec as JSON"),
    Flag.optional,
  ),
};

/** A preset: `--spec` with the JSON itself, or `--file` with a path to it. */
const presetFlags = {
  spec: Flag.String("spec").pipe(
    Flag.withDescription("The preset, as JSON"),
    Flag.optional,
  ),
  file: Flag.String("file").pipe(
    Flag.withDescription("A file holding the preset as JSON"),
    Flag.optional,
  ),
};

const readSpec = Effect.fn("readSpec")(function* (options: {
  readonly spec: Option.Option<string>;
  readonly file: Option.Option<string>;
  readonly what?: string;
}) {
  if (Option.isSome(options.spec)) return options.spec.value;

  if (Option.isSome(options.file)) {
    const path = options.file.value;

    return yield* (yield* FileSystem.FileSystem)
      .readFileString(path)
      .pipe(
        Effect.mapError(
          (cause) =>
            new CardstockError({ message: `Couldn't read ${path}`, cause }),
        ),
      );
  }

  return yield* new CardstockError({
    message: `Give the ${options.what ?? "card spec"} with --spec or --file`,
  });
});

/** Prints data as JSON, or as the lines `text` makes of it. */
const show = <A>(
  asJson: boolean,
  data: A,
  text: (data: A) => readonly string[],
) =>
  Console.log(asJson ? JSON.stringify(data, null, 2) : text(data).join("\n"));

const linkCard = Command.make(
  "link",
  { json, ...specFlags },
  Effect.fn("linkCard")(function* ({ json, spec, file }) {
    const made = yield* cardLink(yield* readSpec({ spec, file }));

    yield* show(json, made, (done) => [done.url]);
  }),
).pipe(
  Command.withDescription(
    "The card's link, with the whole card sealed in it and stored nowhere",
  ),
);

const shuffle = Command.make(
  "shuffle",
  {
    json,
    occasion: Flag.String("occasion").pipe(
      Flag.withDescription(
        "What it's for, such as \"Mum's 60th\"; any cheerful occasion without it",
      ),
      Flag.optional,
    ),
    tone: Flag.Literals("tone", tones).pipe(
      Flag.withDescription("How the words read; any that suits without it"),
      Flag.optional,
    ),
  },
  // Always JSON, since a spec is; `--json` is taken so every data command has it
  Effect.fn("shuffle")(function* ({ occasion, tone }) {
    const shuffled = yield* cardShuffle({
      ...Option.match(occasion, {
        onNone: () => ({}),
        onSome: (value) => ({ occasion: value }),
      }),
      ...Option.match(tone, {
        onNone: () => ({}),
        onSome: (value) => ({ tone: value }),
      }),
    });

    yield* Console.log(JSON.stringify(shuffled, null, 2));
  }),
).pipe(
  Command.withDescription(
    "Pick a card at random for an occasion and tone, and print its spec",
  ),
);

const card = Command.make("card").pipe(
  Command.withDescription("Shuffle a card, and put a card spec in its link"),
  Command.withSubcommands([linkCard, shuffle]),
);

const mediaAddCommand = Command.make(
  "add",
  {
    json,
    ...specFlags,
    url: Flag.String("url").pipe(
      Flag.withDescription(
        "A picture, video or sound at a public web address; the card loads it from there, so it travels in the card's link. See Where to find pictures in the docs for free ones",
      ),
    ),
    as: Flag.Literals("as", ["front", "inside", "background", "music"]).pipe(
      Flag.withDescription(
        "Use it as the front picture, the inside picture, the page background behind the card or the music",
      ),
      Flag.optional,
    ),
    fit: Flag.Literals("fit", ["frame", "fill", "behind"]).pipe(
      Flag.withDescription(
        "Where a picture sits: in a frame, filling the front or inside cover, or behind the design or message",
      ),
      Flag.optional,
    ),
  },
  Effect.fn("mediaAddCommand")(function* ({ json, spec, file, url, as, fit }) {
    const added = yield* mediaAdd({
      spec: yield* readSpec({ spec, file }),
      url,
      as,
      fit,
    });

    // A spec from a file is changed in place; one given inline comes back
    if (Option.isSome(file)) {
      yield* (yield* FileSystem.FileSystem)
        .writeFileString(file.value, `${JSON.stringify(added.spec, null, 2)}\n`)
        .pipe(
          Effect.mapError(
            (cause) =>
              new CardstockError({
                message: `Couldn't write ${file.value}`,
                cause,
              }),
          ),
        );
    }

    yield* show(json, added, (media) => [
      `Added ${media.kind} ${media.mediaId} as the ${slotNames[media.as]}`,
      ...(Option.isSome(file)
        ? [`Saved the card in ${file.value}`]
        : [JSON.stringify(media.spec, null, 2)]),
    ]);
  }),
).pipe(
  Command.withDescription(
    "Add a picture, video or music to a card spec from its web address",
  ),
);

const slotNames = {
  front: "front picture",
  inside: "inside picture",
  background: "page background",
  music: "music",
} as const;

const media = Command.make("media").pipe(
  Command.withDescription(
    "Add pictures, videos and music to cards by web address",
  ),
  Command.withSubcommands([mediaAddCommand]),
);

const presetSaveCommand = Command.make(
  "save",
  { json, ...presetFlags },
  Effect.fn("presetSaveCommand")(function* ({ json, spec, file }) {
    const saved = yield* presetSave(
      yield* readSpec({ spec, file, what: "preset" }),
    );

    yield* show(json, saved, (done) => [
      `${done.replaced ? "Replaced" : "Saved"} preset ${done.name}`,
    ]);
  }),
).pipe(
  Command.withDescription("Save a preset; one with the same name is replaced"),
);

const presetListCommand = Command.make(
  "list",
  { json },
  Effect.fn("presetListCommand")(function* ({ json }) {
    const presets = yield* presetList();

    yield* show(json, presets, (all) =>
      all.length === 0
        ? ["No presets yet"]
        : all.map((preset) =>
            [
              preset.name,
              preset.design,
              preset.effect,
              preset.from === undefined ? undefined : `from "${preset.from}"`,
            ]
              .filter((part) => part !== undefined)
              .join("  "),
          ),
    );
  }),
).pipe(Command.withDescription("List your presets"));

const templateListCommand = Command.make(
  "list",
  { json },
  Effect.fn("templateListCommand")(function* ({ json }) {
    yield* show(json, templateList(), (all) =>
      all.map((each) =>
        [
          each.id,
          each.category,
          each.tone,
          each.spec.design,
          each.spec.front.title,
        ].join("  "),
      ),
    );
  }),
).pipe(
  Command.withDescription(
    "List the ready-made cards, with the spec each one starts as",
  ),
);

const templateCommand = Command.make("template").pipe(
  Command.withDescription("Ready-made cards to start from"),
  Command.withSubcommands([templateListCommand]),
);

const preset = Command.make("preset").pipe(
  Command.withDescription("Save and list what you reuse from card to card"),
  Command.withSubcommands([presetSaveCommand, presetListCommand]),
);

const exportCommand = Command.make(
  "export",
  {
    json,
    ...specFlags,
    still: Flag.Boolean("still").pipe(
      Flag.withDescription("Save a picture of the front, as a PNG"),
      Flag.withDefault(false),
    ),
    mp4: Flag.Boolean("mp4").pipe(
      Flag.withDescription("Save the card opening, as an MP4"),
      Flag.withDefault(false),
    ),
    gif: Flag.Boolean("gif").pipe(
      Flag.withDescription("Save the card opening, as a GIF"),
      Flag.withDefault(false),
    ),
    out: Flag.String("out").pipe(
      Flag.withDescription("The folder to save in"),
      Flag.withDefault("."),
    ),
  },
  Effect.fn("exportCommand")(function* ({
    json,
    spec,
    file,
    still,
    mp4,
    gif,
    out,
  }) {
    const kinds = exportKinds.filter((kind) => ({ still, mp4, gif })[kind]);

    const saved = yield* cardExport({
      spec: yield* readSpec({ spec, file }),
      kinds,
      out,
    });

    yield* show(json, saved, (done) =>
      done.files.map(
        (file) => `Saved ${file.path} (${Math.round(file.bytes / 1024)} KB)`,
      ),
    );
  }),
).pipe(
  Command.withDescription(
    "Save a card spec for a chat: --still (PNG), --mp4, --gif; all three without any",
  ),
);

const statusCommand = Command.make(
  "status",
  { json },
  Effect.fn("statusCommand")(function* ({ json }) {
    const current = yield* status();

    yield* show(json, current, (state) =>
      state.reachable
        ? [
            `Server: ${state.server} (version ${state.version?.id ?? "unknown"})`,
          ]
        : [`Server: ${state.server}`, "The server can't be reached right now"],
    );
  }),
).pipe(
  Command.withDescription("Show whether the server answers, and its version"),
);

/** Every operation, for Code Mode, with whether it changes anything. */
const operations = [
  ["status", "Show whether the server answers, and its version", "read"],
  [
    "card link",
    "The card's link, with the whole card sealed in it and stored nowhere (--spec JSON or --file)",
    "read",
  ],
  [
    "card shuffle",
    "Pick a card at random for an occasion (--occasion) and tone (--tone funny, cheeky, punny, dry, heartfelt or sweet), and print its spec",
    "read",
  ],
  [
    "template list",
    "List the ready-made cards, with the spec each one starts as",
    "read",
  ],
  [
    "media add",
    "Add a picture, video or music to a card spec from its public web address (--url; --spec JSON, or --file, which is changed in place)",
    "write",
  ],
  [
    "export",
    "Save a card spec for a chat as files (--spec JSON or --file; --still PNG, --mp4, --gif; --out folder)",
    "write",
  ],
  ["preset list", "List the presets kept on this device", "read"],
  [
    "preset save",
    "Save a preset on this device (--spec JSON or --file); one with the same name is replaced",
    "write",
  ],
] as const;

const agentTools = Command.make(
  "tools",
  { json },
  Effect.fn("agentTools")(function* () {
    yield* Console.log(
      JSON.stringify(
        {
          tool: "cardstock",
          operations: operations.map(([name, description, access]) => ({
            name,
            description,
            access,
            command: ["cardstock", ...name.split(" "), "--json"],
          })),
        },
        null,
        2,
      ),
    );
  }),
).pipe(Command.withDescription("Print the Code Mode manifest as JSON"));

const agent = Command.make("agent").pipe(
  Command.withDescription("Agent surfaces"),
  Command.withSubcommands([agentTools]),
);

const mcp = Command.make("mcp", {}, () => serveMcp()).pipe(
  Command.withDescription("Serve the operations over MCP on stdio"),
);

const cli = Command.make("cardstock").pipe(
  Command.withDescription(
    "Greeting cards your agent makes, opened as a 3D paper card",
  ),
  Command.withSubcommands([
    card,
    templateCommand,
    media,
    preset,
    exportCommand,
    statusCommand,
    agent,
    mcp,
  ]),
);

cli.pipe(
  Command.run({ version: `0.0.0 (card format ${cardFormatVersion})` }),
  Effect.provide(
    Settings.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(BunServices.layer, FetchHttpClient.layer),
      ),
    ),
  ),
  BunRuntime.runMain,
);
