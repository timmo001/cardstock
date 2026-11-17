---
name: cardstock
description: Make and send greeting cards with the cardstock CLI, opened by link as a 3D paper card. Use when asked to make a card for someone, start from a ready-made one, change one, get a card's link, save a card as a picture or video for a chat, or save or use a preset.
---

# cardstock

Prefer the `cardstock` Code Mode namespace (`cardstock agent tools --json` lists it), then the MCP server (`cardstock mcp`); fall back to the CLI with `--json`. A card is a spec, JSON you keep in a scratch file, and it goes out only as its link, with the whole card sealed in it; nothing is stored anywhere. There are no accounts or keys, so there's nothing to set up.

## Making a card

1. Run `preset list --json` first; presets are kept on this device. If a preset fits the request, such as `Family birthdays` for a sister's birthday, start from its `design`, `effect`, sign-off (`from`) and `tone`, unless the user asked for something else.
   For a quick card, or when the user names one from the app's Browse page, `template list --json` gives the ready-made cards with the `spec` each starts as, and its `tone`. Start your spec from one, then add the sign-off and anything else asked for.
   When the user wants a surprise, or a funny card without saying what, `card shuffle --occasion "<what it's for>" --tone <tone> --json` picks a design, colourway, effect and words at random; tones are `funny`, `cheeky`, `punny`, `dry`, `heartfelt` and `sweet`. Start your spec from its `spec`, and rewrite the words when you know more about the people than it does.
2. Turn the request into a card spec, JSON in this shape, and write it to a scratch file:

   ```json
   {
     "version": 1,
     "occasion": "Mum's 60th",
     "design": "birthday",
     "effect": "confetti",
     "front": { "title": "Happy 60th, Mum" },
     "inside": { "to": "Dear Mum,", "message": "…", "from": "Sam" },
     "media": []
   }
   ```

   - `design` is one of `christmas`, `birthday`, `anniversary` or `any`. An optional `palette` picks another colourway: `red` or `midnight` for Christmas, `blush` or `midnight` for Birthday, `sage` or `navy` for Anniversary, and `kraft`, `sky` or `ink` for Any occasion. Leave it out for the design's own colours. An optional `size` is `landscape`, `square` or `tall`; leave it out for a portrait card. An optional `opening` is `grow` (opens, then grows into a full-screen view of the message), `letter` (from the envelope straight to that full view) or `page` (only the full view, no card); leave it out for an ordinary card. An optional `"footnote": true` lists the web addresses its files load from on the back; leave it out unless the user asks to credit them. `effect` is one of `snow`, `confetti`, `hearts`, `sparkle` or `none`; pick `none` for a sad occasion, such as sympathy.
   - `to` is optional; leave it out rather than guess a name.
   - Leave `media` empty: pictures and music go on with `media add`.

3. Write the words yourself, warm and specific to what you were told: a short title, a message of a few sentences, and the sign-off the user gave. Never invent facts about the people, such as memories, ages or plans; ask, or keep it general.
4. For a picture, video or music, `media add --file <spec file> --url <https address> --json`, with the public web address of the file itself, not the page it's on. Find a free one on a site in the docs' [Where to find pictures](https://cardstock.timmo.dev/pictures) whose licence lets anyone use it, searching for what you want to see, such as `snowy pine forest at dusk`, or use an address the user gave you. It checks the file loads and is a kind a card shows, then changes the spec file in place; the card loads the file from that address each time it opens (through the Cardstock server when the site won't let other sites load it). Over MCP, `media_add` takes the spec as text and returns the changed `spec`.

   A video (MP4 or WebM) plays, muted and looping, wherever a picture would, and its sound follows the card's sound button. A picture or video becomes the front, a sound the music; `--as inside` puts a picture inside instead, and `--as background` fills the page behind the card with a picture or looping video, dimmed a little, in the viewer and in saved files; to use the front's own file there too, set `background` to its media id in the spec. `--fit` says where a picture sits: `frame` (in the design's frame on the front, framed on the inside cover inside; the default), `fill` (the whole front with the title in light ink over it, or the whole inside cover; best for photos) or `behind` (washed into the paper, with the design or the message printed over it). Adding another replaces the one before and keeps the card's fit unless `--fit` changes it.

5. `card link --file <spec file> --json` seals the whole card into its `url`. Give the user that link to send. Whoever has it can open the card, and it can't be stopped or changed after; to change a card, change the spec and make a new link.
6. When the user wants to send the card in a chat as a file rather than a link, `export --file <spec file> --out <folder> --json` saves a PNG of the front, and an MP4 and a GIF of it opening; `--still`, `--mp4` or `--gif` picks only those. Give the user the paths it returns.

## Presets

Save presets by yourself, without asking, so later cards start from what the user liked. When they settle on a design, effect, sign-off or tone for a kind of card, such as birthdays in the family or Christmas at work, run `preset save --spec '<json>' --json` with:

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

Only `version` and `name` are needed. Saving under a name that's taken (ignoring case) replaces that preset, so update one rather than making a near-copy. Keep names and other personal details, such as who a card is for, out of presets. Tell the user in a line what you saved.

## Changing a card

A link already sent can't change. To change a card, edit its spec and make a new link with `card link`. Someone with only the link can open it in the web app and use **Edit a copy**.

## New designs and effects

A card can only name a design or effect that exists. Add a new one only as code, in a pull request to timmo001/cardstock for the user to review: a `defineDesign` in `packages/card/src/designs/` or a `defineEffect` in `packages/card/src/effects/`, listed in the registry.
