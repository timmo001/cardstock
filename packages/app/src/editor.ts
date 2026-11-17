/**
 * The card page at `/cards/<id>`, and `/cards/new` for a new one: the
 * card's words, design and effect beside a live 3D preview, Save, Delete,
 * and the card in a link. Its pictures, video and music come from web
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
  type Media,
  type MediaId,
  newCardId,
  type OpeningValue,
  openings,
  newMediaId,
  PictureFit,
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
  mountCard,
  type Picture,
  showBackdrop,
  stages,
} from "@timmo001/cardstock-card/render";
import {
  DirtyState,
  GwButton,
  GwCopy,
  GwDialog,
  GwInput,
  GwMenuButton,
  GwSegmented,
  GwSelect,
  GwSwitch,
  h,
} from "@timmo001/groundwork-ui";
import { Effect, Exit, Match, Option, Schema, Scope } from "effect";
import { cardPictures, deleteCard, findCard, saveCard } from "./card-store.ts";
import {
  phArrowLeft,
  phDownloadSimple,
  phEnvelopeSimple,
  phImage,
  phMusicNotes,
  phShuffle,
  phTrash,
} from "./icons.ts";
import { takeCopy } from "./copy.ts";
import { decodePicture, run, webFile } from "./picture.ts";

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
const linksSection = page?.querySelector(".card-links");
const wholeButton = page?.querySelector(".card-whole-new");
const wholeDialog = page?.querySelector(".card-whole-dialog");
const wholeCopy = wholeDialog?.querySelector(".card-whole-copy");
const exportMenu = page?.querySelector(".card-export");
const shuffleMenu = page?.querySelector(".card-shuffle");

/** Whether the back lists the web addresses the card's files load from. */
const footnoteSwitch = () => {
  const found = form?.querySelector(".card-footnote");

  return found instanceof GwSwitch ? found : undefined;
};

/** The picture and music rows, each with From a link and Remove. */
const slots = {
  front: {
    row: page?.querySelector(".card-picture"),
    web: page?.querySelector(".card-picture-web"),
    remove: page?.querySelector(".card-picture-remove"),
    none: "None yet. The design decorates the front.",
  },
  inside: {
    row: page?.querySelector(".card-inside"),
    web: page?.querySelector(".card-inside-web"),
    remove: page?.querySelector(".card-inside-remove"),
    none: "None yet. The message has the inside to itself.",
  },
  background: {
    row: page?.querySelector(".card-background"),
    web: page?.querySelector(".card-background-web"),
    remove: page?.querySelector(".card-background-remove"),
    none: "None yet. The card sits on a plain page.",
  },
  music: {
    row: page?.querySelector(".card-music"),
    web: page?.querySelector(".card-music-web"),
    remove: page?.querySelector(".card-music-remove"),
    none: "None yet. The card opens to its own sounds.",
  },
} as const;

const webDialog = page?.querySelector(".card-web-dialog");
const webUse = webDialog?.querySelector(".card-web-use");
const webUrl = webDialog?.querySelector("gw-input[name='web-url']");

type Slot = keyof typeof slots;

/** The slots that take a picture or a video. */
type PictureSlot = Exclude<Slot, "music">;

/** The picture slots on the card itself, each with its own "Sits" picker. */
type FittedSlot = Exclude<PictureSlot, "background">;

const fitField = {
  front: "fit",
  inside: "insideFit",
} as const satisfies { readonly [S in FittedSlot]: keyof Fields };

const isFitted = (slot: Slot): slot is FittedSlot =>
  slot === "front" || slot === "inside";

const useFront = page?.querySelector(".card-background-front");

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
const types = {
  front: pictureTypes,
  inside: pictureTypes,
  background: pictureTypes,
  music: new Map([
    ["mp3", "audio/mpeg"],
    ["ogg", "audio/ogg"],
    ["oga", "audio/ogg"],
    ["opus", "audio/ogg"],
    ["m4a", "audio/mp4"],
    ["wav", "audio/wav"],
    ["flac", "audio/flac"],
  ]),
} as const;

/**
 * The card's pictures and music as they are in the editor, each by its web
 * address. The background can be the front's own, so two slots can hold one
 * file.
 */
interface ChosenMedia {
  front: Media | undefined;
  inside: Media | undefined;
  background: Media | undefined;
  music: Media | undefined;
}

const slotNames = ["front", "inside", "background", "music"] as const;

const chosen: ChosenMedia = {
  front: undefined,
  inside: undefined,
  background: undefined,
  music: undefined,
};

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
  readonly fit: string;
  readonly insideFit: string;
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
  "fit",
  "insideFit",
] as const satisfies ReadonlyArray<keyof Fields>;

const fitNames = {
  fit: {
    frame: "In the frame",
    fill: "Filling the front",
    behind: "Behind the design",
  },
  insideFit: {
    frame: "Framed on the left page",
    fill: "Filling the left page",
    behind: "Behind the message",
  },
} satisfies {
  readonly [Name in (typeof fitField)[FittedSlot]]: {
    readonly [Fit in PictureFit]: string;
  };
};

const isPictureFit = Schema.is(PictureFit);

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
    fit: value("fit"),
    insideFit: value("insideFit"),
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
  fit: card.front.fit ?? "frame",
  insideFit: card.inside.fit ?? "frame",
  footnote: card.footnote === true ? "on" : "",
});

const toCard = Schema.decodeUnknownOption(Card);

const isDesignId = Schema.is(DesignId);

/**
 * The card the fields describe, with the picture and music chosen now.
 * `None` while they don't make a card yet.
 */
const cardOf = (fields: Fields, occasion?: string) => {
  const image = chosen.front;
  const insideImage = chosen.inside;
  const music = chosen.music;
  const background = chosen.background;

  // Framed is how a card without a fit shows, so it's left unnamed
  const front =
    image === undefined
      ? { title: fields.title }
      : isPictureFit(fields.fit) && fields.fit !== "frame"
        ? { title: fields.title, image: image.id, fit: fields.fit }
        : { title: fields.title, image: image.id };

  const words =
    fields.to.trim() === ""
      ? { message: fields.message, from: fields.from }
      : { message: fields.message, from: fields.from, to: fields.to };

  const inside =
    insideImage === undefined
      ? words
      : isPictureFit(fields.insideFit) && fields.insideFit !== "frame"
        ? { ...words, image: insideImage.id, fit: fields.insideFit }
        : { ...words, image: insideImage.id };

  const spec = {
    version: 1,
    occasion: fields.occasion || occasion,
    design: fields.design,
    effect: fields.effect,
    front,
    inside,
    // The background can be the front's own file, which is listed once
    media: [
      ...new Map(
        [image, insideImage, background, music].flatMap((media) =>
          media === undefined ? [] : [[media.id, media] as const],
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

  const scored = music === undefined ? opened : { ...opened, music: music.id };

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
  linksSection?.setAttribute("hidden", "");
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
let wanted: CardStage = "out";
let images: ReadonlyMap<string, Picture> = new Map();

const showStage = () => {
  if (stagePicker instanceof GwSegmented) stagePicker.value = wanted;
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

  stagePicker.value = wanted;
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

  const mounted = await Effect.runPromiseExit(
    Scope.provide(scope)(
      mountCard(canvas, card, {
        images,
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

  const { stages: own } = mounted.value;

  // A stage this opening doesn't pass through gives way to its front, or its
  // full view when it has no front
  if (!own.includes(wanted)) wanted = own.includes("out") ? "out" : "full";

  showStages(own);
  mounted.value.seek(wanted);
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

// Picture and music

/** What a row says about the file in it, crediting an Unsplash photo as the back does. */
const describeMedia = (slot: Slot, media: Media | undefined) => {
  if (media === undefined) return slots[slot].none;

  const kind =
    slot === "music" ? "track" : media.kind === "video" ? "video" : "picture";

  return Match.valueTags(media.source, {
    Unsplash: (photo) => `Photo by ${photo.photographer} on Unsplash`,
    Web: (found) => `A ${kind} from ${new URL(found.url).host}`,
  });
};

const showSlot = (slot: Slot) => {
  const { row, remove, web } = slots[slot];
  const media = chosen[slot];

  row?.setAttribute("description", describeMedia(slot, media));
  remove?.toggleAttribute("hidden", media === undefined);

  if (slot !== "music") {
    const unchosen = media === undefined;

    if (isFitted(slot))
      field(fitField[slot])?.toggleAttribute("hidden", unchosen);
  }

  // The background can take the front's own picture or video in one tap
  useFront?.toggleAttribute(
    "hidden",
    chosen.front === undefined || chosen.background?.id === chosen.front.id,
  );

  const kind = slot === "music" ? "track" : "picture";

  web?.setAttribute(
    "label",
    media === undefined ? `Add a ${kind} from a link` : `Change the ${kind}`,
  );
};

/**
 * Puts a file from its web address in a slot. The card loads it from there
 * each time, so it travels in the card's link. The address's extension
 * decides its type, then the type the site gives.
 */
const readWeb = async (slot: Slot, address: string) => {
  const url = URL.parse(address.trim());

  if (url === null || url.protocol !== "https:") {
    return "Paste an address that starts with https://.";
  }

  const fetched = await run(webFile(url.href).pipe(Effect.exit));

  if (Exit.isFailure(fetched)) {
    return "That address didn't load. Check it opens in a new tab, and that it's a picture, video or track rather than a page.";
  }

  const extension = url.pathname.split(".").at(-1)?.toLowerCase() ?? "";
  const known = new Set(types[slot].values());

  const type =
    types[slot].get(extension) ??
    (known.has(fetched.value.type) ? fetched.value.type : undefined);

  if (type === undefined) {
    return slot === "music"
      ? "That isn't an MP3, Ogg, M4A, WAV or FLAC track."
      : "That isn't a PNG, JPEG, WebP, GIF, AVIF or SVG picture, or an MP4 or WebM video.";
  }

  const source = WebSource.make({ url: url.href });

  if (slot !== "music") {
    return await usePicture(slot, fetched.value.bytes, type, source);
  }

  chosen.music = {
    id: Effect.runSync(newMediaId),
    kind: "audio",
    type,
    source,
  };

  return undefined;
};

/**
 * Drops a picture slot's decoded picture from the preview's pictures, unless
 * another slot shows the same file.
 */
const forgetPicture = (slot: PictureSlot) => {
  const id = chosen[slot]?.id;

  if (id === undefined) return;

  const shared = slotNames.some(
    (other) => other !== slot && chosen[other]?.id === id,
  );

  if (!shared) images = new Map([...images].filter(([each]) => each !== id));
};

/** Puts a picture from the web in a picture slot, once it's read for the preview. */
const usePicture = async (
  slot: PictureSlot,
  bytes: Uint8Array,
  type: string,
  source: Media["source"],
) => {
  const id = Effect.runSync(newMediaId);
  const decoded = await Effect.runPromiseExit(decodePicture(bytes, type));
  const kind = type.startsWith("video/") ? "video" : "image";

  if (Exit.isFailure(decoded))
    return `That ${kind === "video" ? "video" : "picture"} couldn't be read.`;

  forgetPicture(slot);
  images = new Map([...images, [id, decoded.value]]);
  chosen[slot] = { id, kind, type, source };

  return undefined;
};

/** Puts a card's own files in their slots. */
const fillSlots = (card: Card) => {
  const named = (id: MediaId | undefined) =>
    card.media.find((each) => each.id === id);

  chosen.front = named(card.front.image);
  chosen.inside = named(card.inside.image);
  chosen.background = named(card.background);
  chosen.music = named(card.music);
};

/** Fills the slots from a card and loads its pictures for the preview. */
const startFrom = async (card: Card) => {
  fillSlots(card);

  const pictures = await run(cardPictures(card).pipe(Effect.exit));

  if (Exit.isSuccess(pictures)) images = pictures.value;
};

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

  // Edit a copy starts from the card the viewer left
  const copy =
    isNew && search.has("copy")
      ? Option.getOrUndefined(await Effect.runPromise(takeCopy))
      : undefined;

  if (copy !== undefined) await startFrom(copy);

  for (const slot of slotNames) showSlot(slot);

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
    fit: "frame",
    insideFit: "frame",
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

  /** Everything Save would send: the fields, and which picture and track. */
  const current = () => ({
    ...readFields(),
    picture: chosen.front?.id ?? "",
    insidePicture: chosen.inside?.id ?? "",
    backgroundPicture: chosen.background?.id ?? "",
    track: chosen.music?.id ?? "",
  });

  const dirty = new DirtyState<ReturnType<typeof current>>();

  // A template's words aren't saved yet, so Save starts on for them
  dirty.start(
    template === undefined
      ? current()
      : {
          ...blank,
          picture: "",
          insidePicture: "",
          backgroundPicture: "",
          track: "",
        },
  );
  dirty.subscribe((changed) => {
    saveButton?.toggleAttribute("disabled", !changed);
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
  linksSection?.removeAttribute("hidden");

  const first = cardOf(start, "Card");

  if (Option.isSome(first)) void preview(first.value);

  const changed = () => {
    dirty.update(current());
    schedulePreview();
  };

  form?.addEventListener("input", changed);
  form?.addEventListener("change", changed);

  /** The slot whose From a link was pressed, while its dialog asks. */
  let webSlot: Slot | undefined;

  for (const slot of slotNames) {
    const { web, remove } = slots[slot];

    web?.addEventListener("click", () => {
      if (!(webDialog instanceof GwDialog)) return;

      webSlot = slot;

      if (webUrl instanceof GwInput) {
        const media = chosen[slot];

        webUrl.value = media === undefined ? "" : webAddress(media);
        webUrl.error = "";
      }

      webDialog.show();
    });

    remove?.addEventListener("click", () => {
      if (slot !== "music") forgetPicture(slot);

      chosen[slot] = undefined;
      showSlot(slot);
      showSlot("background");
      changed();
    });
  }

  webUse?.addEventListener("click", () => {
    const slot = webSlot;

    if (
      !(webUrl instanceof GwInput) ||
      !(webDialog instanceof GwDialog) ||
      slot === undefined
    ) {
      return;
    }

    const using = readWeb(slot, webUrl.value).then((trouble) => {
      if (trouble !== undefined) {
        webUrl.error = trouble;
        webUrl.focus();

        return;
      }

      webDialog.close("used");
      showProblem(undefined);
      showSlot(slot);
      showSlot("background");
      changed();
    });

    if (webUse instanceof GwButton) void webUse.waitFor(using);
  });

  useFront?.addEventListener("click", () => {
    if (chosen.front === undefined) return;

    forgetPicture("background");
    chosen.background = chosen.front;
    showSlot("background");
    changed();
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

  const save = async () => {
    const fields = readFields();
    const occasionField = field("occasion");

    if (occasionField instanceof GwInput) occasionField.error = "";

    if (fields.occasion === "") {
      if (occasionField instanceof GwInput) {
        occasionField.error = "Say what it's for, such as Christmas.";
        occasionField.focus();
      }

      return;
    }

    const card = cardOf(fields);

    if (Option.isNone(card)) {
      showProblem("Something in the card isn't right. Check each field.");

      return;
    }

    const savedNow = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const id = cardId ?? (yield* newCardId);

        yield* saveCard(id, card.value);

        return id;
      }),
    );

    if (Exit.isFailure(savedNow)) {
      showProblem(
        "Couldn't keep the card on this device. Check the browser has room to store it.",
      );

      return;
    }

    showProblem(undefined);

    const wasNew = cardId === undefined;

    cardId = savedNow.value;
    saved = card.value;
    dirty.markClean();
    showSaved();

    if (wasNew) history.replaceState(null, "", `/cards/${cardId}`);
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

exportMenu?.addEventListener("select", (event) => {
  if (
    !(event instanceof CustomEvent) ||
    !(exportMenu instanceof GwMenuButton)
  ) {
    return;
  }

  const kind: unknown = event.detail?.value;
  const card = cardOf(readFields(), "Card");

  if (!isExportKind(kind) || Option.isNone(card)) return;

  exportMenu.loading = true;
  showProblem(undefined);

  void Effect.runPromiseExit(exportCard(card.value, kind, { images })).then(
    async (made) => {
      exportMenu.loading = false;

      if (Exit.isFailure(made)) {
        const error = Option.getOrUndefined(Exit.findErrorOption(made));

        showProblem(error?.message ?? "Couldn't save the card for a chat.");

        return;
      }

      await deliver(
        new File([made.value], exportName(card.value, kind), {
          type: exportTypes[kind].type,
        }),
      );
    },
  );
});

for (const [element, icon] of [
  [header, phEnvelopeSimple],
  [exportMenu, phDownloadSimple],
  [shuffleMenu, phShuffle],
  [header?.querySelector(".card-back"), phArrowLeft],
  [deleteButton, phTrash],
  [slots.front.web, phImage],
  [slots.inside.web, phImage],
  [slots.music.web, phMusicNotes],
  [slots.front.remove, phTrash],
  [slots.inside.remove, phTrash],
  [slots.music.remove, phTrash],
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

  if (select.name === "fit" || select.name === "insideFit") {
    const names = fitNames[select.name];

    select.options = PictureFit.literals.map((id) => ({
      value: id,
      label: names[id],
    }));
  }
}

showPalettes();

await program();
