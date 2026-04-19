# Spelling Bee — Editable Answer (Tiny) & Back Confirmation

Date: 2026-04-19
Status: Approved, ready for implementation plan
Branch: `feat/spelling-bee-editable-answer-and-back-confirm`

## Summary

Two independent UX changes to the spelling-bee game:

1. **Editable answer for tiny users.** Remove the current auto-submit behaviour in `LetterTiles`. Once all slots are filled, show a Submit button. The child can still Undo to correct their answer before committing.
2. **Back-button confirmation modal.** Replace the immediate `onExit` on `← Back` with a confirmation dialog. Applies in all session phases (instruction, playing, level-transition, complete) and all age tiers.

The dialog is implemented once as a reusable `ConfirmDialog` primitive in `shared/`, then consumed by `SpellingBee.tsx`. `GameShell` is unchanged so other games are unaffected.

## Motivation

**Editable answer.** The current tiny flow auto-submits the moment the last slot fills. A 3–5 year old who taps a wrong final letter has no recovery — the round immediately registers incorrect. Users reported this as frustrating. A visible Submit button makes the commit step explicit and gives the child time to review or undo.

**Back confirmation.** The `← Back` button in `GameShell` currently exits directly. A single accidental tap drops all session progress (up to five levels' worth). A simple modal prevents accidental exits.

## Non-goals

- No change to junior/explorer input (`Keyboard` already has an explicit Enter-to-submit step).
- No per-slot tap-to-clear in `LetterTiles` (Undo + Submit covers correction; per-slot editing adds ordering complexity we don't want).
- No changes to `useSpellingRound` or `useSessionLevels` — submission still flows through `round.submitAnswer`; only the trigger moves from auto to button click.
- No widening of `GameShell`'s API for other games (can be lifted later if a second game wants the same behaviour).

## Design

### Feature 1 — Editable spelling (tiny)

**File: `games/spelling-bee/src/components/LetterTiles.tsx`**

Current behaviour: inside `handleTileTap`, after appending a letter, the code checks `next.length === wordLength` and calls `onSubmit(answer)` immediately, then clears `selected`.

New behaviour:

- `handleTileTap` only ever appends an index to `selected`. It no longer reads `wordLength` or calls `onSubmit`.
- When `selected.length === wordLength`, render a Submit button alongside the existing Undo button.
- Clicking Submit composes the answer (`selected.map((i) => letters[i]).join('')`), calls `onSubmit(answer)`, then resets `setSelected([])`.
- Undo continues to pop the last index, including after slots are full (so the child can correct before submitting).
- Announce "Ready to submit" (polite aria-live) when the Submit button first appears, so screen reader users are told the stage changed.

New i18n key (namespace: `spelling-bee`):

- `submit` — button label, e.g. "Submit".

### Feature 2 — Back confirmation

**New shared component: `shared/src/components/ConfirmDialog/ConfirmDialog.tsx`**

```ts
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'default' | 'danger'; // 'danger' styles confirm as destructive
}
```

Behaviour:

- Renders nothing when `open=false`.
- When open, renders a fixed-position overlay (backdrop + centered card) inline — no portal, matching existing overlays like `CelebrationOverlay` and `GameOverOverlay`.
- `role="dialog"`, `aria-modal="true"`, labelled by the title element.
- Initial focus on the Cancel button (safer action).
- Tab is trapped between Confirm and Cancel.
- `Escape` key and backdrop click both fire `onCancel`.
- On close, focus returns to the element that was focused before open.
- Follows existing design tokens (CSS Modules + custom properties). No CSS-in-JS.

Supporting files:

- `shared/src/components/ConfirmDialog/ConfirmDialog.module.css` — styles.
- `shared/src/components/ConfirmDialog/ConfirmDialog.test.tsx` — see Testing Plan.
- Export from `shared/src/components/index.ts` and re-export from `shared/src/index.ts`.

**New i18n keys (namespace: `common`, for generic reuse across games):**

- `confirmDialog.confirm` — default "Confirm".
- `confirmDialog.cancel` — default "Cancel".

These are defaults; spelling-bee passes its own more kid-friendly labels.

**File: `games/spelling-bee/src/SpellingBee.tsx`**

- Add local state: `confirmExitOpen: boolean`.
- Replace `onBack={onExit}` on every `GameShell` render with `onBack={() => setConfirmExitOpen(true)}`.
- Render `<ConfirmDialog>` at the top level of the component (outside the phase-specific returns is not possible because each branch returns its own `GameShell`; instead, render the dialog inside a single always-returned wrapper, OR render it alongside each `GameShell` branch).
  - Resolution: extract a small helper (e.g. `renderShell(children)`) so the dialog is rendered once, next to the shell, in every branch. Avoids duplication. Implementation detail to be finalised during plan-writing.
- Confirm handler: `audioManager.stopMusic({ fadeOut: 300 })`, then `onExit()`.
- Cancel handler: `setConfirmExitOpen(false)`. Nothing else changes — the game remains in its prior phase.

**New i18n keys (namespace: `spelling-bee`):**

- `exitConfirmTitle` — e.g. "Leave the game?".
- `exitConfirmMessage` — e.g. "Your progress won't be saved.".
- `exitConfirmConfirm` — e.g. "Exit game".
- `exitConfirmCancel` — e.g. "Keep playing".

### Music handling

`GameShell.handleBack` calls `audioManager.stopMusic({ fadeOut: 300 })` and then calls the passed `onBack`. We are passing a replacement `onBack` that opens the dialog, so the stopMusic call fires **when the dialog opens**, not when the user actually confirms. If the user cancels, music has been stopped for no reason.

Options considered:

- (a) Modify `GameShell` to defer its `stopMusic` until the consumer confirms — widens shared API for a single use case. Rejected.
- **(b) Chosen.** Accept that `GameShell` stops music when the back button is clicked. In the cancel handler, re-start music if the game was previously playing it. In the confirm handler, do nothing extra for music (already stopped).

Cancel-handler music behaviour:

- If `isTiny && config.settings.musicEnabled` and `session.sessionPhase` is not `'complete'`, call `audioManager.playMusic('music:spelling-bee-bgm', { loop: true, fadeIn: 300 })`.
- Otherwise, do nothing.
- If the user had manually paused music via the header toggle before clicking back, the paused state is owned by `GameShell`'s internal `musicPaused` state — our resume call will restart music and break that invariant. Accepted limitation for this pass: the `GameShell` music toggle is for tiny, and the common case is that a tiny user hasn't touched it. A follow-up can thread paused-state awareness through if this becomes a real problem.

### Edge cases

- **Dialog open during phase transition.** If the underlying phase changes (e.g., `CelebrationOverlay.onComplete` fires) while the dialog is open, the dialog stays open; confirm still calls `onExit`. No sync needed.
- **Back pressed during instruction phase.** There is progress (a started session) but no played rounds. Per brainstorming decision (answer B), we still confirm — keeps behaviour consistent.
- **Back pressed during level-transition or complete.** Same — always confirm.
- **Music toggle state on cancel.** If the user had manually paused music via the header toggle, they'll want it to stay paused on cancel. Implementation must respect the current paused state (don't blindly resume). Detail to be resolved in plan.

## Testing plan

### New: `shared/src/components/ConfirmDialog/ConfirmDialog.test.tsx`

- Renders title, message, both buttons when `open`.
- Renders nothing when `open=false`.
- `onConfirm` fires on confirm click.
- `onCancel` fires on cancel click, ESC key, and backdrop click.
- Initial focus lands on Cancel.
- Tab is trapped inside the dialog.
- Focus returns to the triggering element on close.
- `toHaveNoViolations()` axe check.

### Updated: `games/spelling-bee/src/__tests__/LetterTiles.test.tsx` (or equivalent coverage in the existing test file)

- Filling all slots does **not** call `onSubmit` (regression guard).
- Submit button does not render until slots are full.
- Submit button renders once full; clicking it calls `onSubmit` with the composed answer and resets state.
- Undo still pops the last letter, including after slots are full.
- Existing tests for tap-to-fill and Undo remain green.

### Updated: `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`

- Clicking `← Back` does **not** call `onExit` directly; the confirm dialog appears.
- Confirming the dialog calls `onExit` exactly once.
- Cancelling the dialog closes it and does not call `onExit`; the game remains in its prior phase.
- Back-intercept works across representative phases (instruction + playing).

### Not tested

- Focus-trap edge cases beyond basics — rely on axe check + straightforward implementation. Add tests if the trap grows complex.
- Every phase permutation for back-intercept — two representative phases is enough.

### i18n in tests

`spelling-bee/vitest.config.ts` aliases `react-i18next` to a local mock that returns keys as rendered strings. Assertions use keys (`"submit"`, `"exitConfirmTitle"`, etc.), not English. For the new `ConfirmDialog` tests in `shared/`, match whatever convention `shared`'s existing component tests use (to be checked in the plan).

## Files changed

**New:**

- `shared/src/components/ConfirmDialog/ConfirmDialog.tsx`
- `shared/src/components/ConfirmDialog/ConfirmDialog.module.css`
- `shared/src/components/ConfirmDialog/ConfirmDialog.test.tsx`

**Modified:**

- `shared/src/components/index.ts` — export `ConfirmDialog`.
- `shared/src/index.ts` — re-export.
- `platform/src/locales/en/common.json` and `platform/src/locales/fr/common.json` — add `confirmDialog.confirm`, `confirmDialog.cancel` (i.e. the `common` namespace lives under `platform/src/locales`, not `shared`).
- `games/spelling-bee/src/components/LetterTiles.tsx` — remove auto-submit, add Submit button.
- `games/spelling-bee/src/components/LetterTiles.module.css` — styles for Submit button (match Undo).
- `games/spelling-bee/src/SpellingBee.tsx` — intercept back button, render `ConfirmDialog`.
- `games/spelling-bee/src/locales/en/spelling-bee.json` and `games/spelling-bee/src/locales/fr/spelling-bee.json` — add `submit`, `exitConfirmTitle`, `exitConfirmMessage`, `exitConfirmConfirm`, `exitConfirmCancel`.
- `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` — back-intercept tests.
- `games/spelling-bee/src/__tests__/LetterTiles.test.tsx` — **new file**. There is no existing LetterTiles test file; add one for the auto-submit removal + Submit button coverage.

**Unchanged:**

- `shared/src/components/GameShell/GameShell.tsx`.
- `games/spelling-bee/src/hooks/*`.
- `games/spelling-bee/src/components/Keyboard.tsx`.

## Open questions for plan-writing

- Whether to extract a `renderShell(children)` helper in `SpellingBee.tsx` or repeat the `<ConfirmDialog>` render in each branch. Either is fine; pick based on final file size.
