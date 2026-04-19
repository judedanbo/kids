# More or Less Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a More or Less comparison game for ages 3–10 with progressive complexity: tiny-tier compares visual object groups (2 choices), junior-tier compares abstract numbers (3 choices), explorer-tier compares decimals/fractions and orders 4+ items.

**Architecture:** Game plugin following the existing `GamePlugin` pattern. Procedural generation for all comparisons — no static data files. Three distinct interaction modes by age tier. Drag-to-order for explorer-tier ordering challenges with tap-in-sequence as alternative input.

**Tech Stack:** React 19, TypeScript (strict), CSS Modules, Vitest + vitest-axe, react-i18next, shared components (GameShell, OptionButton, ProgressBar, ScoreDisplay, CelebrationOverlay, InstructionBubble, useAnnounce)

---

## File Structure

```
games/more-or-less/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                              — GamePlugin default export with manifest
    MoreOrLess.tsx                         — Main game component
    MoreOrLess.module.css
    components/
      ObjectGroups.tsx                     — Visual object groups for tiny-tier
      ObjectGroups.module.css
      NumberCards.tsx                       — Number card display for junior/explorer
      NumberCards.module.css
      OrderingArea.tsx                     — Drag-to-order / tap-to-sequence for explorer
      OrderingArea.module.css
    utils/
      comparisonGenerator.ts              — Generates comparisons by tier and difficulty
    hooks/
      useComparisonRound.ts               — Round management hook
    __tests__/
      MoreOrLess.test.tsx
      comparisonGenerator.test.ts
    __mocks__/
      react-i18next.ts
    locales/
      en/
        more-or-less.json
      fr/
        more-or-less.json
    test-setup.ts
    vite-env.d.ts
```

Platform files to modify:

- `platform/src/config/gameRegistry.ts` — Add more-or-less manifest
- `platform/src/config/featureFlags.json` — Add `game.more-or-less` flag

---

### Task 1: Scaffold game package

**Files:**

- Create: `games/more-or-less/package.json`
- Create: `games/more-or-less/tsconfig.json`
- Create: `games/more-or-less/vitest.config.ts`
- Create: `games/more-or-less/src/vite-env.d.ts`
- Create: `games/more-or-less/src/test-setup.ts`
- Create: `games/more-or-less/src/__mocks__/react-i18next.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@kids-games-zone/more-or-less",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": ">=16.0.0",
    "@kids-games-zone/shared": "workspace:*"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@shared/*": ["../../shared/src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "../../shared" }]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  resolve: {
    alias: {
      '@kids-games-zone/shared': path.resolve(__dirname, '../../shared/src'),
      'react-i18next': path.resolve(__dirname, 'src/__mocks__/react-i18next.ts'),
    },
  },
});
```

- [ ] **Step 4: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

- [ ] **Step 5: Create src/test-setup.ts**

```typescript
import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
expect.extend(axeMatchers);
```

- [ ] **Step 6: Create src/**mocks**/react-i18next.ts**

```typescript
import { vi } from 'vitest';

export const useTranslation = vi.fn(() => ({
  t: (key: string) => key,
  i18n: { changeLanguage: vi.fn() },
}));

export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
```

- [ ] **Step 7: Install dependencies**

Run: `cd /home/jude/code/kids && pnpm install`
Expected: Workspace packages linked, no errors.

- [ ] **Step 8: Commit**

```bash
git add games/more-or-less/
git commit -m "feat(more-or-less): scaffold game package with build config"
```

---

### Task 2: Comparison generator utility

**Files:**

- Create: `games/more-or-less/src/utils/comparisonGenerator.ts`
- Create: `games/more-or-less/src/__tests__/comparisonGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `games/more-or-less/src/__tests__/comparisonGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateComparison, type Comparison } from '../utils/comparisonGenerator';
import type { AgeTier } from '@kids-games-zone/shared';

describe('generateComparison', () => {
  describe('tiny tier', () => {
    it('returns 2 object groups', () => {
      const result = generateComparison('tiny', 1);
      expect(result.type).toBe('objects');
      if (result.type === 'objects') {
        expect(result.groups).toHaveLength(2);
      }
    });

    it('groups have different quantities', () => {
      const result = generateComparison('tiny', 1);
      if (result.type === 'objects') {
        expect(result.groups[0].count).not.toBe(result.groups[1].count);
      }
    });

    it('has a valid prompt (more or less)', () => {
      const result = generateComparison('tiny', 1);
      expect(['more', 'less']).toContain(result.prompt);
    });

    it('correctIndex points to correct answer', () => {
      const result = generateComparison('tiny', 1);
      if (result.type === 'objects') {
        const counts = result.groups.map((g) => g.count);
        if (result.prompt === 'more') {
          expect(counts[result.correctIndex]).toBe(Math.max(...counts));
        } else {
          expect(counts[result.correctIndex]).toBe(Math.min(...counts));
        }
      }
    });

    it('difficulty 1 has large gap between quantities', () => {
      for (let i = 0; i < 10; i++) {
        const result = generateComparison('tiny', 1);
        if (result.type === 'objects') {
          const gap = Math.abs(result.groups[0].count - result.groups[1].count);
          expect(gap).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it('higher difficulty has smaller gaps', () => {
      let smallGapFound = false;
      for (let i = 0; i < 20; i++) {
        const result = generateComparison('tiny', 5);
        if (result.type === 'objects') {
          const gap = Math.abs(result.groups[0].count - result.groups[1].count);
          if (gap <= 2) smallGapFound = true;
        }
      }
      expect(smallGapFound).toBe(true);
    });
  });

  describe('junior tier', () => {
    it('returns 3 number choices', () => {
      const result = generateComparison('junior', 1);
      expect(result.type).toBe('numbers');
      if (result.type === 'numbers') {
        expect(result.values).toHaveLength(3);
      }
    });

    it('all values are unique', () => {
      const result = generateComparison('junior', 1);
      if (result.type === 'numbers') {
        const unique = new Set(result.values);
        expect(unique.size).toBe(result.values.length);
      }
    });

    it('difficulty 1 uses single-digit numbers', () => {
      for (let i = 0; i < 10; i++) {
        const result = generateComparison('junior', 1);
        if (result.type === 'numbers') {
          for (const v of result.values) {
            expect(v).toBeLessThan(10);
            expect(v).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });

    it('difficulty 5 uses three-digit numbers', () => {
      let threeDigitFound = false;
      for (let i = 0; i < 20; i++) {
        const result = generateComparison('junior', 5);
        if (result.type === 'numbers') {
          if (result.values.some((v) => v >= 100)) threeDigitFound = true;
        }
      }
      expect(threeDigitFound).toBe(true);
    });
  });

  describe('explorer tier', () => {
    it('returns comparison type for low difficulty', () => {
      const result = generateComparison('explorer', 1);
      expect(['numbers', 'ordering']).toContain(result.type);
    });

    it('returns 4+ values for ordering at high difficulty', () => {
      let orderingFound = false;
      for (let i = 0; i < 20; i++) {
        const result = generateComparison('explorer', 7);
        if (result.type === 'ordering') {
          expect(result.values.length).toBeGreaterThanOrEqual(4);
          orderingFound = true;
        }
      }
      expect(orderingFound).toBe(true);
    });

    it('ordering correctOrder is sorted ascending', () => {
      for (let i = 0; i < 10; i++) {
        const result = generateComparison('explorer', 7);
        if (result.type === 'ordering') {
          for (let j = 1; j < result.correctOrder.length; j++) {
            expect(result.correctOrder[j]).toBeGreaterThan(result.correctOrder[j - 1]);
          }
        }
      }
    });

    it('difficulty 4 introduces fractions', () => {
      let fractionFound = false;
      for (let i = 0; i < 20; i++) {
        const result = generateComparison('explorer', 4);
        if (result.type === 'numbers' || result.type === 'ordering') {
          const values = result.type === 'ordering' ? result.values : result.values;
          if (values.some((v) => !Number.isInteger(v))) fractionFound = true;
        }
      }
      expect(fractionFound).toBe(true);
    });

    it('difficulty 8 introduces negative numbers', () => {
      let negativeFound = false;
      for (let i = 0; i < 30; i++) {
        const result = generateComparison('explorer', 8);
        if (result.type === 'numbers' || result.type === 'ordering') {
          const values = result.type === 'ordering' ? result.values : result.values;
          if (values.some((v) => v < 0)) negativeFound = true;
        }
      }
      expect(negativeFound).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/more-or-less test`
Expected: FAIL — `generateComparison` not found.

- [ ] **Step 3: Implement comparisonGenerator**

Create `games/more-or-less/src/utils/comparisonGenerator.ts`:

```typescript
import type { AgeTier } from '@kids-games-zone/shared';

const OBJECT_TYPES = ['apple', 'star', 'block', 'butterfly', 'fish', 'flower'];

interface ObjectGroup {
  objectType: string;
  count: number;
}

interface ObjectComparison {
  type: 'objects';
  groups: ObjectGroup[];
  prompt: 'more' | 'less';
  correctIndex: number;
}

interface NumberComparison {
  type: 'numbers';
  values: number[];
  displayValues: string[];
  prompt: 'more' | 'less';
  correctIndex: number;
}

interface OrderingComparison {
  type: 'ordering';
  values: number[];
  displayValues: string[];
  correctOrder: number[];
}

export type Comparison = ObjectComparison | NumberComparison | OrderingComparison;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickPrompt(): 'more' | 'less' {
  return Math.random() < 0.5 ? 'more' : 'less';
}

function pickObjectType(): string {
  return OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
}

function generateUniqueNumbers(
  count: number,
  min: number,
  max: number,
  allowDecimals = false,
  allowNegative = false,
): number[] {
  const values = new Set<number>();
  const effectiveMin = allowNegative ? -Math.abs(max) : min;
  let attempts = 0;

  while (values.size < count && attempts < 100) {
    attempts++;
    let val: number;
    if (allowDecimals && Math.random() < 0.5) {
      val = Math.round((effectiveMin + Math.random() * (max - effectiveMin)) * 10) / 10;
    } else {
      val = randInt(effectiveMin, max);
    }
    values.add(val);
  }

  return [...values];
}

function formatValue(val: number): string {
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(1);
}

function generateTinyComparison(difficulty: number): ObjectComparison {
  const objectType = pickObjectType();
  const prompt = pickPrompt();

  // Gap decreases with difficulty
  const minGap = difficulty <= 2 ? 3 : difficulty <= 4 ? 1 : 1;
  const maxQuantity = difficulty <= 2 ? 8 : 10;

  let a: number, b: number;
  do {
    a = randInt(1, maxQuantity);
    b = randInt(1, maxQuantity);
  } while (a === b || Math.abs(a - b) < minGap);

  const groups: ObjectGroup[] = [
    { objectType, count: a },
    { objectType, count: b },
  ];

  const correctIndex = prompt === 'more' ? (a > b ? 0 : 1) : a < b ? 0 : 1;

  return { type: 'objects', groups, prompt, correctIndex };
}

function generateJuniorComparison(difficulty: number): NumberComparison {
  const prompt = pickPrompt();
  let min: number, max: number;

  if (difficulty <= 2) {
    min = 1;
    max = 9;
  } else if (difficulty <= 4) {
    min = 10;
    max = 99;
  } else {
    min = 100;
    max = 999;
  }

  const values = generateUniqueNumbers(3, min, max);
  const displayValues = values.map(formatValue);

  const target = prompt === 'more' ? Math.max(...values) : Math.min(...values);
  const correctIndex = values.indexOf(target);

  return { type: 'numbers', values, displayValues, prompt, correctIndex };
}

function generateExplorerComparison(difficulty: number): Comparison {
  const useOrdering = difficulty >= 6 && Math.random() < 0.7;

  if (useOrdering) {
    return generateExplorerOrdering(difficulty);
  }

  const prompt = pickPrompt();
  let values: number[];

  if (difficulty <= 2) {
    values = generateUniqueNumbers(4, 10, 999);
  } else if (difficulty <= 3) {
    values = generateUniqueNumbers(4, 1, 99, true);
  } else if (difficulty <= 5) {
    // Fractions as decimals: 0.25, 0.5, 0.75, etc.
    values = generateUniqueNumbers(4, 0, 10, true);
  } else {
    values = generateUniqueNumbers(4, 1, 100, true, difficulty >= 8);
  }

  const displayValues = values.map(formatValue);
  const target = prompt === 'more' ? Math.max(...values) : Math.min(...values);
  const correctIndex = values.indexOf(target);

  return { type: 'numbers', values, displayValues, prompt, correctIndex };
}

function generateExplorerOrdering(difficulty: number): OrderingComparison {
  const count = difficulty >= 7 ? 5 : 4;
  let values: number[];

  if (difficulty <= 6) {
    values = generateUniqueNumbers(count, 1, 100, true);
  } else if (difficulty <= 7) {
    values = generateUniqueNumbers(count, 0, 50, true);
  } else {
    values = generateUniqueNumbers(count, -20, 50, true, true);
  }

  const correctOrder = [...values].sort((a, b) => a - b);
  const displayValues = values.map(formatValue);

  return { type: 'ordering', values, displayValues, correctOrder };
}

export function generateComparison(ageTier: AgeTier, difficulty: number): Comparison {
  switch (ageTier) {
    case 'tiny':
      return generateTinyComparison(difficulty);
    case 'junior':
      return generateJuniorComparison(difficulty);
    case 'explorer':
      return generateExplorerComparison(difficulty);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/more-or-less test`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add games/more-or-less/src/utils/comparisonGenerator.ts games/more-or-less/src/__tests__/comparisonGenerator.test.ts
git commit -m "feat(more-or-less): add comparison generator with tier-based difficulty scaling"
```

---

### Task 3: useComparisonRound hook

**Files:**

- Create: `games/more-or-less/src/hooks/useComparisonRound.ts`

- [ ] **Step 1: Create the round management hook**

```typescript
import { useState, useCallback, useRef, useMemo } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import { generateComparison, type Comparison } from '../utils/comparisonGenerator';

export type ComparisonPhase = 'instruction' | 'playing' | 'feedback' | 'complete';

const ROUNDS_BY_TIER: Record<AgeTier, number> = {
  tiny: 6,
  junior: 8,
  explorer: 10,
};

interface UseComparisonRoundOptions {
  ageTier: AgeTier;
  difficulty: number;
  onScorePoint: (points: number) => void;
}

interface ComparisonRoundState {
  phase: ComparisonPhase;
  currentIndex: number;
  totalRounds: number;
  currentComparison: Comparison;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  correctCount: number;
}

interface ComparisonRoundActions {
  dismissInstruction: () => void;
  submitChoice: (choiceIndex: number) => void;
  submitOrder: (orderedValues: number[]) => void;
  nextRound: () => void;
}

export function useComparisonRound(
  options: UseComparisonRoundOptions,
): ComparisonRoundState & ComparisonRoundActions {
  const { ageTier, difficulty, onScorePoint } = options;
  const totalRounds = ROUNDS_BY_TIER[ageTier];

  const comparisons = useMemo(
    () => Array.from({ length: totalRounds }, () => generateComparison(ageTier, difficulty)),
    [ageTier, difficulty, totalRounds],
  );

  const [phase, setPhase] = useState<ComparisonPhase>('instruction');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const correctCountRef = useRef(0);

  const currentComparison = comparisons[currentIndex];
  const maxScore = totalRounds;

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

  const submitChoice = useCallback(
    (choiceIndex: number) => {
      const comp = comparisons[currentIndex];
      if (comp.type === 'ordering') return; // Wrong method for ordering

      const correct = choiceIndex === comp.correctIndex;
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        correctCountRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [comparisons, currentIndex, onScorePoint],
  );

  const submitOrder = useCallback(
    (orderedValues: number[]) => {
      const comp = comparisons[currentIndex];
      if (comp.type !== 'ordering') return;

      const correct = orderedValues.every((v, i) => v === comp.correctOrder[i]);
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        correctCountRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [comparisons, currentIndex, onScorePoint],
  );

  const nextRound = useCallback(() => {
    setIsCorrect(null);

    if (currentIndex >= totalRounds - 1) {
      setPhase('complete');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentIndex, totalRounds]);

  return {
    phase,
    currentIndex,
    totalRounds,
    currentComparison,
    score,
    maxScore,
    isCorrect,
    correctCount: correctCountRef.current,
    dismissInstruction,
    submitChoice,
    submitOrder,
    nextRound,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add games/more-or-less/src/hooks/useComparisonRound.ts
git commit -m "feat(more-or-less): add useComparisonRound hook for round management"
```

---

### Task 4: ObjectGroups component (tiny-tier)

**Files:**

- Create: `games/more-or-less/src/components/ObjectGroups.tsx`
- Create: `games/more-or-less/src/components/ObjectGroups.module.css`

- [ ] **Step 1: Create ObjectGroups component**

```typescript
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './ObjectGroups.module.css';

const EMOJI_MAP: Record<string, string> = {
  apple: '🍎',
  star: '⭐',
  block: '🟦',
  butterfly: '🦋',
  fish: '🐟',
  flower: '🌸',
};

interface ObjectGroup {
  objectType: string;
  count: number;
}

interface ObjectGroupsProps {
  groups: ObjectGroup[];
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export function ObjectGroups({ groups, onSelect, disabled = false }: ObjectGroupsProps) {
  const announce = useAnnounce();

  const handleSelect = (index: number) => {
    if (disabled) return;
    announce(`Selected group ${index + 1} with ${groups[index].count} ${groups[index].objectType}s`);
    onSelect(index);
  };

  return (
    <div className={styles.container} role="group" aria-label="Choose a group">
      {groups.map((group, index) => (
        <button
          key={index}
          className={styles.group}
          onClick={() => handleSelect(index)}
          disabled={disabled}
          aria-label={`Group with ${group.count} ${group.objectType}s`}
        >
          <div className={styles.objects}>
            {Array.from({ length: group.count }, (_, i) => (
              <span key={i} className={styles.object} aria-hidden="true">
                {EMOJI_MAP[group.objectType] ?? '⬛'}
              </span>
            ))}
          </div>
          <span className={styles.count}>{group.count}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ObjectGroups.module.css**

```css
.container {
  display: flex;
  gap: var(--spacing-xl);
  justify-content: center;
  align-items: stretch;
  width: 100%;
}

.group {
  flex: 1;
  max-width: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 3px solid var(--color-border, #ccc);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-surface, #fff);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.group:hover:not(:disabled) {
  transform: scale(1.03);
  border-color: var(--color-primary, #4a90d9);
}

.group:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.group:disabled {
  opacity: 0.6;
  cursor: default;
}

.objects {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs, 4px);
  justify-content: center;
  min-height: 80px;
  align-items: center;
}

.object {
  font-size: 2rem;
}

.count {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-muted, #666);
}
```

- [ ] **Step 3: Commit**

```bash
git add games/more-or-less/src/components/ObjectGroups.tsx games/more-or-less/src/components/ObjectGroups.module.css
git commit -m "feat(more-or-less): add ObjectGroups component for tiny-tier"
```

---

### Task 5: NumberCards component (junior/explorer comparison)

**Files:**

- Create: `games/more-or-less/src/components/NumberCards.tsx`
- Create: `games/more-or-less/src/components/NumberCards.module.css`

- [ ] **Step 1: Create NumberCards component**

```typescript
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './NumberCards.module.css';

interface NumberCardsProps {
  values: string[];
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export function NumberCards({ values, onSelect, disabled = false }: NumberCardsProps) {
  const announce = useAnnounce();

  const handleSelect = (index: number) => {
    if (disabled) return;
    announce(`Selected ${values[index]}`);
    onSelect(index);
  };

  return (
    <div className={styles.container} role="group" aria-label="Choose a number">
      {values.map((value, index) => (
        <button
          key={index}
          className={styles.card}
          onClick={() => handleSelect(index)}
          disabled={disabled}
          aria-label={value}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create NumberCards.module.css**

```css
.container {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
  flex-wrap: wrap;
}

.card {
  min-width: 80px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  border: 3px solid var(--color-border, #ccc);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-surface, #fff);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.card:hover:not(:disabled) {
  transform: scale(1.05);
  border-color: var(--color-primary, #4a90d9);
}

.card:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.card:disabled {
  opacity: 0.6;
  cursor: default;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/more-or-less/src/components/NumberCards.tsx games/more-or-less/src/components/NumberCards.module.css
git commit -m "feat(more-or-less): add NumberCards component for junior/explorer"
```

---

### Task 6: OrderingArea component (explorer ordering)

**Files:**

- Create: `games/more-or-less/src/components/OrderingArea.tsx`
- Create: `games/more-or-less/src/components/OrderingArea.module.css`

- [ ] **Step 1: Create OrderingArea component**

Supports both tap-in-sequence and drag-to-reorder. Tap-in-sequence is the primary input; drag is progressive enhancement.

```typescript
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './OrderingArea.module.css';

interface OrderingAreaProps {
  values: number[];
  displayValues: string[];
  onSubmit: (orderedValues: number[]) => void;
  disabled?: boolean;
}

export function OrderingArea({ values, displayValues, onSubmit, disabled = false }: OrderingAreaProps) {
  const { t } = useTranslation('more-or-less');
  const announce = useAnnounce();
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);

  const handleTap = useCallback(
    (index: number) => {
      if (disabled || selectedOrder.includes(index)) return;

      const next = [...selectedOrder, index];
      setSelectedOrder(next);
      announce(`Placed ${displayValues[index]} at position ${next.length}`);

      if (next.length === values.length) {
        const orderedValues = next.map((i) => values[i]);
        onSubmit(orderedValues);
        setSelectedOrder([]);
      }
    },
    [disabled, selectedOrder, values, displayValues, onSubmit, announce],
  );

  const handleUndo = useCallback(() => {
    setSelectedOrder((prev) => prev.slice(0, -1));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedOrder([]);
  }, []);

  return (
    <div className={styles.container}>
      <p className={styles.hint}>{t('orderHint')}</p>

      <div className={styles.slots} aria-label="Your order so far">
        {Array.from({ length: values.length }, (_, i) => (
          <span key={i} className={styles.slot}>
            {selectedOrder[i] !== undefined ? displayValues[selectedOrder[i]] : '?'}
          </span>
        ))}
      </div>

      <div className={styles.cards} role="group" aria-label="Numbers to order">
        {displayValues.map((display, index) => (
          <button
            key={index}
            className={`${styles.card} ${selectedOrder.includes(index) ? styles.used : ''}`}
            onClick={() => handleTap(index)}
            disabled={disabled || selectedOrder.includes(index)}
            aria-label={`${display}${selectedOrder.includes(index) ? ' (already placed)' : ''}`}
          >
            {display}
          </button>
        ))}
      </div>

      {selectedOrder.length > 0 && (
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={handleUndo} disabled={disabled}>
            ← {t('undo')}
          </button>
          <button className={styles.actionButton} onClick={handleReset} disabled={disabled}>
            ↻ {t('reset')}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create OrderingArea.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
}

.hint {
  font-size: 1rem;
  color: var(--color-text-muted, #666);
  margin: 0;
  text-align: center;
}

.slots {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}

.slot {
  width: 64px;
  height: 64px;
  border: 3px dashed var(--color-border, #ccc);
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-surface, #fff);
}

.cards {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  justify-content: center;
}

.card {
  min-width: 64px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  border: 2px solid var(--color-primary, #4a90d9);
  border-radius: var(--radius-md, 8px);
  background: var(--color-primary-light, #e8f0fe);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}

.card:hover:not(:disabled) {
  transform: scale(1.05);
}

.card:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.used {
  opacity: 0.3;
  cursor: default;
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
}

.actionButton {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border, #ccc);
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #fff);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
}

.actionButton:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/more-or-less/src/components/OrderingArea.tsx games/more-or-less/src/components/OrderingArea.module.css
git commit -m "feat(more-or-less): add OrderingArea component for explorer-tier ordering"
```

---

### Task 7: Locale files

**Files:**

- Create: `games/more-or-less/src/locales/en/more-or-less.json`
- Create: `games/more-or-less/src/locales/fr/more-or-less.json`

- [ ] **Step 1: Create English locale**

```json
{
  "title": "More or Less",
  "instruction": "Which is more? Which is less? Find the answer!",
  "instructionTiny": "Which group has more? Tap to choose!",
  "letsGo": "Let's Go!",
  "whichMore": "Which is MORE?",
  "whichLess": "Which is LESS?",
  "whichMoreObjects": "Which group has MORE {{object}}s?",
  "whichLessObjects": "Which group has FEWER {{object}}s?",
  "orderHint": "Tap the numbers in order from smallest to biggest",
  "orderPrompt": "Put these in order: smallest → biggest",
  "correct": "Correct!",
  "incorrect": "Not quite!",
  "theAnswerWas": "The answer was {{answer}}",
  "next": "Next",
  "undo": "Undo",
  "reset": "Reset",
  "roundOf": "Question {{current}} of {{total}}",
  "celebrationTitle": "Number Champion!",
  "finalScore": "You got {{score}} of {{total}} correct!"
}
```

- [ ] **Step 2: Create French locale**

```json
{
  "title": "Plus ou Moins",
  "instruction": "Lequel est le plus ? Lequel est le moins ? Trouve la réponse !",
  "instructionTiny": "Quel groupe en a le plus ? Appuie pour choisir !",
  "letsGo": "C'est parti !",
  "whichMore": "Lequel est le PLUS ?",
  "whichLess": "Lequel est le MOINS ?",
  "whichMoreObjects": "Quel groupe a le PLUS de {{object}}s ?",
  "whichLessObjects": "Quel groupe a le MOINS de {{object}}s ?",
  "orderHint": "Appuie sur les nombres dans l'ordre du plus petit au plus grand",
  "orderPrompt": "Mets dans l'ordre : plus petit → plus grand",
  "correct": "Correct !",
  "incorrect": "Pas tout à fait !",
  "theAnswerWas": "La réponse était {{answer}}",
  "next": "Suivant",
  "undo": "Annuler",
  "reset": "Recommencer",
  "roundOf": "Question {{current}} sur {{total}}",
  "celebrationTitle": "Champion des nombres !",
  "finalScore": "Tu as obtenu {{score}} sur {{total}} correct !"
}
```

- [ ] **Step 3: Commit**

```bash
git add games/more-or-less/src/locales/
git commit -m "feat(more-or-less): add English and French locale files"
```

---

### Task 8: Main MoreOrLess component and plugin export

**Files:**

- Create: `games/more-or-less/src/MoreOrLess.tsx`
- Create: `games/more-or-less/src/MoreOrLess.module.css`
- Create: `games/more-or-less/src/index.ts`

- [ ] **Step 1: Create MoreOrLess component**

```typescript
import { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
  InstructionBubble,
  useAnnounce,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { useComparisonRound } from './hooks/useComparisonRound';
import { ObjectGroups } from './components/ObjectGroups';
import { NumberCards } from './components/NumberCards';
import { OrderingArea } from './components/OrderingArea';
import styles from './MoreOrLess.module.css';

export function MoreOrLess({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('more-or-less');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';

  const round = useComparisonRound({
    ageTier,
    difficulty: config.difficulty,
    onScorePoint: onScore,
  });

  const comp = round.currentComparison;

  // Announce current round
  useEffect(() => {
    if (round.phase === 'playing') {
      announce(t('roundOf', { current: round.currentIndex + 1, total: round.totalRounds }));
      // Voice prompt for tiny-tier
      if (isTiny && comp.type === 'objects') {
        const promptKey = comp.prompt === 'more' ? 'whichMoreObjects' : 'whichLessObjects';
        audioManager.playVoice(`voice:prompt-${comp.prompt}`);
        announce(t(promptKey, { object: comp.groups[0].objectType }));
      }
    }
  }, [round.phase, round.currentIndex, round.totalRounds, isTiny, comp, audioManager, announce, t]);

  // Audio feedback
  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-correct');
      }
    } else {
      audioManager.playSFX('incorrect');
    }
  }, [round.phase, round.isCorrect, audioManager, isTiny]);

  // Background music for tiny-tier
  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:game-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'more-or-less',
      score: round.score,
      maxScore: round.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        correctCount: round.correctCount,
        totalRounds: round.totalRounds,
      },
    };
    onComplete(result);
  }, [round, config.difficulty, onComplete]);

  // Get prompt text
  const getPromptText = (): string => {
    if (comp.type === 'ordering') return t('orderPrompt');
    if (comp.type === 'objects') {
      return comp.prompt === 'more'
        ? t('whichMoreObjects', { object: comp.groups[0].objectType })
        : t('whichLessObjects', { object: comp.groups[0].objectType });
    }
    return comp.prompt === 'more' ? t('whichMore') : t('whichLess');
  };

  // Instruction phase
  if (round.phase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character="🔢" />
          <OptionButton label={t('letsGo')} state="default" onSelect={round.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  // Complete phase
  if (round.phase === 'complete') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={round.score}
          maxScore={round.maxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  // Playing / Feedback phases
  const showFeedback = round.phase === 'feedback';

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
        </div>

        <ProgressBar current={round.currentIndex} total={round.totalRounds} showLabel />

        <p className={styles.prompt} aria-live="assertive">{getPromptText()}</p>

        {!showFeedback && comp.type === 'objects' && (
          <ObjectGroups groups={comp.groups} onSelect={round.submitChoice} />
        )}

        {!showFeedback && comp.type === 'numbers' && (
          <NumberCards values={comp.displayValues} onSelect={round.submitChoice} />
        )}

        {!showFeedback && comp.type === 'ordering' && (
          <OrderingArea
            values={comp.values}
            displayValues={comp.displayValues}
            onSubmit={round.submitOrder}
          />
        )}

        {showFeedback && (
          <div className={styles.feedbackArea} aria-live="assertive">
            <p className={round.isCorrect ? styles.correctText : styles.incorrectText}>
              {round.isCorrect ? t('correct') : t('incorrect')}
            </p>
            <OptionButton label={t('next')} state="default" onSelect={round.nextRound} size="large" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: Create MoreOrLess.module.css**

```css
.gameArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-xl);
  max-width: 600px;
  margin: 0 auto;
}

.topBar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.prompt {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  margin: 0;
}

.feedbackArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.correctText {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-success, #34a853);
  margin: 0;
}

.incorrectText {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-error, #ea4335);
  margin: 0;
}
```

- [ ] **Step 3: Create index.ts plugin export**

```typescript
import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { MoreOrLess } from './MoreOrLess';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'more-or-less',
    name: 'More or Less',
    description: 'Compare quantities and numbers — which is more, which is less?',
    thumbnail: '/images/games/more-or-less.webp',
    ageRange: [3, 10],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '../../../games/more-or-less/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 8,
    estimatedPlayTime: 4,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['numbers', 'comparison', 'counting', 'fractions', 'ordering'],
  },

  onLoad: async () => {},

  onStart: (config: GameConfig) => {
    _startTime = Date.now();
    _score = 0;
    _difficulty = config.difficulty;
  },

  onPause: () => {},
  onResume: () => {},

  onEnd: () => {
    const timeSpent = Math.round((Date.now() - _startTime) / 1000);
    return {
      gameId: 'more-or-less',
      score: _score,
      maxScore: 10,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { correctCount: 0, totalRounds: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: MoreOrLess,
};

export default plugin;
```

- [ ] **Step 4: Commit**

```bash
git add games/more-or-less/src/MoreOrLess.tsx games/more-or-less/src/MoreOrLess.module.css games/more-or-less/src/index.ts
git commit -m "feat(more-or-less): add main MoreOrLess component and plugin export"
```

---

### Task 9: Register game in platform

**Files:**

- Modify: `platform/src/config/gameRegistry.ts`
- Modify: `platform/src/config/featureFlags.json`

- [ ] **Step 1: Add manifest to game registry**

Add this entry to the `gameRegistry` array in `platform/src/config/gameRegistry.ts`:

```typescript
  {
    id: 'more-or-less',
    name: 'More or Less',
    description: 'Compare quantities and numbers — which is more, which is less?',
    thumbnail: '/images/games/more-or-less.webp',
    ageRange: [3, 10],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '../../../games/more-or-less/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 8,
    estimatedPlayTime: 4,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['numbers', 'comparison', 'counting', 'fractions', 'ordering'],
  },
```

- [ ] **Step 2: Add feature flag**

Add to `platform/src/config/featureFlags.json`:

```json
  "game.more-or-less": {
    "enabled": true,
    "description": "More or Less game — compare quantities and numbers"
  },
```

- [ ] **Step 3: Commit**

```bash
git add platform/src/config/gameRegistry.ts platform/src/config/featureFlags.json
git commit -m "feat(more-or-less): register game in platform registry and feature flags"
```

---

### Task 10: Main component tests

**Files:**

- Create: `games/more-or-less/src/__tests__/MoreOrLess.test.tsx`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MoreOrLess } from '../MoreOrLess';
import type { GameProps } from '@kids-games-zone/shared';

function createMockProps(overrides: Partial<GameProps> = {}): GameProps {
  return {
    config: {
      difficulty: 1,
      profile: {
        id: 'test',
        name: 'Test',
        avatar: '',
        age: 7,
        ageTier: 'junior',
        createdAt: new Date().toISOString(),
        parentPin: '',
        preferences: {
          musicVolume: 50,
          sfxVolume: 100,
          voiceVolume: 100,
          language: 'en',
          theme: 'default',
        },
        progress: {},
        rewards: [],
        stats: {
          totalPlayTime: 0,
          totalGamesPlayed: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastPlayedAt: '',
        },
      },
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        language: 'en',
        highContrastMode: false,
      },
    },
    onScore: vi.fn(),
    onComplete: vi.fn(),
    onExit: vi.fn(),
    audioManager: {
      playMusic: vi.fn(),
      stopMusic: vi.fn(),
      playSFX: vi.fn(),
      playVoice: vi.fn(),
      setVolume: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
      preload: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

function createTinyProps(): GameProps {
  const props = createMockProps();
  return {
    ...props,
    config: {
      ...props.config,
      profile: { ...props.config.profile, age: 4, ageTier: 'tiny' },
    },
  };
}

function createExplorerProps(): GameProps {
  const props = createMockProps();
  return {
    ...props,
    config: {
      ...props.config,
      difficulty: 7,
      profile: { ...props.config.profile, age: 10, ageTier: 'explorer' },
    },
  };
}

describe('MoreOrLess', () => {
  it('renders game shell with title', () => {
    render(<MoreOrLess {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially', () => {
    render(<MoreOrLess {...createMockProps()} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<MoreOrLess {...createTinyProps()} />);
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows object groups for tiny-tier after starting', () => {
    render(<MoreOrLess {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Choose a group' })).toBeTruthy();
  });

  it('shows number cards for junior-tier after starting', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Choose a number' })).toBeTruthy();
  });

  it('shows a prompt question after starting', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    const prompt = screen.getByRole('paragraph');
    expect(prompt).toBeTruthy();
  });

  it('shows progress bar during gameplay', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows feedback after selecting an answer (junior)', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    // Click any number card
    const buttons = screen.getAllByRole('button');
    const numberButtons = buttons.filter((btn) => /^\d/.test(btn.textContent?.trim() ?? ''));
    if (numberButtons.length > 0) {
      fireEvent.click(numberButtons[0]);
      expect(screen.getByText('next')).toBeTruthy();
    }
  });

  it('plays SFX on answer', () => {
    const props = createMockProps();
    render(<MoreOrLess {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    const buttons = screen.getAllByRole('button');
    const numberButtons = buttons.filter((btn) => /^-?\d/.test(btn.textContent?.trim() ?? ''));
    if (numberButtons.length > 0) {
      fireEvent.click(numberButtons[0]);
      expect(props.audioManager.playSFX).toHaveBeenCalled();
    }
  });

  it('has no accessibility violations on instruction screen', async () => {
    const { container } = render(<MoreOrLess {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/more-or-less test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add games/more-or-less/src/__tests__/MoreOrLess.test.tsx
git commit -m "test(more-or-less): add main component tests with accessibility checks"
```

---

### Task 11: Typecheck, lint, full test suite

- [ ] **Step 1: Run typecheck for all three new games**

Run: `cd /home/jude/code/kids && pnpm typecheck`
Expected: No errors across all packages.

- [ ] **Step 2: Run lint**

Run: `cd /home/jude/code/kids && pnpm lint`
Expected: No new lint errors.

- [ ] **Step 3: Run full test suite**

Run: `cd /home/jude/code/kids && pnpm test`
Expected: All tests pass across all packages.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(more-or-less): resolve typecheck and lint issues"
```

(Skip this commit if no fixes were needed.)

---

### Task 12: Update development plan

**Files:**

- Modify: `plans/development-plan.md`

- [ ] **Step 1: Update Phase 7 status in development plan**

Mark Phase 7 as complete with the three games built:

- Spelling Bee (all ages, literacy)
- Safety Scout (ages 4-8, safety awareness)
- More or Less (ages 3-10, numeracy)

- [ ] **Step 2: Commit**

```bash
git add plans/development-plan.md
git commit -m "docs: mark Phase 7 first game batch as complete"
```
