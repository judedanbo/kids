# GameShell Back-Confirmation — Design

Date: 2026-04-19
Status: Approved, ready for implementation plan
Branch: `feat/gameshell-back-confirm`

## Summary

Move the back-button confirmation behaviour introduced in PR #17 out of `SpellingBee.tsx` and into the shared `GameShell` component, so every game in the monorepo gains it "for free" without per-game duplication.

- Every game (`DummyGame`, `MathAdventure`, `MemoryMatch`, `MoreOrLess`, `SafetyScout`, `SpellingBee`, `WordPuzzle`) currently passes `onBack={onExit}` directly to `GameShell` with no confirmation.
- Spelling Bee is the one exception: its `SpellingBee.tsx` wraps the back button with a custom intercept that opens a `ConfirmDialog`.
- This design collapses all of that into `GameShell` itself. `SpellingBee` reverts to direct `onBack={onExit}`; the other six get back-confirm automatically.

## Motivation

PR #17 built the `ConfirmDialog` primitive and wired up Spelling Bee's intercept. During brainstorming for that PR I deliberately rejected baking the confirm into `GameShell` because only one game needed it — the cost of widening a shared API for a single consumer wasn't justified. That calculus is now reversed: a survey of every game in `games/` confirms all six other games pass `onBack={onExit}` bare, so the confirm is a universal need. Centralising in `GameShell` eliminates six copies of the same intercept pattern.

This spec covers **Fix 1 only** (back-button confirmation). The auto-submit-on-last-tap issue found in `word-puzzle/src/WordPuzzle.tsx:139` is out of scope — it will be handled per-game in follow-up work.

## Non-goals

- Do not touch per-game auto-submit behaviour.
- Do not add per-game customisation of the confirm copy (single generic copy in `common.json`). A future game with a genuine exception — e.g. a savable session where progress is not actually lost — can add optional override props then.
- Do not change `GameShell`'s other responsibilities (title, music toggle, skip link, announcer).

## Design

### `GameShell` gains internal back-confirm state

`GameShell` owns a new `[confirmOpen, setConfirmOpen] = useState(false)`.

Click flow:

1. User clicks `← Back` in the header → `setConfirmOpen(true)`. No other side effects; music keeps playing, `onBack` does NOT fire.
2. User confirms (click Confirm / Enter) → `setConfirmOpen(false)` → `audioManager?.stopMusic({ fadeOut: 300 })` → `onBack?.()`.
3. User cancels (click Cancel / ESC / backdrop click) → `setConfirmOpen(false)`. Nothing else changes. Music state is untouched.

This fixes the music-restart hack in PR #17 — the shell now stops music only on confirm, never on dialog-open.

### Public API

The `GameShell` public signature stays almost identical:

```ts
interface GameShellProps {
  title: string;
  onBack?: () => void;
  onPause?: () => void;
  showPauseButton?: boolean;
  audioManager?: AudioManager;
  musicEnabled?: boolean;
  /** Opt out of the back-button confirmation modal. Default: false. */
  disableBackConfirm?: boolean;
  children: ReactNode;
}
```

The sole addition is `disableBackConfirm?: boolean` (default `false`). It is:

- Not used in production code today.
- Available as an escape hatch for tests, or for future phases (e.g. a game's final celebration screen where an immediate exit is desirable).

### i18n

Four new keys in `platform/src/locales/{en,fr}/common.json`:

- `backConfirm.title` — "Leave the game?" / "Quitter le jeu ?"
- `backConfirm.message` — "Your progress will be lost." / "Ta progression sera perdue."
- `backConfirm.confirm` — "Leave" / "Quitter"
- `backConfirm.cancel` — "Stay" / "Continuer"

Two keys added in PR #17 are retained (unused but documents `ConfirmDialog` defaults):

- `confirmDialog.confirm` — "Confirm" / "Confirmer"
- `confirmDialog.cancel` — "Cancel" / "Annuler"

Four keys in `games/spelling-bee/src/locales/{en,fr}/spelling-bee.json` become unused and are removed:

- `exitConfirmTitle`
- `exitConfirmMessage`
- `exitConfirmConfirm`
- `exitConfirmCancel`

### Modal tone

`ConfirmDialog` is rendered with `tone="danger"` (confirm button gets the danger styling) — matches Spelling Bee's current treatment and reflects that exit is destructive to the session.

### Interaction with existing shell features

- **Music toggle in header.** Orthogonal — clicking the music button toggles music, it does not open the confirm.
- **Pause button (`onPause` + Escape in shell).** Orthogonal — `GameShell` already has an Escape listener that calls `onPause` when set. That continues to work. The confirm dialog's own Escape listener is scoped to the dialog (and only attached when `open=true`), so there's no conflict: when the dialog is closed and `onPause` is set, Escape pauses; when the dialog is open, Escape cancels the dialog.
- **Skip link and Announcer.** Unaffected.

### Spelling Bee simplification

`games/spelling-bee/src/SpellingBee.tsx` reverts substantial chunks of PR #17:

- Delete `confirmExitOpen` state.
- Delete `handleBackIntercept`, `handleConfirmExit`, `handleCancelExit` callbacks.
- Delete the `renderShell(children)` helper.
- Remove the `ConfirmDialog` import and the `useState` / `type ReactNode` imports added in PR #17.
- Every phase branch goes back to passing `onBack={onExit}` directly.
- `GameOverOverlay` gets `onExit={onExit}` (was `onExit={handleBackIntercept}` in PR #17).

### `GameOverOverlay` Escape listener

PR #17 routed the overlay's Escape keypress through Spelling Bee's intercept. With confirm in the shell, the overlay's own `document.addEventListener('keydown')` for Escape would bypass `GameShell`'s confirm entirely — it calls `onExitRef.current()` directly.

Resolution: **remove the overlay's own Escape listener.** The shell is the single source of truth for exit; the overlay's "Exit" button still calls `onExit` via the shell's back path or the overlay's onSelect. Redundant keyboard wiring just reintroduces the exact bypass we are centralising away.

(If we discover the Escape-on-game-over behaviour is actively desired by some users, we add `disableBackConfirm` on the game-over phase and keep the overlay's listener. For now, simplest is to remove it.)

### Files touched

**Modified:**

- `shared/src/components/GameShell/GameShell.tsx` — add state, intercept click, render `ConfirmDialog`, move `stopMusic` to confirm path.
- `shared/src/components/GameShell/GameShell.test.tsx` — update music-on-back test; add 5 new tests for confirm flow.
- `games/spelling-bee/src/SpellingBee.tsx` — revert to pre-PR-#17 state (direct `onBack={onExit}`).
- `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` — remove the `back-button confirmation` describe block (6 tests) added in PR #17.
- `games/spelling-bee/src/locales/en/spelling-bee.json` — remove 4 exit-confirm keys.
- `games/spelling-bee/src/locales/fr/spelling-bee.json` — remove 4 exit-confirm keys.
- `games/spelling-bee/src/components/GameOverOverlay.tsx` — remove Escape-key listener.
- `games/spelling-bee/src/__tests__/GameOverOverlay.test.tsx` — remove/replace Escape-fires-onExit test if present.
- `platform/src/locales/en/common.json` — add 4 `backConfirm.*` keys.
- `platform/src/locales/fr/common.json` — add 4 `backConfirm.*` keys.
- Any game test that asserts "click back → onExit fires" updates to "click back → click confirm → onExit fires". The survey identified `onBack={onExit}` in all six non-spelling-bee games; matching test assertions are audited in the plan phase.

**Unchanged:**

- `shared/src/components/ConfirmDialog/*` — the primitive from PR #17 stays as-is.
- `shared/src/components/index.ts`, `shared/src/index.ts` — `ConfirmDialog` remains exported for other potential uses.
- All other game source files (`DummyGame.tsx`, `MathAdventure.tsx`, etc.) are unchanged.

## Testing plan

### `GameShell.test.tsx`

Update:

- The existing test `"stops music when back button is clicked"` (or equivalent) must be updated: `stopMusic` now fires on **confirm**, not on back click.

Add:

- **Clicking back opens the confirm dialog and does not call `onBack`.** Asserts `onBack` was NOT called and `getByRole('dialog')` is present.
- **Clicking Confirm closes the dialog and calls `onBack`.** Asserts `onBack` called exactly once; dialog gone.
- **Clicking Cancel closes the dialog and does not call `onBack`.** Asserts `onBack` not called; dialog gone.
- **Confirm also calls `stopMusic` when `audioManager` is passed.** Asserts `audioManager.stopMusic` called exactly once with `{ fadeOut: 300 }`.
- **Cancel does not call `stopMusic`.** Regression guard.
- **`disableBackConfirm` bypass.** When `disableBackConfirm` is true, clicking back fires `onBack` directly with no dialog.
- **axe.** No accessibility violations on the dialog-open state.

### Per-game test updates

For each game, audit its test file for any assertion that depends on back-click → exit being synchronous. Update in the plan's task list. The survey found `onBack={onExit}` in:

- `games/dummy-game/src/DummyGame.tsx`
- `games/math-adventure/src/MathAdventure.tsx`
- `games/memory-match/src/MemoryMatch.tsx`
- `games/more-or-less/src/MoreOrLess.tsx`
- `games/safety-scout/src/SafetyScout.tsx`
- `games/word-puzzle/src/WordPuzzle.tsx`

### Spelling Bee

Remove the `back-button confirmation` describe block from `SpellingBee.test.tsx` (6 tests from PR #17). The behaviour is now covered by `GameShell.test.tsx`.

## Open questions for plan-writing

- Whether to include the `disableBackConfirm` escape hatch at all or defer it until an actual caller needs it. Leaning include now since it's one line of code and avoids a follow-up PR when game-over or celebration screens want to bypass.
- Exact naming of i18n keys (`backConfirm.*` vs `exit.*` vs `gameShell.exitConfirm.*`). Leaning `backConfirm.*` for clarity and because `gameShell.*` is already a crowded namespace in `common.json`.

## Risk and rollout

- **Regression risk:** existing game tests asserting direct-exit behaviour will fail until updated. Plan will enumerate each failing test so the implementation is mechanical.
- **Behavioural change for all games:** children playing any of the six non-Spelling-Bee games will see a new modal when they press back. This is the intended behaviour. No platform flag is needed.
