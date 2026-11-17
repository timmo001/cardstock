---
title: Links and privacy
description: A card travels whole in its link, so nothing is stored and the server never sees it.
---

A card travels in its link, and nowhere else.

## The card in its link

```text
https://cards.timmo.dev/c#<sealed card>
```

The whole card is compressed, encrypted with a fresh key, and put after the
`#` with that key. Browsers never send that part to the server, so nothing is
stored and the server never sees the card. Like a shared Drive link, whoever
has it can open the card, and it can't be stopped or changed once it's sent:
to change a card, edit a copy and send its new link.

It carries the card's words, design and effects, and the web addresses of its
pictures, video and music, which load from there each time it opens.

Make one with **Card in a link** in the editor, or `cardstock card link`.

## Files from other sites

A picture, video or track at a web address loads straight from its site
whenever the site allows it. Some sites don't let other sites load their
files, so then the Cardstock server fetches it for the browser instead. It
fetches only the kinds of file a card shows, up to 20 MB, keeps nothing, and
each fetch needs a pass from Cloudflare Turnstile, an invisible check that
the browser isn't a bot. One address gets ten such fetches a minute.

## Nothing stored

Cardstock has no accounts, devices or keys of its own, and the server stores
nothing. The web app keeps the cards you make in the browser you made them
in, and the CLI keeps your presets in a file on your machine; neither is
sent anywhere. Deleting a card in the app doesn't stop a link you've sent,
since the card is in the link.

Opening a card sends you no notification.
