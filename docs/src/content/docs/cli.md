---
title: CLI
description: The cardstock CLI puts cards in their links, adds pictures by web address and exports cards.
---

The `cardstock` CLI in `packages/cli` is what agents use. A card is a card
spec, JSON you keep where you like, and it goes out as its link, with the
whole card sealed in it. There are no accounts or keys to set up. Every
command that returns data takes `--json`.

| Command                                | What it does                                      |
| -------------------------------------- | ------------------------------------------------- |
| `cardstock template list`              | The ready-made cards on the app's Browse page     |
| `cardstock card shuffle`               | A random card for `--occasion` and `--tone`       |
| `cardstock card link`                  | The card's link, with the whole card sealed in it |
| `cardstock media add --url <address>`  | Adds a picture, video or sound from the web       |
| `cardstock preset save`, `preset list` | Starting points for new cards, on this device     |
| `cardstock export`                     | Saves a card with `--still`, `--mp4` or `--gif`   |
| `cardstock status`                     | Whether the server answers, and its version       |
| `cardstock agent tools --json`         | The Code Mode manifest; see [Agents](/agents)     |
| `cardstock mcp`                        | Serves the same operations over MCP on stdio      |

A card spec goes to `card link`, `media add` and `export` as `--spec '<json>'`
or `--file <path>`.

Run it from the repository with `bun packages/cli/src/cli.ts`. Links open on
cards.timmo.dev; `CARDSTOCK_SERVER` points them at another Cardstock, such as
one running locally.

## The card in its link

`cardstock card link --spec '<json>'` (or `--file`) seals the whole card into
its link and prints it, with nothing stored anywhere. Whoever has the link can
open the card, and it can't be stopped or changed once it's sent: change the
spec and make a new link instead. See [Links and privacy](/links-and-privacy).

## Status

`cardstock status` says whether the server answers and which version it is.
It never says whether a card was opened: nothing tells anyone that. Add
`--json` for an agent.

## Shuffle

`cardstock card shuffle` picks a whole card at random: a design, colourway,
effect and words that suit the occasion. `--occasion` says what it's for, as
you'd type it, such as `"Mum's 60th"`, which it reads as a birthday; without
it any cheerful occasion will do. `--tone` is one of `funny`, `cheeky`,
`punny`, `dry`, `heartfelt` or `sweet`. Sad occasions, such as sympathy, stay
heartfelt whatever you ask. It prints the spec to change and put in its link.
The words come from lists in the card package, with no AI anywhere.

## Saving for chats

`cardstock export --file <spec>` saves a card as files to send in a chat:
`--still` for a PNG of the front, `--mp4` and `--gif` for the card opening.
Without any of them it saves all three. `--out <folder>` says where, the
current folder otherwise. A card only draws in a browser, so the CLI opens
the app's export page in headless Chromium with the card in the link's
fragment, as a link carries it, and makes the files with the same code as
the app's Save for a chat. Install the browser once with
`bunx playwright-core install chromium-headless-shell`.

## Templates

`cardstock template list` shows the ready-made cards from the app's Browse
page, each with its id, category, tone and the spec it starts as. Start a
spec from one and change what you like; changing a template later changes no
one's card.

A spec can also name a `palette`, one of its design's colourways, such as
`red` or `midnight` for Christmas. Without one, the card takes the design's
own colours.

A `size` sets the card's shape: `portrait`, `landscape`, `square` or `tall`.
Without one, the card is portrait. The design lays itself out to suit, and a
still of a wide card lies on its side.

An `opening` sets how it opens. `card`, the default, comes out of its
envelope and opens. `grow` opens the same way, then a tap grows it into a
full view: the message filling the screen over its picture or video, with
its effect falling in front. `letter` goes from the envelope straight to that
full view, and `page` is only the full view, with no card at all. A still of
a page is its full view.

`"footnote": true` lists the web addresses its pictures, video and music load
from, small on the back of the card. Without it, the back credits nobody.

## Presets

A preset is what you reuse from card to card, saved under a name, such as
`Family birthdays`: a design, an effect, a sign-off (`from`) and a tone for
the words, all optional. `cardstock preset save --spec '<json>'` (or `--file`)
saves one, and saving under a name that's taken replaces it.
`cardstock preset list` shows them. They're kept on this device, in
`~/.config/cardstock/presets.json`, readable only by you, and never sent
anywhere. `CARDSTOCK_PRESETS` points at another file.

```json
{
  "version": 1,
  "name": "Family birthdays",
  "design": "birthday",
  "effect": "confetti",
  "from": "Love, Sam x",
  "tone": "warm, a little cheeky"
}
```

## Pictures and music

`cardstock media add --file <spec> --url <address>` adds a picture, video or
sound at a public web address, such as a free one from
[Where to find pictures](/pictures). It's checked once, that it loads, is a
kind a card shows and is under 20 MB, then the card loads it from there each
time it opens, so it travels in the card's link. A spec in `--file` is changed
in place; one given with `--spec` comes back changed.

A video (MP4 or WebM) plays, muted and looping, wherever a picture would, and
its sound follows the card's sound button. An SVG on a card is shown as a
picture, so it can't run anything. A picture becomes the front and a sound
the music, unless `--as front`, `--as inside`, `--as background` or
`--as music` says otherwise, and it replaces the one before. `--as background`
fills the page behind the card with a picture or looping video, dimmed a
little so the card stands out, in the viewer, the editor and saved files
alike. To use the front's own file as the background too, set `background` to
its media id in the spec. `--fit` says where a picture sits: `frame` puts it
in the design's frame on the front, or framed on the inside cover (the
default), `fill` fills the whole front with the title over it, or the whole
inside cover, and `behind` washes it into the paper behind the design or the
message.

When the site won't let other sites load its files, the app fetches it
through the Cardstock server instead, behind a Turnstile check.
