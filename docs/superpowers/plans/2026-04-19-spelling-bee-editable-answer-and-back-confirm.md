# Spelling Bee — Editable Answer (Tiny) & Back Confirmation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tiny users explicitly submit their spelling answer (instead of auto-submitting when slots fill), and add a confirmation modal to the game's back button.

**Architecture:** Introduce a new reusable `ConfirmDialog` primitive in `shared/` (modelled on the existing `PauseMenu` — focus-trap, dialog role, ESC/backdrop cancel, animated via framer-motion with reduced-motion gate). In `LetterTiles`, remove the auto-submit branch and render a Submit button once all slots are filled. In `SpellingBee.tsx`, intercept the `← Back` click with local state that opens `ConfirmDialog`; confirm calls `onExit`, cancel closes the dialog and re-plays music if the game was playing it (since `GameShell.handleBack` stops music before our intercept runs).

**Tech Stack:** React 19, TypeScript (strict), Vitest + @testing-library/react + vitest-axe, CSS Modules, react-i18next, framer-motion, focus-trap-react.

**Branch:** `feat/spelling-bee-editable-answer-and-back-confirm` (already created).

**Spec:** `docs/superpowers/specs/2026-04-19-spelling-bee-editable-answer-and-back-confirm-design.md`

---

## File map

**New:**

- `shared/src/components/ConfirmDialog/ConfirmDialog.tsx`
- `shared/src/components/ConfirmDialog/ConfirmDialog.module.css`
- `shared/src/components/ConfirmDialog/ConfirmDialog.test.tsx`
- `games/spelling-bee/src/__tests__/LetterTiles.test.tsx`

**Modified:**

- `shared/src/components/index.ts` — export `ConfirmDialog`.
- `platform/src/locales/en/common.json` — add `confirmDialog.confirm`, `confirmDialog.cancel`.
- `platform/src/locales/fr/common.json` — same keys, French copy.
- `games/spelling-bee/src/components/LetterTiles.tsx` — remove auto-submit, add Submit button.
- `games/spelling-bee/src/components/LetterTiles.module.css` — add `.submitButton` style.
- `games/spelling-bee/src/locales/en/spelling-bee.json` — add `submit`, `exitConfirmTitle`, `exitConfirmMessage`, `exitConfirmConfirm`, `exitConfirmCancel`.
- `games/spelling-bee/src/locales/fr/spelling-bee.json` — same keys, French copy.
- `games/spelling-bee/src/SpellingBee.tsx` — intercept back, render `ConfirmDialog`, music-cancel behaviour.
- `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` — add back-intercept tests.

**Unchanged:** `shared/src/components/GameShell/GameShell.tsx`, `games/spelling-bee/src/hooks/*`, `games/spelling-bee/src/components/Keyboard.tsx`, junior/explorer flows.

---

## Task 1: `ConfirmDialog` component (shared)

**Files:**

- Create: `shared/src/components/ConfirmDialog/ConfirmDialog.tsx`
- Create: `shared/src/components/ConfirmDialog/ConfirmDialog.module.css`
- Create: `shared/src/components/ConfirmDialog/ConfirmDialog.test.tsx`

### - [ ] Step 1.1: Write the failing test file

Create `shared/src/components/ConfirmDialog/ConfirmDialog.test.tsx` with this exact content:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Leave game?',
    message: 'Your progress will be lost.',
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, message, and both buttons when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Leave game?')).toBeInTheDocument();
    expect(screen.getByText('Your progress will be lost.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
  });

  it('fires onConfirm when confirm button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('fires onCancel when cancel button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('fires onCancel on Escape key', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('does not fire onCancel on Escape when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('fires onCancel on backdrop click', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const backdrop = container.querySelector('.backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('does not fire onCancel when clicking inside the dialog', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Your progress will be lost.'));
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('has dialog role and aria attributes', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('applies danger tone class when tone is danger', () => {
    render(<ConfirmDialog {...defaultProps} tone="danger" />);
    const confirmButton = screen.getByRole('button', { name: 'Leave' });
    expect(confirmButton.className).toMatch(/danger/);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### - [ ] Step 1.2: Run the tests and verify they fail

Run from the repo root:

```bash
pnpm --filter @kids-games-zone/shared test -- src/components/ConfirmDialog/ConfirmDialog.test.tsx
```

Expected: all tests fail with an import error (ConfirmDialog does not exist yet).

### - [ ] Step 1.3: Create the CSS module

Create `shared/src/components/ConfirmDialog/ConfirmDialog.module.css` with this exact content:

```css
.backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-overlay);
  z-index: 200;
}

.dialog {
  background-color: var(--color-surface);
  border-radius: var(--radius-large);
  padding: var(--spacing-lg) var(--spacing-xl);
  text-align: center;
  min-width: 260px;
  max-width: 440px;
  box-shadow: var(--shadow-card);
}

.title {
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md);
}

.message {
  font-family: var(--font-family-body);
  font-size: 1rem;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-lg);
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.confirmButton,
.cancelButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  min-height: var(--touch-target-size);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-medium);
  font-family: var(--font-family-body);
  font-size: 1rem;
  transition: opacity var(--transition-fast);
  cursor: pointer;
}

.confirmButton:hover,
.cancelButton:hover {
  opacity: 0.85;
}

.confirmButton {
  background-color: var(--color-primary);
  color: #ffffff;
  border: none;
}

.cancelButton {
  background-color: var(--color-surface-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.danger {
  background-color: var(--color-danger, #c0392b);
}
```

### - [ ] Step 1.4: Create the component

Create `shared/src/components/ConfirmDialog/ConfirmDialog.tsx` with this exact content:

```tsx
import { useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import styles from './ConfirmDialog.module.css';

const CANCEL_BUTTON_SELECTOR = '[data-confirm-dialog-cancel="true"]';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 'danger' styles the confirm button for destructive actions. */
  tone?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'default',
}: ConfirmDialogProps) {
  const titleId = useId();
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancelRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const confirmClass =
    tone === 'danger' ? `${styles.confirmButton} ${styles.danger}` : styles.confirmButton;

  return (
    <FocusTrap
      focusTrapOptions={{
        fallbackFocus: '[role="dialog"]',
        initialFocus: CANCEL_BUTTON_SELECTOR,
      }}
    >
      <div className={styles.backdrop} onClick={onCancel}>
        <motion.div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.message}>{message}</p>
          <div className={styles.buttons}>
            <button type="button" className={confirmClass} onClick={onConfirm}>
              {confirmLabel}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              data-confirm-dialog-cancel="true"
            >
              {cancelLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </FocusTrap>
  );
}
```

### - [ ] Step 1.5: Run the tests and verify they pass

Run from the repo root:

```bash
pnpm --filter @kids-games-zone/shared test -- src/components/ConfirmDialog/ConfirmDialog.test.tsx
```

Expected: all 11 tests pass.

**Note on the backdrop-click test:** `CSS Modules` in this workspace use `classNameStrategy: 'non-scoped'` (see `shared/vitest.config.ts`), so `.backdrop` is a literal class selector in tests. If a future config change breaks this, switch the selector to `container.firstChild as HTMLElement`.

### - [ ] Step 1.6: Commit

```bash
git add shared/src/components/ConfirmDialog/
git commit -m "feat(shared): add ConfirmDialog primitive

Reusable modal for yes/no confirmation. Focus-trapped, ESC + backdrop
cancel, danger-tone variant. Modelled on PauseMenu.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Export `ConfirmDialog` + add common i18n keys

**Files:**

- Modify: `shared/src/components/index.ts`
- Modify: `platform/src/locales/en/common.json`
- Modify: `platform/src/locales/fr/common.json`

### - [ ] Step 2.1: Add the export line

Open `shared/src/components/index.ts` and add one line after line 12 (`IconImage`):

```ts
export { ConfirmDialog } from './ConfirmDialog/ConfirmDialog';
```

Final file should be:

```ts
export { GameShell } from './GameShell/GameShell';
export { OptionButton } from './OptionButton/OptionButton';
export { ScoreDisplay } from './ScoreDisplay/ScoreDisplay';
export { ProgressBar } from './ProgressBar/ProgressBar';
export { CelebrationOverlay } from './CelebrationOverlay/CelebrationOverlay';
export { GameTimer } from './GameTimer/GameTimer';
export { DifficultySelector } from './DifficultySelector/DifficultySelector';
export { InstructionBubble } from './InstructionBubble/InstructionBubble';
export { PauseMenu } from './PauseMenu/PauseMenu';
export { Announcer, useAnnounce } from './Announcer/Announcer';
export { SkipLink } from './SkipLink/SkipLink';
export { IconImage } from './IconImage/IconImage';
export { ConfirmDialog } from './ConfirmDialog/ConfirmDialog';
```

### - [ ] Step 2.2: Add common i18n keys (English)

Open `platform/src/locales/en/common.json`. Find the line `"pause.ariaLabel": "Game paused",` (currently line 137). Add these two keys immediately after, before the next blank line:

```json
  "confirmDialog.confirm": "Confirm",
  "confirmDialog.cancel": "Cancel",
```

The `pause.*` block should then read:

```json
  "pause.title": "Paused",
  "pause.resume": "Resume",
  "pause.restart": "Restart",
  "pause.exitToHub": "Exit to Hub",
  "pause.ariaLabel": "Game paused",
  "confirmDialog.confirm": "Confirm",
  "confirmDialog.cancel": "Cancel",
```

### - [ ] Step 2.3: Add common i18n keys (French)

Open `platform/src/locales/fr/common.json` and add the same two keys with French values in the matching spot (alongside other `pause.*` / generic keys):

```json
  "confirmDialog.confirm": "Confirmer",
  "confirmDialog.cancel": "Annuler",
```

If the French `pause.*` block has a different structure, just add them in a sensible place (near `pause.ariaLabel` if present). The translation copy above is the canonical French for the generic defaults.

### - [ ] Step 2.4: Typecheck

Run from the repo root:

```bash
pnpm --filter @kids-games-zone/shared typecheck
```

Expected: passes with no errors.

### - [ ] Step 2.5: Commit

```bash
git add shared/src/components/index.ts platform/src/locales/en/common.json platform/src/locales/fr/common.json
git commit -m "feat(shared): export ConfirmDialog and add common i18n keys

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Remove auto-submit in `LetterTiles`, add Submit button (TDD)

**Files:**

- Create: `games/spelling-bee/src/__tests__/LetterTiles.test.tsx`
- Modify: `games/spelling-bee/src/components/LetterTiles.tsx`
- Modify: `games/spelling-bee/src/components/LetterTiles.module.css`
- Modify: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Modify: `games/spelling-bee/src/locales/fr/spelling-bee.json`

### - [ ] Step 3.1: Add i18n key (English)

Open `games/spelling-bee/src/locales/en/spelling-bee.json`. Find the `"undoLetter"` key (search for `undoLetter`). Add this line immediately after it:

```json
  "submit": "Submit",
```

### - [ ] Step 3.2: Add i18n key (French)

Open `games/spelling-bee/src/locales/fr/spelling-bee.json`. Add the same key with French copy near the existing `undoLetter`:

```json
  "submit": "Valider",
```

### - [ ] Step 3.3: Write the failing tests

Create `games/spelling-bee/src/__tests__/LetterTiles.test.tsx` with this exact content:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LetterTiles } from '../components/LetterTiles';

describe('LetterTiles', () => {
  it('does not auto-submit when all slots are filled', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not render the submit button until all slots are full', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('submits the composed answer when submit is clicked and resets state', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('CAT');

    // After submit, the submit button should be gone (state reset).
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();
    // All tiles should be re-enabled.
    expect(screen.getByRole('button', { name: 'Letter C' })).not.toBeDisabled();
  });

  it('allows undoing after slots are full so the user can correct before submitting', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter X' }));

    // Submit button is shown.
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();

    // Undo the last letter (X).
    fireEvent.click(screen.getByRole('button', { name: 'Undo last letter' }));

    // Submit should disappear again.
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    // The correct letter (T) is now available again.
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    expect(onSubmit).toHaveBeenCalledWith('CAT');
  });

  it('still pops the last letter on undo before slots are full', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo last letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter C' })); // C is still selected, so should be disabled

    // Because C is still in `selected`, the second click is a no-op, and we haven't hit 3 letters yet.
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();
  });
});
```

### - [ ] Step 3.4: Run the tests and verify they fail

Run from the repo root:

```bash
pnpm --filter spelling-bee test -- src/__tests__/LetterTiles.test.tsx
```

Expected: most tests fail because the current implementation auto-submits and does not render a submit button. The "does not auto-submit" and "submit button" tests will fail; the "undo before full" test may pass incidentally.

### - [ ] Step 3.5: Update `LetterTiles.tsx`

Open `games/spelling-bee/src/components/LetterTiles.tsx` and replace its entire contents with:

```tsx
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './LetterTiles.module.css';

interface LetterTilesProps {
  letters: string[];
  wordLength: number;
  onSubmit: (answer: string) => void;
}

export function LetterTiles({ letters, wordLength, onSubmit }: LetterTilesProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const [selected, setSelected] = useState<number[]>([]);

  const currentAnswer = selected.map((i) => letters[i]).join('');
  const isFull = selected.length === wordLength;

  const handleTileTap = useCallback(
    (index: number) => {
      if (selected.includes(index)) return;
      if (selected.length >= wordLength) return;
      setSelected([...selected, index]);
      announce(letters[index]);
    },
    [selected, letters, wordLength, announce],
  );

  const handleUndo = useCallback(() => {
    setSelected((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (selected.length !== wordLength) return;
    const answer = selected.map((i) => letters[i]).join('');
    onSubmit(answer);
    setSelected([]);
  }, [selected, letters, wordLength, onSubmit]);

  useEffect(() => {
    if (isFull) {
      announce(t('readyToSubmit'));
    }
  }, [isFull, announce, t]);

  return (
    <div className={styles.container}>
      <div className={styles.answerSlots} aria-label="Your answer so far">
        {Array.from({ length: wordLength }, (_, i) => (
          <span key={i} className={styles.slot} aria-label={currentAnswer[i] ?? 'empty'}>
            {currentAnswer[i] ?? ''}
          </span>
        ))}
      </div>

      <div className={styles.tiles} role="group" aria-label="Letter tiles">
        {letters.map((letter, index) => (
          <button
            key={index}
            className={`${styles.tile} ${selected.includes(index) ? styles.used : ''}`}
            onClick={() => handleTileTap(index)}
            disabled={selected.includes(index)}
            aria-label={`Letter ${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        {selected.length > 0 && (
          <button className={styles.undoButton} onClick={handleUndo} aria-label="Undo last letter">
            {t('undoLetter')}
          </button>
        )}
        {isFull && (
          <button className={styles.submitButton} onClick={handleSubmit}>
            {t('submit')}
          </button>
        )}
      </div>
    </div>
  );
}
```

Key changes vs. the previous version:

- No auto-submit: `handleTileTap` no longer composes an answer or calls `onSubmit`.
- A `handleSubmit` handler, invoked only via the Submit button.
- A new `isFull` derived flag gates the Submit button render.
- A one-shot `announce(t('readyToSubmit'))` fires when slots first fill (polite — `useAnnounce` writes into the shared `Announcer`).
- Undo, Submit wrapped in a `.actions` row so layout is stable.

**Note:** `readyToSubmit` is a second new i18n key — add it in the next step.

### - [ ] Step 3.6: Add the `readyToSubmit` i18n key

English (`games/spelling-bee/src/locales/en/spelling-bee.json`) — add next to the `submit` key:

```json
  "readyToSubmit": "Ready to submit",
```

French (`games/spelling-bee/src/locales/fr/spelling-bee.json`) — same spot:

```json
  "readyToSubmit": "Prêt à valider",
```

### - [ ] Step 3.7: Add Submit button style

Open `games/spelling-bee/src/components/LetterTiles.module.css` and append to the end:

```css
.actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.submitButton {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 2px solid var(--color-primary, #4a90d9);
  border-radius: var(--radius-md, 8px);
  background: var(--color-primary, #4a90d9);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  min-height: var(--touch-target-size);
  cursor: pointer;
}

.submitButton:hover {
  opacity: 0.9;
}

.submitButton:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}
```

### - [ ] Step 3.8: Run the tests and verify they pass

```bash
pnpm --filter spelling-bee test -- src/__tests__/LetterTiles.test.tsx
```

Expected: all 5 tests pass.

### - [ ] Step 3.9: Run full spelling-bee test suite

```bash
pnpm --filter spelling-bee test
```

Expected: all tests pass. (If `SpellingBee.test.tsx` exercises tiny flow and was relying on auto-submit, it will fail — proceed to Task 5 to fix it. If every existing test passes, great.)

### - [ ] Step 3.10: Commit

```bash
git add games/spelling-bee/src/components/LetterTiles.tsx games/spelling-bee/src/components/LetterTiles.module.css games/spelling-bee/src/__tests__/LetterTiles.test.tsx games/spelling-bee/src/locales/en/spelling-bee.json games/spelling-bee/src/locales/fr/spelling-bee.json
git commit -m "feat(spelling-bee): replace auto-submit with explicit Submit button for tiny

A tiny user can now review their answer, Undo individual letters, and
explicitly press Submit. Prevents accidental losses when the last tapped
letter is wrong.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Add spelling-bee exit-confirmation i18n keys

**Files:**

- Modify: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Modify: `games/spelling-bee/src/locales/fr/spelling-bee.json`

### - [ ] Step 4.1: Add English keys

Open `games/spelling-bee/src/locales/en/spelling-bee.json` and add these keys (e.g. near the bottom of the object, before the closing `}`):

```json
  "exitConfirmTitle": "Leave the game?",
  "exitConfirmMessage": "You'll lose your progress in this session.",
  "exitConfirmConfirm": "Exit game",
  "exitConfirmCancel": "Keep playing"
```

Make sure to fix trailing commas: whichever key you adjacent, that key now needs a comma, and the last key you add (`exitConfirmCancel`) must NOT have a trailing comma if it's the final key in the object.

### - [ ] Step 4.2: Add French keys

Open `games/spelling-bee/src/locales/fr/spelling-bee.json` and add the same keys with French copy:

```json
  "exitConfirmTitle": "Quitter le jeu ?",
  "exitConfirmMessage": "Tu perdras ta progression dans cette partie.",
  "exitConfirmConfirm": "Quitter",
  "exitConfirmCancel": "Continuer"
```

Same comma rules apply.

### - [ ] Step 4.3: Commit

```bash
git add games/spelling-bee/src/locales/
git commit -m "feat(spelling-bee): add exit-confirmation i18n keys

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Intercept back button in `SpellingBee.tsx` (TDD)

**Files:**

- Modify: `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`
- Modify: `games/spelling-bee/src/SpellingBee.tsx`

### - [ ] Step 5.1: Write failing tests for back-intercept

Open `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` and append a new `describe` block at the end of the file (inside the top-level `describe('SpellingBee', ...)` or as a sibling `describe`, matching existing style in the file):

```tsx
describe('back-button confirmation', () => {
  it('does not call onExit when back is clicked (shows dialog instead)', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
    expect(props.onExit).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('exitConfirmTitle')).toBeInTheDocument();
  });

  it('calls onExit when the user confirms', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
    fireEvent.click(screen.getByRole('button', { name: 'exitConfirmConfirm' }));
    expect(props.onExit).toHaveBeenCalledOnce();
  });

  it('closes the dialog and does not call onExit on cancel', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
    fireEvent.click(screen.getByRole('button', { name: 'exitConfirmCancel' }));
    expect(props.onExit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the dialog in the playing phase too', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByText('letsGo')); // dismiss instruction
    fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('re-plays bgm on cancel for tiny when music was enabled', () => {
    const props = createTinyProps();
    render(<SpellingBee {...props} />);
    // Clear the initial playMusic call from mount.
    (props.audioManager.playMusic as unknown as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
    // GameShell calls stopMusic on back-click.
    expect(props.audioManager.stopMusic).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'exitConfirmCancel' }));
    expect(props.audioManager.playMusic).toHaveBeenCalledWith(
      'music:spelling-bee-bgm',
      expect.objectContaining({ loop: true }),
    );
  });

  it('does not re-play bgm on cancel for non-tiny tiers', () => {
    const props = createMockProps(); // junior by default
    render(<SpellingBee {...props} />);
    (props.audioManager.playMusic as unknown as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
    fireEvent.click(screen.getByRole('button', { name: 'exitConfirmCancel' }));

    expect(props.audioManager.playMusic).not.toHaveBeenCalled();
  });
});
```

### - [ ] Step 5.2: Run the tests and verify they fail

```bash
pnpm --filter spelling-bee test -- src/__tests__/SpellingBee.test.tsx -t "back-button confirmation"
```

Expected: all six new tests fail — the dialog is not yet rendered and `onExit` is still wired directly.

### - [ ] Step 5.3: Update `SpellingBee.tsx`

Open `games/spelling-bee/src/SpellingBee.tsx` and replace its entire contents with:

```tsx
import { useCallback, useRef, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  CelebrationOverlay,
  InstructionBubble,
  ConfirmDialog,
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
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

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

  const handleBackIntercept = useCallback(() => {
    setConfirmExitOpen(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    setConfirmExitOpen(false);
    onExit();
  }, [onExit]);

  const handleCancelExit = useCallback(() => {
    setConfirmExitOpen(false);
    // GameShell's handleBack stopped music when we opened the dialog.
    // For tiny users with music enabled, restart it if the game is still active.
    if (isTiny && config.settings.musicEnabled && session.sessionPhase !== 'complete') {
      audioManager.playMusic('music:spelling-bee-bgm', { loop: true, fadeIn: 300 });
    }
  }, [isTiny, config.settings.musicEnabled, session.sessionPhase, audioManager]);

  const renderShell = (children: ReactNode) => (
    <GameShell
      title={t('title')}
      onBack={handleBackIntercept}
      audioManager={audioManager}
      musicEnabled={config.settings.backgroundMusicEnabled}
    >
      {children}
      <ConfirmDialog
        open={confirmExitOpen}
        title={t('exitConfirmTitle')}
        message={t('exitConfirmMessage')}
        confirmLabel={t('exitConfirmConfirm')}
        cancelLabel={t('exitConfirmCancel')}
        tone="danger"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </GameShell>
  );

  if (session.sessionPhase === 'instruction') {
    return renderShell(
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
      </div>,
    );
  }

  if (session.sessionPhase === 'level-transition') {
    return renderShell(
      <LevelTransition
        levelCompleted={session.currentLevel}
        totalLevels={session.totalLevels}
        score={session.sessionScore}
        ageTier={ageTier}
        onContinue={session.startNextLevel}
      />,
    );
  }

  if (session.sessionPhase === 'complete') {
    if (session.outcome === 'out-of-lives') {
      return renderShell(
        <GameOverOverlay
          levelReached={session.levelsCompleted}
          score={session.sessionScore}
          maxScore={session.sessionMaxScore}
          onRetry={session.restart}
          onExit={onExit}
        />,
      );
    }

    const completionMessage = t('sessionComplete', { levels: session.levelsCompleted });

    return renderShell(
      <CelebrationOverlay
        title={completionMessage}
        score={session.sessionScore}
        maxScore={session.sessionMaxScore}
        onComplete={handleCelebrationComplete}
      />,
    );
  }

  return renderShell(
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
    </div>,
  );
}
```

Key changes:

- Added `useState` for `confirmExitOpen`, `ConfirmDialog` import.
- Introduced `renderShell(children)` so the `<ConfirmDialog>` renders once alongside every `GameShell` branch (spec open question resolved in favour of the helper — avoids duplicating the dialog render in five branches).
- `onBack={handleBackIntercept}` across all branches.
- `handleConfirmExit` closes the dialog and calls `onExit`.
- `handleCancelExit` closes the dialog and, for tiny + music-enabled + non-complete sessions, re-plays `music:spelling-bee-bgm` because `GameShell.handleBack` already stopped it.
- `ConfirmDialog` uses `tone="danger"` so the confirm button is visually distinct (this is a destructive action from the child's perspective).

### - [ ] Step 5.4: Run the new back-intercept tests

```bash
pnpm --filter spelling-bee test -- src/__tests__/SpellingBee.test.tsx -t "back-button confirmation"
```

Expected: all 6 back-intercept tests pass.

### - [ ] Step 5.5: Run the full spelling-bee suite

```bash
pnpm --filter spelling-bee test
```

Expected: all tests pass. If any pre-existing tests fail because they interacted with `GameShell`'s back-button (e.g., directly asserted on `onExit`), update them to follow the new flow (click Back → click confirm). There should not be any such tests based on the current file, but verify.

### - [ ] Step 5.6: Commit

```bash
git add games/spelling-bee/src/SpellingBee.tsx games/spelling-bee/src/__tests__/SpellingBee.test.tsx
git commit -m "feat(spelling-bee): confirm before exiting on back button

Intercepts GameShell's back button with a ConfirmDialog. Cancel restores
BGM for tiny users (since GameShell.handleBack stopped it on click).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Full verification

### - [ ] Step 6.1: Typecheck every package

```bash
pnpm typecheck
```

Expected: passes with no errors.

### - [ ] Step 6.2: Lint

```bash
pnpm lint
```

Expected: passes. If a warning appears about unused imports or vars, prefix unused vars with `_` or remove them.

### - [ ] Step 6.3: All tests

```bash
pnpm test
```

Expected: all tests pass across all packages.

### - [ ] Step 6.4: Format check

```bash
pnpm format:check
```

If it reports any unformatted files, run `pnpm format` and amend the previous relevant commit or create a small formatting commit.

### - [ ] Step 6.5: Manual smoke test (optional but recommended)

Run the platform dev server:

```bash
pnpm --filter platform dev
```

Open `http://localhost:3000`, create or pick a **tiny** profile, launch Spelling Bee. Verify:

- Tapping letters fills slots but does not auto-submit.
- Once slots are full, a Submit button appears. Undo still works and removes the Submit button.
- Clicking Submit commits the answer and advances as before.
- Clicking the back arrow in the header opens a confirmation modal with "Leave the game?".
- Cancel closes the modal and BGM resumes.
- Confirm leaves to the hub.

Repeat with a **junior** profile to verify the back-button modal works there too and that music is not erroneously restarted (junior has no BGM).

### - [ ] Step 6.6: Final commit / wrap-up

If no further changes, the branch is ready to PR. Otherwise commit any lint/format touch-ups:

```bash
git add -A
git commit -m "chore: lint/format touch-ups

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage check

Mapping each spec requirement to a task:

- Remove auto-submit in `LetterTiles` → Task 3 (Steps 3.3–3.5).
- Submit button rendered only when slots full → Task 3 (Steps 3.3, 3.5).
- Undo continues to work after slots full → Task 3 (test in 3.3).
- Announce "Ready to submit" → Task 3 (Step 3.5 `useEffect` on `isFull`).
- New `ConfirmDialog` primitive in `shared/` → Task 1.
- `role=dialog`, `aria-modal`, labelled by title → Task 1 (Step 1.4).
- Focus trap → Task 1 (Step 1.4, `FocusTrap` wrapper).
- ESC + backdrop cancel → Task 1 (Step 1.4).
- Initial focus on Cancel (safer action) → Task 1 (Step 1.4, `autoFocus` on cancel button).
- Danger tone variant → Task 1 (tone prop + `.danger` class in CSS).
- Common i18n defaults → Task 2 (Steps 2.2, 2.3).
- Spelling-bee exit i18n keys → Task 4.
- Intercept back in `SpellingBee.tsx`, render dialog, all phases → Task 5.
- Music restart on cancel (tiny, non-complete) → Task 5 (Step 5.3, `handleCancelExit`).
- Tests covering all of the above → Tasks 1, 3, 5.
- Full verification (typecheck/lint/test/format) → Task 6.

No spec requirement is left without a task.
