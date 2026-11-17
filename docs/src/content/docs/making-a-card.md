---
title: Making a card
description: How an agent turns a description into a card, and what a card holds.
---

You ask an agent for a card in your own words. The agent works out the rest
with the `cardstock` CLI:

1. It picks the occasion, a [design](/designs) and an effect.
2. It writes the words for the front and the inside, as a card spec.
3. It adds pictures, video and music by their web addresses, from the sites
   in [Where to find pictures](/pictures).
4. It puts the card in its link, with the whole card sealed in it, and gives
   you that link to send.

Then you can open the link and edit a copy in the [web app](/web-app).

## What a card holds

A card is data, never code. It holds:

- the occasion, design and effect
- the front: a title and an optional picture
- the inside: the message, who it's from and, optionally, who it's to
- optional music
- the web addresses of the pictures and sounds it uses
