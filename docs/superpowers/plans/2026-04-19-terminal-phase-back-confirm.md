# Terminal-phase back-confirm in other games — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass `disableBackConfirm` on the terminal-phase `<GameShell>` in math-adventure, memory-match, more-or-less, safety-scout, and word-puzzle so the Back button exits immediately when a session is already over, matching Spelling Bee.

**Architecture:** Each game already renders its terminal screen (celebration or game-over) inside a `<GameShell>`. After PR #18, every game inherits a "lose your progress" confirm dialog from `GameShell`. The fix is one boolean prop per file, plus a doc note in `GAME_DEVELOPER_GUIDE.md` to prevent future regression. No new tests — `shared/src/components/GameShell/GameShell.test.tsx` already covers both branches.

**Tech Stack:** React 19, TypeScript, pnpm workspaces, Vitest.

---

## File Structure

Files modified (one prop addition each, in the terminal-phase `<GameShell>` only):

- `games/math-adventure/src/MathAdventure.tsx` — `if (showCelebration)` branch
- `games/memory-match/src/MemoryMatch.tsx` — `if (showCelebration)` branch
- `games/more-or-less/src/MoreOrLess.tsx` — `if (round.phase === 'complete')` branch
- `games/safety-scout/src/SafetyScout.tsx` — `if (round.phase === 'complete')` branch
- `games/word-puzzle/src/WordPuzzle.tsx` — `if (showCelebration)` branch
- `GAME_DEVELOPER_GUIDE.md` — `GameShell` row in the Component reference table

Each game commit is independently revertable. The doc commit lands last.

---

### Task 1: math-adventure — terminal-phase back-confirm

**Files:**
- Modify: `games/math-adventure/src/MathAdventure.tsx:154-161`

- [ ] **Step 1: Add `disableBackConfirm` to the celebration-branch `<GameShell>`**

In `games/math-adventure/src/MathAdventure.tsx`, find the `if (showCelebration)` branch (around line 154) and add the `disableBackConfirm` prop on the `<GameShell>` opening tag, between `onBack` and `audioManager` to match Spelling Bee's prop order.

Replace:

```tsx
  if (showCelebration) {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

With:

```tsx
  if (showCelebration) {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        disableBackConfirm
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

Leave the other two `<GameShell>` instances (instruction branch and main-play branch) unchanged — they still need the confirm.

- [ ] **Step 2: Typecheck the math-adventure package**

Run: `pnpm --filter math-adventure typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Run math-adventure tests**

Run: `pnpm --filter math-adventure test`
Expected: all tests pass (no test changes; this confirms the prop addition didn't break existing rendering tests).

- [ ] **Step 4: Commit**

```bash
git add games/math-adventure/src/MathAdventure.tsx
git commit -m "fix(math-adventure): bypass back-confirm on celebration phase

Matches Spelling Bee. The session is already over on the celebration
screen, so the GameShell confirmation dialog is misleading — there is
no progress left to lose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: memory-match — terminal-phase back-confirm

**Files:**
- Modify: `games/memory-match/src/MemoryMatch.tsx:155-162`

- [ ] **Step 1: Add `disableBackConfirm` to the celebration-branch `<GameShell>`**

In `games/memory-match/src/MemoryMatch.tsx`, find the `if (showCelebration)` branch (around line 155) and add the prop on the `<GameShell>` opening tag.

Replace:

```tsx
  if (showCelebration) {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

With:

```tsx
  if (showCelebration) {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        disableBackConfirm
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

Leave the other two `<GameShell>` instances unchanged.

- [ ] **Step 2: Typecheck the memory-match package**

Run: `pnpm --filter memory-match typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Run memory-match tests**

Run: `pnpm --filter memory-match test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/memory-match/src/MemoryMatch.tsx
git commit -m "fix(memory-match): bypass back-confirm on celebration phase

Matches Spelling Bee. The session is already over on the celebration
screen, so the GameShell confirmation dialog is misleading — there is
no progress left to lose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: more-or-less — terminal-phase back-confirm

**Files:**
- Modify: `games/more-or-less/src/MoreOrLess.tsx:120-127`

- [ ] **Step 1: Add `disableBackConfirm` to the complete-branch `<GameShell>`**

In `games/more-or-less/src/MoreOrLess.tsx`, find the `if (round.phase === 'complete')` branch (around line 120) and add the prop on the `<GameShell>` opening tag.

Replace:

```tsx
  if (round.phase === 'complete') {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

With:

```tsx
  if (round.phase === 'complete') {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        disableBackConfirm
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

Leave the instruction branch and main-play branch `<GameShell>` instances unchanged.

- [ ] **Step 2: Typecheck the more-or-less package**

Run: `pnpm --filter more-or-less typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Run more-or-less tests**

Run: `pnpm --filter more-or-less test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/more-or-less/src/MoreOrLess.tsx
git commit -m "fix(more-or-less): bypass back-confirm on complete phase

Matches Spelling Bee. The session is already over on the celebration
screen, so the GameShell confirmation dialog is misleading — there is
no progress left to lose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: safety-scout — terminal-phase back-confirm

**Files:**
- Modify: `games/safety-scout/src/SafetyScout.tsx:161-168`

- [ ] **Step 1: Add `disableBackConfirm` to the complete-branch `<GameShell>`**

In `games/safety-scout/src/SafetyScout.tsx`, find the `if (round.phase === 'complete')` branch (around line 161) and add the prop on the `<GameShell>` opening tag.

Replace:

```tsx
  if (round.phase === 'complete') {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

With:

```tsx
  if (round.phase === 'complete') {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        disableBackConfirm
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

Leave the category-select, instruction, and main-play `<GameShell>` instances unchanged.

- [ ] **Step 2: Typecheck the safety-scout package**

Run: `pnpm --filter safety-scout typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Run safety-scout tests**

Run: `pnpm --filter safety-scout test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/safety-scout/src/SafetyScout.tsx
git commit -m "fix(safety-scout): bypass back-confirm on complete phase

Matches Spelling Bee. The session is already over on the celebration
screen, so the GameShell confirmation dialog is misleading — there is
no progress left to lose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: word-puzzle — terminal-phase back-confirm

**Files:**
- Modify: `games/word-puzzle/src/WordPuzzle.tsx:260-267`

- [ ] **Step 1: Add `disableBackConfirm` to the celebration-branch `<GameShell>`**

In `games/word-puzzle/src/WordPuzzle.tsx`, find the `if (showCelebration)` branch (around line 260) and add the prop on the `<GameShell>` opening tag.

Replace:

```tsx
  if (showCelebration) {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

With:

```tsx
  if (showCelebration) {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        disableBackConfirm
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
```

Leave the instruction branch and main-play branch `<GameShell>` instances unchanged. The custom document-level Escape listener at lines ~198–233 (used to undo the last placed letter) is unrelated and stays as-is.

- [ ] **Step 2: Typecheck the word-puzzle package**

Run: `pnpm --filter word-puzzle typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Run word-puzzle tests**

Run: `pnpm --filter word-puzzle test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/word-puzzle/src/WordPuzzle.tsx
git commit -m "fix(word-puzzle): bypass back-confirm on celebration phase

Matches Spelling Bee. The session is already over on the celebration
screen, so the GameShell confirmation dialog is misleading — there is
no progress left to lose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: GAME_DEVELOPER_GUIDE.md — document the terminal-phase pattern

**Files:**
- Modify: `GAME_DEVELOPER_GUIDE.md:395`

- [ ] **Step 1: Update the GameShell row in the Component reference table**

In `GAME_DEVELOPER_GUIDE.md`, the GameShell row is at line 395. Add `disableBackConfirm?` to the props column, and append one sentence to the notes column explaining the terminal-phase use case.

Replace:

```markdown
| `GameShell`          | `title`, `onBack?`, `onPause?`, `showPauseButton?`, `children`                                                                            | Wraps every game. Renders header with Back button, title, and pause button. Includes `SkipLink` and `Announcer` for accessibility. Press Escape to trigger `onPause`. |
```

With:

```markdown
| `GameShell`          | `title`, `onBack?`, `onPause?`, `showPauseButton?`, `disableBackConfirm?`, `children`                                                     | Wraps every game. Renders header with Back button, title, and pause button. Includes `SkipLink` and `Announcer` for accessibility. Press Escape to trigger `onPause`. The Back button shows a "lose your progress" confirm dialog by default — pass `disableBackConfirm` on terminal phases (game-over, celebration) so Back exits immediately. See `SpellingBee.tsx` terminal branches for the canonical example. |
```

- [ ] **Step 2: Verify formatting**

Run: `pnpm format:check`
Expected: exits 0. (The script is hardcoded with a glob and runs Prettier across the workspace; the existing GameShell row is already a long unwrapped line so the new row matches.)

If it complains about `GAME_DEVELOPER_GUIDE.md`, run `pnpm format` to fix and re-stage.

- [ ] **Step 3: Commit**

```bash
git add GAME_DEVELOPER_GUIDE.md
git commit -m "docs: document GameShell disableBackConfirm and terminal-phase rule

Adds the prop to the Component reference table and the rule that new
games should pass disableBackConfirm on terminal phases. Pre-empts the
next developer making the same mistake fixed in this branch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Workspace typecheck**

Run: `pnpm typecheck`
Expected: exits 0, no errors across all packages.

- [ ] **Step 2: Workspace lint**

Run: `pnpm lint`
Expected: exits 0, no errors.

- [ ] **Step 3: Workspace format check**

Run: `pnpm format:check`
Expected: exits 0.

- [ ] **Step 4: Workspace tests**

Run: `pnpm test`
Expected: all tests pass across all packages. (Spelling Bee tests are unchanged. The shared GameShell tests already cover both branches of `disableBackConfirm`. Per-game tests don't assert on the prop, so the new prop is invisible to them.)

- [ ] **Step 5: Manual smoke test (recommended, not blocking)**

```bash
pnpm dev
```

Open `http://localhost:3000` and for each of the 5 games:
1. Play (or speed through using difficulty 1) until the celebration screen appears.
2. Click the Back button in the header.
3. Confirm: the game exits immediately to the Hub. No "Are you sure?" dialog.
4. Sanity check the *non-terminal* path still confirms: start a fresh game, click Back during play. Confirm dialog appears, "Cancel" stays in the game, "Exit" leaves.

Spelling Bee: behaviour unchanged from `main`. No need to re-test, but a quick spot-check is fine.

- [ ] **Step 6: Confirm git state is clean**

Run: `git status`
Expected: working tree clean. 6 commits ahead of `main` (5 game fixes + 1 doc).

Run: `git log --oneline main..HEAD`
Expected output (order may differ):

```
<sha> docs: document GameShell disableBackConfirm and terminal-phase rule
<sha> fix(word-puzzle): bypass back-confirm on celebration phase
<sha> fix(safety-scout): bypass back-confirm on complete phase
<sha> fix(more-or-less): bypass back-confirm on complete phase
<sha> fix(memory-match): bypass back-confirm on celebration phase
<sha> fix(math-adventure): bypass back-confirm on celebration phase
<sha> docs: design for terminal-phase back-confirm in other games
```

(The design commit from the brainstorming step is already on the branch.)

The branch is ready for PR. Do not push or open the PR in this plan — that is a separate user-driven step.
