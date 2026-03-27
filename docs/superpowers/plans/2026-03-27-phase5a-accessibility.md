# Phase 5A — Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kids Games Zone fully accessible — WCAG 2.1 AA baseline with select AAA enhancements for high-contrast mode.

**Architecture:** Component-first approach. Install audit tooling, fix shared components (ARIA, focus, reduced motion), add high-contrast mode via design token overrides, implement roving tabindex for grid navigation, then fix platform pages and games. Every change gets an axe-core test.

**Tech Stack:** axe-core, @axe-core/react, vitest-axe, existing framer-motion (useReducedMotion), focus-trap-react, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-27-phase5a-accessibility-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `shared/src/hooks/useRovingTabindex.ts` | Reusable roving tabindex hook for 1D/2D grid keyboard navigation |
| `shared/src/hooks/useHighContrast.ts` | High-contrast mode detection (OS + manual toggle) |
| `shared/src/hooks/__tests__/useRovingTabindex.test.tsx` | Tests for roving tabindex hook |
| `shared/src/hooks/__tests__/useHighContrast.test.tsx` | Tests for high-contrast hook |
| `shared/src/components/Announcer/Announcer.tsx` | Visually hidden aria-live region for screen reader announcements |
| `shared/src/components/Announcer/Announcer.module.css` | Visually-hidden styles for Announcer |
| `shared/src/components/Announcer/Announcer.test.tsx` | Tests for Announcer component |
| `shared/src/components/SkipLink/SkipLink.tsx` | Skip-to-content navigation link |
| `shared/src/components/SkipLink/SkipLink.module.css` | Styles for skip link (hidden until focused) |

### Modified Files

| File | Changes |
|------|---------|
| `package.json` | Add `vitest-axe` to devDependencies |
| `platform/package.json` | Add `@axe-core/react` and `axe-core` to devDependencies |
| `shared/src/test-setup.ts` | Add vitest-axe `toHaveNoViolations` matcher |
| `platform/src/test-setup.ts` | Add vitest-axe `toHaveNoViolations` matcher |
| `platform/src/main.tsx` | Add axe-core dev overlay in DEV mode |
| `shared/src/styles/tokens.css` | Add focus-ring tokens, high-contrast overrides |
| `shared/src/hooks/index.ts` | Export new hooks |
| `shared/src/index.ts` | Export new hooks and components |
| `shared/src/components/index.ts` | Export Announcer and SkipLink |
| `platform/src/context/PlatformContext.tsx` | Add `highContrast` to PlatformSettings |
| `platform/src/pages/Settings.tsx` | Add high-contrast toggle |
| `platform/src/pages/Settings.module.css` | Styles for new accessibility section |
| `shared/src/components/ScoreDisplay/ScoreDisplay.tsx` | Add `aria-live="polite"` |
| `shared/src/components/GameTimer/GameTimer.tsx` | Add debounced `aria-live` announcements |
| `shared/src/components/InstructionBubble/InstructionBubble.tsx` | Add `role="status"`, `aria-live="polite"` |
| `shared/src/components/OptionButton/OptionButton.tsx` | Add `disabled` attribute, `aria-pressed` |
| `shared/src/components/PauseMenu/PauseMenu.tsx` | Add `useReducedMotion` check |
| `shared/src/components/GameShell/GameShell.tsx` | Add SkipLink, Announcer, announce callback |
| `platform/src/components/NavBar/NavBar.tsx` | Add `aria-current="page"` |
| `platform/src/pages/Hub.tsx` | Add landmarks, `aria-pressed` on filters |
| `platform/src/pages/Rewards.tsx` | Add landmarks, list semantics |
| `platform/src/components/ProfileCreator/ProfileCreator.tsx` | Add `aria-current="step"`, fieldset/legend |
| `platform/src/pages/ParentalDashboard.tsx` | Add `<th scope>`, chart `aria-label` |
| `games/memory-match/src/MemoryMatch.tsx` | Card ARIA labels, keyboard nav, announcements |
| `games/math-adventure/src/MathAdventure.tsx` | Question announcements, keyboard nav |
| `games/word-puzzle/src/WordPuzzle.tsx` | Letter/slot ARIA labels, keyboard nav |
| 18 existing test files | Add `toHaveNoViolations()` axe checks |

---

## Task 1: Install axe-core Dependencies

**Files:**
- Modify: `package.json`
- Modify: `platform/package.json`

- [ ] **Step 1: Install vitest-axe in root**

```bash
cd /home/jude/code/kids && pnpm add -Dw vitest-axe
```

- [ ] **Step 2: Install @axe-core/react in platform**

```bash
cd /home/jude/code/kids && pnpm --filter platform add -D @axe-core/react axe-core
```

- [ ] **Step 3: Verify installation**

```bash
cd /home/jude/code/kids && pnpm ls vitest-axe && pnpm --filter platform ls @axe-core/react axe-core
```

Expected: Both packages listed in output.

- [ ] **Step 4: Commit**

```bash
git add package.json platform/package.json pnpm-lock.yaml
git commit -m "chore: add axe-core accessibility testing dependencies"
```

---

## Task 2: Configure axe-core in Test Setup and Dev Overlay

**Files:**
- Modify: `shared/src/test-setup.ts`
- Modify: `platform/src/test-setup.ts`
- Modify: `platform/src/main.tsx`

- [ ] **Step 1: Add vitest-axe matcher to shared test setup**

Replace the full contents of `shared/src/test-setup.ts` with:

```typescript
import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
```

- [ ] **Step 2: Add vitest-axe matcher to platform test setup**

Replace the full contents of `platform/src/test-setup.ts` with:

```typescript
import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
```

- [ ] **Step 3: Add axe-core dev overlay to main.tsx**

In `platform/src/main.tsx`, add this block after the existing imports (after line 10, before the storageManager initialization):

```typescript
// Accessibility dev overlay — logs a11y violations to browser console
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    import('react-dom').then((ReactDOM) => {
      axe.default(React, ReactDOM, 1000);
    });
  });
}
```

Also add `React` to the import on line 1:

```typescript
import React, { StrictMode } from 'react';
```

- [ ] **Step 4: Verify tests still pass**

```bash
cd /home/jude/code/kids && pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Verify dev server starts without errors**

```bash
cd /home/jude/code/kids && timeout 10 pnpm dev || true
```

Expected: Dev server starts. The axe-core overlay will log any violations to the browser console.

- [ ] **Step 6: Commit**

```bash
git add shared/src/test-setup.ts platform/src/test-setup.ts platform/src/main.tsx
git commit -m "feat(a11y): configure vitest-axe matchers and axe-core dev overlay"
```

---

## Task 3: Add Focus Ring and High-Contrast Tokens

**Files:**
- Modify: `shared/src/styles/tokens.css`

- [ ] **Step 1: Add focus ring tokens to :root**

In `shared/src/styles/tokens.css`, add after the shadows section (after line 48, before the age-tier defaults comment):

```css
  /* --- Focus ring --- */
  --color-focus-ring: #1a73e8;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
```

- [ ] **Step 2: Add focus ring to dark theme**

Inside the `[data-theme='dark']` block, add after the shadow-button line (after line 66):

```css
  --color-focus-ring: #8ab4f8;
```

- [ ] **Step 3: Add high-contrast overrides**

Add a new block after the dark theme block (after line 67):

```css
/* --- High-contrast mode overrides --- */
[data-high-contrast='true'] {
  --color-focus-ring: #000000;
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;
  --color-text-primary: #000000;
  --color-text-secondary: #1a1a1a;
  --color-border: #000000;
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --shadow-card: none;
  --shadow-button: none;
}

[data-high-contrast='true'][data-theme='dark'] {
  --color-focus-ring: #ffffff;
  --color-text-primary: #ffffff;
  --color-text-secondary: #e0e0e0;
  --color-border: #ffffff;
  --color-bg-primary: #000000;
  --color-bg-secondary: #0a0a0a;
  --color-surface: #000000;
  --color-surface-raised: #1a1a1a;
}
```

- [ ] **Step 4: Add global focus-visible style**

Add at the very end of `tokens.css` (after the age-tier blocks):

```css
/* --- Global focus indicator --- */
*:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-ring-offset);
}

[data-high-contrast='true'] *:focus-visible {
  outline-width: var(--focus-ring-width);
  box-shadow: 0 0 0 1px var(--color-focus-ring);
}
```

- [ ] **Step 5: Verify build passes**

```bash
cd /home/jude/code/kids && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add shared/src/styles/tokens.css
git commit -m "feat(a11y): add focus ring tokens, high-contrast mode overrides"
```

---

## Task 4: Create useHighContrast Hook

**Files:**
- Create: `shared/src/hooks/useHighContrast.ts`
- Create: `shared/src/hooks/__tests__/useHighContrast.test.tsx`
- Modify: `shared/src/hooks/index.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/src/hooks/__tests__/useHighContrast.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useHighContrast } from '../useHighContrast';

describe('useHighContrast', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-high-contrast');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-high-contrast');
  });

  it('returns false by default', () => {
    const { result } = renderHook(() => useHighContrast());
    expect(result.current.isHighContrast).toBe(false);
  });

  it('toggles high contrast on', () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => {
      result.current.setHighContrast(true);
    });
    expect(result.current.isHighContrast).toBe(true);
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
  });

  it('toggles high contrast off', () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => {
      result.current.setHighContrast(true);
    });
    act(() => {
      result.current.setHighContrast(false);
    });
    expect(result.current.isHighContrast).toBe(false);
    expect(document.documentElement.hasAttribute('data-high-contrast')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test -- --run src/hooks/__tests__/useHighContrast.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook implementation**

Create `shared/src/hooks/useHighContrast.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseHighContrastReturn {
  isHighContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

export function useHighContrast(manualOverride?: boolean): UseHighContrastReturn {
  const [osPreference, setOsPreference] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
  });

  const [manualToggle, setManualToggle] = useState(manualOverride ?? false);

  // Listen for OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-contrast: more)');
    const handler = (e: MediaQueryListEvent) => setOsPreference(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Sync manual override from props
  useEffect(() => {
    if (manualOverride !== undefined) {
      setManualToggle(manualOverride);
    }
  }, [manualOverride]);

  const isHighContrast = osPreference || manualToggle;

  // Apply data attribute to document root
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }
  }, [isHighContrast]);

  const setHighContrast = useCallback((enabled: boolean) => {
    setManualToggle(enabled);
  }, []);

  return { isHighContrast, setHighContrast };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test -- --run src/hooks/__tests__/useHighContrast.test.tsx
```

Expected: All 3 tests pass.

- [ ] **Step 5: Export from barrel files**

In `shared/src/hooks/index.ts`, add:

```typescript
export { useHighContrast } from './useHighContrast';
```

In `shared/src/index.ts`, add after line 32 (after `useGameLifecycle` export):

```typescript
export { useHighContrast } from './hooks/useHighContrast';
```

- [ ] **Step 6: Verify typecheck passes**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add shared/src/hooks/useHighContrast.ts shared/src/hooks/__tests__/useHighContrast.test.tsx shared/src/hooks/index.ts shared/src/index.ts
git commit -m "feat(a11y): add useHighContrast hook with OS detection and manual toggle"
```

---

## Task 5: Create useRovingTabindex Hook

**Files:**
- Create: `shared/src/hooks/useRovingTabindex.ts`
- Create: `shared/src/hooks/__tests__/useRovingTabindex.test.tsx`
- Modify: `shared/src/hooks/index.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `shared/src/hooks/__tests__/useRovingTabindex.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRovingTabindex } from '../useRovingTabindex';

describe('useRovingTabindex', () => {
  describe('1D horizontal', () => {
    it('starts with activeIndex 0', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 4, orientation: 'horizontal' }),
      );
      expect(result.current.activeIndex).toBe(0);
    });

    it('active item has tabIndex 0, others have -1', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal' }),
      );
      expect(result.current.getItemProps(0).tabIndex).toBe(0);
      expect(result.current.getItemProps(1).tabIndex).toBe(-1);
      expect(result.current.getItemProps(2).tabIndex).toBe(-1);
    });

    it('ArrowRight moves to next item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowRight',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('ArrowLeft moves to previous item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.setActiveIndex(2);
      });
      act(() => {
        result.current.getItemProps(2).onKeyDown({
          key: 'ArrowLeft',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('wraps from last to first', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal', wrap: true }),
      );
      act(() => {
        result.current.setActiveIndex(2);
      });
      act(() => {
        result.current.getItemProps(2).onKeyDown({
          key: 'ArrowRight',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });

    it('Home moves to first item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 5, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.setActiveIndex(3);
      });
      act(() => {
        result.current.getItemProps(3).onKeyDown({
          key: 'Home',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });

    it('End moves to last item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 5, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'End',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(4);
    });
  });

  describe('1D vertical', () => {
    it('ArrowDown moves to next item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'vertical' }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('ArrowUp moves to previous item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'vertical' }),
      );
      act(() => {
        result.current.setActiveIndex(1);
      });
      act(() => {
        result.current.getItemProps(1).onKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('2D grid', () => {
    it('ArrowRight moves to next column', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3 }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowRight',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('ArrowDown moves to next row', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3 }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(3);
    });

    it('ArrowUp moves to previous row', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3 }),
      );
      act(() => {
        result.current.setActiveIndex(4);
      });
      act(() => {
        result.current.getItemProps(4).onKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('does not move past grid boundary when wrap is false', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3, wrap: false }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test -- --run src/hooks/__tests__/useRovingTabindex.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook implementation**

Create `shared/src/hooks/useRovingTabindex.ts`:

```typescript
import { useState, useCallback, useRef, type KeyboardEvent, type RefCallback } from 'react';

interface UseRovingTabindexOptions {
  itemCount: number;
  columns?: number;
  wrap?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'grid';
}

interface ItemProps {
  tabIndex: number;
  onKeyDown: (e: KeyboardEvent) => void;
  ref: RefCallback<HTMLElement>;
}

interface UseRovingTabindexReturn {
  activeIndex: number;
  getItemProps: (index: number) => ItemProps;
  setActiveIndex: (index: number) => void;
}

export function useRovingTabindex({
  itemCount,
  columns = 1,
  wrap = true,
  orientation = 'horizontal',
}: UseRovingTabindexOptions): UseRovingTabindexReturn {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const moveTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      itemRefs.current.get(index)?.focus();
    },
    [],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent) => {
      let nextIndex = index;
      const row = Math.floor(index / columns);
      const col = index % columns;

      switch (e.key) {
        case 'ArrowRight': {
          if (orientation === 'vertical') return;
          e.preventDefault();
          if (col < columns - 1 && index + 1 < itemCount) {
            nextIndex = index + 1;
          } else if (wrap) {
            nextIndex = orientation === 'grid' ? row * columns : 0;
          }
          break;
        }
        case 'ArrowLeft': {
          if (orientation === 'vertical') return;
          e.preventDefault();
          if (col > 0) {
            nextIndex = index - 1;
          } else if (wrap) {
            nextIndex =
              orientation === 'grid'
                ? Math.min(row * columns + columns - 1, itemCount - 1)
                : itemCount - 1;
          }
          break;
        }
        case 'ArrowDown': {
          if (orientation === 'horizontal') return;
          e.preventDefault();
          if (orientation === 'grid') {
            const below = index + columns;
            if (below < itemCount) {
              nextIndex = below;
            } else if (wrap) {
              nextIndex = col;
            }
          } else {
            if (index + 1 < itemCount) {
              nextIndex = index + 1;
            } else if (wrap) {
              nextIndex = 0;
            }
          }
          break;
        }
        case 'ArrowUp': {
          if (orientation === 'horizontal') return;
          e.preventDefault();
          if (orientation === 'grid') {
            const above = index - columns;
            if (above >= 0) {
              nextIndex = above;
            } else if (wrap) {
              const lastRowStart = Math.floor((itemCount - 1) / columns) * columns;
              nextIndex = Math.min(lastRowStart + col, itemCount - 1);
            }
          } else {
            if (index - 1 >= 0) {
              nextIndex = index - 1;
            } else if (wrap) {
              nextIndex = itemCount - 1;
            }
          }
          break;
        }
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = itemCount - 1;
          break;
        default:
          return;
      }

      if (nextIndex !== index) {
        moveTo(nextIndex);
      }
    },
    [itemCount, columns, wrap, orientation, moveTo],
  );

  const getItemProps = useCallback(
    (index: number): ItemProps => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (e: KeyboardEvent) => handleKeyDown(index, e),
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
    }),
    [activeIndex, handleKeyDown],
  );

  return { activeIndex, getItemProps, setActiveIndex };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test -- --run src/hooks/__tests__/useRovingTabindex.test.tsx
```

Expected: All 11 tests pass.

- [ ] **Step 5: Export from barrel files**

In `shared/src/hooks/index.ts`, add:

```typescript
export { useRovingTabindex } from './useRovingTabindex';
```

In `shared/src/index.ts`, add after the `useHighContrast` export:

```typescript
export { useRovingTabindex } from './hooks/useRovingTabindex';
```

- [ ] **Step 6: Verify typecheck passes**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add shared/src/hooks/useRovingTabindex.ts shared/src/hooks/__tests__/useRovingTabindex.test.tsx shared/src/hooks/index.ts shared/src/index.ts
git commit -m "feat(a11y): add useRovingTabindex hook for 1D/2D keyboard grid navigation"
```

---

## Task 6: Create Announcer and SkipLink Components

**Files:**
- Create: `shared/src/components/Announcer/Announcer.tsx`
- Create: `shared/src/components/Announcer/Announcer.module.css`
- Create: `shared/src/components/Announcer/Announcer.test.tsx`
- Create: `shared/src/components/SkipLink/SkipLink.tsx`
- Create: `shared/src/components/SkipLink/SkipLink.module.css`
- Modify: `shared/src/components/index.ts` (or wherever the component barrel is)

- [ ] **Step 1: Write Announcer test**

Create `shared/src/components/Announcer/Announcer.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Announcer, useAnnounce } from './Announcer';

function TestConsumer() {
  const announce = useAnnounce();
  return (
    <button onClick={() => announce('Score updated to 5')}>Announce</button>
  );
}

describe('Announcer', () => {
  it('renders a visually hidden aria-live region', () => {
    render(<Announcer />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces messages via useAnnounce', async () => {
    vi.useFakeTimers();
    render(
      <Announcer>
        <TestConsumer />
      </Announcer>,
    );

    const button = screen.getByText('Announce');
    act(() => {
      button.click();
    });

    // Message appears after a short delay (for screen reader pick-up)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Score updated to 5');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test -- --run src/components/Announcer/Announcer.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write Announcer CSS**

Create `shared/src/components/Announcer/Announcer.module.css`:

```css
.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 4: Write Announcer implementation**

Create `shared/src/components/Announcer/Announcer.tsx`:

```tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import styles from './Announcer.module.css';

type AnnounceFn = (message: string) => void;

const AnnounceContext = createContext<AnnounceFn>(() => {});

export function useAnnounce(): AnnounceFn {
  return useContext(AnnounceContext);
}

interface AnnouncerProps {
  children?: ReactNode;
}

export function Announcer({ children }: AnnouncerProps) {
  const [message, setMessage] = useState('');

  const announce: AnnounceFn = useCallback((msg: string) => {
    // Clear then set — forces screen readers to re-read even if same text
    setMessage('');
    setTimeout(() => setMessage(msg), 100);
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.visuallyHidden}
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
```

- [ ] **Step 5: Run Announcer test to verify it passes**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test -- --run src/components/Announcer/Announcer.test.tsx
```

Expected: All 2 tests pass.

- [ ] **Step 6: Write SkipLink component**

Create `shared/src/components/SkipLink/SkipLink.module.css`:

```css
.skipLink {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: #ffffff;
  border-radius: var(--radius-medium);
  font-weight: 700;
  font-size: 1rem;
  z-index: 9999;
  text-decoration: none;
  transition: top var(--transition-fast);
}

.skipLink:focus {
  top: var(--spacing-sm);
}
```

Create `shared/src/components/SkipLink/SkipLink.tsx`:

```tsx
import styles from './SkipLink.module.css';

interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export function SkipLink({ targetId, label = 'Skip to content' }: SkipLinkProps) {
  return (
    <a href={`#${targetId}`} className={styles.skipLink}>
      {label}
    </a>
  );
}
```

- [ ] **Step 7: Export both components from barrel**

Find the components barrel file and add exports. In `shared/src/components/index.ts`, add:

```typescript
export { Announcer, useAnnounce } from './Announcer/Announcer';
export { SkipLink } from './SkipLink/SkipLink';
```

In `shared/src/index.ts`, add to the Components export section:

```typescript
export { Announcer, useAnnounce } from './components/Announcer/Announcer';
export { SkipLink } from './components/SkipLink/SkipLink';
```

- [ ] **Step 8: Verify typecheck passes**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add shared/src/components/Announcer/ shared/src/components/SkipLink/ shared/src/components/index.ts shared/src/index.ts
git commit -m "feat(a11y): add Announcer and SkipLink components"
```

---

## Task 7: Fix Shared Component ARIA — ScoreDisplay, ProgressBar, InstructionBubble

**Files:**
- Modify: `shared/src/components/ScoreDisplay/ScoreDisplay.tsx`
- Modify: `shared/src/components/ProgressBar/ProgressBar.tsx`
- Modify: `shared/src/components/InstructionBubble/InstructionBubble.tsx`

- [ ] **Step 1: Add aria-live to ScoreDisplay**

In `shared/src/components/ScoreDisplay/ScoreDisplay.tsx`, change line 46 from:

```tsx
    <div className={styles.container} aria-label={ariaLabel}>
```

to:

```tsx
    <div className={styles.container} aria-label={ariaLabel} aria-live="polite">
```

- [ ] **Step 2: Add aria-label to ProgressBar**

In `shared/src/components/ProgressBar/ProgressBar.tsx`, add `aria-label` to the track div. Change lines 29-36 from:

```tsx
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        style={style}
      >
```

to:

```tsx
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={displayLabel}
        style={style}
      >
```

- [ ] **Step 3: Add role and aria-live to InstructionBubble**

In `shared/src/components/InstructionBubble/InstructionBubble.tsx`, change line 37 from:

```tsx
    <div className={styles.container}>
```

to:

```tsx
    <div className={styles.container} role="status" aria-live="polite">
```

- [ ] **Step 4: Run existing tests to verify nothing breaks**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test
```

Expected: All tests pass.

- [ ] **Step 5: Add axe checks to existing component tests**

In each of the following test files, add `import { axe } from 'vitest-axe';` at the top and add an accessibility test:

**ScoreDisplay** — In `shared/src/components/ScoreDisplay/ScoreDisplay.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

// Add this test to the existing describe block:
it('has no accessibility violations', async () => {
  const { container } = render(<ScoreDisplay score={5} maxScore={10} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**ProgressBar** — In `shared/src/components/ProgressBar/ProgressBar.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<ProgressBar current={3} total={10} showLabel />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**InstructionBubble** — In `shared/src/components/InstructionBubble/InstructionBubble.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<InstructionBubble text="Find the word!" />);
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 6: Run tests to verify axe checks pass**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test
```

Expected: All tests pass including new axe checks.

- [ ] **Step 7: Commit**

```bash
git add shared/src/components/ScoreDisplay/ shared/src/components/ProgressBar/ shared/src/components/InstructionBubble/
git commit -m "feat(a11y): add aria-live to ScoreDisplay, ProgressBar label, InstructionBubble role"
```

---

## Task 8: Fix Shared Component ARIA — GameTimer, OptionButton, PauseMenu

**Files:**
- Modify: `shared/src/components/GameTimer/GameTimer.tsx`
- Modify: `shared/src/components/OptionButton/OptionButton.tsx`
- Modify: `shared/src/components/PauseMenu/PauseMenu.tsx`

- [ ] **Step 1: Add debounced aria-live to GameTimer**

In `shared/src/components/GameTimer/GameTimer.tsx`, add a state for the announced time and a ref for the last announcement. Add after line 27 (`useState(0)`):

```typescript
const [announcedTime, setAnnouncedTime] = useState('');
const lastAnnouncedRef = useRef(0);
```

Inside the `setInterval` callback (around line 42-53), add announcement logic. After the `onTickRef.current?.(...)` call on line 51, add:

```typescript
        // Announce to screen readers every 10 seconds
        const displaySecs = mode === 'countdown' ? duration - next : next;
        if (Math.abs(displaySecs - lastAnnouncedRef.current) >= 10) {
          lastAnnouncedRef.current = displaySecs;
          setAnnouncedTime(
            mode === 'countdown'
              ? `${formatTime(displaySecs)} remaining`
              : `${formatTime(displaySecs)} elapsed`,
          );
        }
```

Then add a visually-hidden aria-live region inside the component return, after the closing `</svg>` tag (before the closing `</div>`):

```tsx
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcedTime}
      </span>
```

- [ ] **Step 2: Fix OptionButton — add disabled attribute and aria-pressed**

In `shared/src/components/OptionButton/OptionButton.tsx`, update the `OptionButtonProps` interface to add `selected`:

```typescript
interface OptionButtonProps {
  label: string;
  icon?: ReactNode;
  state?: 'default' | 'correct' | 'incorrect';
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  size?: 'normal' | 'large';
}
```

Update the destructuring to include `selected`:

```typescript
export function OptionButton({
  label,
  icon,
  state = 'default',
  disabled = false,
  selected,
  onSelect,
  size = 'normal',
}: OptionButtonProps) {
```

On the `<motion.button>`, replace `aria-disabled={disabled}` with:

```tsx
      disabled={disabled}
      aria-pressed={selected}
```

- [ ] **Step 3: Add useReducedMotion to PauseMenu**

In `shared/src/components/PauseMenu/PauseMenu.tsx`, add `useReducedMotion` import. Change line 2 from:

```typescript
import { motion } from 'framer-motion';
```

to:

```typescript
import { motion, useReducedMotion } from 'framer-motion';
```

Add inside the component body (after line 14):

```typescript
  const shouldReduceMotion = useReducedMotion();
```

Update the motion.div props (lines 36-39) to respect reduced motion:

```tsx
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
```

- [ ] **Step 4: Run existing tests**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test
```

Expected: All tests pass.

- [ ] **Step 5: Add axe checks to these component tests**

**GameTimer** — In `shared/src/components/GameTimer/GameTimer.test.tsx`:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<GameTimer mode="countup" />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**OptionButton** — In `shared/src/components/OptionButton/OptionButton.test.tsx`:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<OptionButton label="Answer A" />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**PauseMenu** — In `shared/src/components/PauseMenu/PauseMenu.test.tsx`:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(
    <PauseMenu onResume={() => {}} onRestart={() => {}} onExit={() => {}} />,
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 6: Run tests**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test
```

Expected: All tests pass including new axe checks.

- [ ] **Step 7: Commit**

```bash
git add shared/src/components/GameTimer/ shared/src/components/OptionButton/ shared/src/components/PauseMenu/
git commit -m "feat(a11y): debounced timer announcements, OptionButton disabled/pressed, PauseMenu reduced motion"
```

---

## Task 9: Fix GameShell — SkipLink, Announcer, Landmarks

**Files:**
- Modify: `shared/src/components/GameShell/GameShell.tsx`
- Modify: `shared/src/components/GameShell/GameShell.test.tsx`

- [ ] **Step 1: Update GameShell with SkipLink, Announcer, and announce prop**

Replace the contents of `shared/src/components/GameShell/GameShell.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { SkipLink } from '../SkipLink/SkipLink';
import { Announcer } from '../Announcer/Announcer';
import styles from './GameShell.module.css';

interface GameShellProps {
  title: string;
  onBack?: () => void;
  onPause?: () => void;
  showPauseButton?: boolean;
  children: ReactNode;
}

export function GameShell({
  title,
  onBack,
  onPause,
  showPauseButton = true,
  children,
}: GameShellProps) {
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

  return (
    <Announcer>
      <div className={styles.shell}>
        <SkipLink targetId="game-content" label="Skip to game" />
        <header className={styles.header}>
          {onBack ? (
            <button
              className={styles.backButton}
              onClick={onBack}
              aria-label="Go back"
            >
              ← Back
            </button>
          ) : (
            <div className={styles.placeholder} />
          )}

          <h1 className={styles.title}>{title}</h1>

          {showPauseButton && onPause ? (
            <button
              className={styles.pauseButton}
              onClick={onPause}
              aria-label="Pause game"
            >
              ⏸
            </button>
          ) : (
            <div className={styles.placeholder} />
          )}
        </header>

        <main id="game-content" className={styles.content}>
          {children}
        </main>
      </div>
    </Announcer>
  );
}
```

- [ ] **Step 2: Add axe check to GameShell test**

In `shared/src/components/GameShell/GameShell.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(
    <GameShell title="Test Game" onBack={() => {}} onPause={() => {}}>
      <div>Game content</div>
    </GameShell>,
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 3: Run tests**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add shared/src/components/GameShell/
git commit -m "feat(a11y): add SkipLink, Announcer, and landmark roles to GameShell"
```

---

## Task 10: Add axe Checks to Remaining Shared Component Tests

**Files:**
- Modify: `shared/src/components/DifficultySelector/DifficultySelector.test.tsx`
- Modify: `shared/src/components/CelebrationOverlay/CelebrationOverlay.test.tsx`

- [ ] **Step 1: Add axe check to DifficultySelector test**

In `shared/src/components/DifficultySelector/DifficultySelector.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(
    <DifficultySelector current={3} onChange={() => {}} />,
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 2: Add axe check to CelebrationOverlay test**

In `shared/src/components/CelebrationOverlay/CelebrationOverlay.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(
    <CelebrationOverlay title="Great job!" score={8} maxScore={10} />,
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 3: Run all shared tests**

```bash
cd /home/jude/code/kids && pnpm --filter @kids-games-zone/shared test
```

Expected: All tests pass. If any axe violations are found, fix the component code accordingly and re-run.

- [ ] **Step 4: Commit**

```bash
git add shared/src/components/DifficultySelector/DifficultySelector.test.tsx shared/src/components/CelebrationOverlay/CelebrationOverlay.test.tsx
git commit -m "test(a11y): add axe violation checks to DifficultySelector and CelebrationOverlay"
```

---

## Task 11: Add High-Contrast Toggle to Platform Settings

**Files:**
- Modify: `platform/src/context/PlatformContext.tsx`
- Modify: `platform/src/pages/Settings.tsx`
- Modify: `platform/src/pages/Settings.module.css`

- [ ] **Step 1: Add highContrast to PlatformSettings**

In `platform/src/context/PlatformContext.tsx`, update the `PlatformSettings` interface (line 20-24). Change from:

```typescript
export interface PlatformSettings {
  theme: 'light' | 'dark';
  language: string;
  timeLimits: TimeLimitConfig;
}
```

to:

```typescript
export interface PlatformSettings {
  theme: 'light' | 'dark';
  language: string;
  timeLimits: TimeLimitConfig;
  highContrast: boolean;
}
```

Find the initial settings defaults in the same file and add `highContrast: false` to the default settings object.

- [ ] **Step 2: Add high-contrast toggle to Settings page**

In `platform/src/pages/Settings.tsx`, import `useHighContrast`:

```typescript
import { useHighContrast } from '@kids-games-zone/shared';
```

Add inside the component, after the `handleThemeToggle` function:

```typescript
  const { isHighContrast, setHighContrast } = useHighContrast(
    state.settings.highContrast,
  );

  const handleHighContrastToggle = () => {
    const next = !isHighContrast;
    setHighContrast(next);
    dispatch({ type: 'SET_SETTINGS', payload: { highContrast: next } });
  };
```

Add a new section in the JSX, after the Appearance section (after line 48):

```tsx
      {/* Accessibility */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Accessibility</h2>
        <div className={styles.settingRow}>
          <label htmlFor="high-contrast-toggle">High Contrast</label>
          <button
            id="high-contrast-toggle"
            className={styles.toggleBtn}
            onClick={handleHighContrastToggle}
            aria-pressed={isHighContrast}
          >
            {isHighContrast ? 'On' : 'Off'}
          </button>
        </div>
      </section>
```

- [ ] **Step 3: Verify build passes**

```bash
cd /home/jude/code/kids && pnpm typecheck && pnpm build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add platform/src/context/PlatformContext.tsx platform/src/pages/Settings.tsx platform/src/pages/Settings.module.css
git commit -m "feat(a11y): add high-contrast toggle to Settings page with persistence"
```

---

## Task 12: Fix NavBar Accessibility

**Files:**
- Modify: `platform/src/components/NavBar/NavBar.tsx`

- [ ] **Step 1: Add aria-current to active NavLink**

In `platform/src/components/NavBar/NavBar.tsx`, update the `NavLink` to include `aria-current`. Change lines 22-34 from:

```tsx
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
          end={tab.path === '/'}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
```

to:

```tsx
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
          aria-current={({ isActive }: { isActive: boolean }) =>
            isActive ? 'page' : undefined
          }
          end={tab.path === '/'}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
```

Note: React Router's `NavLink` supports `aria-current` via a function prop. If this doesn't work with the current React Router version, use a render prop pattern instead — check the React Router 7 docs. An alternative approach is to read `isActive` from the className function and pass `aria-current` separately:

```tsx
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              end={tab.path === '/'}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={styles.icon} aria-hidden="true">
                {tab.icon}
              </span>
              <span className={styles.label}>{tab.label}</span>
            </NavLink>
          );
        })}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add platform/src/components/NavBar/NavBar.tsx
git commit -m "feat(a11y): add aria-current='page' to active NavBar link"
```

---

## Task 13: Fix Hub Page Accessibility

**Files:**
- Modify: `platform/src/pages/Hub.tsx`

- [ ] **Step 1: Add landmark roles and aria-pressed to Hub**

Read `platform/src/pages/Hub.tsx` to get the exact current code, then apply these changes:

1. Wrap the main content area in `<main>` if not already (or add `role="main"` to the outermost container).

2. Add `aria-label` to each `<section>`:
   - Continue Playing section: `<section aria-label="Continue Playing">`
   - All Games section: `<section aria-label="All Games">`
   - Daily Challenge section already has `role="region" aria-label="Daily challenge"` — keep it.

3. Add `aria-pressed` to filter buttons. For the "All" filter button, add:
   ```tsx
   aria-pressed={activeFilter === 'all'}
   ```
   For each category filter button, add:
   ```tsx
   aria-pressed={activeFilter === category}
   ```

4. Make game cards announce their full state. On each game card's clickable element, ensure `aria-label` includes game name + progress info + locked state.

- [ ] **Step 2: Verify build passes**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add platform/src/pages/Hub.tsx
git commit -m "feat(a11y): add landmarks, aria-pressed filters, and descriptive card labels to Hub"
```

---

## Task 14: Fix Remaining Platform Pages

**Files:**
- Modify: `platform/src/pages/Rewards.tsx`
- Modify: `platform/src/components/ProfileCreator/ProfileCreator.tsx`
- Modify: `platform/src/pages/ParentalDashboard.tsx`

- [ ] **Step 1: Fix Rewards page**

Read `platform/src/pages/Rewards.tsx`, then:

1. Wrap reward grid in `<ul role="list">` and each card in `<li>`.
2. Add `aria-label="Your rewards"` to the grid container.

- [ ] **Step 2: Fix ProfileCreator**

Read `platform/src/components/ProfileCreator/ProfileCreator.tsx`, then:

1. Add `aria-current="step"` to the active step indicator.
2. Wrap avatar selection in `<fieldset>` with `<legend>Choose your avatar</legend>`.
3. Wrap age selection in `<fieldset>` with `<legend>How old are you?</legend>`.
4. Add `aria-pressed={selected}` to avatar buttons and age buttons.

- [ ] **Step 3: Fix ParentalDashboard**

Read `platform/src/pages/ParentalDashboard.tsx`, then:

1. Add `scope="col"` to all `<th>` elements in the game progress table.
2. Add an `aria-label` to the play-time bar chart summarizing the data (e.g., `aria-label="Play time over the last 7 days"`).

- [ ] **Step 4: Verify build passes**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add platform/src/pages/Rewards.tsx platform/src/components/ProfileCreator/ProfileCreator.tsx platform/src/pages/ParentalDashboard.tsx
git commit -m "feat(a11y): fix landmarks, fieldsets, table headers, and ARIA across platform pages"
```

---

## Task 15: Fix Memory Match Game Accessibility

**Files:**
- Modify: `games/memory-match/src/MemoryMatch.tsx`

- [ ] **Step 1: Read the current MemoryMatch code**

Read `games/memory-match/src/MemoryMatch.tsx` to understand the card rendering structure.

- [ ] **Step 2: Add ARIA labels to cards**

Each card button needs an `aria-label` describing its state:
- Face down: `"Card ${index + 1} of ${totalCards}, face down"`
- Face up (during flip): `"${cardContent}, face up"`
- Matched: `"${cardContent}, matched"`

Add `role="grid"` to the card container and `role="gridcell"` to each card wrapper.

- [ ] **Step 3: Add useAnnounce for game events**

Import `useAnnounce` from the shared library:

```typescript
import { useAnnounce } from '@kids-games-zone/shared';
```

Add inside the component:

```typescript
const announce = useAnnounce();
```

Call `announce()` at key moments:
- When cards are revealed in preview: `announce('Preview: memorize the cards!')`
- When a match is found: `announce('Match found! ${matchName}')`
- When cards don't match: `announce('Not a match, try again')`
- When game is complete: `announce('Congratulations! All pairs matched!')`

- [ ] **Step 4: Add keyboard navigation to card grid**

Import `useRovingTabindex` from shared:

```typescript
import { useRovingTabindex } from '@kids-games-zone/shared';
```

Use it for the card grid:

```typescript
const { getItemProps } = useRovingTabindex({
  itemCount: cards.length,
  columns: gridConfig.cols,
  orientation: 'grid',
});
```

Spread `getItemProps(index)` onto each card button.

- [ ] **Step 5: Run game tests**

```bash
cd /home/jude/code/kids && pnpm --filter memory-match test
```

Expected: All tests pass. Fix any failures caused by new ARIA attributes in test assertions.

- [ ] **Step 6: Add axe check to MemoryMatch test**

In `games/memory-match/src/__tests__/MemoryMatch.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  // Render with required GameProps — use the same setup as existing tests
  const { container } = render(<MemoryMatch {...defaultProps} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 7: Run tests**

```bash
cd /home/jude/code/kids && pnpm --filter memory-match test
```

Expected: All tests pass including axe check.

- [ ] **Step 8: Commit**

```bash
git add games/memory-match/
git commit -m "feat(a11y): add card ARIA labels, keyboard grid nav, and announcements to Memory Match"
```

---

## Task 16: Fix Math Adventure Game Accessibility

**Files:**
- Modify: `games/math-adventure/src/MathAdventure.tsx`

- [ ] **Step 1: Read the current MathAdventure code**

Read `games/math-adventure/src/MathAdventure.tsx` to understand the question/option rendering structure.

- [ ] **Step 2: Add announcements for new questions**

Import `useAnnounce`:

```typescript
import { useAnnounce } from '@kids-games-zone/shared';
```

Add inside the component:

```typescript
const announce = useAnnounce();
```

When a new question is displayed (after `advanceQuestion` or on initial render), call:

```typescript
announce(`Question ${currentIndex + 1} of ${questions.length}: ${questions[currentIndex].text}`);
```

When an answer is selected:
- Correct: `announce('Correct!')`
- Incorrect: `announce('Incorrect, try again')`

- [ ] **Step 3: Add aria-label to question display**

Wrap the question text in an element with `aria-live="assertive"`:

```tsx
<p aria-live="assertive" aria-atomic="true">
  {questions[currentIndex].text}
</p>
```

Add `aria-label` to the attempts/hint display describing remaining attempts.

- [ ] **Step 4: Run game tests**

```bash
cd /home/jude/code/kids && pnpm --filter math-adventure test
```

Expected: All tests pass.

- [ ] **Step 5: Add axe check to MathAdventure test**

In `games/math-adventure/src/__tests__/MathAdventure.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<MathAdventure {...defaultProps} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 6: Run tests**

```bash
cd /home/jude/code/kids && pnpm --filter math-adventure test
```

Expected: All tests pass including axe check.

- [ ] **Step 7: Commit**

```bash
git add games/math-adventure/
git commit -m "feat(a11y): add question announcements and ARIA labels to Math Adventure"
```

---

## Task 17: Fix Word Puzzle Game Accessibility

**Files:**
- Modify: `games/word-puzzle/src/WordPuzzle.tsx`

- [ ] **Step 1: Read the current WordPuzzle code**

Read `games/word-puzzle/src/WordPuzzle.tsx` to understand the letter tile and answer slot rendering.

- [ ] **Step 2: Add ARIA labels to letter tiles and answer slots**

For each letter tile button, add:

```tsx
aria-label={`Letter ${letter}${isUsed ? ', used' : ''}`}
```

For each answer slot, add:

```tsx
aria-label={`Slot ${index + 1} of ${totalSlots}${letter ? `, filled with letter ${letter}` : ', empty'}`}
```

- [ ] **Step 3: Add announcements for game events**

Import `useAnnounce`:

```typescript
import { useAnnounce } from '@kids-games-zone/shared';
```

Add announcements:
- New round: `announce('Unscramble the word! Category: ${category}, Clue: ${clue}')`
- Letter placed: `announce('Placed letter ${letter} in slot ${slotIndex + 1}')`
- Letter removed: `announce('Removed letter ${letter} from slot ${slotIndex + 1}')`
- Correct answer: `announce('Correct! The word is ${word}')`
- Incorrect answer: `announce('Not quite, try again')`

- [ ] **Step 4: Add keyboard navigation to letter tiles**

Import `useRovingTabindex`:

```typescript
import { useRovingTabindex } from '@kids-games-zone/shared';
```

Use for the scrambled letter row:

```typescript
const { getItemProps: getLetterProps } = useRovingTabindex({
  itemCount: scrambledLetters.length,
  orientation: 'horizontal',
});
```

Spread `getLetterProps(index)` onto each letter tile button.

- [ ] **Step 5: Run game tests**

```bash
cd /home/jude/code/kids && pnpm --filter word-puzzle test
```

Expected: All tests pass.

- [ ] **Step 6: Add axe check to WordPuzzle test**

In `games/word-puzzle/src/__tests__/WordPuzzle.test.tsx`, add:

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<WordPuzzle {...defaultProps} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 7: Run tests**

```bash
cd /home/jude/code/kids && pnpm --filter word-puzzle test
```

Expected: All tests pass including axe check.

- [ ] **Step 8: Commit**

```bash
git add games/word-puzzle/
git commit -m "feat(a11y): add letter/slot ARIA labels, keyboard nav, and announcements to Word Puzzle"
```

---

## Task 18: Add axe Checks to Remaining Platform Tests

**Files:**
- Modify: `platform/src/components/RewardCard/RewardCard.test.tsx`
- Modify: `platform/src/components/RewardCelebration/RewardCelebration.test.tsx`
- Modify: `games/memory-match/src/__tests__/Card.test.tsx`

- [ ] **Step 1: Add axe checks to each test file**

For each file, add `import { axe } from 'vitest-axe';` and an axe test following the same pattern used in prior tasks. Read each test file first to understand the existing render setup.

- [ ] **Step 2: Run all tests**

```bash
cd /home/jude/code/kids && pnpm test
```

Expected: All tests pass across all packages.

- [ ] **Step 3: Commit**

```bash
git add platform/src/components/RewardCard/RewardCard.test.tsx platform/src/components/RewardCelebration/RewardCelebration.test.tsx games/memory-match/src/__tests__/Card.test.tsx
git commit -m "test(a11y): add axe violation checks to remaining component tests"
```

---

## Task 19: Full Test Suite Verification and Lint

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
cd /home/jude/code/kids && pnpm test
```

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

```bash
cd /home/jude/code/kids && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run lint**

```bash
cd /home/jude/code/kids && pnpm lint
```

Expected: No lint errors (jsx-a11y rules should all pass with the fixes applied).

- [ ] **Step 4: Run build**

```bash
cd /home/jude/code/kids && pnpm build
```

Expected: Production build succeeds.

- [ ] **Step 5: Commit any remaining fixes**

If any of the above steps revealed issues, fix them and commit:

```bash
git add -A && git commit -m "fix(a11y): resolve lint/type/test issues from accessibility changes"
```

---

## Task 20: Update Development Plan

**Files:**
- Modify: `plans/development-plan.md`

- [ ] **Step 1: Update Phase 5A status**

In `plans/development-plan.md`, update the Phase 5 section to reflect that 5A (Accessibility) is complete. Change the header and add a completion note similar to Phases 0-4:

```markdown
## Phase 5 — Accessibility, i18n & Offline
**Duration:** 2-3 weeks

### 5A. Accessibility Audit & Fixes — ✅ COMPLETE
**Completed:** [today's date]

What was delivered:
- axe-core dev overlay and vitest-axe test integration
- Global focus-visible indicators and focus ring tokens
- High-contrast mode (OS detection + manual toggle in Settings)
- useRovingTabindex hook for 1D/2D keyboard grid navigation
- Announcer component for centralized screen reader announcements
- SkipLink component for keyboard users
- ARIA fixes across all 9 shared components
- Landmark roles and labels across all platform pages
- Game-specific ARIA labels, keyboard navigation, and announcements for all 3 games
- axe violation checks added to ~20 test files
```

Update the acceptance criteria checkboxes for the accessibility items.

- [ ] **Step 2: Commit**

```bash
git add plans/development-plan.md
git commit -m "docs: mark Phase 5A accessibility as complete"
```
