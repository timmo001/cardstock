/**
 * The Browse page at `/browse`: ready-made cards, grouped by category as in a
 * card shop, with a filters sidebar to narrow them by category, occasion,
 * tone and design. Each front is painted flat, without three.js, and opens a
 * new card filled in from it, to change and save with no agent needed. The
 * filters come back as they were left, in this browser.
 */
import {
  categories,
  designIds,
  type DesignIdValue,
  type Template,
  templates,
  toneNames,
  tones,
} from "@timmo001/cardstock-card";
import { paintFront } from "@timmo001/cardstock-card/flat";
import {
  animateLayout,
  type FilterOption,
  GwFilter,
  getStorage,
  h,
} from "@timmo001/groundwork-ui";
import { Effect, Exit, Option, Schema } from "effect";
import { phShuffle, phStorefront } from "./icons.ts";

const page = document.querySelector("gw-stack.browse");
const results = page?.querySelector(".browse-results");
const filterBox = page?.querySelector(".browse-filters");
const shownLine = page?.querySelector(".browse-shown");
const emptyState = page?.querySelector(".browse-empty");

page?.querySelector("gw-page-header")?.setAttribute("icon", phStorefront);

page?.querySelector(".browse-shuffle")?.setAttribute("icon", phShuffle);

document.title = "Browse · Cardstock";

/** Front pictures are painted at this width, sharp on a phone's screen. */
const tileWidth = 360;

const designNames = {
  christmas: "Christmas",
  birthday: "Birthday",
  anniversary: "Anniversary",
  any: "Any occasion",
} satisfies { readonly [Id in DesignIdValue]: string };

interface Facet {
  readonly id: string;
  readonly label: string;
  readonly of: (template: Template) => string;
  readonly options: ReadonlyArray<FilterOption>;
}

const countOf = (of: (template: Template) => string, value: string) =>
  templates.filter((each) => of(each) === value).length;

const optionsOf = (
  of: (template: Template) => string,
  values: ReadonlyArray<readonly [string, string]>,
) =>
  values.flatMap(([value, label]) => {
    const count = countOf(of, value);

    return count === 0 ? [] : [{ value, label, count }];
  });

const occasionOf = (template: Template) => template.card.occasion;

const facets: ReadonlyArray<Facet> = [
  {
    id: "category",
    label: "Category",
    of: (template) => template.category,
    options: optionsOf(
      (template) => template.category,
      categories.map((each) => [each, each] as const),
    ),
  },
  {
    id: "occasion",
    label: "Occasion",
    of: occasionOf,
    options: optionsOf(
      occasionOf,
      [...new Set(templates.map(occasionOf))]
        .toSorted((a, b) => a.localeCompare(b))
        .map((each) => [each, each] as const),
    ),
  },
  {
    id: "tone",
    label: "Tone",
    of: (template) => template.tone,
    options: optionsOf(
      (template) => template.tone,
      tones.map((each) => [each, toneNames[each]] as const),
    ),
  },
  {
    id: "design",
    label: "Design",
    of: (template) => template.card.design,
    options: optionsOf(
      (template) => template.card.design,
      designIds.map((each) => [each, designNames[each]] as const),
    ),
  },
];

const storage = getStorage();
const storageKey = "cardstock:browse:filters";

// Anyone can edit what's kept, so it's read back through a schema
const SavedFilters = Schema.Record(Schema.String, Schema.Array(Schema.String));

const saved = Option.getOrElse(
  Schema.decodeUnknownOption(SavedFilters)(storage.get(storageKey)),
  (): typeof SavedFilters.Type => ({}),
);

const valueOf = (facet: Facet) =>
  (saved[facet.id] ?? []).filter((value) =>
    facet.options.some((option) => option.value === value),
  );

// On a phone the sidebar sits above the cards, so its filters start folded
const narrow = matchMedia("(width < 50rem)").matches;

const filters = facets.map((facet) => {
  const filter = new GwFilter();

  filter.label = facet.label;
  filter.options = facet.options;
  filter.value = valueOf(facet);
  filter.search = facet.options.length > 12 ? "always" : "never";
  filter.expanded = !narrow;
  filter.dataset.facet = facet.id;

  return filter;
});

const tile = (template: Template) => {
  const picture = h("img", {
    class: "browse-front",
    alt: "",
    width: 5,
    height: 7,
  });

  void Effect.runPromiseExit(
    paintFront(template.card, tileWidth).pipe(
      Effect.flatMap((canvas) =>
        Effect.promise(() => canvas.convertToBlob({ type: "image/webp" })),
      ),
    ),
  ).then((painted) => {
    if (Exit.isSuccess(painted)) {
      picture.src = URL.createObjectURL(painted.value);
    }
  });

  return h(
    "a",
    {
      class: "browse-card",
      role: "listitem",
      href: `cards/new?template=${encodeURIComponent(template.id)}`,
      "aria-label": `${template.name}: ${template.card.front.title}`,
      "data-id": template.id,
    },
    picture,
    h("span", { class: "browse-name" }, template.name),
  );
};

// Each tile is painted once and moved between groups as the filters change
const tiles = new Map(templates.map((each) => [each.id, tile(each)]));

const groups = new Map(
  categories.map((category) => {
    const list = h("div", {
      class: "browse-shelf",
      role: "list",
      "aria-label": category,
    });

    return [
      category,
      {
        section: h("gw-section", { heading: category, level: 2 }, list),
        list,
      },
    ] as const;
  }),
);

const matches = (template: Template) =>
  facets.every((facet, index) => {
    const ticked = filters[index]?.value ?? [];

    return ticked.length === 0 || ticked.includes(facet.of(template));
  });

const show = () => {
  const shown = templates.filter(matches);

  for (const [category, group] of groups) {
    const inGroup = shown.filter((each) => each.category === category);

    group.list.replaceChildren(
      ...inGroup.flatMap((each) => tiles.get(each.id) ?? []),
    );
    group.section.hidden = inGroup.length === 0;
  }

  if (shownLine !== null && shownLine !== undefined) {
    shownLine.textContent =
      shown.length === templates.length
        ? `${templates.length} cards`
        : `${shown.length} of ${templates.length} cards`;
  }

  if (emptyState instanceof HTMLElement) emptyState.hidden = shown.length > 0;
};

filterBox?.replaceChildren(...filters);

results?.replaceChildren(...[...groups.values()].map((each) => each.section));

show();

filterBox?.addEventListener("change", () => {
  storage.set(
    storageKey,
    Object.fromEntries(
      facets.map((facet, index) => [
        facet.id,
        [...(filters[index]?.value ?? [])],
      ]),
    ),
  );

  if (results !== null && results !== undefined) {
    void animateLayout(results, show);
  }
});

page?.querySelector(".browse-clear")?.addEventListener("click", () => {
  for (const filter of filters) filter.value = [];

  filterBox?.dispatchEvent(new Event("change"));
});
