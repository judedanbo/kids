# Terminal-phase back-confirm in other games — Design

## Context

PR #18 (`feat(shared): bake back-button confirmation into GameShell`, commit `8c7b281`) moved the back-button confirmation dialog into `GameShell`. Every game that uses `GameShell` now inherits an "Are you sure you want to exit? You'll lose your progress." dialog when the Back button is clicked.

The same PR added an escape hatch: a `disableBackConfirm` boolean prop. Spelling Bee passes it on its terminal phases (`outcome === 'out-of-lives'` and `sessionPhase === 'complete'`) so Back exits immediately, matching the in-overlay "Back to Home" button. The reasoning is captured in `games/spelling-bee/src/SpellingBee.tsx:129–130`:

> Terminal phases — session is already over, so exit is immediate; matches the in-overlay "Back to Home" button which also exits directly.

## Problem

The other 5 production games render `<CelebrationOverlay>` (or a `phase === 'complete'` branch) inside a `GameShell` without `disableBackConfirm`. A child who hits Back on the celebration screen sees the misleading "lose your progress" warning when there is no progress left to lose. This is inconsistent with Spelling Bee and confusing UX.

## Scope

In scope: math-adventure, memory-match, more-or-less, safety-scout, word-puzzle.

Out of scope:
- `dummy-game` — scaffold/template, not user-facing.
- Word Puzzle's custom document-level Escape listener for letter-undo (`WordPuzzle.tsx:198–233`) — already correctly scoped by placement state and answer state, no conflict with the shell.
- Other Spelling Bee fixes (i18n sweeps, reduced-motion gating, StrictMode double-fire guards, keyboard input rework). Each is a separate audit if desired.

## Change

One single-prop addition per game, on the terminal-phase `<GameShell>` instance:

| Game | File | Branch | Line of `<GameShell>` to edit |
|---|---|---|---|
| math-adventure | `games/math-adventure/src/MathAdventure.tsx` | `if (showCelebration)` | ~156 |
| memory-match | `games/memory-match/src/MemoryMatch.tsx` | `if (showCelebration)` | ~157 |
| more-or-less | `games/more-or-less/src/MoreOrLess.tsx` | `if (round.phase === 'complete')` | ~122 |
| safety-scout | `games/safety-scout/src/SafetyScout.tsx` | `if (round.phase === 'complete')` | ~163 |
| word-puzzle | `games/word-puzzle/src/WordPuzzle.tsx` | `if (showCelebration)` | ~262 |

Each edit adds `disableBackConfirm` as a prop on the `<GameShell>` opening tag in the terminal branch. No other change.

## Documentation

Add a short note to `GAME_DEVELOPER_GUIDE.md` in the GameShell section:

> When rendering a terminal phase (game-over screen, completion celebration, or any state where the session is already over), pass `disableBackConfirm` so the Back button exits immediately. There is no progress left to lose, so the confirmation dialog is misleading. See Spelling Bee's terminal branches in `SpellingBee.tsx` for the canonical example.

This is the only thing standing between the next new game and re-introducing the bug.

## Tests

No new tests added. `shared/src/components/GameShell/GameShell.test.tsx` already covers both branches of `disableBackConfirm` (immediate exit when `true`, confirm dialog when `false`/omitted). Per-game tests would be brittle prop-shape assertions that don't add coverage value.

## Verification

After the changes:
- `pnpm typecheck` and `pnpm lint` pass.
- `pnpm test` passes (no test changes expected).
- Manual smoke test for each game: reach the celebration screen, click Back, confirm immediate exit (no dialog).
- Spelling Bee unchanged — no regression possible.

## Branch and PR

- Branch: `fix/terminal-phase-back-confirm` (off `main`).
- One PR for all 5 games (per user decision — small mechanical change, easier to review as a sweep than 5 one-line PRs).
