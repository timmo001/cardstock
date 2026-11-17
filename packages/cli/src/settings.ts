/**
 * Where the CLI keeps things on this device, and which server links open on.
 * Cardstock has no accounts or keys: the only thing kept is your presets, in
 * `~/.config/cardstock/presets.json`, readable only by you. `CARDSTOCK_PRESETS`
 * points elsewhere, such as for a test, and `CARDSTOCK_SERVER` opens links on
 * another Cardstock, such as a local one.
 */
import { cardOrigin } from "@timmo001/cardstock-card";
import { Config, Context, Effect, Layer, Path } from "effect";

export class Settings extends Context.Service<
  Settings,
  {
    /** Where cards open and the API answers, such as https://cards.timmo.dev. */
    readonly server: string;
    /** The file your presets are kept in. */
    readonly presets: string;
  }
>()("cardstock/Settings") {
  static readonly layer = Layer.effect(
    Settings,
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const home = yield* Config.String("HOME").pipe(Config.withDefault("."));

      const configHome = yield* Config.String("XDG_CONFIG_HOME").pipe(
        Config.withDefault(path.join(home, ".config")),
      );

      return Settings.of({
        server: yield* Config.String("CARDSTOCK_SERVER").pipe(
          Config.withDefault(cardOrigin),
        ),
        presets: yield* Config.String("CARDSTOCK_PRESETS").pipe(
          Config.withDefault(
            path.join(configHome, "cardstock", "presets.json"),
          ),
        ),
      });
    }),
  );
}
