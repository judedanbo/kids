# Phase 3: First Three Games — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three playable games (Math Adventure, Word Puzzle, Memory Match) as monorepo plugin packages.

**Architecture:** Each game is a workspace package under `games/` implementing `GamePlugin`. Games use shared UI components and platform services (audio, storage). Build order: Math Adventure → Word Puzzle → Memory Match.

**Tech Stack:** React 19, TypeScript (strict), Framer Motion, CSS Modules, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-16-phase3-first-three-games-design.md`

**Reference implementation:** `games/dummy-game/` — follow this pattern for plugin structure, package.json, tsconfig.json.

---

## Chunk 1: Math Adventure

### Task 1: Scaffold math-adventure workspace package

**Files:**

- Create: `games/math-adventure/package.json`
- Create: `games/math-adventure/tsconfig.json`
- Create: `games/math-adventure/src/index.ts` (stub)
- Create: `games/math-adventure/src/MathAdventure.tsx` (stub)
- Create: `games/math-adventure/src/MathAdventure.module.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@kids-games-zone/math-adventure",
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

- [ ] **Step 3: Create stub MathAdventure.tsx**

```tsx
import type { GameProps } from '@kids-games-zone/shared';
import { GameShell } from '@kids-games-zone/shared';
import styles from './MathAdventure.module.css';

export function MathAdventure({ onExit }: GameProps) {
  return (
    <GameShell title="Math Adventure" onBack={onExit}>
      <div className={styles.gameArea}>
        <p>Math Adventure — coming soon</p>
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 4: Create stub MathAdventure.module.css**

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
```

- [ ] **Step 5: Create index.ts with GamePlugin**

Follow `games/dummy-game/src/index.ts` pattern exactly:

```typescript
import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { MathAdventure } from './MathAdventure';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'math-adventure',
    name: 'Math Adventure',
    description: 'Solve math problems and sharpen your number skills!',
    thumbnail: '/images/games/math-adventure.webp',
    ageRange: [6, 8],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '../../games/math-adventure/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-03-16',
    tags: ['math', 'addition', 'subtraction', 'multiplication'],
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
      gameId: 'math-adventure',
      score: _score,
      maxScore: 100,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        questionsCorrect: 0,
        avgAttempts: 0,
        additionCount: 0,
        subtractionCount: 0,
        multiplicationCount: 0,
      },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: MathAdventure,
};

export default plugin;
```

- [ ] **Step 6: Install dependencies and verify**

Run: `pnpm install`
Run: `pnpm --filter @kids-games-zone/math-adventure typecheck`
Expected: PASS (no type errors)

- [ ] **Step 7: Register in game registry**

Modify: `platform/src/config/gameRegistry.ts`

Add the math-adventure manifest to the `gameRegistry` array (copy the manifest object from `index.ts`).

- [ ] **Step 8: Verify game loads in dev server**

Run: `pnpm dev`
Navigate to the Hub, verify Math Adventure card appears for a junior-tier profile (age 6-8). Click it. Verify the stub renders inside GameShell.

- [ ] **Step 9: Commit**

```bash
git add games/math-adventure/ platform/src/config/gameRegistry.ts
git commit -m "feat: scaffold math-adventure game package with plugin stub"
```

---

### Task 2: Question generator — tests

**Files:**

- Create: `games/math-adventure/src/utils/questionGenerator.ts` (types only)
- Create: `games/math-adventure/src/__tests__/questionGenerator.test.ts`

- [ ] **Step 1: Create questionGenerator.ts with types and empty function**

```typescript
export type Operation = 'add' | 'subtract' | 'multiply';

export interface Question {
  operandA: number;
  operandB: number;
  operation: Operation;
  correctAnswer: number;
  options: number[];
  displayText: string;
}

export interface DifficultyConfig {
  operations: Operation[];
  minVal: number;
  maxVal: number;
  allowCarrying: boolean;
}

const DIFFICULTY_MAP: Record<number, DifficultyConfig> = {
  1: { operations: ['add'], minVal: 1, maxVal: 9, allowCarrying: false },
  2: { operations: ['add'], minVal: 1, maxVal: 15, allowCarrying: false },
  3: { operations: ['add', 'subtract'], minVal: 1, maxVal: 20, allowCarrying: false },
  4: { operations: ['add', 'subtract'], minVal: 1, maxVal: 50, allowCarrying: true },
  5: { operations: ['add', 'subtract', 'multiply'], minVal: 1, maxVal: 50, allowCarrying: true },
};

export function getDifficultyConfig(difficulty: number): DifficultyConfig {
  return DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP[1];
}

export function generateQuestion(_difficulty: number): Question {
  throw new Error('Not implemented');
}

export function generateRound(_difficulty: number, _count: number): Question[] {
  throw new Error('Not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateQuestion, generateRound, getDifficultyConfig } from '../utils/questionGenerator';
import type { Question } from '../utils/questionGenerator';

describe('getDifficultyConfig', () => {
  it('returns addition-only for difficulty 1', () => {
    const config = getDifficultyConfig(1);
    expect(config.operations).toEqual(['add']);
    expect(config.maxVal).toBe(9);
  });

  it('includes multiply for difficulty 5', () => {
    const config = getDifficultyConfig(5);
    expect(config.operations).toContain('multiply');
  });

  it('falls back to difficulty 1 for invalid input', () => {
    const config = getDifficultyConfig(99);
    expect(config).toEqual(getDifficultyConfig(1));
  });
});

describe('generateQuestion', () => {
  it('generates a valid question for difficulty 1', () => {
    const q = generateQuestion(1);
    expect(q.operandA).toBeGreaterThanOrEqual(1);
    expect(q.operandA).toBeLessThanOrEqual(9);
    expect(q.operandB).toBeGreaterThanOrEqual(1);
    expect(q.operandB).toBeLessThanOrEqual(9);
    expect(q.operation).toBe('add');
    expect(q.correctAnswer).toBe(q.operandA + q.operandB);
  });

  it('includes the correct answer in options', () => {
    const q = generateQuestion(1);
    expect(q.options).toContain(q.correctAnswer);
    expect(q.options).toHaveLength(4);
  });

  it('has no duplicate options', () => {
    const q = generateQuestion(1);
    const unique = new Set(q.options);
    expect(unique.size).toBe(4);
  });

  it('has no negative options', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(3);
      q.options.forEach((opt) => expect(opt).toBeGreaterThanOrEqual(0));
    }
  });

  it('subtraction never produces negative answers', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(3);
      if (q.operation === 'subtract') {
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(q.operandA).toBeGreaterThanOrEqual(q.operandB);
      }
    }
  });

  it('multiplication uses single-digit factors at difficulty 5', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(5);
      if (q.operation === 'multiply') {
        expect(q.operandA).toBeLessThanOrEqual(9);
        expect(q.operandB).toBeLessThanOrEqual(9);
      }
    }
  });

  it('generates displayText in the form "A op B = ?"', () => {
    const q = generateQuestion(1);
    expect(q.displayText).toMatch(/^\d+\s*\+\s*\d+\s*=\s*\?$/);
  });

  it('does not allow carrying at difficulty 1', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(1);
      const aOnes = q.operandA % 10;
      const bOnes = q.operandB % 10;
      expect(aOnes + bOnes).toBeLessThanOrEqual(9);
    }
  });

  it('does not allow carrying at difficulty 2', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(2);
      const aOnes = q.operandA % 10;
      const bOnes = q.operandB % 10;
      expect(aOnes + bOnes).toBeLessThanOrEqual(9);
    }
  });

  it('does not allow borrowing in subtraction at difficulty 3', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(3);
      if (q.operation === 'subtract') {
        const aOnes = q.operandA % 10;
        const bOnes = q.operandB % 10;
        expect(aOnes).toBeGreaterThanOrEqual(bOnes);
      }
    }
  });
});

describe('generateRound', () => {
  it('generates the requested number of questions', () => {
    const round = generateRound(1, 10);
    expect(round).toHaveLength(10);
  });

  it('has no duplicate questions in a round', () => {
    const round = generateRound(1, 10);
    const keys = round.map((q) => q.displayText);
    const unique = new Set(keys);
    expect(unique.size).toBe(10);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/math-adventure test`
Expected: FAIL — "Not implemented"

- [ ] **Step 4: Commit failing tests**

```bash
git add games/math-adventure/src/utils/questionGenerator.ts games/math-adventure/src/__tests__/questionGenerator.test.ts
git commit -m "test: add question generator tests for math-adventure"
```

---

### Task 3: Question generator — implementation

**Files:**

- Modify: `games/math-adventure/src/utils/questionGenerator.ts`

- [ ] **Step 1: Implement generateQuestion**

Replace the `throw` stubs with working implementations:

```typescript
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOperation(operations: Operation[]): Operation {
  return operations[Math.floor(Math.random() * operations.length)];
}

const OP_SYMBOLS: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
};

function computeAnswer(a: number, b: number, op: Operation): number {
  switch (op) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
  }
}

function generateDistractors(correct: number, count: number): number[] {
  const distractors = new Set<number>();
  // Common mistakes: off-by-one, off-by-two, double
  const candidates = [
    correct - 1,
    correct + 1,
    correct - 2,
    correct + 2,
    correct * 2,
    Math.floor(correct / 2),
  ];
  for (const c of candidates) {
    if (c >= 0 && c !== correct) distractors.add(c);
    if (distractors.size >= count) break;
  }
  // Fill remaining with random nearby values
  let attempts = 0;
  while (distractors.size < count && attempts < 50) {
    const offset = randomInt(1, 5) * (Math.random() < 0.5 ? -1 : 1);
    const val = correct + offset;
    if (val >= 0 && val !== correct) distractors.add(val);
    attempts++;
  }
  return [...distractors].slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuestion(difficulty: number): Question {
  const config = getDifficultyConfig(difficulty);
  const operation = pickOperation(config.operations);

  let operandA: number;
  let operandB: number;

  if (operation === 'multiply') {
    // Single-digit factors only
    operandA = randomInt(1, 9);
    operandB = randomInt(1, 9);
  } else if (operation === 'subtract') {
    // Ensure non-negative result: a >= b
    operandA = randomInt(config.minVal, config.maxVal);
    operandB = randomInt(config.minVal, operandA);
    if (!config.allowCarrying) {
      // Ensure no borrowing: each digit of A >= corresponding digit of B
      const aOnes = operandA % 10;
      const bOnes = operandB % 10;
      if (bOnes > aOnes) {
        operandB = operandB - bOnes + randomInt(0, aOnes);
        if (operandB < config.minVal) operandB = config.minVal;
      }
    }
  } else {
    // Addition
    operandA = randomInt(config.minVal, config.maxVal);
    operandB = randomInt(config.minVal, config.maxVal);
    if (!config.allowCarrying) {
      // Ensure no carrying: ones digits sum <= 9
      const aOnes = operandA % 10;
      const bOnes = operandB % 10;
      if (aOnes + bOnes > 9) {
        operandB = operandB - bOnes + randomInt(0, 9 - aOnes);
        if (operandB < config.minVal) operandB = config.minVal;
      }
    }
  }

  const correctAnswer = computeAnswer(operandA, operandB, operation);
  const distractors = generateDistractors(correctAnswer, 3);
  const options = shuffleArray([correctAnswer, ...distractors]);

  return {
    operandA,
    operandB,
    operation,
    correctAnswer,
    options,
    displayText: `${operandA} ${OP_SYMBOLS[operation]} ${operandB} = ?`,
  };
}

export function generateRound(difficulty: number, count: number): Question[] {
  const questions: Question[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (questions.length < count && attempts < count * 10) {
    const q = generateQuestion(difficulty);
    if (!seen.has(q.displayText)) {
      seen.add(q.displayText);
      questions.push(q);
    }
    attempts++;
  }

  return questions;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter @kids-games-zone/math-adventure test`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add games/math-adventure/src/utils/questionGenerator.ts
git commit -m "feat: implement question generator for math-adventure"
```

---

### Task 4: VisualAid component

**Files:**

- Create: `games/math-adventure/src/components/VisualAid.tsx`
- Create: `games/math-adventure/src/components/VisualAid.module.css`

- [ ] **Step 1: Create VisualAid.tsx**

```tsx
import styles from './VisualAid.module.css';

interface VisualAidProps {
  operandA: number;
  operandB: number;
  operation: string;
}

function DotGroup({ count, color }: { count: number; color: string }) {
  const dots = Array.from({ length: count }, (_, i) => (
    <span key={i} className={styles.dot} style={{ backgroundColor: color }} aria-hidden="true" />
  ));

  // Arrange in rows of 5
  const rows: JSX.Element[][] = [];
  for (let i = 0; i < dots.length; i += 5) {
    rows.push(dots.slice(i, i + 5));
  }

  return (
    <div className={styles.dotGroup}>
      {rows.map((row, i) => (
        <div key={i} className={styles.dotRow}>
          {row}
        </div>
      ))}
    </div>
  );
}

export function VisualAid({ operandA, operandB, operation }: VisualAidProps) {
  const symbol = operation === 'add' ? '+' : operation === 'subtract' ? '−' : '×';

  return (
    <div className={styles.container} role="img" aria-label={`${operandA} ${symbol} ${operandB}`}>
      <DotGroup count={operandA} color="var(--color-primary)" />
      <span className={styles.symbol}>{symbol}</span>
      <DotGroup count={operandB} color="var(--color-secondary)" />
    </div>
  );
}
```

- [ ] **Step 2: Create VisualAid.module.css**

```css
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  min-height: 60px;
}

.dotGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dotRow {
  display: flex;
  gap: 4px;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}

.symbol {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  padding: 0 var(--spacing-xs);
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @kids-games-zone/math-adventure typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add games/math-adventure/src/components/
git commit -m "feat: add VisualAid dot display component for math-adventure"
```

---

### Task 5: MathAdventure game component — tests

**Files:**

- Create: `games/math-adventure/src/__tests__/MathAdventure.test.tsx`

- [ ] **Step 1: Write component tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MathAdventure } from '../MathAdventure';
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
          lastPlayedAt: null,
        },
      },
      settings: { soundEnabled: true, musicEnabled: true, language: 'en', highContrastMode: false },
    },
    onScore: vi.fn(),
    onComplete: vi.fn(),
    onExit: vi.fn(),
    audioManager: {
      playMusic: vi.fn(),
      stopMusic: vi.fn(),
      playSFX: vi.fn(),
      playVoice: vi.fn(),
      stopVoice: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn().mockReturnValue(100),
      mute: vi.fn(),
      unmute: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      preload: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

describe('MathAdventure', () => {
  it('renders the game shell with title', () => {
    render(<MathAdventure {...createMockProps()} />);
    expect(screen.getByText('Math Adventure')).toBeInTheDocument();
  });

  it('displays a math question', () => {
    render(<MathAdventure {...createMockProps()} />);
    // Should show a question with "= ?"
    expect(screen.getByText(/= \?/)).toBeInTheDocument();
  });

  it('shows 4 answer options', () => {
    render(<MathAdventure {...createMockProps()} />);
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent?.match(/^\d+$/));
    expect(buttons.length).toBe(4);
  });

  it('shows visual aid at difficulty 1', () => {
    render(
      <MathAdventure
        {...createMockProps({ config: { ...createMockProps().config, difficulty: 1 } })}
      />,
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('hides visual aid at difficulty 3', () => {
    const props = createMockProps();
    props.config = { ...props.config, difficulty: 3 };
    render(<MathAdventure {...props} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls onScore when correct answer is selected', async () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);

    // Find the correct answer button — we need to find it via the question
    // Since questions are random, we click all buttons until one triggers onScore
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent?.match(/^\d+$/));
    for (const btn of buttons) {
      fireEvent.click(btn);
      if ((props.onScore as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }

    expect(props.onScore).toHaveBeenCalled();
  });

  it('plays SFX on correct answer', async () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);

    const buttons = screen.getAllByRole('button').filter((b) => b.textContent?.match(/^\d+$/));
    for (const btn of buttons) {
      fireEvent.click(btn);
      if ((props.audioManager.playSFX as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }

    expect(props.audioManager.playSFX).toHaveBeenCalledWith('correct');
  });

  it('shows progress bar', () => {
    render(<MathAdventure {...createMockProps()} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/math-adventure test`
Expected: FAIL — component doesn't have game logic yet

- [ ] **Step 3: Commit failing tests**

```bash
git add games/math-adventure/src/__tests__/MathAdventure.test.tsx
git commit -m "test: add MathAdventure component tests"
```

---

### Task 6: MathAdventure game component — implementation

**Files:**

- Modify: `games/math-adventure/src/MathAdventure.tsx`
- Modify: `games/math-adventure/src/MathAdventure.module.css`

- [ ] **Step 1: Implement MathAdventure.tsx**

```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
  InstructionBubble,
  GameTimer,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { generateRound } from './utils/questionGenerator';
import type { Question } from './utils/questionGenerator';
import { VisualAid } from './components/VisualAid';
import styles from './MathAdventure.module.css';

const QUESTIONS_PER_ROUND = 10;
const POINTS_FIRST_TRY = 10;
const POINTS_SECOND_TRY = 5;
const POINTS_THIRD_TRY = 2;

function getPoints(attempts: number): number {
  if (attempts === 1) return POINTS_FIRST_TRY;
  if (attempts === 2) return POINTS_SECOND_TRY;
  return POINTS_THIRD_TRY;
}

export function MathAdventure({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionStates, setOptionStates] = useState<Record<number, 'correct' | 'incorrect'>>({});
  const [timerPaused, setTimerPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const operationCounts = useRef({ add: 0, subtract: 0, multiply: 0 });
  const totalAttempts = useRef(0);
  const questionsCorrect = useRef(0);

  useEffect(() => {
    const round = generateRound(config.difficulty, QUESTIONS_PER_ROUND);
    setQuestions(round);
    startTimeRef.current = Date.now();
  }, [config.difficulty]);

  const currentQuestion = questions[currentIndex];

  const advanceQuestion = useCallback(() => {
    setAttempts(0);
    setSelectedOption(null);
    setOptionStates({});

    if (currentIndex + 1 >= QUESTIONS_PER_ROUND) {
      setShowCelebration(true);
      setTimerPaused(true);
      audioManager.playSFX('celebrate');
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, audioManager]);

  const handleOptionSelect = useCallback(
    (option: number) => {
      if (selectedOption !== null || !currentQuestion) return;

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      totalAttempts.current += 1;

      if (option === currentQuestion.correctAnswer) {
        const points = getPoints(newAttempts);
        setScore((s) => s + points);
        onScore(points);
        setSelectedOption(option);
        setOptionStates((prev) => ({ ...prev, [option]: 'correct' }));
        audioManager.playSFX('correct');
        questionsCorrect.current += 1;
        operationCounts.current[currentQuestion.operation] += 1;

        setTimeout(advanceQuestion, 800);
      } else {
        setOptionStates((prev) => ({ ...prev, [option]: 'incorrect' }));
        audioManager.playSFX('incorrect');
        // Clear incorrect state after brief delay so they can try again
        setTimeout(() => {
          setOptionStates((prev) => {
            const next = { ...prev };
            delete next[option];
            return next;
          });
        }, 600);
      }
    },
    [currentQuestion, attempts, selectedOption, onScore, audioManager, advanceQuestion],
  );

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'math-adventure',
      score,
      maxScore: QUESTIONS_PER_ROUND * POINTS_FIRST_TRY,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        questionsCorrect: questionsCorrect.current,
        avgAttempts: totalAttempts.current / QUESTIONS_PER_ROUND,
        additionCount: operationCounts.current.add,
        subtractionCount: operationCounts.current.subtract,
        multiplicationCount: operationCounts.current.multiply,
      },
    };
    onComplete(result);
  }, [score, config.difficulty, onComplete]);

  if (showInstruction) {
    return (
      <GameShell title="Math Adventure" onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text="Solve the math problems!" />
          <OptionButton label="Let's Go!" onSelect={() => setShowInstruction(false)} size="large" />
        </div>
      </GameShell>
    );
  }

  if (showCelebration) {
    return (
      <GameShell title="Math Adventure" onBack={onExit}>
        <CelebrationOverlay
          title="Amazing!"
          score={score}
          maxScore={QUESTIONS_PER_ROUND * POINTS_FIRST_TRY}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  if (!currentQuestion) return null;

  return (
    <GameShell title="Math Adventure" onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={score} maxScore={QUESTIONS_PER_ROUND * POINTS_FIRST_TRY} showStars />
          <GameTimer mode="countup" paused={timerPaused} />
        </div>
        <ProgressBar current={currentIndex + 1} total={QUESTIONS_PER_ROUND} showLabel />

        <div className={styles.questionArea}>
          <h2 className={styles.questionText}>{currentQuestion.displayText}</h2>
          {config.difficulty <= 2 && (
            <VisualAid
              operandA={currentQuestion.operandA}
              operandB={currentQuestion.operandB}
              operation={currentQuestion.operation}
            />
          )}
          {attempts > 1 && <p className={styles.attemptHint}>Attempt {attempts} — keep trying!</p>}
        </div>

        <div className={styles.optionsGrid}>
          {currentQuestion.options.map((option, idx) => (
            <OptionButton
              key={`${currentIndex}-${idx}`}
              label={String(option)}
              state={optionStates[option] ?? 'default'}
              onSelect={() => handleOptionSelect(option)}
              disabled={selectedOption !== null || optionStates[option] === 'incorrect'}
              size="large"
            />
          ))}
        </div>
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: Update MathAdventure.module.css**

```css
.gameArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  max-width: 600px;
  margin: 0 auto;
}

.topBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.questionArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

.questionText {
  font-family: var(--font-family-display);
  font-size: 2rem;
  color: var(--color-text);
  margin: 0;
}

.attemptHint {
  font-size: 0.9rem;
  color: var(--color-secondary);
  margin: 0;
}

.optionsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 400px;
}
```

- [ ] **Step 3: Note on score sync**

The component calls `onComplete(result)` directly after the celebration (same pattern as the dummy game). The plugin's `onEnd()` serves as a fallback with default metrics. No additional sync mechanism is needed.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @kids-games-zone/math-adventure test`
Expected: All PASS

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @kids-games-zone/math-adventure typecheck`
Expected: PASS

- [ ] **Step 6: Manual smoke test**

Run: `pnpm dev`
Navigate to Hub → click Math Adventure → verify:

- Instruction bubble shows
- Click "Let's Go!" → first question appears
- 4 option buttons displayed
- Visual aid shows at difficulty 1
- Correct answer: green flash, score increments, next question
- Wrong answer: red flash, "Attempt 2" hint
- After 10 questions: celebration overlay → returns to hub

- [ ] **Step 7: Commit**

```bash
git add games/math-adventure/src/
git commit -m "feat: implement MathAdventure game component with full gameplay"
```

---

## Chunk 2: Word Puzzle

### Task 7: Scaffold word-puzzle workspace package

**Files:**

- Create: `games/word-puzzle/package.json`
- Create: `games/word-puzzle/tsconfig.json`
- Create: `games/word-puzzle/src/index.ts`
- Create: `games/word-puzzle/src/WordPuzzle.tsx` (stub)
- Create: `games/word-puzzle/src/WordPuzzle.module.css`
- Modify: `platform/src/config/gameRegistry.ts`

- [ ] **Step 1: Create package.json**

Same structure as math-adventure but with `"name": "@kids-games-zone/word-puzzle"`. Additionally, since word-puzzle directly imports `framer-motion` (in LetterTile, AnswerSlots), add it as a dependency:

```json
"dependencies": {
  "framer-motion": "^11.0.0"
}
```

- [ ] **Step 2: Create tsconfig.json**

Identical to `games/math-adventure/tsconfig.json`.

- [ ] **Step 3: Create stub WordPuzzle.tsx**

```tsx
import type { GameProps } from '@kids-games-zone/shared';
import { GameShell } from '@kids-games-zone/shared';
import styles from './WordPuzzle.module.css';

export function WordPuzzle({ onExit }: GameProps) {
  return (
    <GameShell title="Word Puzzle" onBack={onExit}>
      <div className={styles.gameArea}>
        <p>Word Puzzle — coming soon</p>
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 4: Create WordPuzzle.module.css**

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
```

- [ ] **Step 5: Create index.ts with GamePlugin**

Follow the same pattern as math-adventure's `index.ts`:

- `id: 'word-puzzle'`, manifest fields from spec
- `entryPoint: '../../games/word-puzzle/src/index.ts'`
- Plugin-level `_startTime`, `_score`, `_difficulty`
- `onEnd` returns `GameResult` with `gameId: 'word-puzzle'`, `maxScore: 80`
- Metrics: `{ wordsCorrect: 0, avgAttempts: 0, categoryIndex: 0 }`

- [ ] **Step 6: Register in gameRegistry.ts, install, verify**

Run: `pnpm install && pnpm --filter @kids-games-zone/word-puzzle typecheck`

- [ ] **Step 7: Commit**

```bash
git add games/word-puzzle/ platform/src/config/gameRegistry.ts
git commit -m "feat: scaffold word-puzzle game package with plugin stub"
```

---

### Task 8: Word data and scramble utilities — tests

**Files:**

- Create: `games/word-puzzle/src/data/words.ts` (types + empty data)
- Create: `games/word-puzzle/src/utils/scramble.ts` (types + stubs)
- Create: `games/word-puzzle/src/__tests__/words.test.ts`
- Create: `games/word-puzzle/src/__tests__/scramble.test.ts`

- [ ] **Step 1: Create words.ts with types and initial structure**

```typescript
export interface WordEntry {
  word: string;
  clue: string;
}

export interface WordCategory {
  name: string;
  words: Record<number, WordEntry[]>; // keyed by difficulty 1-5
}

export const categories: WordCategory[] = [];

export function getWordsForRound(
  categoryIndex: number,
  difficulty: number,
  count: number,
): WordEntry[] {
  throw new Error('Not implemented');
}

export function getRandomCategoryIndex(): number {
  return Math.floor(Math.random() * categories.length);
}
```

- [ ] **Step 2: Create scramble.ts with stubs**

```typescript
export function scrambleWord(_word: string): string {
  throw new Error('Not implemented');
}
```

- [ ] **Step 3: Write words.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { categories, getWordsForRound } from '../data/words';

describe('word data integrity', () => {
  it('has at least 3 categories', () => {
    expect(categories.length).toBeGreaterThanOrEqual(3);
  });

  it('every category has words for all 5 difficulty levels', () => {
    for (const cat of categories) {
      for (let d = 1; d <= 5; d++) {
        expect(cat.words[d]).toBeDefined();
        expect(cat.words[d].length).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('word lengths match difficulty expectations', () => {
    for (const cat of categories) {
      for (const entry of cat.words[1] ?? []) expect(entry.word.length).toBe(3);
      for (const entry of cat.words[2] ?? []) expect(entry.word.length).toBe(4);
      for (const entry of cat.words[3] ?? []) expect([4, 5]).toContain(entry.word.length);
      for (const entry of cat.words[4] ?? []) expect([5, 6]).toContain(entry.word.length);
      for (const entry of cat.words[5] ?? []) expect(entry.word.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('all words are lowercase alphabetic', () => {
    for (const cat of categories) {
      for (const entries of Object.values(cat.words)) {
        for (const entry of entries) {
          expect(entry.word).toMatch(/^[a-z]+$/);
        }
      }
    }
  });

  it('every word has a non-empty clue', () => {
    for (const cat of categories) {
      for (const entries of Object.values(cat.words)) {
        for (const entry of entries) {
          expect(entry.clue.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('getWordsForRound', () => {
  it('returns the requested number of words', () => {
    const words = getWordsForRound(0, 1, 8);
    expect(words).toHaveLength(8);
  });

  it('returns different words each call (randomized)', () => {
    const a = getWordsForRound(0, 1, 8).map((w) => w.word);
    const b = getWordsForRound(0, 1, 8).map((w) => w.word);
    // Extremely unlikely to be identical with 10+ word pool and 8 picks
    // But not guaranteed — just check they are valid
    expect(a).toHaveLength(8);
    expect(b).toHaveLength(8);
  });
});
```

- [ ] **Step 4: Write scramble.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { scrambleWord } from '../utils/scramble';

describe('scrambleWord', () => {
  it('returns a string of the same length', () => {
    expect(scrambleWord('cat').length).toBe(3);
  });

  it('contains the same letters', () => {
    const result = scrambleWord('hello');
    expect([...result].sort().join('')).toBe([...'hello'].sort().join(''));
  });

  it('returns a different arrangement than the original', () => {
    // With 3+ letter words, scramble should differ
    // Run multiple times to be sure (fisher-yates is random)
    let differed = false;
    for (let i = 0; i < 20; i++) {
      if (scrambleWord('cat') !== 'cat') {
        differed = true;
        break;
      }
    }
    expect(differed).toBe(true);
  });

  it('handles two-letter words by swapping', () => {
    expect(scrambleWord('ab')).toBe('ba');
  });

  it('handles single-letter words (returns same)', () => {
    expect(scrambleWord('a')).toBe('a');
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/word-puzzle test`
Expected: FAIL

- [ ] **Step 6: Commit**

```bash
git add games/word-puzzle/src/data/words.ts games/word-puzzle/src/utils/scramble.ts games/word-puzzle/src/__tests__/
git commit -m "test: add word data integrity and scramble tests for word-puzzle"
```

---

### Task 9: Word data and scramble utilities — implementation

**Files:**

- Modify: `games/word-puzzle/src/data/words.ts`
- Modify: `games/word-puzzle/src/utils/scramble.ts`

- [ ] **Step 1: Implement scramble.ts**

```typescript
function fisherYatesShuffle(arr: string[]): string[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function scrambleWord(word: string): string {
  if (word.length <= 1) return word;
  if (word.length === 2) return word[1] + word[0];

  const letters = word.split('');
  let scrambled: string;
  let attempts = 0;

  do {
    scrambled = fisherYatesShuffle(letters).join('');
    attempts++;
  } while (scrambled === word && attempts < 10);

  // Fallback: force-swap first two letters
  if (scrambled === word) {
    const arr = scrambled.split('');
    [arr[0], arr[1]] = [arr[1], arr[0]];
    scrambled = arr.join('');
  }

  return scrambled;
}
```

- [ ] **Step 2: Populate words.ts with curated data**

Fill `categories` with at least 3 categories (Animals, Food, Nature). Each category needs words for difficulties 1-5 with at least 10 words each. Include clues. All words lowercase alphabetic.

Example structure:

```typescript
export const categories: WordCategory[] = [
  {
    name: 'Animals',
    words: {
      1: [
        { word: 'cat', clue: 'It says meow' },
        { word: 'dog', clue: 'It says woof' },
        { word: 'hen', clue: 'It lays eggs' },
        { word: 'pig', clue: 'It rolls in mud' },
        { word: 'cow', clue: 'It gives us milk' },
        { word: 'bat', clue: 'It flies at night' },
        { word: 'ant', clue: 'A tiny insect' },
        { word: 'fox', clue: 'A sly red animal' },
        { word: 'owl', clue: 'It hoots at night' },
        { word: 'ram', clue: 'A male sheep' },
      ],
      2: [
        /* 10+ 4-letter animal words with clues */
      ],
      3: [
        /* 10+ 4-5-letter animal words with clues */
      ],
      4: [
        /* 10+ 5-6-letter animal words with clues */
      ],
      5: [
        /* 10+ 6+-letter animal words with clues */
      ],
    },
  },
  // ... Food, Nature categories
];
```

Implement `getWordsForRound`:

```typescript
export function getWordsForRound(
  categoryIndex: number,
  difficulty: number,
  count: number,
): WordEntry[] {
  const category = categories[categoryIndex];
  if (!category) return [];
  const pool = category.words[difficulty] ?? category.words[1];
  if (!pool || pool.length === 0) return [];

  // Shuffle and take `count`
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @kids-games-zone/word-puzzle test`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add games/word-puzzle/src/data/words.ts games/word-puzzle/src/utils/scramble.ts
git commit -m "feat: implement word data and scramble utilities for word-puzzle"
```

---

### Task 10: LetterTile, ScrambleRow, AnswerSlots components

**Files:**

- Create: `games/word-puzzle/src/components/LetterTile.tsx`
- Create: `games/word-puzzle/src/components/LetterTile.module.css`
- Create: `games/word-puzzle/src/components/ScrambleRow.tsx`
- Create: `games/word-puzzle/src/components/ScrambleRow.module.css`
- Create: `games/word-puzzle/src/components/AnswerSlots.tsx`
- Create: `games/word-puzzle/src/components/AnswerSlots.module.css`

- [ ] **Step 1: Create LetterTile.tsx**

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from './LetterTile.module.css';

interface LetterTileProps {
  letter: string;
  state: 'available' | 'placed' | 'correct' | 'incorrect';
  onClick: () => void;
  disabled?: boolean;
}

export function LetterTile({ letter, state, onClick, disabled = false }: LetterTileProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      className={`${styles.tile} ${styles[state]}`}
      onClick={onClick}
      disabled={disabled || state === 'placed'}
      layout={!shouldReduceMotion}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      aria-label={`Letter ${letter}`}
    >
      {letter.toUpperCase()}
    </motion.button>
  );
}
```

- [ ] **Step 2: Create LetterTile.module.css**

```css
.tile {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.tile:hover:not(:disabled) {
  background: var(--color-primary-light, #e8f0fe);
}

.tile:disabled {
  cursor: default;
}

.available {
  background: var(--color-surface);
}

.placed {
  opacity: 0.3;
  pointer-events: none;
}

.correct {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.incorrect {
  background: var(--color-error, #f44336);
  border-color: var(--color-error, #f44336);
  color: white;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .incorrect {
    animation: none;
  }
}
```

- [ ] **Step 3: Create ScrambleRow.tsx**

```tsx
import { LetterTile } from './LetterTile';
import styles from './ScrambleRow.module.css';

interface ScrambleRowProps {
  letters: string[];
  placedIndices: Set<number>;
  onLetterClick: (index: number) => void;
}

export function ScrambleRow({ letters, placedIndices, onLetterClick }: ScrambleRowProps) {
  return (
    <div className={styles.row} role="group" aria-label="Scrambled letters">
      {letters.map((letter, i) => (
        <LetterTile
          key={i}
          letter={letter}
          state={placedIndices.has(i) ? 'placed' : 'available'}
          onClick={() => onLetterClick(i)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create ScrambleRow.module.css**

```css
.row {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}
```

- [ ] **Step 5: Create AnswerSlots.tsx**

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from './AnswerSlots.module.css';

interface AnswerSlotsProps {
  slots: (string | null)[];
  state: 'default' | 'correct' | 'incorrect';
  onSlotClick: (index: number) => void;
}

export function AnswerSlots({ slots, state, onSlotClick }: AnswerSlotsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`${styles.row} ${state !== 'default' ? styles[state] : ''}`}
      role="group"
      aria-label="Your answer"
    >
      {slots.map((letter, i) => (
        <motion.button
          key={i}
          className={`${styles.slot} ${letter ? styles.filled : styles.empty}`}
          onClick={() => letter && onSlotClick(i)}
          disabled={!letter}
          layout={!shouldReduceMotion}
          aria-label={letter ? `Remove letter ${letter}` : `Empty slot ${i + 1}`}
        >
          {letter?.toUpperCase() ?? ''}
        </motion.button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create AnswerSlots.module.css**

```css
.row {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.slot {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  border: 2px dashed var(--color-primary);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.filled {
  border-style: solid;
  background: var(--color-surface);
}

.empty {
  cursor: default;
}

.correct .slot {
  border-color: var(--color-success);
  background: var(--color-success);
  color: white;
}

.incorrect .slot {
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .incorrect .slot {
    animation: none;
  }
}
```

- [ ] **Step 7: Verify typecheck**

Run: `pnpm --filter @kids-games-zone/word-puzzle typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add games/word-puzzle/src/components/
git commit -m "feat: add LetterTile, ScrambleRow, AnswerSlots components for word-puzzle"
```

---

### Task 11: WordPuzzle game component — tests

**Files:**

- Create: `games/word-puzzle/src/__tests__/WordPuzzle.test.tsx`

- [ ] **Step 1: Write component tests**

Follow the same pattern as `MathAdventure.test.tsx` using the `createMockProps` helper. Test:

- Renders game shell with "Word Puzzle" title
- Shows instruction bubble initially
- After dismissing instruction, shows scrambled letters
- Shows answer slots matching word length
- Shows category label
- Tapping a letter places it in the answer slot
- Tapping a filled answer slot returns the letter
- Calls `onScore` on correct word completion
- Plays correct/incorrect SFX
- Shows progress bar

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/word-puzzle test`
Expected: FAIL

- [ ] **Step 3: Commit**

```bash
git add games/word-puzzle/src/__tests__/WordPuzzle.test.tsx
git commit -m "test: add WordPuzzle component tests"
```

---

### Task 12: WordPuzzle game component — implementation

**Files:**

- Modify: `games/word-puzzle/src/WordPuzzle.tsx`
- Modify: `games/word-puzzle/src/WordPuzzle.module.css`

- [ ] **Step 1: Implement WordPuzzle.tsx**

Core state:

- `words: WordEntry[]` — the 8 words for this round
- `currentIndex: number` — which word we're on
- `scrambledLetters: string[]` — the scrambled letters of current word
- `placedIndices: Set<number>` — which scramble indices have been placed
- `answerSlots: (string | null)[]` — current answer
- `placementOrder: number[]` — tracks order of placed indices for undo
- `attempts: number` — attempts on current word
- `score: number`
- `answerState: 'default' | 'correct' | 'incorrect'`
- `showCelebration: boolean`
- `showInstruction: boolean`

Logic:

- On mount: call `getWordsForRound(categoryIndex, difficulty, 8)` and `scrambleWord` for first word
- `handleLetterClick(scrambleIndex)`: add letter to next empty answer slot, add to `placementOrder`
- `handleSlotClick(slotIndex)`: remove letter, return to scramble row, remove from `placementOrder`
- Keyboard: Escape → undo last placed letter (pop from `placementOrder`)
- When all slots filled: auto-check against word
  - Correct: set `answerState='correct'`, play SFX, score, advance after delay
  - Incorrect: set `answerState='incorrect'`, play SFX, increment attempts, clear slots after delay
- After 8 words: show celebration

- [ ] **Step 2: Update WordPuzzle.module.css**

Include styles for: `.gameArea`, `.categoryLabel`, `.clueText`, `.wordArea`, `.attemptHint`

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @kids-games-zone/word-puzzle test`
Expected: All PASS

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @kids-games-zone/word-puzzle typecheck`

- [ ] **Step 5: Manual smoke test**

Run: `pnpm dev`
Verify full word puzzle gameplay flow.

- [ ] **Step 6: Commit**

```bash
git add games/word-puzzle/src/
git commit -m "feat: implement WordPuzzle game component with full gameplay"
```

---

## Chunk 3: Memory Match

### Task 13: Scaffold memory-match workspace package

**Files:**

- Create: `games/memory-match/package.json`
- Create: `games/memory-match/tsconfig.json`
- Create: `games/memory-match/src/index.ts`
- Create: `games/memory-match/src/MemoryMatch.tsx` (stub)
- Create: `games/memory-match/src/MemoryMatch.module.css`
- Modify: `platform/src/config/gameRegistry.ts`

- [ ] **Step 1: Create package.json, tsconfig.json**

Same pattern as previous games. Name: `@kids-games-zone/memory-match`.

- [ ] **Step 2: Create stub MemoryMatch.tsx and module.css**

- [ ] **Step 3: Create index.ts with GamePlugin**

- `id: 'memory-match'`, manifest fields from spec
- `entryPoint: '../../games/memory-match/src/index.ts'`
- `ageRange: [3, 5]`, `skills: ['memory']`
- `onStart` stores `_difficulty` from `config.difficulty`
- `onEnd` computes `maxScore` dynamically: `getGridConfig(_difficulty).pairs * 10`
- Metrics: `{ turns: 0, matchesFound: 0, totalPairs: 0 }`
- Add `framer-motion` as a dependency in package.json (Card.tsx uses it directly)

- [ ] **Step 4: Register in gameRegistry.ts, install, verify**

- [ ] **Step 5: Commit**

```bash
git add games/memory-match/ platform/src/config/gameRegistry.ts
git commit -m "feat: scaffold memory-match game package with plugin stub"
```

---

### Task 14: Grid utilities — tests and implementation

**Files:**

- Create: `games/memory-match/src/utils/gridUtils.ts`
- Create: `games/memory-match/src/__tests__/gridUtils.test.ts`

- [ ] **Step 1: Create gridUtils.ts with types**

```typescript
export interface GridConfig {
  pairs: number;
  columns: number;
  rows: number;
  cardSize: number;
  previewDuration: number;
}

export const GRID_CONFIGS: Record<number, GridConfig> = {
  1: { pairs: 2, columns: 2, rows: 2, cardSize: 120, previewDuration: 2000 },
  2: { pairs: 3, columns: 3, rows: 2, cardSize: 110, previewDuration: 2000 },
  3: { pairs: 4, columns: 4, rows: 2, cardSize: 100, previewDuration: 1500 },
  4: { pairs: 6, columns: 4, rows: 3, cardSize: 96, previewDuration: 1500 },
  5: { pairs: 8, columns: 4, rows: 4, cardSize: 96, previewDuration: 1000 },
};

export type IllustrationName =
  | 'cat'
  | 'fish'
  | 'butterfly'
  | 'bird'
  | 'flower'
  | 'sun'
  | 'tree'
  | 'star'
  | 'heart'
  | 'house';

export const ALL_ILLUSTRATIONS: IllustrationName[] = [
  'cat',
  'fish',
  'butterfly',
  'bird',
  'flower',
  'sun',
  'tree',
  'star',
  'heart',
  'house',
];

export interface CardData {
  id: number;
  illustration: IllustrationName;
  pairId: number;
}

export function getGridConfig(difficulty: number): GridConfig {
  return GRID_CONFIGS[difficulty] ?? GRID_CONFIGS[1];
}

export function generateCards(difficulty: number): CardData[] {
  throw new Error('Not implemented');
}
```

- [ ] **Step 2: Write gridUtils.test.ts**

Test: `getGridConfig` returns correct values, `generateCards` returns correct count (pairs × 2), each illustration appears exactly twice, card IDs are unique, cards are shuffled.

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement generateCards**

Pick `pairs` random illustrations from `ALL_ILLUSTRATIONS`, create 2 cards per illustration with unique IDs and shared `pairId`, shuffle with Fisher-Yates.

- [ ] **Step 5: Run tests, verify pass**

- [ ] **Step 6: Commit**

```bash
git add games/memory-match/src/utils/ games/memory-match/src/__tests__/gridUtils.test.ts
git commit -m "feat: implement grid utilities for memory-match"
```

---

### Task 15: CSSIllustration component

**Files:**

- Create: `games/memory-match/src/components/CSSIllustration.tsx`
- Create: `games/memory-match/src/components/CSSIllustration.module.css`

- [ ] **Step 1: Create CSSIllustration.tsx**

A component that takes a `name: IllustrationName` prop and renders the corresponding CSS illustration. Each illustration is a set of styled `div` elements. Implement all 10 designs (cat, fish, butterfly, bird, flower, sun, tree, star, heart, house).

Example for cat:

```tsx
function Cat() {
  return (
    <div className={styles.cat}>
      <div className={styles.catFace}>
        <div className={styles.catEarLeft} />
        <div className={styles.catEarRight} />
        <div className={styles.catEyeLeft} />
        <div className={styles.catEyeRight} />
        <div className={styles.catNose} />
        <div className={styles.catWhiskerLeft} />
        <div className={styles.catWhiskerRight} />
      </div>
    </div>
  );
}
```

The main export:

```tsx
export function CSSIllustration({ name }: { name: IllustrationName }) {
  const illustrations: Record<IllustrationName, () => JSX.Element> = {
    cat: Cat,
    fish: Fish,
    butterfly: Butterfly,
    bird: Bird,
    flower: Flower,
    sun: Sun,
    tree: Tree,
    star: Star,
    heart: Heart,
    house: House,
  };
  const Component = illustrations[name];
  return (
    <div className={styles.illustration}>
      <Component />
    </div>
  );
}
```

- [ ] **Step 2: Create CSSIllustration.module.css**

CSS for all 10 illustrations. Use bright, high-contrast colors. Keep each illustration within a 60×60px bounding box.

- [ ] **Step 3: Verify typecheck**

- [ ] **Step 4: Commit**

```bash
git add games/memory-match/src/components/CSSIllustration.*
git commit -m "feat: add CSS illustration components for memory-match cards"
```

---

### Task 16: Card and CardGrid components

**Files:**

- Create: `games/memory-match/src/components/Card.tsx`
- Create: `games/memory-match/src/components/Card.module.css`
- Create: `games/memory-match/src/components/CardGrid.tsx`
- Create: `games/memory-match/src/components/CardGrid.module.css`
- Create: `games/memory-match/src/__tests__/Card.test.tsx`

- [ ] **Step 1: Create Card.tsx**

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { CSSIllustration } from './CSSIllustration';
import type { IllustrationName } from '../utils/gridUtils';
import styles from './Card.module.css';

interface CardProps {
  illustration: IllustrationName;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled: boolean;
  size: number;
}

export function Card({ illustration, isFlipped, isMatched, onClick, disabled, size }: CardProps) {
  const shouldReduceMotion = useReducedMotion();
  const showFront = isFlipped || isMatched;

  return (
    <div className={styles.cardWrapper} style={{ perspective: 800, width: size, height: size }}>
      <motion.button
        className={`${styles.card} ${isMatched ? styles.matched : ''}`}
        onClick={onClick}
        disabled={disabled || isMatched}
        aria-label={showFront ? `Card showing ${illustration}` : 'Face-down card'}
        animate={{ rotateY: showFront ? 180 : 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4 }}
      >
        <div className={styles.cardInner}>
          <div className={styles.cardBack}>
            <span className={styles.questionMark}>?</span>
          </div>
          <div className={styles.cardFront}>
            <CSSIllustration name={illustration} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}
```

**Critical CSS for Card.module.css** — the flip effect requires:

- `.cardWrapper` — sets `perspective: 800px` (parent of rotated element)
- `.cardInner` — needs `transform-style: preserve-3d; width: 100%; height: 100%`
- `.cardBack` and `.cardFront` — both need `backface-visibility: hidden; position: absolute; inset: 0`
- `.cardFront` — additionally needs `transform: rotateY(180deg)` (pre-rotated so it shows when parent rotates to 180°)

````

- [ ] **Step 2: Create Card.module.css**

Style the 3D flip card with `backface-visibility: hidden` on both faces, card sizing, matched glow effect.

- [ ] **Step 3: Create CardGrid.tsx**

Takes `cards: CardData[]`, `gridConfig: GridConfig`, manages which cards are flipped, match checking, interaction lock. Exposes callbacks: `onMatch(pairId)`, `onMismatch()`, `onAllMatched()`.

- [ ] **Step 4: Create CardGrid.module.css**

CSS Grid layout using `gridConfig.columns`, centered, responsive.

- [ ] **Step 5: Write Card.test.tsx**

Test: renders face-down by default, shows illustration when flipped, calls onClick, is disabled when matched.

- [ ] **Step 6: Run tests, verify pass**

- [ ] **Step 7: Commit**

```bash
git add games/memory-match/src/components/ games/memory-match/src/__tests__/Card.test.tsx
git commit -m "feat: add Card and CardGrid components for memory-match"
````

---

### Task 17: MemoryMatch game component — tests and implementation

**Files:**

- Create: `games/memory-match/src/__tests__/MemoryMatch.test.tsx`
- Modify: `games/memory-match/src/MemoryMatch.tsx`
- Modify: `games/memory-match/src/MemoryMatch.module.css`

- [ ] **Step 1: Write MemoryMatch.test.tsx**

Test: renders game shell with "Memory Match" title, shows instruction bubble, displays correct number of cards for difficulty, calls onScore on match, calls onComplete after all matched, plays SFX.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement MemoryMatch.tsx**

Core state:

- `cards: CardData[]`
- `flippedIds: number[]` — currently flipped card IDs (max 2)
- `matchedPairIds: Set<number>`
- `turns: number`
- `score: number`
- `isLocked: boolean` — interaction lock during comparison
- `isPreview: boolean` — initial preview phase
- `showCelebration: boolean`
- `showInstruction: boolean`
- `encourageMessage: string | null`

Logic:

- On mount: generate cards, show instruction
- After instruction dismissed: start preview phase. Set `isPreview = true` which makes all cards render as flipped. After `getGridConfig(difficulty).previewDuration` ms, set `isPreview = false` to flip them all back. When `prefers-reduced-motion` is active, show cards statically (no flip animation) for the preview duration, then hide them.
- `handleCardClick(cardId)`: if locked or already flipped/matched, ignore. Flip card. If 2 flipped, lock and compare:
  - Match: add to matchedPairIds, score += 10, play 'correct' SFX, show "Great match!", check if all matched
  - No match: show "Keep trying!", wait 1s, flip back, play 'incorrect' SFX
  - Increment turns
- All matched: show celebration, call onComplete

- [ ] **Step 4: Update MemoryMatch.module.css**

- [ ] **Step 5: Run tests, verify pass**

- [ ] **Step 6: Run full test suite**

Run: `pnpm test`
Expected: All tests across all packages pass

- [ ] **Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Manual smoke test**

Run: `pnpm dev`
Verify Memory Match works end-to-end for a tiny-tier profile (age 3-5).

- [ ] **Step 9: Commit**

```bash
git add games/memory-match/src/
git commit -m "feat: implement MemoryMatch game component with full gameplay"
```

---

## Chunk 4: Integration and Final Verification

### Task 18: Full integration verification

**Files:**

- No new files — verification only

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass across all packages

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 4: Run production build**

Run: `pnpm build`
Expected: PASS. Check that build completes without errors.

- [ ] **Step 5: Verify all three games in dev server**

Run: `pnpm dev`

Test with a junior-tier profile (age 7):

- Hub shows Math Adventure and Word Puzzle cards
- Hub does NOT show Memory Match (age 3-5 only)
- Play Math Adventure to completion
- Play Word Puzzle to completion

Switch to a tiny-tier profile (age 4):

- Hub shows Memory Match card
- Hub does NOT show Math Adventure or Word Puzzle (age 6-8 only)
- Play Memory Match to completion

Verify for each game:

- Instruction bubble → gameplay → celebration → result screen
- Score increments during play (onScore)
- Correct/incorrect SFX plays
- Keyboard navigation works
- Progress persists after returning to hub

- [ ] **Step 6: Commit any fixes**

```bash
git add games/ platform/src/config/gameRegistry.ts
git commit -m "fix: integration fixes for Phase 3 games"
```

- [ ] **Step 7: Update development plan status**

Modify: `plans/development-plan.md`

- Change Phase 3 status to ✅ COMPLETE
- Update the phase dependency graph

```bash
git add plans/development-plan.md
git commit -m "docs: mark Phase 3 as complete in development plan"
```
