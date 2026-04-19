# GameShell Back-Confirmation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the back-button confirmation modal out of `SpellingBee.tsx` and into shared `GameShell`, so every game gains it automatically.

**Architecture:** Add a `[confirmOpen, setConfirmOpen]` state in `GameShell`, render `<ConfirmDialog>` inline, and reroute the existing `handleBack` through it. Stop music on confirm (not on click). Add four `backConfirm.*` i18n keys to `common.json`. Revert the Spelling Bee intercept wiring introduced in PR #17 and delete the now-unused game-specific exit-confirm keys. Also remove `GameOverOverlay`'s redundant Escape listener so the shell is the single exit path.

**Tech Stack:** React 19, TypeScript (strict), Vitest + @testing-library/react + vitest-axe, CSS Modules, react-i18next.

**Branch:** `feat/gameshell-back-confirm` (already created off `main`).

**Spec:** `docs/superpowers/specs/2026-04-19-gameshell-back-confirm-design.md`

---

## File map

**Modified:**

- `shared/src/components/GameShell/GameShell.tsx` — add `confirmOpen` state, render `ConfirmDialog`, move `stopMusic` to confirm path, expose `disableBackConfirm` prop.
- `shared/src/components/GameShell/GameShell.test.tsx` — update existing music-on-back test; add 7 new tests covering confirm/cancel/disableBackConfirm behaviour.
- `platform/src/locales/en/common.json` — add 4 `backConfirm.*` keys.
- `platform/src/locales/fr/common.json` — add 4 `backConfirm.*` keys with French copy.
- `games/spelling-bee/src/SpellingBee.tsx` — revert PR #17 intercept: remove state, 3 callbacks, `renderShell` helper, `ConfirmDialog`/`useState`/`ReactNode` imports. Every phase passes `onBack={onExit}` directly; `GameOverOverlay` gets `onExit={onExit}`.
- `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` — remove the `describe('back-button confirmation', ...)` block (6 tests from PR #17). The behaviour is now covered by `GameShell.test.tsx`.
- `games/spelling-bee/src/locales/en/spelling-bee.json` — delete `exitConfirmTitle`, `exitConfirmMessage`, `exitConfirmConfirm`, `exitConfirmCancel`.
- `games/spelling-bee/src/locales/fr/spelling-bee.json` — same 4 key deletions.
- `games/spelling-bee/src/components/GameOverOverlay.tsx` — remove the Escape-key `useEffect` (lines 33–41 at the time of writing).
- `games/spelling-bee/src/__tests__/GameOverOverlay.test.tsx` — replace the `'calls onExit when Escape is pressed'` test with a regression guard that Escape does NOT fire onExit.

**Unchanged:**

- `shared/src/components/ConfirmDialog/*` — the primitive from PR #17 stays as-is.
- `shared/src/components/index.ts` and `shared/src/index.ts` — `ConfirmDialog` export stays.
- All other game source files (`DummyGame`, `MathAdventure`, `MemoryMatch`, `MoreOrLess`, `SafetyScout`, `WordPuzzle`) and their test files — they already pass `onBack={onExit}` bare and none of their tests assert on the callback being called, so behaviour changes without test churn.
- `games/spelling-bee/src/locales/*/spelling-bee.json` — all other keys unchanged.

---

## Task 1: Update `GameShell` with back-confirm behaviour (TDD)

**Files:**

- Modify: `shared/src/components/GameShell/GameShell.test.tsx`
- Modify: `shared/src/components/GameShell/GameShell.tsx`

### - [ ] Step 1.1: Update the existing music-on-back test

In `shared/src/components/GameShell/GameShell.test.tsx`, find the test `'stops music when back is clicked and audioManager is provided'` (currently lines 75–86). Replace its body with:

```tsx
it('does NOT stop music when back is clicked (music stops only on confirm)', () => {
  const audioManager = createMockAudioManager();
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack} audioManager={audioManager} musicEnabled>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  expect(audioManager.stopMusic).not.toHaveBeenCalled();
  expect(onBack).not.toHaveBeenCalled();
});
```

This replaces the stale assertion with a regression guard for the new flow.

Also update the existing test `'fires onBack when back button is clicked'` (currently lines 33–42) — it will now fail because clicking back no longer calls `onBack` directly. Replace its body with:

```tsx
it('opens the confirmation dialog when back is clicked (does not call onBack directly)', () => {
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack}>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

### - [ ] Step 1.2: Add the new back-confirm tests

In the same file, add these 6 new tests anywhere after the existing ones, before the `'has no accessibility violations'` test (keep the axe test last):

```tsx
it('calls onBack when the user confirms', () => {
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack}>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  fireEvent.click(screen.getByRole('button', { name: 'backConfirm.confirm' }));
  expect(onBack).toHaveBeenCalledOnce();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('does not call onBack when the user cancels', () => {
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack}>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  fireEvent.click(screen.getByRole('button', { name: 'backConfirm.cancel' }));
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('stops music on confirm (with fadeOut 300)', () => {
  const audioManager = createMockAudioManager();
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack} audioManager={audioManager} musicEnabled>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  fireEvent.click(screen.getByRole('button', { name: 'backConfirm.confirm' }));
  expect(audioManager.stopMusic).toHaveBeenCalledWith({ fadeOut: 300 });
  expect(audioManager.stopMusic).toHaveBeenCalledOnce();
});

it('does not stop music on cancel', () => {
  const audioManager = createMockAudioManager();
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack} audioManager={audioManager} musicEnabled>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  fireEvent.click(screen.getByRole('button', { name: 'backConfirm.cancel' }));
  expect(audioManager.stopMusic).not.toHaveBeenCalled();
});

it('disableBackConfirm bypasses the dialog and fires onBack directly', () => {
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack} disableBackConfirm>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  expect(onBack).toHaveBeenCalledOnce();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('closes the dialog on Escape and does not call onBack', () => {
  const onBack = vi.fn();
  render(
    <GameShell title="Test" onBack={onBack}>
      content
    </GameShell>,
  );
  fireEvent.click(screen.getByLabelText('gameShell.goBack'));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});
```

The test uses `name: 'backConfirm.confirm'` and `name: 'backConfirm.cancel'` because the shared i18n mock returns keys as their rendered text.

### - [ ] Step 1.3: Run the tests and verify they fail

From the repo root:

```
pnpm --filter @kids-games-zone/shared test -- src/components/GameShell/GameShell.test.tsx
```

Expected: the new tests fail (`ConfirmDialog` is not rendered yet), and the two updated tests fail (the old direct-back behaviour still exists).

### - [ ] Step 1.4: Update `GameShell.tsx`

Replace the entire contents of `shared/src/components/GameShell/GameShell.tsx` with:

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipLink } from '../SkipLink/SkipLink';
import { Announcer } from '../Announcer/Announcer';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import type { AudioManager } from '../../types/services';
import styles from './GameShell.module.css';

interface GameShellProps {
  title: string;
  onBack?: () => void;
  onPause?: () => void;
  showPauseButton?: boolean;
  /**
   * When provided alongside `musicEnabled`, GameShell renders a music pause/play
   * toggle in the header and stops music when the user confirms exiting.
   */
  audioManager?: AudioManager;
  /** Master toggle from platform settings. When false, the music button is hidden. */
  musicEnabled?: boolean;
  /** Skip the back-button confirmation dialog and fire onBack directly. Default: false. */
  disableBackConfirm?: boolean;
  children: ReactNode;
}

export function GameShell({
  title,
  onBack,
  onPause,
  showPauseButton = true,
  audioManager,
  musicEnabled = false,
  disableBackConfirm = false,
  children,
}: GameShellProps) {
  const { t } = useTranslation('common');
  const [musicPaused, setMusicPaused] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showMusicToggle = Boolean(audioManager) && musicEnabled;

  useEffect(() => {
    if (!onPause) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onPause!();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPause]);

  const handleBackClick = () => {
    if (disableBackConfirm) {
      onBack?.();
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    audioManager?.stopMusic({ fadeOut: 300 });
    onBack?.();
  };

  const handleCancelExit = () => {
    setConfirmOpen(false);
  };

  const handleToggleMusic = () => {
    if (!audioManager) return;
    if (musicPaused) {
      audioManager.resumeMusic();
      setMusicPaused(false);
    } else {
      audioManager.pauseMusic();
      setMusicPaused(true);
    }
  };

  return (
    <Announcer>
      <div className={styles.shell}>
        <SkipLink targetId="game-content" label={t('gameShell.skipToGame')} />
        <header className={styles.header}>
          {onBack ? (
            <button
              className={styles.backButton}
              onClick={handleBackClick}
              aria-label={t('gameShell.goBack')}
            >
              ← Back
            </button>
          ) : (
            <div className={styles.placeholder} />
          )}

          <h1 className={styles.title}>{title}</h1>

          <div className={styles.headerActions}>
            {showMusicToggle && (
              <button
                type="button"
                className={styles.musicButton}
                onClick={handleToggleMusic}
                aria-pressed={musicPaused}
                aria-label={musicPaused ? t('gameShell.resumeMusic') : t('gameShell.pauseMusic')}
              >
                {musicPaused ? '▶' : '⏸'}
              </button>
            )}
            {showPauseButton && onPause ? (
              <button
                className={styles.pauseButton}
                onClick={onPause}
                aria-label={t('gameShell.pauseGame')}
              >
                ⏸
              </button>
            ) : !showMusicToggle ? (
              <div className={styles.placeholder} />
            ) : null}
          </div>
        </header>

        <main id="game-content" className={styles.content}>
          {children}
        </main>

        <ConfirmDialog
          open={confirmOpen}
          title={t('backConfirm.title')}
          message={t('backConfirm.message')}
          confirmLabel={t('backConfirm.confirm')}
          cancelLabel={t('backConfirm.cancel')}
          tone="danger"
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
        />
      </div>
    </Announcer>
  );
}
```

Key changes from the previous version:

- `ConfirmDialog` imported.
- New `disableBackConfirm?: boolean` prop.
- New `confirmOpen` state.
- `handleBackClick` opens the dialog (unless `disableBackConfirm` is true, in which case it behaves like the old `handleBack`).
- `handleConfirmExit` is the new "actually exit" path: closes dialog → stops music → calls `onBack`.
- `handleCancelExit` just closes the dialog.
- The `<ConfirmDialog>` is rendered as a sibling to `<header>` and `<main>` inside the `.shell` div, so it overlays everything via its own fixed-position styling.

### - [ ] Step 1.5: Run the GameShell tests and verify they pass

```
pnpm --filter @kids-games-zone/shared test -- src/components/GameShell/GameShell.test.tsx
```

Expected: all 15 tests pass (8 pre-existing, 2 updated in-place, 5 net-new from step 1.2 — actually the 6 new tests added plus 1 that replaced the music-on-back test counts as 1 replacement + 6 new = 7 net additions). Adjust count expectations to match: ~15 total, all green.

### - [ ] Step 1.6: Run the full shared suite as a smoke check

```
pnpm --filter @kids-games-zone/shared test
```

Expected: all tests pass. If the ConfirmDialog tests or any other shared test fails, stop and report — those indicate an unintended regression.

### - [ ] Step 1.7: Commit

```bash
git add shared/src/components/GameShell/GameShell.tsx shared/src/components/GameShell/GameShell.test.tsx
git commit -m "feat(shared): bake back-button confirmation into GameShell

The back button now opens a ConfirmDialog. Music stops only on confirm,
not on click, so canceling leaves the session exactly as it was. Adds a
disableBackConfirm escape-hatch prop for phases that want immediate exit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add `backConfirm.*` i18n keys

**Files:**

- Modify: `platform/src/locales/en/common.json`
- Modify: `platform/src/locales/fr/common.json`

### - [ ] Step 2.1: Add English keys

Open `platform/src/locales/en/common.json`. Find the existing `"confirmDialog.cancel": "Cancel",` entry (added in PR #17, near line 140). Add four new keys immediately after:

```json
  "backConfirm.title": "Leave the game?",
  "backConfirm.message": "Your progress will be lost.",
  "backConfirm.confirm": "Leave",
  "backConfirm.cancel": "Stay",
```

Double-check JSON commas: the new final key (`backConfirm.cancel`) must end with a comma if a non-blank line follows it in the file, or no comma if it is the last key in the object. In practice PR #17 left more keys after `confirmDialog.cancel`, so include the trailing comma.

### - [ ] Step 2.2: Add French keys

Open `platform/src/locales/fr/common.json` and add the same keys with French copy, in the same spot (after `confirmDialog.cancel`):

```json
  "backConfirm.title": "Quitter le jeu ?",
  "backConfirm.message": "Ta progression sera perdue.",
  "backConfirm.confirm": "Quitter",
  "backConfirm.cancel": "Continuer",
```

Same comma rules.

### - [ ] Step 2.3: Validate the JSON

```
node -e "JSON.parse(require('fs').readFileSync('platform/src/locales/en/common.json'))"
node -e "JSON.parse(require('fs').readFileSync('platform/src/locales/fr/common.json'))"
```

Expected: no output from either. Any `SyntaxError` means a comma is wrong — fix it.

### - [ ] Step 2.4: Commit

```bash
git add platform/src/locales/en/common.json platform/src/locales/fr/common.json
git commit -m "feat(i18n): add backConfirm.* keys for GameShell exit dialog

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Revert Spelling Bee's PR #17 back-intercept

**Files:**

- Modify: `games/spelling-bee/src/SpellingBee.tsx`
- Modify: `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`
- Modify: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Modify: `games/spelling-bee/src/locales/fr/spelling-bee.json`

### - [ ] Step 3.1: Replace `SpellingBee.tsx`

Replace the entire contents of `games/spelling-bee/src/SpellingBee.tsx` with:

```tsx
import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  CelebrationOverlay,
  InstructionBubble,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult, AgeTier } from '@kids-games-zone/shared';
import { useSessionLevels } from './hooks/useSessionLevels';
import { LevelPlay } from './components/LevelPlay';
import { LevelIndicator } from './components/LevelIndicator';
import { LevelTransition } from './components/LevelTransition';
import { GameOverOverlay } from './components/GameOverOverlay';
import wordsTiny from './data/words-tiny.json';
import wordsJunior from './data/words-junior.json';
import wordsExplorer from './data/words-explorer.json';
import styles from './SpellingBee.module.css';

function getWordPool(ageTier: AgeTier) {
  switch (ageTier) {
    case 'tiny':
      return wordsTiny;
    case 'junior':
      return wordsJunior;
    case 'explorer':
      return wordsExplorer;
  }
}

// Design note: any animations added to spelling-bee components should gate
// on `useReducedMotion()` from framer-motion. The shared CelebrationOverlay
// and PauseMenu already follow this pattern; follow them.
export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('spelling-bee');
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const wordPool = useMemo(() => getWordPool(ageTier), [ageTier]);

  const session = useSessionLevels({
    startingDifficulty: config.difficulty,
    ageTier,
    wordPool,
  });

  const { addScore } = session;
  const handleScorePoint = useCallback(
    (points: number) => {
      onScore(points);
      addScore(points);
    },
    [onScore, addScore],
  );

  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:spelling-bee-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'spelling-bee',
      score: session.sessionScore,
      maxScore: session.sessionMaxScore,
      timeSpent,
      difficulty: session.highestDifficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        wordsCorrect: session.sessionScore,
        wordsTotal: session.sessionMaxScore,
        levelsCompleted: session.levelsCompleted,
        ...(isTiny ? {} : { livesRemaining: session.lives }),
      },
    };
    onComplete(result);
  }, [session, isTiny, onComplete]);

  if (session.sessionPhase === 'instruction') {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
        <div className={styles.gameArea}>
          <InstructionBubble
            text={isTiny ? t('instructionTiny') : t('instruction')}
            character={'\u{1F41D}'}
            characterSrc="/images/games/mascots/bee.webp"
          />
          <OptionButton
            label={t('letsGo')}
            state="default"
            onSelect={session.dismissInstruction}
            size="large"
          />
        </div>
      </GameShell>
    );
  }

  if (session.sessionPhase === 'level-transition') {
    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
        <LevelTransition
          levelCompleted={session.currentLevel}
          totalLevels={session.totalLevels}
          score={session.sessionScore}
          ageTier={ageTier}
          onContinue={session.startNextLevel}
        />
      </GameShell>
    );
  }

  if (session.sessionPhase === 'complete') {
    if (session.outcome === 'out-of-lives') {
      return (
        <GameShell
          title={t('title')}
          onBack={onExit}
          audioManager={audioManager}
          musicEnabled={config.settings.backgroundMusicEnabled}
        >
          <GameOverOverlay
            levelReached={session.levelsCompleted}
            score={session.sessionScore}
            maxScore={session.sessionMaxScore}
            onRetry={session.restart}
            onExit={onExit}
          />
        </GameShell>
      );
    }

    const completionMessage = t('sessionComplete', { levels: session.levelsCompleted });

    return (
      <GameShell
        title={t('title')}
        onBack={onExit}
        audioManager={audioManager}
        musicEnabled={config.settings.backgroundMusicEnabled}
      >
        <CelebrationOverlay
          title={completionMessage}
          score={session.sessionScore}
          maxScore={session.sessionMaxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  return (
    <GameShell
      title={t('title')}
      onBack={onExit}
      audioManager={audioManager}
      musicEnabled={config.settings.backgroundMusicEnabled}
    >
      <div className={styles.gameArea}>
        <LevelIndicator current={session.currentLevel} total={session.totalLevels} />
        <LevelPlay
          key={session.currentLevel}
          words={session.levelWords}
          ageTier={ageTier}
          lives={session.lives}
          maxLives={session.maxLives}
          onScorePoint={handleScorePoint}
          onRoundComplete={session.completeLevel}
          onLifeLost={session.loseLife}
          audioManager={audioManager}
        />
      </div>
    </GameShell>
  );
}
```

What's removed relative to current `main` (PR #17): the `useState`/`ReactNode` imports, the `ConfirmDialog` import, the `confirmExitOpen` state, the three `handleBackIntercept`/`handleConfirmExit`/`handleCancelExit` callbacks, and the `renderShell` helper. Every `GameShell` render uses `onBack={onExit}` directly. `GameOverOverlay` gets `onExit={onExit}`.

### - [ ] Step 3.2: Remove the back-button confirmation test block

In `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`, find and delete the entire `describe('back-button confirmation', () => { ... })` block added in PR #17 (6 tests). It's nested inside the top-level `describe('SpellingBee', ...)` and spans from the start of `describe('back-button confirmation'` to the block's closing `})` immediately before the outer `describe`'s closing brace.

### - [ ] Step 3.3: Remove unused Spelling Bee i18n keys

In `games/spelling-bee/src/locales/en/spelling-bee.json`, delete these four keys (added in PR #17):

```json
  "exitConfirmTitle": "Leave the game?",
  "exitConfirmMessage": "You'll lose your progress in this session.",
  "exitConfirmConfirm": "Exit game",
  "exitConfirmCancel": "Keep playing"
```

Ensure whichever key now precedes the closing `}` does not have a trailing comma.

In `games/spelling-bee/src/locales/fr/spelling-bee.json`, delete the same four keys (with French copy). Same trailing-comma rule.

### - [ ] Step 3.4: Validate the JSON

```
node -e "JSON.parse(require('fs').readFileSync('games/spelling-bee/src/locales/en/spelling-bee.json'))"
node -e "JSON.parse(require('fs').readFileSync('games/spelling-bee/src/locales/fr/spelling-bee.json'))"
```

Expected: no output.

### - [ ] Step 3.5: Run the spelling-bee tests

```
pnpm --filter spelling-bee test
```

Expected: all tests pass. The 6 tests you deleted in step 3.2 are gone; all other tests should remain green. If any test fails because it relied on old Spelling Bee intercept state, stop and report — we don't want to silently invalidate coverage.

### - [ ] Step 3.6: Commit

```bash
git add games/spelling-bee/src/SpellingBee.tsx games/spelling-bee/src/__tests__/SpellingBee.test.tsx games/spelling-bee/src/locales/en/spelling-bee.json games/spelling-bee/src/locales/fr/spelling-bee.json
git commit -m "refactor(spelling-bee): rely on GameShell for back confirmation

Removes the custom intercept added in PR #17 now that the same behaviour
lives in GameShell. Deletes the six tests in SpellingBee.test.tsx that
covered the intercept (coverage moved to GameShell.test.tsx) and the
four game-specific exit-confirm i18n keys.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Remove `GameOverOverlay`'s Escape listener

**Files:**

- Modify: `games/spelling-bee/src/components/GameOverOverlay.tsx`
- Modify: `games/spelling-bee/src/__tests__/GameOverOverlay.test.tsx`

### - [ ] Step 4.1: Update the Escape-key test to assert it does NOT fire onExit

In `games/spelling-bee/src/__tests__/GameOverOverlay.test.tsx`, find the test `'calls onExit when Escape is pressed'` (currently around lines 47–52). Replace its body with:

```tsx
it('does not call onExit when Escape is pressed (exit flow owned by GameShell)', () => {
  const onExit = vi.fn();
  renderOverlay({ onExit });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onExit).not.toHaveBeenCalled();
});
```

Rename the test title to reflect new behaviour, or replace in-place — either is fine.

### - [ ] Step 4.2: Run the test and verify it fails

```
pnpm --filter spelling-bee test -- src/__tests__/GameOverOverlay.test.tsx
```

Expected: the updated test fails because the component still handles Escape.

### - [ ] Step 4.3: Update `GameOverOverlay.tsx`

In `games/spelling-bee/src/components/GameOverOverlay.tsx`:

1. Delete the `onExitRef` lines (currently lines 26–27):

```tsx
const onExitRef = useRef(onExit);
onExitRef.current = onExit;
```

2. Delete the entire Escape-key `useEffect` block (currently lines 33–41):

```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onExitRef.current();
    }
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

3. After removing both, audit the import list. `useEffect` is still used (for the retry-focus effect). `useRef` may become unused if it was only used for `onExitRef` — check: the `retryRef = useRef<HTMLButtonElement>(null)` on line 25 keeps `useRef` needed. Leave it.

The final import line should be:

```tsx
import { useEffect, useId, useRef } from 'react';
```

### - [ ] Step 4.4: Run the full GameOverOverlay test and verify pass

```
pnpm --filter spelling-bee test -- src/__tests__/GameOverOverlay.test.tsx
```

Expected: all 8 tests pass. The renamed Escape test now asserts no-op; the retry-focus, renders, button-click, aria-modal, and axe tests keep passing.

### - [ ] Step 4.5: Run the full spelling-bee suite

```
pnpm --filter spelling-bee test
```

Expected: all tests pass.

### - [ ] Step 4.6: Commit

```bash
git add games/spelling-bee/src/components/GameOverOverlay.tsx games/spelling-bee/src/__tests__/GameOverOverlay.test.tsx
git commit -m "fix(spelling-bee): drop GameOverOverlay's Escape listener

GameShell's back-confirm is now the single exit path. The overlay's own
document-level Escape listener bypassed the confirmation and duplicated
the shell's behaviour.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Full verification

### - [ ] Step 5.1: Typecheck every package

```
pnpm typecheck
```

Expected: passes. If a stale `shared/dist` declaration causes a type error (as happened during PR #17's verification), rebuild shared:

```
pnpm --filter @kids-games-zone/shared build
pnpm typecheck
```

### - [ ] Step 5.2: Lint

```
pnpm lint
```

Expected: passes. If a new `jsx-a11y` warning appears on the shell (none expected — `ConfirmDialog` is reused unchanged), address before committing.

### - [ ] Step 5.3: All tests

```
pnpm test
```

Expected: all tests pass across all packages. Representative counts (from PR #17 baseline):

- shared: 117 + 7 new GameShell + 1 replacement = 124 or so
- spelling-bee: 364 − 6 deleted back-intercept tests = ~358
- Other packages: unchanged

### - [ ] Step 5.4: Format check

```
pnpm format:check
```

If any file is unformatted, run `pnpm format` and amend or add a touch-up commit.

### - [ ] Step 5.5: Manual smoke (optional, recommended)

Start the dev server:

```
pnpm --filter platform dev
```

Spot-check each non-Spelling-Bee game in turn:

- Launch the game.
- Click `← Back` in the header.
- Verify the confirmation modal appears with the `backConfirm.*` labels.
- Click `Stay` — verify you return to the game with no changes.
- Click `← Back` again, then `Leave` — verify you exit to the hub.

Spot-check Spelling Bee:

- Launch Spelling Bee with a tiny profile (music on).
- Click `← Back` → modal appears, music keeps playing.
- Click `Stay` → modal closes, music keeps playing (no double-stop).
- Click `← Back` → `Leave` → exits; music fades out.

### - [ ] Step 5.6: Final commit / wrap-up

If any lint/format touch-ups happened, commit them:

```bash
git add -A
git commit -m "chore: lint/format touch-ups

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Otherwise do not create an empty commit.

---

## Spec coverage check

Mapping each spec requirement to a task:

- Move back-confirm behaviour into `GameShell` → Task 1.
- `confirmOpen` state owned by `GameShell` → Task 1 (Step 1.4).
- Music stops only on confirm → Task 1 (Step 1.4 `handleConfirmExit`) and Task 1 (Step 1.1 regression test).
- Cancel leaves state untouched → Task 1 (Step 1.2 cancel tests).
- `disableBackConfirm` escape-hatch prop → Task 1 (Step 1.2 `disableBackConfirm` test + Step 1.4 `handleBackClick`).
- `tone="danger"` on the dialog → Task 1 (Step 1.4).
- New `backConfirm.*` i18n keys in en + fr → Task 2.
- Retain `confirmDialog.*` keys from PR #17 → no-op (not deleted in any task).
- Remove Spelling Bee custom intercept → Task 3 (Step 3.1).
- Delete obsolete Spelling Bee i18n keys → Task 3 (Step 3.3).
- Delete the 6 back-intercept tests in Spelling Bee → Task 3 (Step 3.2).
- Remove `GameOverOverlay` Escape listener → Task 4.
- Update `GameOverOverlay` test to regression-guard that Escape is no-op → Task 4 (Step 4.1).
- Full repo typecheck/lint/test/format → Task 5.

No spec requirement without a task.
