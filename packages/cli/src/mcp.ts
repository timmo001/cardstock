/**
 * The MCP server: the CLI's operations as tools. A card is a spec the agent
 * keeps and passes in as JSON text; it goes out only as its link. Failures
 * come back as the tool's result, so an agent reads them and carries on.
 * None of the tools removes anything.
 */
import { BunStdio } from "@effect/platform-bun";
import {
  PictureFit,
  PicturePage,
  type ShuffleOptions,
  tones,
} from "@timmo001/cardstock-card";
import {
  Effect,
  type FileSystem,
  Layer,
  Option,
  type Path,
  Schema,
} from "effect";
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/ai";
import type { HttpClient } from "effect/http";
import {
  CardstockError,
  cardLink,
  cardRead,
  cardShuffle,
  status,
  templateList,
} from "./operations.ts";
import { cardExport } from "./export.ts";
import { type MediaAs, mediaAdd } from "./media.ts";
import { presetList, presetSave } from "./presets.ts";
import type { Settings } from "./settings.ts";

const tool = <const Name extends string, P extends Schema.Struct.Fields>(
  name: Name,
  description: string,
  parameters: P,
) =>
  Tool.make(name, {
    description,
    parameters: Schema.Struct(parameters),
    success: Schema.Unknown,
    failure: CardstockError,
    failureMode: "return",
  });

/** A tool that takes nothing, which MCP wants as an empty object schema. */
const bareTool = <const Name extends string>(name: Name, description: string) =>
  Tool.make(name, {
    description,
    parameters: Tool.EmptyParams,
    success: Schema.Unknown,
    failure: CardstockError,
    failureMode: "return",
  });

const specField = { spec: Schema.String };

const Status = bareTool("status", "Whether the server answers, and its version")
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const CardLink = tool(
  "card_link",
  "The card's link, with the whole card sealed in it and stored nowhere, from a spec given as JSON text. Whoever holds the link can open the card. Its pictures, video and music load from their web addresses. edit is the same card opened in the web app's editor as a new card, for the user to carry on with",
  specField,
)
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const CardRead = tool(
  "card_read",
  "The spec of the card sealed in a link, to change and pass to card_link for a new link. A link already sent can't change",
  { link: Schema.String },
)
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const MediaAdd = tool(
  "media_add",
  "Add a picture, video or music to a card spec from its public https url, and return the changed spec with the new media id. The card loads it from that address each time it opens, so it travels in the card's link; find free ones with the docs' Where to find pictures guide. Use it as the front picture, the inside picture, a picture laid over the rest (as picture, on the page on names: front, left for the inside cover or right for the page with the message; call it again for each one, and later ones lie on top), the page background (filling the page behind the card, dimmed a little, in the viewer and exports) or the music. A video plays, muted and looping, where a picture would, one per page. To use a picture as the background too, set background to its media id in the spec. fit says where a picture sits: frame (in a box: the design's frame on the front, the inside cover's upper part, or a band above the message; boxes on one page share it), fill (the whole page, with the title or message kept readable over it) or behind (washed into the paper behind the front's design or the message)",
  {
    ...specField,
    url: Schema.String,
    as: Schema.optionalKey(
      Schema.Literals(["front", "inside", "picture", "background", "music"]),
    ),
    fit: Schema.optionalKey(PictureFit),
    on: Schema.optionalKey(PicturePage),
  },
)
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const CardShuffle = tool(
  "card_shuffle",
  'Pick a card at random for an occasion and tone, as a spec to change and pass to card_link; occasion such as "Mum\'s 60th" (any cheerful one when left out), tone one of funny, cheeky, punny, dry, heartfelt or sweet. Sad occasions stay heartfelt',
  {
    occasion: Schema.optionalKey(Schema.String),
    tone: Schema.optionalKey(Schema.Literals(tones)),
  },
)
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const CardExport = tool(
  "card_export",
  "Save a card spec for a chat as files in a folder: kinds still (PNG of the front), mp4 and gif (the card opening); all three when kinds is left out",
  {
    ...specField,
    kinds: Schema.optionalKey(
      Schema.Array(Schema.Literals(["still", "mp4", "gif"])),
    ),
    out: Schema.String,
  },
).annotate(Tool.Destructive, false);

const TemplateList = bareTool(
  "template_list",
  "List the ready-made cards, each with its category, tone and the spec it starts as",
)
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const PresetList = bareTool(
  "preset_list",
  "List the presets kept on this device",
)
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

const PresetSave = tool(
  "preset_save",
  "Save a preset on this device, given as JSON text; one with the same name is replaced",
  { spec: Schema.String },
).annotate(Tool.Destructive, false);

const Tools = Toolkit.make(
  Status,
  CardLink,
  CardRead,
  MediaAdd,
  CardShuffle,
  CardExport,
  TemplateList,
  PresetList,
  PresetSave,
);

/** What the operations need from the CLI: its settings, HTTP and files. */
type Needs =
  HttpClient.HttpClient | Settings | FileSystem.FileSystem | Path.Path;

/** The handlers, each given the CLI's own settings, HTTP client and files. */
const handlers = Effect.gen(function* () {
  const context = yield* Effect.context<Needs>();

  const run = <A, E>(effect: Effect.Effect<A, E, Needs>) =>
    Effect.provide(effect, context);

  return {
    media_add: (input: {
      readonly spec: string;
      readonly url: string;
      readonly as?: MediaAs;
      readonly fit?: PictureFit;
      readonly on?: PicturePage;
    }) =>
      run(
        mediaAdd({
          spec: input.spec,
          url: input.url,
          as: Option.fromNullishOr(input.as),
          fit: Option.fromNullishOr(input.fit),
          on: Option.fromNullishOr(input.on),
        }),
      ),
    status: () => run(status()),
    card_link: ({ spec }: { readonly spec: string }) => run(cardLink(spec)),
    card_read: ({ link }: { readonly link: string }) => cardRead(link),
    template_list: () => Effect.succeed(templateList()),
    card_shuffle: (input: ShuffleOptions) => cardShuffle(input),
    card_export: ({
      spec,
      kinds,
      out,
    }: {
      readonly spec: string;
      readonly kinds?: ReadonlyArray<"still" | "mp4" | "gif">;
      readonly out: string;
    }) => run(cardExport({ spec, kinds: kinds ?? [], out })),
    preset_list: () => run(presetList()),
    preset_save: ({ spec }: { readonly spec: string }) => run(presetSave(spec)),
  };
});

const server = (
  registrations: Layer.Layer<never, never, McpServer.McpServer>,
) =>
  registrations.pipe(
    Layer.provide(
      McpServer.layerStdio({
        name: "cardstock",
        version: "0.0.0",
        protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25],
      }),
    ),
    Layer.provide(BunStdio.layer),
  );

/** Serves the operations over MCP on stdio. */
export const serveMcp = Effect.fn("serveMcp")(function* () {
  const implementation = yield* handlers;

  const registrations = McpServer.toolkit(Tools).pipe(
    Layer.provide(Tools.toLayer(Effect.succeed(implementation))),
  );

  return yield* Layer.launch(server(registrations));
});
