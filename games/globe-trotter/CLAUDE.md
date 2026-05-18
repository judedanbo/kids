# CLAUDE.md

This file is scoped to the `globe-trotter` game package. The monorepo-wide
`CLAUDE.md` at the repo root covers workspace layout, the `GamePlugin`
interface, age tiers, and shared conventions — read it first.

## Commands (run from this directory)

```bash
pnpm typecheck                          # tsc --noEmit
pnpm test                               # vitest run --passWithNoTests
pnpm test src/__tests__/questionGenerator.test.ts   # single file
```

There is no `dev`/`build` here — the game is loaded by the `platform/` shell.
Run `pnpm --filter platform dev` from the repo root to play it.

## Plugin entry point

`src/index.ts` exports the default `GamePlugin`. Its closure only carries
timing/difficulty for the `GameResult` envelope — **all real game state lives
in the `GlobeTrotter` component and `useGlobeSession` hook**. `onComplete` is
called from the component (via `CelebrationOverlay`), not from `onEnd`.

## Architecture

- `utils/countryPool.ts` — merges the two data files, difficulty filtering,
  and all localization/flag helpers (`localizedName`, `flagEmoji`, `flagSrc`,
  `continentKey`, `continentEmoji`).
- `utils/questionGenerator.ts` — pure. Builds a session's questions; subjects
  are unique, modes round-robin over the enabled set, distractors prefer the
  same continent at difficulty ≥ 3. No React, no i18n here.
- `hooks/useGlobeSession.ts` — single round machine
  (`instruction → playing → feedback → complete`).
- `GlobeTrotter.tsx` — outer component owns a restart nonce; the inner
  `GlobeTrotterSession` is remounted (via `key`) on PauseMenu restart so the
  whole session resets cleanly.

## Age-tier branching (in `GlobeTrotter.tsx`)

`TIER_MODES` / `TIER_COUNT` / `poolDifficultyFor` gate behavior:

- **tiny**: flag + continent modes only, difficulty-1 pool, 6 questions,
  large buttons, optional background music, single-column options.
- **junior**: capital + flag + continent, difficulty ≤ 3 pool, 8 questions.
- **explorer**: all four modes incl. fun facts, full pool, 10 questions,
  count-up `GameTimer`.

## Data

`src/data/countries-famous.json` (difficulty 1–2, fully bilingual) and
`countries-world.json` (difficulty 3–5, English facts with French
names/capitals). Each entry: `code` (ISO 3166-1 alpha-2), `name`/`nameFr`,
`capital`/`capitalFr`, `continent`, `difficulty`, `facts`/`factsFr?`.
`countryData.test.ts` enforces integrity (valid codes, ≥2 facts, continent
enum, French/English fact alignment).

## Flags

No flag images are bundled. `<IconImage>` is given `flagSrc(code)`
(`/images/flags/<code>.svg`, generated later by the platform image pipeline)
with `flagEmoji(code)` as the always-present fallback — the same
image-or-emoji convention every other game uses.

## Testing notes

`vitest.config.ts` aliases `react-i18next` to a local mock that returns the
translation key, and `@kids-games-zone/shared` to source. Tests assert against
keys (`"title"`, `"correct"`, `"continent.africa"`), never English text.
`test-setup.ts` adds `vitest-axe` matchers. Environment is `jsdom` with
non-scoped CSS module class names.
