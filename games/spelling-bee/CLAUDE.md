# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file is scoped to the `spelling-bee` game package. The monorepo-wide `CLAUDE.md` at the repo root covers workspace layout, the `GamePlugin` interface, age tiers, and shared conventions — read it first.

## Commands (run from this directory)

```bash
pnpm typecheck                     # tsc --noEmit
pnpm test                          # vitest run --passWithNoTests

# Single test file
pnpm test src/__tests__/wordSelector.test.ts

# Single test by name pattern
pnpm test -t "advances difficulty when accuracy"
```

There is no `dev` or `build` script here — the game is loaded by the `platform/` shell. To exercise it interactively, run `pnpm --filter platform dev` from the repo root.

## Plugin entry point

`src/index.ts` exports the default `GamePlugin`. The lifecycle hooks (`onLoad`/`onStart`/`onEnd`/etc.) only carry timing and difficulty for the `GameResult` envelope — **all real game state lives inside the `SpellingBee` React component and its hooks**, not in the plugin closure. Don't try to track per-word state at the plugin level.

`onComplete(result)` is called from `SpellingBee.tsx` (not from `onEnd`); the plugin's `onEnd` returns a stub result that the platform overrides with the component's real one.

## State architecture (two-layer hooks)

The game has a deliberate split between session-level and round-level state:

- `hooks/useSessionLevels.ts` — owns the **5-level ladder** for one play session: which words to draw, lives, cumulative score, phase machine (`instruction → playing → level-transition → complete`), and difficulty re-planning.
- `hooks/useSpellingRound.ts` — owns the **per-level round**: current word index, correctness, sub-phase (`playing → feedback → complete`).

`SpellingBee.tsx` mounts `LevelPlay` with `key={session.currentLevel}` so the round hook is fully remounted between levels. Don't try to thread round state across levels — it's intentional.

### The difficulty ladder

`buildLadder(startDifficulty)` produces 5 levels: `[d-1, d, d, d+1, d+1]` with word counts `[3, 4, 5, 6, 7]`. After each level, `adjustDifficulty` checks accuracy against `ADVANCEMENT_THRESHOLD` (0.7) — if the player fell short, **all remaining levels are clamped down** to the previous difficulty. This is in-place mutation of `ladderRef.current`; preserve that behavior when editing.

## Age tier branching

`AgeTier` from `@kids-games-zone/shared` (`tiny` | `junior` | `explorer`) gates major UI and rule differences in many places:

- **Word pool**: `getWordPool(ageTier)` in `SpellingBee.tsx` picks one of three JSON files in `src/data/`.
- **Input mode**: `tiny` → `LetterTiles` (word letters + 3 distractors, scrambled); `junior`/`explorer` → `Keyboard`.
- **Lives**: `tiny` → `Infinity` (no fail state, `LivesDisplay` hidden); others → 3 lives, lose one on a wrong answer.
- **Background music**: only plays for `tiny`.
- **Clue buttons** (`WordDisplay`): definition/origin/sentence buttons are non-`tiny` only; `tiny` gets the word image instead.

When changing per-tier behavior, search for `isTiny` and `ageTier === 'tiny'` — the conditionals are spread across `SpellingBee.tsx`, `LevelPlay.tsx`, `WordDisplay.tsx`, `useSessionLevels.ts`, and `useSpellingRound.ts`.

## Word data

`src/data/words-{tiny,junior,explorer}.json` are arrays of `WordEntry` (`{ word, difficulty, image, definition, origin, sentence }`). `selectWords` (in `utils/wordSelector.ts`) picks words at-or-below the target difficulty, prefers ones closest to it, then shuffles. The `exclude` list is threaded through `useSessionLevels` so a single session never repeats a word.

## Audio conventions

The game does not bundle audio — it calls into the platform-provided `audioManager` with namespaced ids resolved by the platform:

- `voice:word-<word>` — pronunciation
- `voice:def-<word>` — definition narration (only triggered if `word.definition` is non-empty)
- `voice:sentence-<word>` — sentence narration
- `voice:encouragement-correct` / `voice:encouragement-tryagain` — `tiny` only
- `music:spelling-bee-bgm` — `tiny` background music
- SFX: `correct`, `incorrect`

The actual MP3s live under `platform/public/audio/narration/en/` (e.g. `def-cat.mp3`). When adding a word, ensure the corresponding narration files exist or the platform's audio loader will silently skip them.

## Testing notes

- `vitest.config.ts` aliases **react-i18next to a local mock** (`src/__mocks__/react-i18next.ts`) that returns the translation key as the rendered string. Tests assert against keys like `"correct"`, not English text. Don't import the real i18n in tests.
- It also aliases `@kids-games-zone/shared` to the source path, so changes to shared types are picked up without a rebuild.
- `test-setup.ts` extends Vitest with `vitest-axe` matchers (`toHaveNoViolations()`); use them when adding component tests with a11y concerns.
- Environment is `jsdom`; CSS modules are configured with `classNameStrategy: 'non-scoped'` so class names in tests match source.
