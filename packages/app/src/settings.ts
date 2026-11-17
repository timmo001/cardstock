/**
 * The Settings page at `/settings`, behind the app bar's gear: whether cards
 * play sound on this device. The mode stays in the app bar alone.
 */
import { GwSwitch } from "@timmo001/groundwork-ui";
import { Effect } from "effect";
import { phGear } from "./icons.ts";
import { readMuted, saveMuted } from "./sound.ts";

const page = document.querySelector("gw-stack.settings");
const soundSwitch = page?.querySelector(".settings-sound");

page?.querySelector("gw-page-header")?.setAttribute("icon", phGear);

document.title = "Settings · Cardstock";

// Card sounds, the other way round from the viewer's mute button
if (soundSwitch instanceof GwSwitch) {
  soundSwitch.checked = !(await Effect.runPromise(readMuted));

  soundSwitch.addEventListener("change", () => {
    void Effect.runPromise(saveMuted(!soundSwitch.checked));
  });
}
