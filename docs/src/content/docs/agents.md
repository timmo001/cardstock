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

## Installing the skill

With the [Skills CLI](https://skills.sh):

```bash
npx skills add timmo001/cardstock --skill cardstock
```

In Claude Code, from the repository's marketplace:

```text
/plugin install cardstock --marketplace timmo001/cardstock
```
