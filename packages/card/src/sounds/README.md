# Sounds

The card's paper sounds, from Kenney's [RPG Audio](https://kenney.nl/assets/rpg-audio) pack, released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Credit isn't required, but Kenney asks nicely, so here it is: thank you, [Kenney](https://kenney.nl).

| File        | From            | Plays when                |
| ----------- | --------------- | ------------------------- |
| `flap.mp3`  | `bookFlip2.ogg` | The envelope's flap opens |
| `slide.mp3` | `cloth1.ogg`    | The card slides out       |
| `open.mp3`  | `bookFlip1.ogg` | The cover turns open      |

Each is the original made mono and saved as an 80 kbps MP3, which every browser's Web Audio decodes: `ffmpeg -i bookFlip2.ogg -ac 1 -b:a 80k flap.mp3`.
