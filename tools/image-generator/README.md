# @kids-games-zone/image-generator

Local-only pipeline that calls the OpenAI Images API to render all illustrated
assets (nav icons, skill/reward badges, game mascots, word and object
illustrations for Spelling Bee and Safety Scout, …) used by the Kids Games Zone
platform.

Nothing here runs in CI — it's a developer tool you execute on your own
machine, because each run costs real money.

## Quick start

```bash
# one-time
pnpm install

# put your key in your shell or a local .env in this directory
export OPENAI_API_KEY=sk-...

# see the whole manifest
pnpm --filter @kids-games-zone/image-generator list

# estimate cost, no API calls
pnpm --filter @kids-games-zone/image-generator start --full --dry-run

# pilot batch (~8 images) — review style first
pnpm --filter @kids-games-zone/image-generator pilot

# full run (all ~180 images)
pnpm --filter @kids-games-zone/image-generator full

# only one category
pnpm --filter @kids-games-zone/image-generator start --category spelling-bee
pnpm --filter @kids-games-zone/image-generator start --category ui
pnpm --filter @kids-games-zone/image-generator start --category games/mascots

# regenerate a specific asset
pnpm --filter @kids-games-zone/image-generator start --only ui/nav-home --force
```

Outputs land under `platform/public/images/…`. The script is idempotent — it
skips files that already exist unless you pass `--force`.

## Style

All prompts pass through `src/style.mjs`, which wraps each subject in a shared
preamble/suffix:

- **Look:** cheerful 3D Pixar/claymation — not photoreal. Photoreal assets
  render poorly at 32–64 px icon sizes and feel off-brand for ages 3–12.
- **Safety:** every prompt appends "no text / no logos / no weapons / no blood
  / no scary faces" guardrails, and content entries for Safety Scout include
  object-specific neutralizations (e.g. the kitchen knife is shown flat on a
  cutting board, matches are shown as a closed box, etc.).

Tweak `STYLE_PREFIX` / `STYLE_SUFFIX` in `src/style.mjs` if you want to shift
the look — every entry picks it up on the next run.

## What gets generated

The manifest is assembled in `src/manifest.mjs`. Static entries are
hand-authored; content entries are derived from the game data files:

| Category           | Count | Source                                  |
|--------------------|-------|-----------------------------------------|
| `ui/*`             | ~24   | hand-authored (nav, skills, rewards)    |
| `games/thumbnails` | 6     | hand-authored                           |
| `games/mascots`    | 6     | hand-authored                           |
| `games/more-or-less` | 6   | hand-authored                           |
| `games/spelling-bee` | 3   | hand-authored (hearts, speaker)         |
| `spelling-bee/*`   | ~80+  | `games/spelling-bee/src/data/words-*.json` |
| `safety-scout/*`   | 38    | `games/safety-scout/src/data/objects.json` |

Adding a new Safety Scout object? Just add it to `objects.json` with a
`image: "my-thing.webp"` field and re-run `start --category safety-scout`. New
spelling words work the same way.

## Re-running / editing

- The CLI hashes nothing; file existence is the cache key. Delete a file and
  re-run, or pass `--force`, to regenerate.
- For one-off creative tweaks edit the prompt in `manifest.mjs`, delete the
  output file, and run `--only <id> --force`.

## Pricing notes

gpt-image-1 pricing is per-image at one of three qualities. The CLI prints an
estimate based on approximate unit prices; always sanity-check against the
current OpenAI pricing page before a big run.
