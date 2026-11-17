---
title: Agents
description: The Code Mode manifest, MCP server and skill an agent uses to make cards.
---

An agent makes cards through the [`cardstock` CLI](/cli), in this order of
preference:

1. **Code Mode:** `cardstock agent tools --json` prints every operation with
   its command and whether it reads or writes.
2. **MCP:** `cardstock mcp` serves the same operations on stdio. None of them
   removes anything.
3. **The CLI** itself, with `--json`.

## The skill

`skills/cardstock/SKILL.md` tells an agent to:

- turn a request into a card spec, with pictures, video and music from their
  web addresses
- write the words warmly and specifically, without inventing facts about anyone
- give you the card's link, with the whole card sealed in it
- check your presets before a card, and save presets by itself, so later
  cards start from what you liked
- add a new design or effect only as code, in a pull request for you to review

The server has no AI of its own and stores nothing: the agent writes the
words and picks the pictures, and the card travels in its link.

## What it covers

The manifest, the MCP server and the skill cover putting cards in their
links, pictures and music by web address, exports and presets.

## In the browser

In a browser with [WebMCP](https://webmachinelearning.github.io/webmcp/), the
web app's card editor offers its own tools to an agent in the browser, so you
watch the preview change as it works:

| Tool          | What it does                                                                          |
| ------------- | ------------------------------------------------------------------------------------- |
| `get-card`    | Reads the card as its spec, with its link                                             |
| `make-card`   | Starts over from a ready-made card by id, or Shuffle's pick for an occasion and tone  |
| `set-words`   | Changes the occasion, title, who it's to, the message and who it's from               |
| `set-design`  | Changes the design, colourway, effect, size and how it opens                          |
| `add-picture` | Adds a picture or video by web address to the front, the left or right page, or behind |
| `set-music`   | Sets the music by the track's web address                                             |
| `save`        | Keeps the card on this device, as Save does                                           |
| `export`      | Saves it for a chat as a still, MP4 or GIF, as Save for a chat does                   |

Each one works through the editor's own code, so it checks what the buttons
check, and answers in words when something isn't right. The page's theme
tools, `get-theme`, `list-themes` and `set-theme`, are there too.

## Installing the skill

With the [Skills CLI](https://skills.sh):

```bash
npx skills add timmo001/cardstock --skill cardstock
```

In Claude Code, from the repository's marketplace:

```text
/plugin install cardstock --marketplace timmo001/cardstock
```
