/**
 * The editor's WebMCP tools: an agent in the browser makes and changes the
 * card on this page through the editor's own code, so the person watches the
 * preview change as it works, and Save, the link and Save for a chat do what
 * their buttons do. Each tool's input schema and the decoding of what the
 * agent sends come from one Effect schema. It does nothing where the browser
 * has no `document.modelContext`.
 * Spec: https://webmachinelearning.github.io/webmcp/
 */
import {
  cardSizes,
  designIds,
  effectIds,
  openings,
  PictureFit,
  templates,
  tones,
} from "@timmo001/cardstock-card";
import { type ExportKind, exportKinds } from "@timmo001/cardstock-card/export";
import type {
  ToolArguments,
  ToolResult,
} from "@timmo001/groundwork-tokens/webmcp";
import { Result, Schema } from "effect";

const described = <S extends Schema.Top>(schema: S, description: string) =>
  schema.annotate({ description });

const MakeCard = Schema.Struct({
  template: Schema.optionalKey(
    described(
      Schema.Literals(templates.map((each) => each.id)),
      "A ready-made card to start from, by its id.",
    ),
  ),
  spec: Schema.optionalKey(
    described(
      Schema.String,
      "A whole card to start from, as its spec's JSON text, such as get-card or the CLI's card read gives. Its pictures and music come with it.",
    ),
  ),
  occasion: Schema.optionalKey(
    described(
      Schema.String,
      "What it's for, such as Mum's 60th. Without a template, Shuffle picks words that suit it.",
    ),
  ),
  tone: Schema.optionalKey(
    described(
      Schema.Literals(tones),
      "How Shuffle's words read, when there's no template.",
    ),
  ),
});

const SetWords = Schema.Struct({
  occasion: Schema.optionalKey(
    described(Schema.String, "What it's for. Only the sender sees it."),
  ),
  title: Schema.optionalKey(described(Schema.String, "The front's title.")),
  to: Schema.optionalKey(
    described(Schema.String, "Who it's to, above the message; empty for none."),
  ),
  message: Schema.optionalKey(described(Schema.String, "The message inside.")),
  from: Schema.optionalKey(
    described(Schema.String, "Who it's from, under the message."),
  ),
});

const SetDesign = Schema.Struct({
  design: Schema.optionalKey(Schema.Literals(designIds)),
  palette: Schema.optionalKey(
    described(
      Schema.String,
      "One of the design's colourways; the design's first when it changes without one.",
    ),
  ),
  effect: Schema.optionalKey(Schema.Literals(effectIds)),
  size: Schema.optionalKey(Schema.Literals(cardSizes)),
  opening: Schema.optionalKey(
    described(
      Schema.Literals(openings),
      "card opens its cover; grow opens, then fills the screen; letter is a sheet from an envelope; page is shown flat.",
    ),
  ),
});

const AddPicture = Schema.Struct({
  url: described(
    Schema.String,
    "The public https address of a picture (PNG, JPEG, WebP, GIF, AVIF or SVG) or video (MP4 or WebM).",
  ),
  on: described(
    Schema.Literals(["front", "left", "right", "background"]),
    "front, left for the inside cover, right for the page with the message, or background for behind the card.",
  ),
  fit: Schema.optionalKey(
    described(
      PictureFit,
      "frame puts it in a box, fill fills its page, behind washes it pale under the design or the message. frame when left out.",
    ),
  ),
});

const SetMusic = Schema.Struct({
  url: described(
    Schema.String,
    "The public https address of a track (MP3, Ogg, M4A, WAV or FLAC).",
  ),
});

const SaveFor = Schema.Struct({
  kind: described(
    Schema.Literals(exportKinds),
    "still is a PNG of the front; mp4 and gif are the card opening.",
  ),
});

/** No input: an empty object, which agents read better than Struct({})'s "anything but null". */
const Nothing = Schema.Record(Schema.String, Schema.Never);

export type MakeCardInput = typeof MakeCard.Type;

export type WordsInput = typeof SetWords.Type;

export type DesignInput = typeof SetDesign.Type;

export type PictureInput = typeof AddPicture.Type;

/**
 * What the tools ask of the editor. Each answers with what went wrong, in
 * words for the agent, or nothing when it worked.
 */
export interface EditorActions {
  /** The card as it stands now, as its spec, with its link. */
  readonly read: () => Promise<
    { readonly spec: unknown; readonly link: string } | string
  >;
  readonly start: (input: MakeCardInput) => Promise<string | undefined>;
  readonly words: (input: WordsInput) => string | undefined;
  readonly design: (input: DesignInput) => string | undefined;
  readonly picture: (input: PictureInput) => Promise<string | undefined>;
  readonly music: (url: string) => Promise<string | undefined>;
  readonly save: () => Promise<string | undefined>;
  readonly saveFor: (kind: ExportKind) => Promise<string | undefined>;
}

const text = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
});

/** A tool from its schema, decoding what the agent sends before it runs. */
const tool = <S extends Schema.Codec<unknown, unknown>>(
  name: string,
  description: string,
  input: S,
  run: (decoded: S["Type"]) => Promise<string>,
  readOnly = false,
) => ({
  name,
  description,
  inputSchema: Schema.toJsonSchemaDocument(input).schema,
  annotations: { readOnlyHint: readOnly },
  // The browser hands over whatever the agent sent, typed by Groundwork's
  // WebMCP declaration; this tool's own schema decodes it
  execute: async (sent: ToolArguments) => {
    const decoded = Schema.decodeUnknownResult(input)(sent);

    if (Result.isFailure(decoded)) {
      return text(
        `That input doesn't fit the tool: ${decoded.failure.message}`,
      );
    }

    return text(await run(decoded.success));
  },
});

/** The answer for an action that worked, or what went wrong. */
const answer = (trouble: string | undefined, done: string) => trouble ?? done;

/** Registers the editor's tools, where the browser offers WebMCP. */
export const registerEditorTools = (actions: EditorActions) => {
  const context = document.modelContext;

  if (context === undefined) return;

  const tools = [
    tool(
      "get-card",
      "Reads the card in the editor as its spec, and its link with the whole card sealed in it. Whoever holds the link can open the card.",
      Nothing,
      async () => {
        const read = await actions.read();

        return Schema.is(Schema.String)(read)
          ? read
          : JSON.stringify(read, null, 2);
      },
      true,
    ),
    tool(
      "make-card",
      "Starts the card in the editor over: from a ready-made card by its template id, from a whole card's spec, or picked by Shuffle for an occasion and tone. A spec brings its own pictures and music; otherwise they're cleared. The preview shows it at once; nothing is kept until save.",
      MakeCard,
      async (input) =>
        answer(
          await actions.start(input),
          "Started the card. Change its words with set-words and its look with set-design.",
        ),
    ),
    tool(
      "set-words",
      "Changes the card's words: the occasion, the front's title, who it's to, the message and who it's from. Only the ones given change. Write warmly and specifically, without inventing facts about anyone.",
      SetWords,
      async (input) => answer(actions.words(input), "Changed the words."),
    ),
    tool(
      "set-design",
      "Changes how the card looks: its design, colourway, effect, size and how it opens. Only the ones given change.",
      SetDesign,
      async (input) => answer(actions.design(input), "Changed the design."),
    ),
    tool(
      "add-picture",
      "Adds a picture or video by its public web address, laid over the others on its page, or sets the background behind the card. The card loads it from that address each time it opens. A page plays one video at a time.",
      AddPicture,
      async (input) =>
        answer(await actions.picture(input), "Added the picture."),
    ),
    tool(
      "set-music",
      "Sets the music that plays once the card opens, by the track's public web address.",
      SetMusic,
      async ({ url }) => answer(await actions.music(url), "Set the music."),
    ),
    tool(
      "save",
      "Keeps the card on this device, as Save does. It needs an occasion.",
      Nothing,
      async () =>
        answer(
          await actions.save(),
          "Saved on this device. Call get-card for its link to send.",
        ),
    ),
    tool(
      "export",
      "Saves the card for a chat, as Save for a chat does: a still of the front (PNG), or a video (MP4) or GIF of it opening. It's shared on a phone and downloaded elsewhere.",
      SaveFor,
      async ({ kind }) =>
        answer(await actions.saveFor(kind), `Saved the card as ${kind}.`),
    ),
  ];

  for (const each of tools) void context.registerTool(each);
};
