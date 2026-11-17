/**
 * The card page at `/cards/<id>`, and `/cards/new` for a new one: the
 * card's words, design and pictures beside a live 3D preview, Save, Delete,
 * and the card in a link. The form is in panels, one open at a time, by the
 * part of the card each changes. Its pictures, video and music come from web
 * addresses, and Save keeps it on this device alone; it goes out only as its
 * link, with the whole card sealed in it.
 */
import {
  Card,
  CardId,
  type CardSizeValue,
  cardSizes,
  sizeOf,
  type DesignIdValue,
  designIds,
  type EffectIdValue,
  effectIds,
  layersOf,
  type Media,
  type MediaId,
  newCardId,
  type OpeningValue,
  openings,
  newMediaId,
  openWholeCardUrl,
  PictureFit,
  type PicturePage,
  templateById,
  shuffleCard,
  webAddress,
  WebSource,
  wholeCardUrl,
  toneNames,
  tones,
  DesignId,
  paletteIds,
  type PaletteIdValue,
} from "@timmo001/cardstock-card";
import {
  exportCard,
  type ExportKind,
  exportKinds,
  exportName,
  exportTypes,
} from "@timmo001/cardstock-card/export";
import {
  backdropOf,
  type CardStage,
  type CardView,
  coloursOf,
  designs,
  type Picture,
  showBackdrop,
  stages,
} from "@timmo001/cardstock-card/render";
import { type SoundBoard, soundBoard } from "@timmo001/cardstock-card/sounds";
import {
  DirtyState,
  GwButton,
  GwCopy,
  GwDialog,
  GwInput,
  GwMenuButton,
  GwPopover,
  GwSegmented,
  GwSelect,
  GwSwitch,
  h,
  type MenuItem,
} from "@timmo001/groundwork-ui";
import { Effect, Exit, Match, Option, Schema, Scope } from "effect";
import { cardPictures, deleteCard, findCard, saveCard } from "./card-store.ts";
import {
  phArrowDown,
  phArrowLeft,
  phArrowUp,
  phDotsThreeVertical,
  phDownloadSimple,
  phEnvelopeSimple,
  phImage,
  phLinkSimple,
  phMusicNotes,
  phPlus,
  phShuffle,
  phTrash,
} from "./icons.ts";
import { takeCopy } from "./copy.ts";
import { registerEditorTools } from "./editor-tools.ts";
import { decodePicture, run, webBytes, webFile } from "./picture.ts";
import { playCard } from "./player.ts";
import { readMuted } from "./sound.ts";

const page = document.querySelector("gw-stack.card");
const header = page?.querySelector("gw-page-header");
const problem = page?.querySelector(".card-problem");
const missing = page?.querySelector(".card-missing");
const editor = page?.querySelector(".card-editor");
const stageBox = page?.querySelector(".card-stage");
const stagePicker = page?.querySelector(".card-view");
const form = page?.querySelector("form.card-form");
const saveButton = form?.querySelector("gw-button[type='submit']");
const deleteButton = page?.querySelector(".card-delete");
const deleteDialog = page?.querySelector(".card-delete-dialog");
const wholeButton = page?.querySelector(".card-whole-new");
const wholeDialog = page?.querySelector(".card-whole-dialog");
const wholeCopy = wholeDialog?.querySelector(".card-whole-copy");
const exportMenu = page?.querySelector(".card-export");
const shuffleMenu = page?.querySelector(".card-shuffle");
const webPopover = page?.querySelector(".card-web-popover");
const webUse = webPopover?.querySelector(".card-web-use");
const webUrl = webPopover?.querySelector("gw-input[name='web-url']");
const backgroundAdd = page?.querySelector(".card-add-background");

/** Whether the back lists the web addresses the card's files load from. */
const footnoteSwitch = () => {
  const found = form?.querySelector(".card-footnote");

  return found instanceof GwSwitch ? found : undefined;
};

/**
 * The editor's lists: the front's pictures, the inside's (on the left or
 * the right page), and the one background and track.
 */
type ListName = "front" | "inside" | "background" | "music";

/** The lists that hold any number of pictures, laid in order. */
type PictureList = "front" | "inside";

/** A picture or video on a page, as the editor holds it. */
interface Item {
  readonly media: Media;
  readonly on: PicturePage;
  readonly fit: PictureFit;
}

const pictures = { front: Array.of<Item>(), inside: Array.of<Item>() };
let background: Media | undefined;
let music: Media | undefined;

const laidItems = () => [...pictures.front, ...pictures.inside];

const isPictureList = (list: ListName): list is PictureList =>
  list === "front" || list === "inside";

const pictureTypes = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
  ["avif", "image/avif"],
  ["svg", "image/svg+xml"],
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
]);

/**
 * The files a card shows, by extension, as the CLI takes them. Browsers
 * disagree on some types, such as Ogg, so the extension decides, then the
 * type the site gives.
 */
const musicTypes = new Map([
  ["mp3", "audio/mpeg"],
  ["ogg", "audio/ogg"],
  ["oga", "audio/ogg"],
  ["opus", "audio/ogg"],
  ["m4a", "audio/mp4"],
  ["wav", "audio/wav"],
  ["flac", "audio/flac"],
]);

const designNames = {
  christmas: "Christmas",
  birthday: "Birthday",
  anniversary: "Anniversary",
  any: "Any occasion",
} satisfies { readonly [Id in DesignIdValue]: string };

const effectNames = {
  none: "None",
  snow: "Falling snow",
  confetti: "Confetti",
  hearts: "Rising hearts",
  sparkle: "Sparkle",
} satisfies { readonly [Id in EffectIdValue]: string };

const sizeNames = {
  portrait: "Portrait",
  landscape: "Landscape",
  square: "Square",
  tall: "Tall",
} satisfies { readonly [Id in CardSizeValue]: string };

const openingNames = {
  card: "As a card",
  grow: "Card, then full screen",
  letter: "Letter, full screen",
  page: "Full screen only",
} satisfies { readonly [Id in OpeningValue]: string };

const paletteNames = {
  green: "Green",
  red: "Red",
  midnight: "Midnight",
  cream: "Cream",
  blush: "Blush",
  sage: "Sage",
  navy: "Navy",
  white: "White",
  kraft: "Kraft",
  sky: "Sky",
  ink: "Ink",
} satisfies { readonly [Id in PaletteIdValue]: string };

/** How a picture sits, as its menu offers it. */
const fitLabels = {
  fill: "Full",
  frame: "In a box",
  behind: "Behind",
} satisfies { readonly [Fit in PictureFit]: string };

/** Where a picture sits, as its row says it. */
const placeNames = {
  front: {
    fill: "Filling the front",
    frame: "In a box on the front",
    behind: "Behind the front's design",
  },
  left: {
    fill: "Filling the left page",
    frame: "In a box on the left page",
    behind: "Behind, on the left page",
  },
  right: {
    fill: "Filling the right page, under the message",
    frame: "In a box above the message",
    behind: "Behind the message",
  },
} satisfies {
  readonly [Page in PicturePage]: { readonly [Fit in PictureFit]: string };
};

const pageNames = {
  left: "Left page",
  right: "Right page",
} as const;

/** Fills the Colours picker with the chosen design's colourways. */
const showPalettes = () => {
  const design = field("design")?.value ?? "";
  const picker = field("palette");

  if (!isDesignId(design) || !(picker instanceof GwSelect)) return;

  const ids: readonly PaletteIdValue[] = paletteIds[design];
  const kept = ids.find((id) => id === picker.value) ?? ids[0];

  picker.options = ids.map((id) => {
    const colours = coloursOf({ design, palette: id });

    return {
      value: id,
      label: paletteNames[id],
      swatches: [colours.paper, colours.accent, colours.foil],
    };
  });

  if (kept !== undefined) picker.value = kept;
};

interface Fields {
  readonly occasion: string;
  readonly design: string;
  readonly palette: string;
  readonly effect: string;
  readonly size: string;
  readonly opening: string;
  readonly title: string;
  readonly to: string;
  readonly message: string;
  readonly from: string;
  /** `on` when the back lists the web addresses the files load from. */
  readonly footnote: string;
}

const fieldNames = [
  "occasion",
  "design",
  "palette",
  "effect",
  "size",
  "opening",
  "title",
  "to",
  "message",
  "from",
] as const satisfies ReadonlyArray<keyof Fields>;

const field = (name: keyof Fields) => {
  const found = form?.querySelector(
    `gw-input[name='${name}'], gw-select[name='${name}']`,
  );

  return found instanceof GwInput || found instanceof GwSelect
    ? found
    : undefined;
};

const readFields = (): Fields => {
  const value = (name: keyof Fields) => field(name)?.value ?? "";

  return {
    occasion: value("occasion").trim(),
    design: value("design"),
    palette: value("palette"),
    effect: value("effect"),
    size: value("size"),
    opening: value("opening"),
    title: value("title"),
    to: value("to"),
    message: value("message"),
    from: value("from"),
    footnote: footnoteSwitch()?.checked === true ? "on" : "",
  };
};

const writeFields = (fields: Fields) => {
  for (const name of fieldNames) {
    const each = field(name);

    if (each !== undefined) each.value = fields[name];
  }

  const footnote = footnoteSwitch();

  if (footnote !== undefined) footnote.checked = fields.footnote === "on";

  // The colourways depend on the design, so they're filled once it's set
  showPalettes();

  const picker = field("palette");

  if (picker !== undefined) picker.value = fields.palette;
};

const fieldsOf = (card: Card): Fields => ({
  occasion: card.occasion,
  design: card.design,
  palette: card.palette ?? paletteIds[card.design][0],
  effect: card.effect,
  size: sizeOf(card),
  opening: card.opening ?? openings[0],
  title: card.front.title,
  to: card.inside.to ?? "",
  message: card.inside.message,
  from: card.inside.from,
  footnote: card.footnote === true ? "on" : "",
});

const toCard = Schema.decodeUnknownOption(Card);

const isDesignId = Schema.is(DesignId);

/**
 * The card the fields describe, with the pictures and music in the lists
 * now. `None` while they don't make a card yet. Every picture goes in
 * `pictures`, in the order it's laid.
 */
const cardOf = (fields: Fields, occasion?: string) => {
  const laid = laidItems();

  const words =
    fields.to.trim() === ""
      ? { message: fields.message, from: fields.from }
      : { message: fields.message, from: fields.from, to: fields.to };

  const spec = {
    version: 1,
    occasion: fields.occasion || occasion,
    design: fields.design,
    effect: fields.effect,
    front: { title: fields.title },
    inside: words,
    // The background can be one of the pictures, which is listed once
    media: [
      ...new Map(
        [...laid.map((item) => item.media), background, music].flatMap(
          (media) => (media === undefined ? [] : [[media.id, media] as const]),
        ),
      ).values(),
    ],
  };

  // A design's own colourway is left unnamed, as a card without one takes it
  const own = isDesignId(fields.design)
    ? paletteIds[fields.design][0]
    : undefined;

  const coloured =
    fields.palette === "" || fields.palette === own
      ? spec
      : { ...spec, palette: fields.palette };

  // Portrait is how a card without a size shows, so it's left unnamed too
  const sized =
    fields.size === "" || fields.size === cardSizes[0]
      ? coloured
      : { ...coloured, size: fields.size };

  // And a card that opens as a card
  const opened =
    fields.opening === "" || fields.opening === openings[0]
      ? sized
      : { ...sized, opening: fields.opening };

  // Framed is how a picture without a fit sits, so it's left unnamed
  const pictured =
    laid.length === 0
      ? opened
      : {
          ...opened,
          pictures: laid.map((item) =>
            item.fit === "frame"
              ? { image: item.media.id, on: item.on }
              : { image: item.media.id, on: item.on, fit: item.fit },
          ),
        };

  const scored =
    music === undefined ? pictured : { ...pictured, music: music.id };

  // Off is how a card without a footnote shows
  const noted =
    fields.footnote === "on" ? { ...scored, footnote: true } : scored;

  return toCard(
    background === undefined ? noted : { ...noted, background: background.id },
  );
};

const showProblem = (message: string | undefined) => {
  if (problem === null || problem === undefined) return;

  problem.textContent = message ?? "";
  problem.toggleAttribute("hidden", message === undefined);
};

const showMissing = (heading: string) => {
  editor?.setAttribute("hidden", "");
  deleteButton?.setAttribute("hidden", "");
  missing?.setAttribute("heading", heading);
  missing?.removeAttribute("hidden");
};

// The preview: each change paints a new card on a fresh canvas over the old
// one, which goes once the new one is drawing, so it never blinks

let shown:
  | {
      readonly scope: Scope.Closeable;
      readonly canvas: HTMLCanvasElement;
      readonly view: CardView;
    }
  | undefined;

let generation = 0;

/** The stage the preview is on, kept as it repaints; it starts as a link does. */
let wanted: CardStage | undefined;

let images: ReadonlyMap<string, Picture> = new Map();

const showStage = () => {
  if (stagePicker instanceof GwSegmented && wanted !== undefined) {
    stagePicker.value = wanted;
  }
};

/**
 * The preview's sounds and music, made once for each track rather than for
 * each repaint, so the music plays on while the words change.
 */
let board:
  | {
      readonly track: string;
      readonly sounds: SoundBoard | undefined;
      readonly scope: Scope.Closeable;
    }
  | undefined;

const soundsFor = async () => {
  const track = music === undefined ? "" : music.id;

  if (board?.track === track) return board.sounds;

  const old = board;
  const scope = Effect.runSync(Scope.make());

  const bytes =
    music === undefined
      ? undefined
      : await run(
          webBytes(webAddress(music)).pipe(
            Effect.map((loaded) => new Uint8Array(loaded).buffer),
            Effect.orElseSucceed(() => undefined),
          ),
        );

  const muted = await Effect.runPromise(readMuted);

  // Sound is a bonus: a browser without Web Audio still gets the preview
  const made = await Effect.runPromiseExit(
    Scope.provide(scope)(soundBoard({ music: bytes, muted })),
  );

  board = {
    track,
    sounds: Exit.isSuccess(made) ? made.value : undefined,
    scope,
  };

  if (old !== undefined) {
    await Effect.runPromise(Scope.close(old.scope, Exit.void));
  }

  return board.sounds;
};

const stageNames = {
  sealed: "Envelope",
  out: "Front",
  open: "Inside",
  full: "Full screen",
} satisfies { readonly [Stage in CardStage]: string };

/** Offers the stages the card passes through, hidden when there's only the one. */
const showStages = (own: readonly CardStage[]) => {
  if (!(stagePicker instanceof GwSegmented)) return;

  stagePicker.options = own.map((stage) => ({
    value: stage,
    label: stageNames[stage],
  }));

  showStage();
  stagePicker.toggleAttribute("hidden", own.length < 2);
};

/** The background behind the preview now, and how to take it away. */
let pageBackground:
  { readonly picture: Picture; readonly remove: () => void } | undefined;

/** Shows the card's background behind the preview, swapping it only when it changes. */
const showPageBackground = (box: HTMLElement, picture: Picture | undefined) => {
  if (pageBackground?.picture === picture) return;

  pageBackground?.remove();
  pageBackground =
    picture === undefined
      ? undefined
      : { picture, remove: showBackdrop(box, picture) };
};

const preview = async (card: Card) => {
  if (!(stageBox instanceof HTMLElement)) return;

  const mine = ++generation;

  const canvas = h("canvas", {
    class: "card-canvas",
    tabindex: 0,
    "aria-label": "Preview. Tap it to open the card, and drag it to turn it.",
  });

  stageBox.append(canvas);

  const scope = Effect.runSync(Scope.make());
  const sounds = await soundsFor();

  // It plays as the card's link does, from where it was while it repaints
  const mounted = await Effect.runPromiseExit(
    Scope.provide(scope)(
      playCard(stageBox, canvas, card, {
        images,
        sounds,
        at: wanted,
        onStage: (stage) => {
          wanted = stage;
          showStage();
        },
      }),
    ),
  );

  if (Exit.isFailure(mounted) || mine !== generation) {
    await Effect.runPromise(Scope.close(scope, Exit.void));
    canvas.remove();

    if (Exit.isFailure(mounted) && mine === generation) {
      stageBox.dataset["failed"] = "";
    }

    return;
  }

  delete stageBox.dataset["failed"];

  // A stage this opening doesn't pass through gives way to its first
  wanted = mounted.value.stage();
  showStages(mounted.value.stages);
  showPageBackground(stageBox, backdropOf(card, images));

  const old = shown;

  shown = { scope, canvas, view: mounted.value };

  if (old !== undefined) {
    await Effect.runPromise(Scope.close(old.scope, Exit.void));
    old.canvas.remove();
  }
};

let pending: ReturnType<typeof setTimeout> | undefined;

/** Repaints once typing pauses, rather than on every key. */
const schedulePreview = () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    const card = cardOf(readFields(), "Card");

    if (Option.isSome(card)) void preview(card.value);
  }, 350);
};

/** What changing the card does once the page is set up: Save, then the preview. */
let changed = () => {};

// Pictures, the background and music

const kindNames = {
  image: "picture",
  video: "video",
  audio: "track",
} satisfies { readonly [Kind in Media["kind"]]: string };

const isText = Schema.is(Schema.String);

/** What a row says about its file, crediting an Unsplash photo as the back does. */
const describeMedia = (media: Media) => {
  return Match.valueTags(media.source, {
    Unsplash: (photo) => `Photo by ${photo.photographer} on Unsplash`,
    Web: (found) =>
      `A ${kindNames[media.kind]} from ${new URL(found.url).host}`,
  });
};

/** Drops decoded pictures no list uses any more. */
const prunePictures = () => {
  const used = new Set<string>(laidItems().map((item) => item.media.id));

  if (background !== undefined) used.add(background.id);

  images = new Map([...images].filter(([id]) => used.has(id)));
};

/** Whether a page already plays a video, which it can only do once. */
const hasVideo = (on: PicturePage, except?: Item) =>
  laidItems().some(
    (item) => item !== except && item.on === on && item.media.kind === "video",
  );

const svgNamespace = "http://www.w3.org/2000/svg";

/** A Phosphor icon, as the rows draw it in place of a thumbnail. */
const iconOf = (path: string) => {
  const svg = document.createElementNS(svgNamespace, "svg");
  const drawn = document.createElementNS(svgNamespace, "path");

  svg.setAttribute("viewBox", "0 0 24 24");
  drawn.setAttribute("d", path);
  svg.append(drawn);

  return svg;
};

/** A small square of the picture, cropped to fill it, or an icon for music. */
const thumbOf = (media: Media) => {
  const box = h("span", { class: "card-thumb", "aria-hidden": "true" });
  const picture = images.get(media.id);

  if (media.kind === "audio" || picture === undefined) {
    box.append(iconOf(media.kind === "audio" ? phMusicNotes : phImage));

    return box;
  }

  const size = 96;
  const canvas = h("canvas", { width: size, height: size });
  const paint = canvas.getContext("2d");
  const scale = Math.max(size / picture.width, size / picture.height);
  const width = picture.width * scale;
  const height = picture.height * scale;

  paint?.drawImage(
    "video" in picture ? picture.video : picture,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
  box.append(canvas);

  return box;
};

/** One row of a list: the file's thumbnail, what it is and where, and its menu. */
const rowOf = (
  media: Media,
  where: string,
  items: readonly MenuItem[],
  onSelect: (value: string, menu: HTMLElement) => void,
) => {
  const name = describeMedia(media);

  const menu = h("gw-menu-button", {
    class: "card-row-menu",
    label: `Options for ${name}`,
    icon: phDotsThreeVertical,
    labels: "hide",
    appearance: "plain",
  });

  if (menu instanceof GwMenuButton) menu.items = [...items];

  menu.addEventListener("select", (event) => {
    if (!(event instanceof CustomEvent)) return;

    const value: unknown = event.detail?.value;

    if (isText(value)) onSelect(value, menu);
  });

  return h(
    "div",
    { class: "card-row", role: "listitem" },
    thumbOf(media),
    h(
      "span",
      { class: "card-row-text" },
      h("span", { class: "card-row-name" }, name),
      h("span", { class: "card-row-where" }, where),
    ),
    menu,
  );
};

/** The items every row's menu ends with. */
const changeItems = (kind: string): readonly MenuItem[] => [
  {
    value: "change",
    label: "Change the address",
    icon: phLinkSimple,
    separator: true,
  },
  { value: "remove", label: `Remove the ${kind}`, icon: phTrash },
];

/**
 * A picture's row. The list shows the top one first: it lies over the ones
 * under it, so Bring forward moves it up the list and later in the card's
 * order.
 */
const pictureRow = (list: PictureList, item: Item, index: number) => {
  const items = pictures[list];

  const fits = PictureFit.literals.map((fit): MenuItem => ({
    value: `fit:${fit}`,
    label: fitLabels[fit],
    description: placeNames[item.on][fit],
    checked: item.fit === fit,
    group: "Sits",
  }));

  const sides =
    list === "inside"
      ? (["left", "right"] as const).map((on): MenuItem => ({
          value: `on:${on}`,
          label: pageNames[on],
          checked: item.on === on,
          group: "Page",
        }))
      : [];

  const order: readonly MenuItem[] =
    items.length < 2
      ? []
      : [
          {
            value: "forward",
            label: "Bring forward",
            icon: phArrowUp,
            disabled: index === items.length - 1,
            separator: true,
          },
          {
            value: "back",
            label: "Send back",
            icon: phArrowDown,
            disabled: index === 0,
          },
        ];

  return rowOf(
    item.media,
    placeNames[item.on][item.fit],
    [...fits, ...sides, ...order, ...changeItems("picture")],
    (value, menu) => {
      const at = items.indexOf(item);

      if (at === -1) return;

      if (value.startsWith("fit:")) {
        const fit = PictureFit.literals.find((each) => `fit:${each}` === value);

        if (fit !== undefined) items[at] = { ...item, fit };
      } else if (value.startsWith("on:")) {
        const on = value === "on:right" ? "right" : "left";

        if (item.media.kind === "video" && hasVideo(on, item)) {
          showProblem(
            "That page already plays a video, and a page plays one at a time.",
          );

          return;
        }

        items[at] = { ...item, on };
      } else if (value === "forward" || value === "back") {
        const to = value === "forward" ? at + 1 : at - 1;
        const other = items[to];

        if (other === undefined) return;

        items[to] = item;
        items[at] = other;
      } else if (value === "change") {
        askAddress({ list, item }, menu);

        return;
      } else if (value === "remove") {
        // A background that shares this picture keeps it
        items.splice(at, 1);
        prunePictures();
      }

      showProblem(undefined);
      showLists();
      changed();
    },
  );
};

/** The background's or the music's row, which holds one file at most. */
const singleRow = (list: "background" | "music", media: Media) =>
  rowOf(
    media,
    list === "music"
      ? "Plays once the card is open"
      : laidItems().some((item) => item.media.id === media.id)
        ? "Behind the card, as on the card"
        : "Filling the page behind the card",
    changeItems(list === "music" ? "music" : "background"),
    (value, menu) => {
      if (value === "change") {
        askAddress({ list }, menu);

        return;
      }

      if (list === "music") music = undefined;
      else background = undefined;

      showLists();
      changed();
    },
  );

/** Draws every list's rows, and shows Add where it can take another. */
const showLists = () => {
  for (const list of ["front", "inside", "background", "music"] as const) {
    const box = page?.querySelector(`.card-list[data-list='${list}']`);
    const rows = box?.querySelector(".card-rows");
    const none = box?.querySelector(".card-list-none");
    const add = box?.querySelector(".card-add");

    if (!(rows instanceof HTMLElement)) continue;

    const single = list === "music" ? music : background;

    const made = isPictureList(list)
      ? pictures[list]
          .map((item, index) => pictureRow(list, item, index))
          .toReversed()
      : single === undefined
        ? []
        : [singleRow(list, single)];

    rows.replaceChildren(...made);
    none?.toggleAttribute("hidden", made.length > 0);

    // The background and music take one file, so Add goes once there's one
    add?.toggleAttribute("hidden", !isPictureList(list) && made.length > 0);
  }

  if (backgroundAdd instanceof GwMenuButton) {
    const shared = new Map(
      laidItems()
        .filter((item) => item.media.kind !== "audio")
        .map((item) => [item.media.id, item] as const),
    );

    backgroundAdd.items = [
      { value: "web", label: "From a web address", icon: phLinkSimple },
      ...[...shared.values()].map((item): MenuItem => ({
        value: `use:${item.media.id}`,
        label:
          item.on === "front" ? "A picture on the front" : "A picture inside",
        description: describeMedia(item.media),
        icon: phImage,
      })),
    ];
  }
};

/** What the web address popover fills: a list, and the picture it replaces. */
interface Asking {
  readonly list: ListName;
  readonly item?: Item;
  /** Where a new picture goes and how it sits, when an agent says. */
  readonly on?: PicturePage;
  readonly fit?: PictureFit;
}

let asking: Asking | undefined;

/**
 * Asks for a web address for a list, or to change one already there, in a
 * popover beside the button that asked.
 */
const askAddress = (target: Asking, anchor: Element | null | undefined) => {
  if (!(webPopover instanceof GwPopover)) return;

  asking = target;

  if (webUrl instanceof GwInput) {
    const singles = { music, background, front: undefined, inside: undefined };
    const media = target.item?.media ?? singles[target.list];

    webUrl.value = media === undefined ? "" : webAddress(media);
    webUrl.error = "";
  }

  webPopover.show(anchor ?? undefined);
};

/**
 * Puts a file from its web address in a list, or in place of the picture
 * it changes. The card loads it from there each time, so it travels in the
 * card's link. The address's extension decides its type, then the type the
 * site gives.
 */
const readWeb = async (target: Asking, address: string) => {
  const url = URL.parse(address.trim());

  if (url === null || url.protocol !== "https:") {
    return "Paste an address that starts with https://.";
  }

  const fetched = await run(webFile(url.href).pipe(Effect.exit));

  if (Exit.isFailure(fetched)) {
    return "That address didn't load. Check it opens in a new tab, and that it's a picture, video or track rather than a page.";
  }

  const extension = url.pathname.split(".").at(-1)?.toLowerCase() ?? "";
  const known = target.list === "music" ? musicTypes : pictureTypes;
  const types = new Set(known.values());

  const type =
    known.get(extension) ??
    (types.has(fetched.value.type) ? fetched.value.type : undefined);

  if (type === undefined) {
    return target.list === "music"
      ? "That isn't an MP3, Ogg, M4A, WAV or FLAC track."
      : "That isn't a PNG, JPEG, WebP, GIF, AVIF or SVG picture, or an MP4 or WebM video.";
  }

  const source = WebSource.make({ url: url.href });
  const id = Effect.runSync(newMediaId);

  if (target.list === "music") {
    music = { id, kind: "audio", type, source };

    return undefined;
  }

  const kind = type.startsWith("video/") ? "video" : "image";
  const media: Media = { id, kind, type, source };
  const { list, item: old } = target;

  // A video can't be painted, so a page shows one at most
  const on: PicturePage =
    old?.on ??
    target.on ??
    (list === "front"
      ? "front"
      : kind === "video" && hasVideo("left") && !hasVideo("right")
        ? "right"
        : "left");

  if (isPictureList(list) && kind === "video" && hasVideo(on, old)) {
    return "That page already plays a video, and a page plays one at a time. Add a picture here, or remove the other video first.";
  }

  const decoded = await Effect.runPromiseExit(
    decodePicture(fetched.value.bytes, type),
  );

  if (Exit.isFailure(decoded)) {
    return `That ${kind === "video" ? "video" : "picture"} couldn't be read.`;
  }

  images = new Map([...images, [id, decoded.value]]);

  if (list === "background") {
    background = media;
  } else if (isPictureList(list)) {
    const items = pictures[list];
    const item: Item = { media, on, fit: old?.fit ?? target.fit ?? "frame" };
    const at = old === undefined ? -1 : items.indexOf(old);

    if (at === -1) items.push(item);
    else items[at] = item;

    // The background follows a picture it shared, when that picture changes
    if (old !== undefined && background?.id === old.media.id) {
      background = media;
    }
  }

  prunePictures();

  return undefined;
};

/** Puts a card's own files in the lists, in the order they're laid. */
const fillLists = (card: Card) => {
  const named = (id: MediaId | undefined) =>
    card.media.find((each) => each.id === id);

  pictures.front.length = 0;
  pictures.inside.length = 0;

  for (const layer of layersOf(card)) {
    const media = named(layer.image);

    if (media === undefined) continue;

    const item = { media, on: layer.on, fit: layer.fit ?? "frame" };

    if (layer.on === "front") pictures.front.push(item);
    else pictures.inside.push(item);
  }

  background = named(card.background);
  music = named(card.music);
};

/** Fills the lists from a card and loads its pictures for the preview. */
const startFrom = async (card: Card) => {
  fillLists(card);

  const loaded = await run(cardPictures(card).pipe(Effect.exit));

  if (Exit.isSuccess(loaded)) images = loaded.value;
};

/** Opens one panel at a time: opening one closes the others. */
const panels = [...(form?.querySelectorAll("gw-expansion.card-panel") ?? [])];

for (const panel of panels) {
  panel.addEventListener("toggle", () => {
    if (!panel.hasAttribute("open")) return;

    for (const other of panels) {
      if (other !== panel) other.removeAttribute("open");
    }
  });
}

const program = async () => {
  const segment = location.pathname.split("/")[2] ?? "";
  const isNew = segment === "new";

  let cardId: CardId | undefined;
  let saved: Card | undefined;

  if (!isNew) {
    const id = Schema.decodeUnknownOption(CardId)(segment);

    const found = Option.isNone(id)
      ? Option.none()
      : await Effect.runPromise(findCard(id.value));

    if (Option.isNone(id) || Option.isNone(found)) {
      showMissing("This card isn't on this device");

      return;
    }

    cardId = id.value;
    saved = found.value.card;
    await startFrom(saved);
  }

  const search = new URLSearchParams(location.search);

  // Edit a copy starts from the card the viewer left, and an editor address
  // from the CLI from the card sealed in its fragment, which then leaves the
  // address bar so the card's key doesn't linger in it
  const sealed = isNew && location.hash.length > 1 ? location.hash : "";

  if (sealed !== "")
    history.replaceState(null, "", location.pathname + location.search);

  const copy = !isNew
    ? undefined
    : search.has("copy")
      ? Option.getOrUndefined(await Effect.runPromise(takeCopy))
      : sealed === ""
        ? undefined
        : Option.getOrUndefined(
            await Effect.runPromise(
              openWholeCardUrl(`${location.origin}/c${sealed}`),
            ),
          );

  if (copy !== undefined) await startFrom(copy);

  showLists();

  const blank: Fields = {
    occasion: "",
    design: "any",
    palette: paletteIds.any[0],
    effect: "sparkle",
    size: cardSizes[0],
    opening: openings[0],
    title: "",
    to: "",
    message: "",
    from: "",
    footnote: "",
  };

  // A card started from Browse begins with its template's words, or Shuffle's,
  // and one from a link's Edit a copy with that card
  const template = isNew
    ? (templateById(search.get("template") ?? "") ??
      (search.has("shuffle")
        ? { card: Effect.runSync(shuffleCard()).card }
        : copy === undefined
          ? undefined
          : { card: copy }))
    : undefined;

  const start: Fields =
    saved === undefined
      ? template === undefined
        ? blank
        : fieldsOf(template.card)
      : fieldsOf(saved);

  writeFields(start);

  /** Everything Save would send: the fields, and the files in each list. */
  const current = () => ({
    ...readFields(),
    pictures: JSON.stringify(
      laidItems().map((item) => [item.media.id, item.on, item.fit]),
    ),
    backgroundPicture: background?.id ?? "",
    track: music?.id ?? "",
  });

  const dirty = new DirtyState<ReturnType<typeof current>>();

  // A template's words aren't saved yet, so Save starts on for them
  dirty.start(
    template === undefined
      ? current()
      : { ...blank, pictures: "[]", backgroundPicture: "", track: "" },
  );
  dirty.subscribe((isDirty) => {
    saveButton?.toggleAttribute("disabled", !isDirty);
  });
  saveButton?.toggleAttribute("disabled", !dirty.dirty);
  dirty.update(current());

  const showSaved = () => {
    header?.setAttribute("heading", saved?.occasion ?? "New card");
    document.title = `${saved?.occasion ?? "New card"} · Cardstock`;
    deleteButton?.toggleAttribute("hidden", cardId === undefined);
  };

  showSaved();
  editor?.removeAttribute("hidden");

  const first = cardOf(start, "Card");

  if (Option.isSome(first)) void preview(first.value);

  changed = () => {
    dirty.update(current());
    schedulePreview();
  };

  form?.addEventListener("input", changed);
  form?.addEventListener("change", changed);

  for (const add of page?.querySelectorAll("gw-button.card-add") ?? []) {
    add.addEventListener("click", () => {
      const list = ["front", "inside", "music"].find(
        (each): each is ListName => each === add.getAttribute("data-list"),
      );

      if (list !== undefined) askAddress({ list }, add);
    });
  }

  backgroundAdd?.addEventListener("select", (event) => {
    if (!(event instanceof CustomEvent)) return;

    const value: unknown = event.detail?.value;

    if (value === "web") {
      askAddress({ list: "background" }, backgroundAdd);

      return;
    }

    const shared = laidItems().find((item) => `use:${item.media.id}` === value);

    if (shared === undefined) return;

    background = shared.media;
    showLists();
    changed();
  });

  webUse?.addEventListener("click", () => {
    const target = asking;

    if (
      !(webUrl instanceof GwInput) ||
      !(webPopover instanceof GwPopover) ||
      target === undefined
    ) {
      return;
    }

    const using = readWeb(target, webUrl.value).then((trouble) => {
      if (trouble !== undefined) {
        webUrl.error = trouble;
        webUrl.focus();

        return;
      }

      webPopover.close("used");
      showProblem(undefined);
      showLists();
      changed();
    });

    if (webUse instanceof GwButton) void webUse.waitFor(using);
  });

  // Shuffle keeps what's personal: the occasion typed, who it's to and from
  shuffleMenu?.addEventListener("select", (event) => {
    if (!(event instanceof CustomEvent)) return;

    const value: unknown = event.detail?.value;
    const tone = tones.find((each) => each === value);
    const now = readFields();

    const { card } = Effect.runSync(
      shuffleCard(
        tone === undefined
          ? { occasion: now.occasion }
          : { occasion: now.occasion, tone },
      ),
    );

    writeFields({
      ...fieldsOf(card),
      occasion: now.occasion === "" ? card.occasion : now.occasion,
      to: now.to,
      from: now.from,
    });
    changed();
  });

  stagePicker?.addEventListener("change", () => {
    if (!(stagePicker instanceof GwSegmented)) return;

    const stage = stages.find((each) => each === stagePicker.value);

    if (stage !== undefined) {
      wanted = stage;
      shown?.view.playTo(stage);
    }
  });

  /** Keeps the card on this device, answering with what went wrong. */
  const save = async () => {
    const fields = readFields();
    const occasionField = field("occasion");

    if (occasionField instanceof GwInput) occasionField.error = "";

    if (fields.occasion === "") {
      const trouble = "Say what it's for, such as Christmas.";

      if (occasionField instanceof GwInput) {
        occasionField.error = trouble;
        occasionField.focus();
      }

      return trouble;
    }

    const card = cardOf(fields);

    if (Option.isNone(card)) {
      const trouble = "Something in the card isn't right. Check each field.";

      showProblem(trouble);

      return trouble;
    }

    const savedNow = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const id = cardId ?? (yield* newCardId);

        yield* saveCard(id, card.value);

        return id;
      }),
    );

    if (Exit.isFailure(savedNow)) {
      const trouble =
        "Couldn't keep the card on this device. Check the browser has room to store it.";

      showProblem(trouble);

      return trouble;
    }

    showProblem(undefined);

    const wasNew = cardId === undefined;

    cardId = savedNow.value;
    saved = card.value;
    dirty.markClean();
    showSaved();

    if (wasNew) history.replaceState(null, "", `/cards/${cardId}`);

    return undefined;
  };

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const saving = save();

    if (saveButton instanceof GwButton) void saveButton.waitFor(saving);
  });

  deleteButton?.addEventListener("click", () => {
    if (deleteDialog instanceof GwDialog) deleteDialog.show();
  });

  deleteDialog?.addEventListener("close", () => {
    if (
      !(deleteDialog instanceof GwDialog) ||
      deleteDialog.returnValue !== "delete" ||
      cardId === undefined
    ) {
      return;
    }

    void Effect.runPromiseExit(deleteCard(cardId)).then((deleted) => {
      if (Exit.isFailure(deleted)) {
        showProblem("Couldn't delete the card. Try again.");

        return;
      }

      dirty.dispose();
      location.assign("/");
    });
  });

  wholeButton?.addEventListener("click", () => {
    if (!(wholeDialog instanceof GwDialog) || !(wholeCopy instanceof GwCopy)) {
      return;
    }

    const card = cardOf(readFields());

    if (Option.isNone(card)) {
      showProblem("Something in the card isn't right. Check each field.");

      return;
    }

    void Effect.runPromiseExit(wholeCardUrl(card.value, location.origin)).then(
      (made) => {
        if (Exit.isFailure(made)) {
          showProblem("Couldn't put the card in a link. Try again.");

          return;
        }

        wholeCopy.value = made.value;
        wholeCopy.display = `${location.host}/c#…`;
        wholeDialog.show();
      },
    );
  });

  /** Shows what changed: the lists, Save and the preview. */
  const showChange = () => {
    showLists();
    changed();
  };

  registerEditorTools({
    read: async () => {
      const card = cardOf(readFields(), "Card");

      if (Option.isNone(card)) {
        return "Something in the card isn't right. Check each field.";
      }

      const link = await Effect.runPromiseExit(
        wholeCardUrl(card.value, location.origin),
      );

      return Exit.isSuccess(link)
        ? { spec: card.value, link: link.value }
        : "Couldn't put the card in a link.";
    },
    start: async (input) => {
      const from =
        input.template === undefined
          ? Effect.runSync(
              shuffleCard(
                input.tone === undefined
                  ? { occasion: input.occasion ?? "" }
                  : { occasion: input.occasion ?? "", tone: input.tone },
              ),
            ).card
          : templateById(input.template)?.card;

      if (from === undefined) return "There's no ready-made card with that id.";

      pictures.front.length = 0;
      pictures.inside.length = 0;
      background = undefined;
      music = undefined;
      images = new Map();

      const fields = fieldsOf(from);

      writeFields(
        input.occasion === undefined
          ? fields
          : { ...fields, occasion: input.occasion },
      );
      showChange();

      return undefined;
    },
    words: (input) => {
      writeFields({ ...readFields(), ...input });
      changed();

      return undefined;
    },
    design: (input) => {
      const now = readFields();
      const design = input.design ?? now.design;

      if (!isDesignId(design)) return "Pick a design first.";

      const own: readonly string[] = paletteIds[design];
      const keeps = input.design === undefined || input.design === now.design;
      const palette = input.palette ?? (keeps ? now.palette : own[0]) ?? "";

      if (!own.includes(palette)) {
        return `${palette} isn't one of ${design}'s colourways: ${own.join(", ")}.`;
      }

      writeFields({
        ...now,
        design,
        palette,
        effect: input.effect ?? now.effect,
        size: input.size ?? now.size,
        opening: input.opening ?? now.opening,
      });
      changed();

      return undefined;
    },
    picture: async ({ url, on, fit }) => {
      const list = Match.value(on).pipe(
        Match.when("background", () => "background" as const),
        Match.when("front", () => "front" as const),
        Match.orElse(() => "inside" as const),
      );

      const page = on === "background" ? undefined : on;

      const target: Asking =
        page === undefined
          ? { list }
          : fit === undefined
            ? { list, on: page }
            : { list, on: page, fit };

      const trouble = await readWeb(target, url);

      if (trouble === undefined) showChange();

      return trouble;
    },
    music: async (url) => {
      const trouble = await readWeb({ list: "music" }, url);

      if (trouble === undefined) showChange();

      return trouble;
    },
    save,
    saveFor: saveForChat,
  });
};

// Saving for a chat: the card as it is now, shared where the device can
// share files, such as a phone, and downloaded otherwise

const isExportKind = Schema.is(Schema.Literals(exportKinds));

const deliver = async (file: File) => {
  if (navigator.canShare?.({ files: [file] }) === true) {
    const shared = await Effect.runPromiseExit(
      Effect.tryPromise(() => navigator.share({ files: [file] })),
    );

    // Closing the share sheet isn't a failure, only a change of mind
    if (Exit.isSuccess(shared)) return;
  }

  const url = URL.createObjectURL(file);

  h("a", { href: url, download: file.name }).click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
};

/** Saves the card as it is now for a chat, answering with what went wrong. */
const saveForChat = async (kind: ExportKind) => {
  const card = cardOf(readFields(), "Card");

  if (Option.isNone(card)) {
    return "Something in the card isn't right. Check each field.";
  }

  if (exportMenu instanceof GwMenuButton) exportMenu.loading = true;

  showProblem(undefined);

  const made = await Effect.runPromiseExit(
    exportCard(card.value, kind, { images }),
  );

  if (exportMenu instanceof GwMenuButton) exportMenu.loading = false;

  if (Exit.isFailure(made)) {
    const error = Option.getOrUndefined(Exit.findErrorOption(made));
    const trouble = error?.message ?? "Couldn't save the card for a chat.";

    showProblem(trouble);

    return trouble;
  }

  await deliver(
    new File([made.value], exportName(card.value, kind), {
      type: exportTypes[kind].type,
    }),
  );

  return undefined;
};

exportMenu?.addEventListener("select", (event) => {
  if (!(event instanceof CustomEvent)) return;

  const kind: unknown = event.detail?.value;

  if (isExportKind(kind)) void saveForChat(kind);
});

for (const [element, icon] of [
  [header, phEnvelopeSimple],
  [exportMenu, phDownloadSimple],
  [shuffleMenu, phShuffle],
  [header?.querySelector(".card-back"), phArrowLeft],
  [deleteButton, phTrash],
  [wholeButton, phLinkSimple],
  ...[...(page?.querySelectorAll(".card-add") ?? [])].map(
    (add) => [add, phPlus] as const,
  ),
] as const) {
  element?.setAttribute("icon", icon);
}

if (shuffleMenu instanceof GwMenuButton) {
  shuffleMenu.items = [
    { value: "any", label: "Any", description: "Whatever suits the occasion" },
    ...tones.map((tone) => ({ value: tone, label: toneNames[tone] })),
  ];
}

for (const select of form?.querySelectorAll("gw-select") ?? []) {
  if (!(select instanceof GwSelect)) continue;

  if (select.name === "design") {
    select.options = designIds.map((id) => ({
      value: id,
      label: designNames[id],
      swatches: [
        designs[id].colours.paper,
        designs[id].colours.accent,
        designs[id].colours.foil,
      ],
    }));

    // The colourways follow the design, keeping the choice where it can
    select.addEventListener("change", showPalettes);
  }

  if (select.name === "effect") {
    select.options = effectIds.map((id) => ({
      value: id,
      label: effectNames[id],
    }));
  }

  if (select.name === "size") {
    select.options = cardSizes.map((id) => ({
      value: id,
      label: sizeNames[id],
    }));
  }

  if (select.name === "opening") {
    select.options = openings.map((id) => ({
      value: id,
      label: openingNames[id],
    }));
  }
}

showPalettes();

await program();
