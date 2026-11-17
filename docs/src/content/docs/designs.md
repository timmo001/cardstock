---
title: Designs
description: The card designs and effects a card can use.
---

A design sets a card's paper, colours, fonts and shape. An effect plays
around it once it opens. A card can only name a design and effect that
exist, since both are listed in one registry the card format is built from.

## Designs

| Design        | For                                 |
| ------------- | ----------------------------------- |
| `christmas`   | Christmas, the first to be finished |
| `birthday`    | Birthdays                           |
| `anniversary` | Anniversaries                       |
| `any`         | Any other occasion                  |

## Effects

| Effect     | What it does               |
| ---------- | -------------------------- |
| `confetti` | Confetti falls as it opens |
| `snow`     | Snow drifts down           |
| `hearts`   | Hearts float up            |
| `sparkle`  | Sparkles catch the light   |

## Adding one

Designs live in `packages/card/src/designs/<id>.ts` and effects in
`packages/card/src/effects/<id>.ts`. An agent can add one, but only as code
in a pull request for you to review.
