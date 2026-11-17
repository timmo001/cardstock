/**
 * Running a Cloudflare binding's call inside the request it belongs to.
 * Bindings such as the rate limit and the version metadata need the
 * Worker's runtime for each call, and the services that use them are made
 * once, when the Worker starts.
 */
import { RuntimeContext } from "alchemy/RuntimeContext";
import { Effect, Option } from "effect";

/** Runs `effect` with the runtime of the request it's called in. */
export const inRequest = <A, E>(effect: Effect.Effect<A, E, RuntimeContext>) =>
  Effect.serviceOption(RuntimeContext).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () =>
          Effect.die("A binding is only reachable inside a request"),
        onSome: (runtime) =>
          Effect.provideService(effect, RuntimeContext, runtime),
      }),
    ),
    Effect.orDie,
  );
