# Spelling Bee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Spelling Bee game for ages 3–12 with age-adaptive input (scrambled tiles for tiny, keyboard for junior/explorer), elimination-style rounds for older kids, and rich audio feedback via AudioManager.

**Architecture:** Game plugin following the existing `GamePlugin` pattern — `games/spelling-bee/` workspace with React component, word data as static JSON, procedural round generation from difficulty-tagged word pools. Three age tiers with distinct input modes, round structures, and audio feedback levels.

**Tech Stack:** React 19, TypeScript (strict), CSS Modules, Vitest + vitest-axe, react-i18next, shared components (GameShell, OptionButton, ProgressBar, ScoreDisplay, CelebrationOverlay, InstructionBubble, useAnnounce)

---

## File Structure

```
games/spelling-bee/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                              — GamePlugin default export with manifest
    SpellingBee.tsx                        — Main game component (orchestrates flow)
    SpellingBee.module.css                 — Main component styles
    components/
      LetterTiles.tsx                      — Scrambled letter tiles input (tiny-tier)
      LetterTiles.module.css
      Keyboard.tsx                         — On-screen A-Z keyboard input (junior/explorer)
      Keyboard.module.css
      WordDisplay.tsx                      — Shows spelled word, image (tiny), clue buttons (junior/explorer)
      WordDisplay.module.css
      LivesDisplay.tsx                     — Hearts display for elimination mode
      LivesDisplay.module.css
    data/
      words-tiny.json                     — Word pool for ages 3-5, difficulty 1-4
      words-junior.json                   — Word pool for ages 6-8, difficulty 1-6
      words-explorer.json                 — Word pool for ages 9-12, difficulty 1-10
    hooks/
      useSpellingRound.ts                 — Round management hook (word selection, scoring, lives)
    utils/
      wordSelector.ts                     — Selects words from pool by difficulty
      letterScrambler.ts                  — Scrambles word letters + adds distractors
    __tests__/
      SpellingBee.test.tsx                — Main component tests
      wordSelector.test.ts                — Word selection logic tests
      letterScrambler.test.ts             — Scrambler logic tests
    __mocks__/
      react-i18next.ts                    — i18n mock for tests
    locales/
      en/
        spelling-bee.json
      fr/
        spelling-bee.json
    test-setup.ts
    vite-env.d.ts
```

Platform files to modify:
- `platform/src/config/gameRegistry.ts` — Add spelling-bee manifest
- `platform/src/config/featureFlags.json` — Add `game.spelling-bee` flag

---

### Task 1: Scaffold game package

**Files:**
- Create: `games/spelling-bee/package.json`
- Create: `games/spelling-bee/tsconfig.json`
- Create: `games/spelling-bee/vitest.config.ts`
- Create: `games/spelling-bee/src/vite-env.d.ts`
- Create: `games/spelling-bee/src/test-setup.ts`
- Create: `games/spelling-bee/src/__mocks__/react-i18next.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@kids-games-zone/spelling-bee",
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

- [ ] **Step 6: Create src/__mocks__/react-i18next.ts**

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

- [ ] **Step 8: Verify typecheck passes**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee typecheck`
Expected: No errors (empty src).

- [ ] **Step 9: Commit**

```bash
git add games/spelling-bee/
git commit -m "feat(spelling-bee): scaffold game package with build config"
```

---

### Task 2: Word data files and word selector utility

**Files:**
- Create: `games/spelling-bee/src/data/words-tiny.json`
- Create: `games/spelling-bee/src/data/words-junior.json`
- Create: `games/spelling-bee/src/data/words-explorer.json`
- Create: `games/spelling-bee/src/utils/wordSelector.ts`
- Create: `games/spelling-bee/src/__tests__/wordSelector.test.ts`

- [ ] **Step 1: Create words-tiny.json**

```json
[
  { "word": "cat", "difficulty": 1, "image": "cat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "dog", "difficulty": 1, "image": "dog.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "sun", "difficulty": 1, "image": "sun.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "hat", "difficulty": 1, "image": "hat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "cup", "difficulty": 1, "image": "cup.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bed", "difficulty": 1, "image": "bed.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "pen", "difficulty": 2, "image": "pen.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bus", "difficulty": 2, "image": "bus.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "box", "difficulty": 2, "image": "box.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "map", "difficulty": 2, "image": "map.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "tree", "difficulty": 3, "image": "tree.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "ball", "difficulty": 3, "image": "ball.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "fish", "difficulty": 3, "image": "fish.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bird", "difficulty": 3, "image": "bird.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "cake", "difficulty": 4, "image": "cake.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "frog", "difficulty": 4, "image": "frog.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "star", "difficulty": 4, "image": "star.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "rain", "difficulty": 4, "image": "rain.webp", "definition": "", "origin": "", "sentence": "" }
]
```

- [ ] **Step 2: Create words-junior.json**

```json
[
  { "word": "book", "difficulty": 1, "image": "", "definition": "A set of pages with words or pictures", "origin": "Old English", "sentence": "I read a book before bed." },
  { "word": "fish", "difficulty": 1, "image": "", "definition": "An animal that lives in water", "origin": "Old English", "sentence": "The fish swam in the pond." },
  { "word": "milk", "difficulty": 1, "image": "", "definition": "A white drink from cows", "origin": "Old English", "sentence": "She drank a glass of milk." },
  { "word": "lamp", "difficulty": 2, "image": "", "definition": "A device that gives light", "origin": "Greek", "sentence": "Turn on the lamp please." },
  { "word": "jump", "difficulty": 2, "image": "", "definition": "To push yourself up into the air", "origin": "Middle English", "sentence": "He can jump very high." },
  { "word": "hand", "difficulty": 2, "image": "", "definition": "The part of your body at the end of your arm", "origin": "Old English", "sentence": "She raised her hand in class." },
  { "word": "plant", "difficulty": 3, "image": "", "definition": "A living thing that grows in soil", "origin": "Latin", "sentence": "We planted a flower in the garden." },
  { "word": "crane", "difficulty": 3, "image": "", "definition": "A large bird or a machine for lifting", "origin": "Old English", "sentence": "The crane lifted the heavy box." },
  { "word": "stove", "difficulty": 3, "image": "", "definition": "A device used for cooking food", "origin": "Dutch", "sentence": "Dad cooked dinner on the stove." },
  { "word": "brave", "difficulty": 4, "image": "", "definition": "Ready to face danger without fear", "origin": "French", "sentence": "The brave knight saved the village." },
  { "word": "float", "difficulty": 4, "image": "", "definition": "To rest on top of water", "origin": "Old English", "sentence": "The leaf will float on the river." },
  { "word": "bridge", "difficulty": 5, "image": "", "definition": "A structure built over a river or road so people can cross", "origin": "Old English", "sentence": "We walked across the bridge to get to the park." },
  { "word": "frozen", "difficulty": 5, "image": "", "definition": "Turned into ice or very cold", "origin": "Old English", "sentence": "The lake was frozen in winter." },
  { "word": "garden", "difficulty": 5, "image": "", "definition": "A piece of land where plants are grown", "origin": "French", "sentence": "She grows tomatoes in the garden." },
  { "word": "market", "difficulty": 6, "image": "", "definition": "A place where people buy and sell things", "origin": "Latin", "sentence": "We bought fruit at the market." },
  { "word": "winter", "difficulty": 6, "image": "", "definition": "The coldest season of the year", "origin": "Old English", "sentence": "Snow falls in winter." }
]
```

- [ ] **Step 3: Create words-explorer.json**

```json
[
  { "word": "house", "difficulty": 1, "image": "", "definition": "A building where people live", "origin": "Old English", "sentence": "They moved to a new house." },
  { "word": "table", "difficulty": 1, "image": "", "definition": "A piece of furniture with a flat top", "origin": "Latin", "sentence": "Put the plates on the table." },
  { "word": "ocean", "difficulty": 2, "image": "", "definition": "A very large body of salt water", "origin": "Greek", "sentence": "Whales live in the ocean." },
  { "word": "forest", "difficulty": 2, "image": "", "definition": "A large area covered with trees", "origin": "Latin", "sentence": "The deer ran into the forest." },
  { "word": "kitchen", "difficulty": 3, "image": "", "definition": "The room where food is prepared", "origin": "Latin", "sentence": "She baked cookies in the kitchen." },
  { "word": "blanket", "difficulty": 3, "image": "", "definition": "A warm covering used on beds", "origin": "French", "sentence": "He pulled the blanket over himself." },
  { "word": "dinosaur", "difficulty": 4, "image": "", "definition": "A large reptile that lived millions of years ago", "origin": "Greek", "sentence": "The museum has a dinosaur skeleton." },
  { "word": "elephant", "difficulty": 4, "image": "", "definition": "The largest land animal with a trunk", "origin": "Greek", "sentence": "The elephant sprayed water with its trunk." },
  { "word": "adventure", "difficulty": 5, "image": "", "definition": "An exciting and unusual experience", "origin": "Latin", "sentence": "They went on an adventure in the mountains." },
  { "word": "geography", "difficulty": 5, "image": "", "definition": "The study of the Earth and its features", "origin": "Greek", "sentence": "In geography class we learned about rivers." },
  { "word": "beautiful", "difficulty": 6, "image": "", "definition": "Very pleasing to look at or hear", "origin": "French", "sentence": "The sunset was beautiful." },
  { "word": "celebration", "difficulty": 7, "image": "", "definition": "A special event to mark an occasion", "origin": "Latin", "sentence": "The birthday celebration was fun." },
  { "word": "temperature", "difficulty": 7, "image": "", "definition": "How hot or cold something is", "origin": "Latin", "sentence": "The temperature dropped below zero." },
  { "word": "magnificent", "difficulty": 8, "image": "", "definition": "Extremely beautiful or impressive", "origin": "Latin", "sentence": "The castle was magnificent." },
  { "word": "encyclopedia", "difficulty": 9, "image": "", "definition": "A book or set of books containing information on many subjects", "origin": "Greek", "sentence": "She looked it up in the encyclopedia." },
  { "word": "extraordinary", "difficulty": 10, "image": "", "definition": "Very unusual or remarkable", "origin": "Latin", "sentence": "The magician performed an extraordinary trick." }
]
```

- [ ] **Step 4: Write the failing test for wordSelector**

Create `games/spelling-bee/src/__tests__/wordSelector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { selectWords } from '../utils/wordSelector';
import wordsTiny from '../data/words-tiny.json';
import wordsJunior from '../data/words-junior.json';
import wordsExplorer from '../data/words-explorer.json';

describe('selectWords', () => {
  it('returns the requested number of words', () => {
    const result = selectWords(wordsTiny, { difficulty: 1, count: 4 });
    expect(result).toHaveLength(4);
  });

  it('returns words at or below the requested difficulty', () => {
    const result = selectWords(wordsTiny, { difficulty: 2, count: 6 });
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(2);
    }
  });

  it('prioritizes words closest to the target difficulty', () => {
    const result = selectWords(wordsJunior, { difficulty: 5, count: 3 });
    const difficulties = result.map((w) => w.difficulty);
    // Should prefer difficulty 5 words, then fall back to 4, etc.
    expect(Math.max(...difficulties)).toBe(5);
  });

  it('returns fewer words if pool is smaller than count', () => {
    const result = selectWords(wordsTiny, { difficulty: 1, count: 100 });
    expect(result.length).toBeLessThanOrEqual(wordsTiny.filter((w) => w.difficulty <= 1).length);
  });

  it('shuffles the result (non-deterministic, run multiple times)', () => {
    const results = Array.from({ length: 5 }, () =>
      selectWords(wordsJunior, { difficulty: 6, count: 8 }).map((w) => w.word),
    );
    const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
    // With 8+ words, extremely unlikely all 5 runs produce same order
    expect(allSame).toBe(false);
  });

  it('works with explorer word pool and high difficulty', () => {
    const result = selectWords(wordsExplorer, { difficulty: 10, count: 5 });
    expect(result.length).toBeGreaterThan(0);
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(10);
    }
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee test`
Expected: FAIL — `selectWords` not found.

- [ ] **Step 6: Implement wordSelector**

Create `games/spelling-bee/src/utils/wordSelector.ts`:

```typescript
export interface WordEntry {
  word: string;
  difficulty: number;
  image: string;
  definition: string;
  origin: string;
  sentence: string;
}

interface SelectOptions {
  difficulty: number;
  count: number;
}

/**
 * Selects words from pool at or below the target difficulty,
 * prioritizing words closest to the target. Shuffles result.
 */
export function selectWords(pool: WordEntry[], options: SelectOptions): WordEntry[] {
  const { difficulty, count } = options;

  // Filter to eligible words (at or below target difficulty)
  const eligible = pool.filter((w) => w.difficulty <= difficulty);

  if (eligible.length === 0) return [];

  // Sort by proximity to target difficulty (closest first), then shuffle within same difficulty
  const sorted = [...eligible].sort((a, b) => {
    const distA = difficulty - a.difficulty;
    const distB = difficulty - b.difficulty;
    if (distA !== distB) return distA - distB;
    return Math.random() - 0.5;
  });

  // Take up to count words
  const selected = sorted.slice(0, count);

  // Shuffle final selection
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee test`
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add games/spelling-bee/src/data/ games/spelling-bee/src/utils/wordSelector.ts games/spelling-bee/src/__tests__/wordSelector.test.ts
git commit -m "feat(spelling-bee): add word data files and word selector utility"
```

---

### Task 3: Letter scrambler utility

**Files:**
- Create: `games/spelling-bee/src/utils/letterScrambler.ts`
- Create: `games/spelling-bee/src/__tests__/letterScrambler.test.ts`

- [ ] **Step 1: Write the failing test**

Create `games/spelling-bee/src/__tests__/letterScrambler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scrambleWithDistractors } from '../utils/letterScrambler';

describe('scrambleWithDistractors', () => {
  it('contains all letters of the original word', () => {
    const result = scrambleWithDistractors('cat', 2);
    const wordLetters = 'cat'.split('');
    for (const letter of wordLetters) {
      expect(result).toContain(letter);
    }
  });

  it('adds the requested number of distractor letters', () => {
    const result = scrambleWithDistractors('dog', 3);
    // 3 word letters + 3 distractors = 6 total
    expect(result).toHaveLength(6);
  });

  it('distractors are not letters already in the word', () => {
    const word = 'cat';
    const result = scrambleWithDistractors(word, 3);
    const wordLetters = new Set(word.split(''));
    const distractors = result.filter((l) => !wordLetters.has(l));
    for (const d of distractors) {
      expect(wordLetters.has(d)).toBe(false);
    }
  });

  it('returns uppercase letters', () => {
    const result = scrambleWithDistractors('sun', 2);
    for (const letter of result) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
  });

  it('shuffles the result (not always in word order)', () => {
    const results = Array.from({ length: 10 }, () => scrambleWithDistractors('tree', 2));
    const allSame = results.every((r) => r.join('') === results[0].join(''));
    expect(allSame).toBe(false);
  });

  it('handles words with duplicate letters', () => {
    const result = scrambleWithDistractors('book', 2);
    const oCount = result.filter((l) => l === 'O').length;
    expect(oCount).toBeGreaterThanOrEqual(2); // 'book' has two o's
    expect(result).toHaveLength(6); // 4 word letters + 2 distractors
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee test`
Expected: FAIL — `scrambleWithDistractors` not found.

- [ ] **Step 3: Implement letterScrambler**

Create `games/spelling-bee/src/utils/letterScrambler.ts`:

```typescript
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Returns the word's letters (uppercase) plus N distractor letters, all shuffled.
 * Distractors are random letters NOT present in the word.
 */
export function scrambleWithDistractors(word: string, distractorCount: number): string[] {
  const upperWord = word.toUpperCase();
  const wordLetters = upperWord.split('');
  const wordSet = new Set(wordLetters);

  // Pick distractor letters not in the word
  const available = ALPHABET.split('').filter((l) => !wordSet.has(l));
  const distractors: string[] = [];
  for (let i = 0; i < distractorCount && i < available.length; i++) {
    const idx = Math.floor(Math.random() * available.length);
    distractors.push(available[idx]);
    available.splice(idx, 1);
  }

  const all = [...wordLetters, ...distractors];

  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee test`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add games/spelling-bee/src/utils/letterScrambler.ts games/spelling-bee/src/__tests__/letterScrambler.test.ts
git commit -m "feat(spelling-bee): add letter scrambler with distractor generation"
```

---

### Task 4: useSpellingRound hook

**Files:**
- Create: `games/spelling-bee/src/hooks/useSpellingRound.ts`

- [ ] **Step 1: Create the round management hook**

This hook manages the game session state: current word, score, lives, word progression.

Create `games/spelling-bee/src/hooks/useSpellingRound.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';

export type RoundPhase = 'instruction' | 'playing' | 'feedback' | 'complete';

interface UseSpellingRoundOptions {
  words: WordEntry[];
  ageTier: AgeTier;
  onScorePoint: (points: number) => void;
}

interface SpellingRoundState {
  phase: RoundPhase;
  currentWordIndex: number;
  currentWord: WordEntry;
  score: number;
  maxScore: number;
  lives: number;
  maxLives: number;
  isCorrect: boolean | null;
  wordsCorrect: number;
}

interface SpellingRoundActions {
  dismissInstruction: () => void;
  submitAnswer: (answer: string) => void;
  nextWord: () => void;
}

const LIVES_COUNT = 3;

export function useSpellingRound(options: UseSpellingRoundOptions): SpellingRoundState & SpellingRoundActions {
  const { words, ageTier, onScorePoint } = options;
  const isTiny = ageTier === 'tiny';

  const [phase, setPhase] = useState<RoundPhase>('instruction');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_COUNT);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const wordsCorrectRef = useRef(0);

  const maxScore = words.length;
  const maxLives = LIVES_COUNT;
  const currentWord = words[currentWordIndex] ?? words[0];

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

  const submitAnswer = useCallback(
    (answer: string) => {
      const correct = answer.toLowerCase() === currentWord.word.toLowerCase();
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        wordsCorrectRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      } else if (!isTiny) {
        // Elimination mode for junior/explorer
        setLives((prev) => prev - 1);
      }
    },
    [currentWord, isTiny, onScorePoint],
  );

  const nextWord = useCallback(() => {
    setIsCorrect(null);

    // Check end conditions
    const isLastWord = currentWordIndex >= words.length - 1;
    const outOfLives = !isTiny && lives <= 0;

    if (isLastWord || outOfLives) {
      setPhase('complete');
      return;
    }

    setCurrentWordIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentWordIndex, words.length, isTiny, lives]);

  return {
    phase,
    currentWordIndex,
    currentWord,
    score,
    maxScore,
    lives,
    maxLives,
    isCorrect,
    wordsCorrect: wordsCorrectRef.current,
    dismissInstruction,
    submitAnswer,
    nextWord,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add games/spelling-bee/src/hooks/useSpellingRound.ts
git commit -m "feat(spelling-bee): add useSpellingRound hook for round management"
```

---

### Task 5: LetterTiles component (tiny-tier input)

**Files:**
- Create: `games/spelling-bee/src/components/LetterTiles.tsx`
- Create: `games/spelling-bee/src/components/LetterTiles.module.css`

- [ ] **Step 1: Create LetterTiles component**

```typescript
import { useState, useCallback } from 'react';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './LetterTiles.module.css';

interface LetterTilesProps {
  letters: string[];
  wordLength: number;
  onSubmit: (answer: string) => void;
}

export function LetterTiles({ letters, wordLength, onSubmit }: LetterTilesProps) {
  const announce = useAnnounce();
  const [selected, setSelected] = useState<number[]>([]);

  const currentAnswer = selected.map((i) => letters[i]).join('');

  const handleTileTap = useCallback(
    (index: number) => {
      if (selected.includes(index)) return;
      const next = [...selected, index];
      setSelected(next);
      announce(letters[index]);

      if (next.length === wordLength) {
        const answer = next.map((i) => letters[i]).join('');
        onSubmit(answer);
        setSelected([]);
      }
    },
    [selected, letters, wordLength, onSubmit, announce],
  );

  const handleUndo = useCallback(() => {
    setSelected((prev) => prev.slice(0, -1));
  }, []);

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

      {selected.length > 0 && (
        <button className={styles.undoButton} onClick={handleUndo} aria-label="Undo last letter">
          ← Undo
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create LetterTiles.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  width: 100%;
}

.answerSlots {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}

.slot {
  width: 56px;
  height: 56px;
  border: 3px dashed var(--color-border, #ccc);
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-surface, #fff);
}

.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  justify-content: center;
  max-width: 400px;
}

.tile {
  width: 64px;
  height: 64px;
  border: 2px solid var(--color-primary, #4a90d9);
  border-radius: var(--radius-md, 8px);
  background: var(--color-primary-light, #e8f0fe);
  color: var(--color-text);
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.tile:hover:not(:disabled) {
  transform: scale(1.08);
}

.tile:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.used {
  opacity: 0.3;
  cursor: default;
}

.undoButton {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border, #ccc);
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #fff);
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/components/LetterTiles.tsx games/spelling-bee/src/components/LetterTiles.module.css
git commit -m "feat(spelling-bee): add LetterTiles component for tiny-tier input"
```

---

### Task 6: Keyboard component (junior/explorer input)

**Files:**
- Create: `games/spelling-bee/src/components/Keyboard.tsx`
- Create: `games/spelling-bee/src/components/Keyboard.module.css`

- [ ] **Step 1: Create Keyboard component**

```typescript
import { useState, useCallback } from 'react';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './Keyboard.module.css';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface KeyboardProps {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function Keyboard({ onSubmit, disabled = false }: KeyboardProps) {
  const announce = useAnnounce();
  const [typed, setTyped] = useState('');

  const handleKey = useCallback(
    (letter: string) => {
      if (disabled) return;
      setTyped((prev) => prev + letter);
      announce(letter);
    },
    [disabled, announce],
  );

  const handleBackspace = useCallback(() => {
    setTyped((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (typed.length === 0) return;
    onSubmit(typed);
    setTyped('');
  }, [typed, onSubmit]);

  return (
    <div className={styles.container}>
      <div className={styles.typedWord} aria-live="polite" aria-label={`Typed: ${typed || 'nothing yet'}`}>
        {typed || <span className={styles.placeholder}>Type your answer...</span>}
      </div>

      <div className={styles.keyboard} role="group" aria-label="On-screen keyboard">
        {ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className={styles.row}>
            {row.map((letter) => (
              <button
                key={letter}
                className={styles.key}
                onClick={() => handleKey(letter)}
                disabled={disabled}
                aria-label={letter}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          <button className={`${styles.key} ${styles.actionKey}`} onClick={handleBackspace} disabled={disabled || typed.length === 0} aria-label="Backspace">
            ⌫
          </button>
          <button className={`${styles.key} ${styles.submitKey}`} onClick={handleSubmit} disabled={disabled || typed.length === 0} aria-label="Submit answer">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Keyboard.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
}

.typedWord {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--color-text);
  min-height: 2.5rem;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 3px solid var(--color-primary, #4a90d9);
  text-align: center;
  min-width: 200px;
}

.placeholder {
  color: var(--color-text-muted, #888);
  font-weight: 400;
  font-size: 1rem;
  letter-spacing: normal;
}

.keyboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}

.row {
  display: flex;
  gap: var(--spacing-xs, 4px);
  justify-content: center;
}

.key {
  min-width: 36px;
  height: 44px;
  border: 1px solid var(--color-border, #ccc);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface, #fff);
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s ease;
}

.key:hover:not(:disabled) {
  background: var(--color-primary-light, #e8f0fe);
}

.key:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.actionKey {
  min-width: 60px;
  background: var(--color-surface-alt, #f0f0f0);
}

.submitKey {
  min-width: 100px;
  background: var(--color-primary, #4a90d9);
  color: white;
  border-color: var(--color-primary, #4a90d9);
}

.submitKey:hover:not(:disabled) {
  background: var(--color-primary-dark, #3a7bc8);
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/components/Keyboard.tsx games/spelling-bee/src/components/Keyboard.module.css
git commit -m "feat(spelling-bee): add on-screen Keyboard component for junior/explorer"
```

---

### Task 7: WordDisplay and LivesDisplay components

**Files:**
- Create: `games/spelling-bee/src/components/WordDisplay.tsx`
- Create: `games/spelling-bee/src/components/WordDisplay.module.css`
- Create: `games/spelling-bee/src/components/LivesDisplay.tsx`
- Create: `games/spelling-bee/src/components/LivesDisplay.module.css`

- [ ] **Step 1: Create WordDisplay component**

```typescript
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';
import styles from './WordDisplay.module.css';

interface WordDisplayProps {
  word: WordEntry;
  ageTier: AgeTier;
  audioManager: AudioManager;
}

export function WordDisplay({ word, ageTier, audioManager }: WordDisplayProps) {
  const { t } = useTranslation('spelling-bee');
  const isTiny = ageTier === 'tiny';
  const [showDefinition, setShowDefinition] = useState(false);
  const [showOrigin, setShowOrigin] = useState(false);
  const [showSentence, setShowSentence] = useState(false);

  const handlePlayWord = useCallback(() => {
    audioManager.playVoice(`voice:word-${word.word}`);
  }, [audioManager, word.word]);

  const handleDefinition = useCallback(() => {
    setShowDefinition(true);
    if (word.definition) {
      audioManager.playVoice(`voice:def-${word.word}`);
    }
  }, [audioManager, word]);

  const handleOrigin = useCallback(() => {
    setShowOrigin(true);
  }, []);

  const handleSentence = useCallback(() => {
    setShowSentence(true);
    if (word.sentence) {
      audioManager.playVoice(`voice:sentence-${word.word}`);
    }
  }, [audioManager, word]);

  return (
    <div className={styles.container}>
      {isTiny && word.image && (
        <img
          src={`/images/spelling-bee/${word.image}`}
          alt={word.word}
          className={styles.wordImage}
          role="img"
        />
      )}

      <button className={styles.playButton} onClick={handlePlayWord} aria-label={t('playWord')}>
        🔊 {t('hearWord')}
      </button>

      {!isTiny && (
        <div className={styles.clueButtons}>
          <button className={styles.clueButton} onClick={handleDefinition} aria-label={t('getDefinition')}>
            {t('definition')}
          </button>
          <button className={styles.clueButton} onClick={handleOrigin} aria-label={t('getOrigin')}>
            {t('origin')}
          </button>
          <button className={styles.clueButton} onClick={handleSentence} aria-label={t('getSentence')}>
            {t('sentence')}
          </button>
        </div>
      )}

      {showDefinition && word.definition && (
        <p className={styles.clueText} aria-live="polite">{word.definition}</p>
      )}
      {showOrigin && word.origin && (
        <p className={styles.clueText} aria-live="polite">{t('originLabel', { origin: word.origin })}</p>
      )}
      {showSentence && word.sentence && (
        <p className={styles.clueText} aria-live="polite">{word.sentence}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create WordDisplay.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
}

.wordImage {
  width: 160px;
  height: 160px;
  object-fit: contain;
  border-radius: var(--radius-lg, 12px);
  border: 3px solid var(--color-border, #ccc);
}

.playButton {
  padding: var(--spacing-md) var(--spacing-lg);
  border: 2px solid var(--color-primary, #4a90d9);
  border-radius: var(--radius-md, 8px);
  background: var(--color-primary-light, #e8f0fe);
  color: var(--color-text);
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
}

.playButton:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.clueButtons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.clueButton {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border, #ccc);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface, #fff);
  color: var(--color-text-muted, #666);
  font-size: 0.875rem;
  cursor: pointer;
}

.clueButton:hover {
  background: var(--color-surface-alt, #f0f0f0);
}

.clueButton:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.clueText {
  font-size: 1rem;
  color: var(--color-text-muted, #666);
  text-align: center;
  font-style: italic;
  margin: 0;
  padding: var(--spacing-sm);
  background: var(--color-surface-alt, #f5f5f5);
  border-radius: var(--radius-sm, 4px);
  width: 100%;
  max-width: 400px;
}
```

- [ ] **Step 3: Create LivesDisplay component**

Create `games/spelling-bee/src/components/LivesDisplay.tsx`:

```typescript
import styles from './LivesDisplay.module.css';

interface LivesDisplayProps {
  lives: number;
  maxLives: number;
}

export function LivesDisplay({ lives, maxLives }: LivesDisplayProps) {
  return (
    <div className={styles.container} aria-label={`${lives} of ${maxLives} lives remaining`}>
      {Array.from({ length: maxLives }, (_, i) => (
        <span
          key={i}
          className={`${styles.heart} ${i < lives ? styles.alive : styles.lost}`}
          aria-hidden="true"
        >
          {i < lives ? '❤️' : '🖤'}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create LivesDisplay.module.css**

```css
.container {
  display: flex;
  gap: var(--spacing-xs, 4px);
  align-items: center;
}

.heart {
  font-size: 1.5rem;
  transition: transform 0.2s ease;
}

.alive {
  transform: scale(1);
}

.lost {
  transform: scale(0.8);
  opacity: 0.5;
}
```

- [ ] **Step 5: Commit**

```bash
git add games/spelling-bee/src/components/WordDisplay.tsx games/spelling-bee/src/components/WordDisplay.module.css games/spelling-bee/src/components/LivesDisplay.tsx games/spelling-bee/src/components/LivesDisplay.module.css
git commit -m "feat(spelling-bee): add WordDisplay and LivesDisplay components"
```

---

### Task 8: Locale files

**Files:**
- Create: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Create: `games/spelling-bee/src/locales/fr/spelling-bee.json`

- [ ] **Step 1: Create English locale**

```json
{
  "title": "Spelling Bee",
  "instruction": "Listen to the word and spell it!",
  "instructionTiny": "Look at the picture and spell the word!",
  "letsGo": "Let's Go!",
  "hearWord": "Hear the word",
  "playWord": "Play word pronunciation",
  "definition": "Definition",
  "origin": "Origin",
  "sentence": "Use in a sentence",
  "getDefinition": "Show definition",
  "getOrigin": "Show word origin",
  "getSentence": "Show word in a sentence",
  "originLabel": "Origin: {{origin}}",
  "correct": "Correct! Well done!",
  "incorrect": "Not quite. The word was {{word}}.",
  "incorrectTiny": "Almost! Try the next one!",
  "nextWord": "Next Word",
  "wordOf": "Word {{current}} of {{total}}",
  "livesRemaining": "{{lives}} lives remaining",
  "celebrationTitle": "Great Spelling!",
  "finalScore": "You spelled {{score}} of {{total}} words correctly!",
  "encourageTiny": "Well done!",
  "encourageJunior": "Nice spelling!",
  "gameOver": "Game Over"
}
```

- [ ] **Step 2: Create French locale**

```json
{
  "title": "Concours d'orthographe",
  "instruction": "Écoute le mot et épelle-le !",
  "instructionTiny": "Regarde l'image et épelle le mot !",
  "letsGo": "C'est parti !",
  "hearWord": "Écouter le mot",
  "playWord": "Lire la prononciation du mot",
  "definition": "Définition",
  "origin": "Origine",
  "sentence": "Dans une phrase",
  "getDefinition": "Afficher la définition",
  "getOrigin": "Afficher l'origine du mot",
  "getSentence": "Afficher le mot dans une phrase",
  "originLabel": "Origine : {{origin}}",
  "correct": "Correct ! Bien joué !",
  "incorrect": "Pas tout à fait. Le mot était {{word}}.",
  "incorrectTiny": "Presque ! Essaie le suivant !",
  "nextWord": "Mot suivant",
  "wordOf": "Mot {{current}} sur {{total}}",
  "livesRemaining": "{{lives}} vies restantes",
  "celebrationTitle": "Super orthographe !",
  "finalScore": "Tu as épelé {{score}} mots sur {{total}} correctement !",
  "encourageTiny": "Bien joué !",
  "encourageJunior": "Belle orthographe !",
  "gameOver": "Fin de partie"
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/locales/
git commit -m "feat(spelling-bee): add English and French locale files"
```

---

### Task 9: Main SpellingBee component

**Files:**
- Create: `games/spelling-bee/src/SpellingBee.tsx`
- Create: `games/spelling-bee/src/SpellingBee.module.css`

- [ ] **Step 1: Create SpellingBee component**

```typescript
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import type { GameProps, GameResult, AgeTier } from '@kids-games-zone/shared';
import { selectWords } from './utils/wordSelector';
import { scrambleWithDistractors } from './utils/letterScrambler';
import { useSpellingRound } from './hooks/useSpellingRound';
import { LetterTiles } from './components/LetterTiles';
import { Keyboard } from './components/Keyboard';
import { WordDisplay } from './components/WordDisplay';
import { LivesDisplay } from './components/LivesDisplay';
import wordsTiny from './data/words-tiny.json';
import wordsJunior from './data/words-junior.json';
import wordsExplorer from './data/words-explorer.json';
import styles from './SpellingBee.module.css';

const WORDS_PER_ROUND_TINY = 8;
const WORDS_PER_ROUND_OTHER = 15;

function getWordPool(ageTier: AgeTier) {
  switch (ageTier) {
    case 'tiny': return wordsTiny;
    case 'junior': return wordsJunior;
    case 'explorer': return wordsExplorer;
  }
}

export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const wordCount = isTiny ? WORDS_PER_ROUND_TINY : WORDS_PER_ROUND_OTHER;

  const words = useMemo(
    () => selectWords(getWordPool(ageTier), { difficulty: config.difficulty, count: wordCount }),
    [ageTier, config.difficulty, wordCount],
  );

  const round = useSpellingRound({ words, ageTier, onScorePoint: onScore });

  const tiles = useMemo(
    () => (isTiny ? scrambleWithDistractors(round.currentWord.word, 3) : []),
    [isTiny, round.currentWord.word],
  );

  // Play word pronunciation when entering playing phase
  useEffect(() => {
    if (round.phase === 'playing') {
      audioManager.playVoice(`voice:word-${round.currentWord.word}`);
      announce(t('wordOf', { current: round.currentWordIndex + 1, total: words.length }));
    }
  }, [round.phase, round.currentWordIndex, round.currentWord.word, audioManager, announce, t, words.length]);

  // Audio feedback for correct/incorrect
  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-correct');
      }
    } else {
      audioManager.playSFX('incorrect');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-tryagain');
      }
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
      gameId: 'spelling-bee',
      score: round.score,
      maxScore: round.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        wordsCorrect: round.wordsCorrect,
        wordsTotal: words.length,
        livesRemaining: round.lives,
      },
    };
    onComplete(result);
  }, [round, words.length, config.difficulty, onComplete]);

  // Instruction phase
  if (round.phase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character="🐝" />
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

  // Playing / Feedback phase
  const showFeedback = round.phase === 'feedback';

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
          {!isTiny && <LivesDisplay lives={round.lives} maxLives={round.maxLives} />}
        </div>

        <ProgressBar current={round.currentWordIndex} total={words.length} showLabel />

        <WordDisplay word={round.currentWord} ageTier={ageTier} audioManager={audioManager} />

        {!showFeedback && isTiny && (
          <LetterTiles letters={tiles} wordLength={round.currentWord.word.length} onSubmit={round.submitAnswer} />
        )}

        {!showFeedback && !isTiny && (
          <Keyboard onSubmit={round.submitAnswer} />
        )}

        {showFeedback && (
          <div className={styles.feedbackArea} aria-live="assertive">
            <p className={round.isCorrect ? styles.correctText : styles.incorrectText}>
              {round.isCorrect
                ? t('correct')
                : isTiny
                  ? t('incorrectTiny')
                  : t('incorrect', { word: round.currentWord.word })}
            </p>
            <OptionButton label={t('nextWord')} state="default" onSelect={round.nextWord} size="large" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: Create SpellingBee.module.css**

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
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-md);
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
  text-align: center;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/SpellingBee.tsx games/spelling-bee/src/SpellingBee.module.css
git commit -m "feat(spelling-bee): add main SpellingBee game component"
```

---

### Task 10: GamePlugin export (index.ts)

**Files:**
- Create: `games/spelling-bee/src/index.ts`

- [ ] **Step 1: Create the plugin export**

```typescript
import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { SpellingBee } from './SpellingBee';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'spelling-bee',
    name: 'Spelling Bee',
    description: 'Listen to words and spell them correctly!',
    thumbnail: '/images/games/spelling-bee.webp',
    ageRange: [3, 12],
    skills: ['literacy'],
    version: '1.0.0',
    entryPoint: '../../../games/spelling-bee/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 10,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['spelling', 'words', 'vocabulary', 'literacy', 'phonics'],
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
      gameId: 'spelling-bee',
      score: _score,
      maxScore: 100,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { wordsCorrect: 0, wordsTotal: 0, livesRemaining: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: SpellingBee,
};

export default plugin;
```

- [ ] **Step 2: Commit**

```bash
git add games/spelling-bee/src/index.ts
git commit -m "feat(spelling-bee): add GamePlugin export with manifest"
```

---

### Task 11: Register game in platform

**Files:**
- Modify: `platform/src/config/gameRegistry.ts`
- Modify: `platform/src/config/featureFlags.json`

- [ ] **Step 1: Add manifest to game registry**

Add this entry to the `gameRegistry` array in `platform/src/config/gameRegistry.ts`:

```typescript
  {
    id: 'spelling-bee',
    name: 'Spelling Bee',
    description: 'Listen to words and spell them correctly!',
    thumbnail: '/images/games/spelling-bee.webp',
    ageRange: [3, 12],
    skills: ['literacy'],
    version: '1.0.0',
    entryPoint: '../../../games/spelling-bee/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 10,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['spelling', 'words', 'vocabulary', 'literacy', 'phonics'],
  },
```

- [ ] **Step 2: Add feature flag**

Add to `platform/src/config/featureFlags.json`:

```json
  "game.spelling-bee": {
    "enabled": true,
    "description": "Spelling Bee game — listen to words and spell them"
  },
```

- [ ] **Step 3: Commit**

```bash
git add platform/src/config/gameRegistry.ts platform/src/config/featureFlags.json
git commit -m "feat(spelling-bee): register game in platform registry and feature flags"
```

---

### Task 12: Main component tests

**Files:**
- Create: `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SpellingBee } from '../SpellingBee';
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

describe('SpellingBee', () => {
  it('renders game shell with title', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows on-screen keyboard for junior-tier after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'On-screen keyboard' })).toBeTruthy();
  });

  it('shows letter tiles for tiny-tier after dismissing instruction', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Letter tiles' })).toBeTruthy();
  });

  it('shows hear word button after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText('hearWord')).toBeTruthy();
  });

  it('plays word voice on entering play phase', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(props.audioManager.playVoice).toHaveBeenCalled();
  });

  it('shows lives display for junior-tier', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByLabelText(/lives remaining/)).toBeTruthy();
  });

  it('does not show lives display for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.queryByLabelText(/lives remaining/)).toBeNull();
  });

  it('shows progress bar', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows clue buttons for junior-tier', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText('definition')).toBeTruthy();
    expect(screen.getByText('origin')).toBeTruthy();
    expect(screen.getByText('sentence')).toBeTruthy();
  });

  it('does not show clue buttons for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.queryByText('definition')).toBeNull();
  });

  it('has no accessibility violations on instruction screen', async () => {
    const { container } = render(<SpellingBee {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/__tests__/SpellingBee.test.tsx
git commit -m "test(spelling-bee): add main component tests with accessibility checks"
```

---

### Task 13: Typecheck and lint

- [ ] **Step 1: Run typecheck**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/spelling-bee typecheck`
Expected: No errors. Fix any type issues found.

- [ ] **Step 2: Run lint**

Run: `cd /home/jude/code/kids && pnpm lint`
Expected: No new lint errors. Fix any issues found.

- [ ] **Step 3: Run full test suite**

Run: `cd /home/jude/code/kids && pnpm test`
Expected: All tests pass across all packages.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(spelling-bee): resolve typecheck and lint issues"
```

(Skip this commit if no fixes were needed.)
