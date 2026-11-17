# Cardstock

Greeting cards an agent makes from a description, opened by link as a 3D
paper card. You customise them in the installed web app on a phone or desktop,
and save a still, MP4 or GIF to send in a chat. The work is tracked in
timmo001/cardstock#24, with the plan attached; read it and the issue's
Decisions for why things are the way they are. Open decisions are
labelled Needs Decision, and work that depends on one waits for it.

## Stack

- Runtime, package manager, test runner and compiler: Bun.
- TypeScript with Effect v4. Read the installed `effect` source before writing
  Effect code, and follow the `effect` skill.
- The card renders with three.js on `WebGPURenderer` (WebGL 2 fallback) and a
  GSAP timeline. Read the installed `three` source for its API.
- The server is one Cloudflare Worker, `cardstock`, which stores nothing: it
  serves the app, `/api/health` and the picture fetcher behind Turnstile and a
  rate limit. The docs site is the `cardstock-docs` Worker. All of it is
  infrastructure as code in the Alchemy stack `alchemy.run.ts`, which the
  Deploy workflow deploys from `main`; read the installed `alchemy` and
  `@alchemy.run/cloudflare` source for their API. Nothing runs
  `wrangler deploy`: wrangler is only a build dependency of the docs' Astro
  adapter.
- The web app and docs are built on Groundwork; follow `groundwork-interfaces`
  for screens and `groundwork-themes` for the Cardstock theme.
- Task runner: mise.

## Repository

- It's public: no secrets, home paths, machine or host names, and nothing
  that isn't public information.
- A card is data, never code. It travels sealed whole in its link, the only
  secret; there are no accounts, devices or keys. The only storage is the
  browser's localStorage and the CLI's local presets file, and the server has
  no AI.
- Use mise-pinned tools and Bun. Keep `bun.lock` in sync with the workspace's
  `package.json` files, and pin dependencies to exact versions (`bun add -E`).
- Run project tasks through mise. Use `mise run format` and `mise run check`
  for validation, and `mise run test` for the tests.
- Each part is a private Bun workspace package under `packages/<name>/`:
  `card` is the card format, encryption, renderer, designs, effects and
  exports; `app` is the PWA with the viewer and editor; `server` is the
  Worker; `cli` is the `cardstock` CLI with its Code Mode and MCP surface. The
  docs site is `docs/`. The skill is `skills/cardstock/SKILL.md`; keep it in
  step with the CLI's operations.
- Use lowercase filenames, with kebab-case for multiword names.
- Open each hand-written source file with a short header comment saying what
  it is and, where it isn't obvious, why it's there: a `/** */` block before
  the imports in TypeScript, the file's own comment syntax elsewhere. Skip
  generated files, data files and one-line configs.

## Development

- Start dev processes only through the `serve:*` tasks, which run them through
  Pitchfork, never in the foreground.
- CI runs each package's checks when its folder changes, plus the shared lint
  workflows. The hk pre-push hook runs the shared Markdown, YAML, Actions and
  shell lints and `mise run lint`; run them by hand with `hk check --all`.

## Rollout

Changes made here are pushed as they land, with no go-ahead needed and no
Plannotator review. Once `mise run check` passes for a change:

1. Commit the session's own changes through `dot git commit`, leaving other
   sessions' work alone, and push. The Deploy workflow deploys `main` with
   Alchemy; run `mise run plan` first when a change touches `alchemy.run.ts`.
2. When the change has a box on timmo001/cardstock#24, tick it off there, with
   a link to the commit.
3. Report what landed and anything flagged.

## Notifications

This project moves fast, so clear its GitHub notifications as soon as the
work settles them, without asking: a failed CI run once a later run on the
same branch passes, an issue or pull request once it's closed or answered.
List them with `dot git notifications --bar-json`, matching the repository and
title, and clear each with `dot git notifications --mark-read <id>`. Leave the
ones the work didn't settle.
