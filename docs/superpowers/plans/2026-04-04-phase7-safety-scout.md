# Safety Scout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Safety Scout game for ages 4–8 where children identify safe vs harmful objects across multiple categories (Kitchen, Bathroom, Living Room, Outdoor, Garage, Playground), with age-adaptive feedback and voice explanations for younger kids.

**Architecture:** Game plugin following the existing `GamePlugin` pattern. Object data as static JSON with category tagging and per-tier explanations. Category selection screen before gameplay. Tap-to-label interaction (green checkmark / red X) with immediate feedback.

**Tech Stack:** React 19, TypeScript (strict), CSS Modules, Vitest + vitest-axe, react-i18next, shared components (GameShell, OptionButton, ProgressBar, ScoreDisplay, CelebrationOverlay, InstructionBubble, useAnnounce)

---

## File Structure

```
games/safety-scout/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                              — GamePlugin default export with manifest
    SafetyScout.tsx                        — Main game component
    SafetyScout.module.css
    components/
      CategoryPicker.tsx                   — Category selection screen
      CategoryPicker.module.css
      ObjectCard.tsx                       — Object image + name display
      ObjectCard.module.css
      SafetyButtons.tsx                    — Green checkmark / red X buttons
      SafetyButtons.module.css
      ExplanationCard.tsx                  — Post-answer explanation display
      ExplanationCard.module.css
    data/
      objects.json                        — All objects across all categories
    utils/
      objectSelector.ts                   — Selects objects by category/difficulty
    hooks/
      useSafetyRound.ts                   — Round management hook
    __tests__/
      SafetyScout.test.tsx
      objectSelector.test.ts
    __mocks__/
      react-i18next.ts
    locales/
      en/
        safety-scout.json
      fr/
        safety-scout.json
    test-setup.ts
    vite-env.d.ts
```

Platform files to modify:

- `platform/src/config/gameRegistry.ts` — Add safety-scout manifest
- `platform/src/config/featureFlags.json` — Add `game.safety-scout` flag

---

### Task 1: Scaffold game package

**Files:**

- Create: `games/safety-scout/package.json`
- Create: `games/safety-scout/tsconfig.json`
- Create: `games/safety-scout/vitest.config.ts`
- Create: `games/safety-scout/src/vite-env.d.ts`
- Create: `games/safety-scout/src/test-setup.ts`
- Create: `games/safety-scout/src/__mocks__/react-i18next.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@kids-games-zone/safety-scout",
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
git add games/safety-scout/
git commit -m "feat(safety-scout): scaffold game package with build config"
```

---

### Task 2: Object data and object selector utility

**Files:**

- Create: `games/safety-scout/src/data/objects.json`
- Create: `games/safety-scout/src/utils/objectSelector.ts`
- Create: `games/safety-scout/src/__tests__/objectSelector.test.ts`

- [ ] **Step 1: Create objects.json**

```json
[
  {
    "id": "kitchen-knife",
    "name": "Kitchen Knife",
    "category": "kitchen",
    "image": "kitchen-knife.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Knives are sharp! Always ask a grown-up.",
      "junior": "Kitchen knives can cut you. Only adults should handle them."
    },
    "difficulty": 1
  },
  {
    "id": "kitchen-spoon",
    "name": "Spoon",
    "category": "kitchen",
    "image": "spoon.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Spoons are safe to use!",
      "junior": "Spoons are a safe eating utensil."
    },
    "difficulty": 1
  },
  {
    "id": "kitchen-stove",
    "name": "Stove",
    "category": "kitchen",
    "image": "stove.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "The stove is very hot! Don't touch it.",
      "junior": "Stoves get very hot when cooking. Only use them with an adult."
    },
    "difficulty": 1
  },
  {
    "id": "kitchen-cup",
    "name": "Cup",
    "category": "kitchen",
    "image": "cup.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Cups are safe for drinking!",
      "junior": "Cups are safe to use for drinks."
    },
    "difficulty": 1
  },
  {
    "id": "kitchen-blender",
    "name": "Blender",
    "category": "kitchen",
    "image": "blender.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Blenders have sharp blades! Ask a grown-up.",
      "junior": "Blenders have sharp spinning blades inside. Let an adult use it."
    },
    "difficulty": 2
  },
  {
    "id": "kitchen-fork",
    "name": "Fork",
    "category": "kitchen",
    "image": "fork.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Forks are safe for eating!",
      "junior": "Forks are safe eating utensils when used properly."
    },
    "difficulty": 1
  },
  {
    "id": "kitchen-microwave",
    "name": "Microwave",
    "category": "kitchen",
    "image": "microwave.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Food from the microwave is very hot! Be careful.",
      "junior": "Microwaves heat food very quickly. Ask an adult to help."
    },
    "difficulty": 3
  },
  {
    "id": "kitchen-oven-mitt",
    "name": "Oven Mitt",
    "category": "kitchen",
    "image": "oven-mitt.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Oven mitts protect your hands!",
      "junior": "Oven mitts keep your hands safe from hot things."
    },
    "difficulty": 2
  },

  {
    "id": "bathroom-medicine",
    "name": "Medicine Bottle",
    "category": "bathroom",
    "image": "medicine.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Medicine is only for when a grown-up gives it to you!",
      "junior": "Never take medicine without an adult. It can be dangerous."
    },
    "difficulty": 1
  },
  {
    "id": "bathroom-toothbrush",
    "name": "Toothbrush",
    "category": "bathroom",
    "image": "toothbrush.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Toothbrushes keep your teeth clean!",
      "junior": "Toothbrushes are safe and important for dental hygiene."
    },
    "difficulty": 1
  },
  {
    "id": "bathroom-razor",
    "name": "Razor",
    "category": "bathroom",
    "image": "razor.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Razors are very sharp! Don't touch them.",
      "junior": "Razors have sharp blades. Only adults should use them."
    },
    "difficulty": 1
  },
  {
    "id": "bathroom-soap",
    "name": "Soap",
    "category": "bathroom",
    "image": "soap.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Soap helps keep your hands clean!",
      "junior": "Soap is safe and helps fight germs."
    },
    "difficulty": 1
  },
  {
    "id": "bathroom-hairdryer",
    "name": "Hair Dryer",
    "category": "bathroom",
    "image": "hairdryer.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Hair dryers are very hot and use electricity!",
      "junior": "Hair dryers get hot and should not be used near water."
    },
    "difficulty": 2
  },
  {
    "id": "bathroom-shampoo",
    "name": "Shampoo",
    "category": "bathroom",
    "image": "shampoo.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Shampoo cleans your hair! Keep it away from your eyes.",
      "junior": "Shampoo is safe for hair but avoid getting it in your eyes."
    },
    "difficulty": 2
  },

  {
    "id": "living-outlet",
    "name": "Electrical Outlet",
    "category": "living-room",
    "image": "outlet.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Never put anything in an outlet! It's very dangerous.",
      "junior": "Electrical outlets carry electricity that can shock you badly."
    },
    "difficulty": 1
  },
  {
    "id": "living-remote",
    "name": "Remote Control",
    "category": "living-room",
    "image": "remote.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Remote controls are safe to use!",
      "junior": "Remote controls are safe electronics for everyday use."
    },
    "difficulty": 1
  },
  {
    "id": "living-candle",
    "name": "Candle",
    "category": "living-room",
    "image": "candle.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Candles have fire! Don't touch them.",
      "junior": "Lit candles have an open flame that can burn you or start a fire."
    },
    "difficulty": 2
  },
  {
    "id": "living-cushion",
    "name": "Cushion",
    "category": "living-room",
    "image": "cushion.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Cushions are soft and safe!",
      "junior": "Cushions are soft and harmless household items."
    },
    "difficulty": 1
  },
  {
    "id": "living-lamp",
    "name": "Lamp",
    "category": "living-room",
    "image": "lamp.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Lamps give us light!",
      "junior": "Lamps are generally safe when used properly."
    },
    "difficulty": 2
  },
  {
    "id": "living-matches",
    "name": "Matches",
    "category": "living-room",
    "image": "matches.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Matches make fire! Never play with them.",
      "junior": "Matches are fire starters. Only adults should use them."
    },
    "difficulty": 1
  },

  {
    "id": "outdoor-traffic",
    "name": "Busy Road",
    "category": "outdoor",
    "image": "traffic.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Roads with cars are dangerous! Hold a grown-up's hand.",
      "junior": "Busy roads are dangerous. Always look both ways and cross with an adult."
    },
    "difficulty": 1
  },
  {
    "id": "outdoor-bicycle",
    "name": "Bicycle",
    "category": "outdoor",
    "image": "bicycle.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Bikes are fun! Always wear a helmet.",
      "junior": "Bicycles are safe when you wear a helmet and follow road rules."
    },
    "difficulty": 3
  },
  {
    "id": "outdoor-swing",
    "name": "Swing",
    "category": "outdoor",
    "image": "swing.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Swings are fun to play on!",
      "junior": "Swings are safe playground equipment. Hold on tight!"
    },
    "difficulty": 1
  },
  {
    "id": "outdoor-stray-animal",
    "name": "Stray Animal",
    "category": "outdoor",
    "image": "stray-animal.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Don't touch animals you don't know!",
      "junior": "Stray animals may be scared and could bite. Keep your distance."
    },
    "difficulty": 2
  },
  {
    "id": "outdoor-puddle",
    "name": "Deep Puddle",
    "category": "outdoor",
    "image": "puddle.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Deep puddles can be slippery!",
      "junior": "Deep puddles can hide hazards and make you slip."
    },
    "difficulty": 3
  },
  {
    "id": "outdoor-helmet",
    "name": "Helmet",
    "category": "outdoor",
    "image": "helmet.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Helmets protect your head!",
      "junior": "Helmets protect your head during sports and cycling."
    },
    "difficulty": 1
  },
  {
    "id": "outdoor-ball",
    "name": "Ball",
    "category": "outdoor",
    "image": "ball.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Balls are fun to play with!",
      "junior": "Balls are safe toys for outdoor play."
    },
    "difficulty": 1
  },

  {
    "id": "garage-tools",
    "name": "Power Tools",
    "category": "garage",
    "image": "power-tools.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Tools are for grown-ups! They can hurt you.",
      "junior": "Power tools are dangerous machines. Only adults should use them."
    },
    "difficulty": 1
  },
  {
    "id": "garage-paint",
    "name": "Paint Cans",
    "category": "garage",
    "image": "paint-cans.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Paint can make you sick if you breathe it!",
      "junior": "Paint fumes are toxic. Only use paint in well-ventilated areas with an adult."
    },
    "difficulty": 2
  },
  {
    "id": "garage-ladder",
    "name": "Ladder",
    "category": "garage",
    "image": "ladder.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Ladders are tall and you can fall! Don't climb them.",
      "junior": "Ladders are dangerous if used without proper supervision."
    },
    "difficulty": 2
  },
  {
    "id": "garage-flashlight",
    "name": "Flashlight",
    "category": "garage",
    "image": "flashlight.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Flashlights help you see in the dark!",
      "junior": "Flashlights are safe and useful tools."
    },
    "difficulty": 1
  },
  {
    "id": "garage-nails",
    "name": "Nails",
    "category": "garage",
    "image": "nails.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Nails are sharp and pointy! Don't touch them.",
      "junior": "Nails are sharp and can cause injuries if stepped on or handled."
    },
    "difficulty": 1
  },
  {
    "id": "garage-broom",
    "name": "Broom",
    "category": "garage",
    "image": "broom.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Brooms help clean the floor!",
      "junior": "Brooms are safe cleaning tools."
    },
    "difficulty": 1
  },

  {
    "id": "playground-glass",
    "name": "Broken Glass",
    "category": "playground",
    "image": "broken-glass.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Broken glass is very sharp! Tell a grown-up.",
      "junior": "Broken glass can cut you badly. Alert an adult if you see any."
    },
    "difficulty": 1
  },
  {
    "id": "playground-slide",
    "name": "Slide",
    "category": "playground",
    "image": "slide.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Slides are fun! Go down feet first.",
      "junior": "Slides are safe when you go down feet first and wait your turn."
    },
    "difficulty": 1
  },
  {
    "id": "playground-sandbox",
    "name": "Sandbox",
    "category": "playground",
    "image": "sandbox.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Sandboxes are fun to play in!",
      "junior": "Sandboxes are safe play areas. Wash your hands after playing."
    },
    "difficulty": 1
  },
  {
    "id": "playground-rusty-nail",
    "name": "Rusty Nail",
    "category": "playground",
    "image": "rusty-nail.webp",
    "isSafe": false,
    "explanations": {
      "tiny": "Rusty nails can hurt you! Tell a grown-up right away.",
      "junior": "Rusty nails can cause tetanus infection. Never pick them up."
    },
    "difficulty": 1
  },
  {
    "id": "playground-fountain",
    "name": "Water Fountain",
    "category": "playground",
    "image": "fountain.webp",
    "isSafe": true,
    "explanations": {
      "tiny": "Water fountains give you a drink!",
      "junior": "Water fountains are safe for drinking when you're thirsty."
    },
    "difficulty": 1
  }
]
```

- [ ] **Step 2: Write the failing test for objectSelector**

Create `games/safety-scout/src/__tests__/objectSelector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { selectObjects, getCategories } from '../utils/objectSelector';
import objects from '../data/objects.json';

describe('selectObjects', () => {
  it('returns objects from a specific category', () => {
    const result = selectObjects(objects, { category: 'kitchen', difficulty: 5, count: 6 });
    for (const obj of result) {
      expect(obj.category).toBe('kitchen');
    }
  });

  it('returns objects at or below difficulty', () => {
    const result = selectObjects(objects, { category: 'kitchen', difficulty: 2, count: 6 });
    for (const obj of result) {
      expect(obj.difficulty).toBeLessThanOrEqual(2);
    }
  });

  it('returns random mix when category is null', () => {
    const result = selectObjects(objects, { category: null, difficulty: 5, count: 10 });
    const categories = new Set(result.map((o) => o.category));
    // Random mix should span multiple categories
    expect(categories.size).toBeGreaterThan(1);
  });

  it('returns requested count', () => {
    const result = selectObjects(objects, { category: null, difficulty: 5, count: 8 });
    expect(result).toHaveLength(8);
  });

  it('includes a mix of safe and harmful objects', () => {
    const result = selectObjects(objects, { category: null, difficulty: 5, count: 10 });
    const safeCount = result.filter((o) => o.isSafe).length;
    const harmfulCount = result.filter((o) => !o.isSafe).length;
    expect(safeCount).toBeGreaterThan(0);
    expect(harmfulCount).toBeGreaterThan(0);
  });

  it('shuffles the result', () => {
    const results = Array.from({ length: 5 }, () =>
      selectObjects(objects, { category: null, difficulty: 5, count: 10 }).map((o) => o.id),
    );
    const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
    expect(allSame).toBe(false);
  });
});

describe('getCategories', () => {
  it('returns all unique categories', () => {
    const categories = getCategories(objects);
    expect(categories).toContain('kitchen');
    expect(categories).toContain('bathroom');
    expect(categories).toContain('living-room');
    expect(categories).toContain('outdoor');
    expect(categories).toContain('garage');
    expect(categories).toContain('playground');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/safety-scout test`
Expected: FAIL — `selectObjects` not found.

- [ ] **Step 4: Implement objectSelector**

Create `games/safety-scout/src/utils/objectSelector.ts`:

```typescript
export interface SafetyObject {
  id: string;
  name: string;
  category: string;
  image: string;
  isSafe: boolean;
  explanations: { tiny: string; junior: string };
  difficulty: number;
}

interface SelectOptions {
  category: string | null;
  difficulty: number;
  count: number;
}

/**
 * Selects objects by category and difficulty, ensuring a mix of safe/harmful.
 * When category is null, picks from all categories (random mix mode).
 */
export function selectObjects(pool: SafetyObject[], options: SelectOptions): SafetyObject[] {
  const { category, difficulty, count } = options;

  let eligible = pool.filter((o) => o.difficulty <= difficulty);

  if (category) {
    eligible = eligible.filter((o) => o.category === category);
  }

  if (eligible.length === 0) return [];

  // Ensure a mix of safe and harmful
  const safe = eligible.filter((o) => o.isSafe);
  const harmful = eligible.filter((o) => !o.isSafe);

  // Aim for roughly even split
  const halfCount = Math.floor(count / 2);
  const safeCount = Math.min(halfCount, safe.length);
  const harmfulCount = Math.min(count - safeCount, harmful.length);
  const remaining = count - safeCount - harmfulCount;

  // Shuffle each group
  const shuffled = (arr: SafetyObject[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const selected = [
    ...shuffled(safe).slice(0, safeCount + remaining),
    ...shuffled(harmful).slice(0, harmfulCount),
  ].slice(0, count);

  // Final shuffle
  return shuffled(selected);
}

/**
 * Returns all unique category names from the object pool.
 */
export function getCategories(pool: SafetyObject[]): string[] {
  return [...new Set(pool.map((o) => o.category))];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/safety-scout test`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add games/safety-scout/src/data/ games/safety-scout/src/utils/objectSelector.ts games/safety-scout/src/__tests__/objectSelector.test.ts
git commit -m "feat(safety-scout): add object data and object selector utility"
```

---

### Task 3: useSafetyRound hook

**Files:**

- Create: `games/safety-scout/src/hooks/useSafetyRound.ts`

- [ ] **Step 1: Create the round management hook**

```typescript
import { useState, useCallback, useRef } from 'react';
import type { SafetyObject } from '../utils/objectSelector';

export type SafetyPhase = 'category-select' | 'instruction' | 'playing' | 'feedback' | 'complete';

interface UseSafetyRoundOptions {
  objects: SafetyObject[];
  onScorePoint: (points: number) => void;
}

interface SafetyRoundState {
  phase: SafetyPhase;
  currentObjectIndex: number;
  currentObject: SafetyObject;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  objectsCorrect: number;
}

interface SafetyRoundActions {
  startRound: (objects: SafetyObject[]) => void;
  dismissInstruction: () => void;
  submitAnswer: (answeredSafe: boolean) => void;
  nextObject: () => void;
}

export function useSafetyRound(
  options: UseSafetyRoundOptions,
): SafetyRoundState & SafetyRoundActions {
  const { onScorePoint } = options;

  const [roundObjects, setRoundObjects] = useState<SafetyObject[]>(options.objects);
  const [phase, setPhase] = useState<SafetyPhase>('category-select');
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const objectsCorrectRef = useRef(0);

  const maxScore = roundObjects.length;
  const currentObject = roundObjects[currentObjectIndex] ?? roundObjects[0];

  const startRound = useCallback((objects: SafetyObject[]) => {
    setRoundObjects(objects);
    setCurrentObjectIndex(0);
    setScore(0);
    setIsCorrect(null);
    objectsCorrectRef.current = 0;
    setPhase('instruction');
  }, []);

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

  const submitAnswer = useCallback(
    (answeredSafe: boolean) => {
      const correct = answeredSafe === currentObject.isSafe;
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        objectsCorrectRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [currentObject, onScorePoint],
  );

  const nextObject = useCallback(() => {
    setIsCorrect(null);

    if (currentObjectIndex >= roundObjects.length - 1) {
      setPhase('complete');
      return;
    }

    setCurrentObjectIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentObjectIndex, roundObjects.length]);

  return {
    phase,
    currentObjectIndex,
    currentObject,
    score,
    maxScore,
    isCorrect,
    objectsCorrect: objectsCorrectRef.current,
    startRound,
    dismissInstruction,
    submitAnswer,
    nextObject,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add games/safety-scout/src/hooks/useSafetyRound.ts
git commit -m "feat(safety-scout): add useSafetyRound hook for round management"
```

---

### Task 4: UI components (CategoryPicker, ObjectCard, SafetyButtons, ExplanationCard)

**Files:**

- Create: `games/safety-scout/src/components/CategoryPicker.tsx`
- Create: `games/safety-scout/src/components/CategoryPicker.module.css`
- Create: `games/safety-scout/src/components/ObjectCard.tsx`
- Create: `games/safety-scout/src/components/ObjectCard.module.css`
- Create: `games/safety-scout/src/components/SafetyButtons.tsx`
- Create: `games/safety-scout/src/components/SafetyButtons.module.css`
- Create: `games/safety-scout/src/components/ExplanationCard.tsx`
- Create: `games/safety-scout/src/components/ExplanationCard.module.css`

- [ ] **Step 1: Create CategoryPicker**

```typescript
import { useTranslation } from 'react-i18next';
import styles from './CategoryPicker.module.css';

const CATEGORY_ICONS: Record<string, string> = {
  kitchen: '🍳',
  bathroom: '🛁',
  'living-room': '🛋️',
  outdoor: '🌳',
  garage: '🔧',
  playground: '🎪',
};

interface CategoryPickerProps {
  categories: string[];
  onSelect: (category: string | null) => void;
}

export function CategoryPicker({ categories, onSelect }: CategoryPickerProps) {
  const { t } = useTranslation('safety-scout');

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>{t('pickCategory')}</h2>
      <div className={styles.grid} role="group" aria-label={t('categories')}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={styles.categoryButton}
            onClick={() => onSelect(cat)}
            aria-label={t(`category.${cat}`)}
          >
            <span className={styles.icon} aria-hidden="true">{CATEGORY_ICONS[cat] ?? '📦'}</span>
            <span className={styles.label}>{t(`category.${cat}`)}</span>
          </button>
        ))}
        <button
          className={`${styles.categoryButton} ${styles.randomButton}`}
          onClick={() => onSelect(null)}
          aria-label={t('randomMix')}
        >
          <span className={styles.icon} aria-hidden="true">🎲</span>
          <span className={styles.label}>{t('randomMix')}</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CategoryPicker.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
}

.heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
  width: 100%;
  max-width: 500px;
}

.categoryButton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border: 2px solid var(--color-border, #ccc);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-surface, #fff);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.categoryButton:hover {
  transform: scale(1.05);
  border-color: var(--color-primary, #4a90d9);
}

.categoryButton:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.randomButton {
  border-style: dashed;
}

.icon {
  font-size: 2rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}
```

- [ ] **Step 3: Create ObjectCard**

```typescript
import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import type { SafetyObject } from '../utils/objectSelector';
import styles from './ObjectCard.module.css';

interface ObjectCardProps {
  object: SafetyObject;
  ageTier: AgeTier;
  audioManager: AudioManager;
}

export function ObjectCard({ object, ageTier, audioManager }: ObjectCardProps) {
  const isTiny = ageTier === 'tiny';

  const handlePlayName = () => {
    audioManager.playVoice(`voice:object-${object.id}`);
  };

  return (
    <div className={styles.container}>
      <img
        src={`/images/safety-scout/${object.image}`}
        alt={object.name}
        className={`${styles.image} ${isTiny ? styles.imageLarge : ''}`}
        role="img"
      />
      <p className={styles.name}>{object.name}</p>
      {isTiny && (
        <button className={styles.playButton} onClick={handlePlayName} aria-label={`Hear: ${object.name}`}>
          🔊
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create ObjectCard.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.image {
  width: 140px;
  height: 140px;
  object-fit: contain;
  border-radius: var(--radius-lg, 12px);
  border: 3px solid var(--color-border, #ccc);
}

.imageLarge {
  width: 180px;
  height: 180px;
}

.name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  text-align: center;
}

.playButton {
  padding: var(--spacing-sm);
  border: 2px solid var(--color-primary, #4a90d9);
  border-radius: 50%;
  background: var(--color-primary-light, #e8f0fe);
  font-size: 1.25rem;
  cursor: pointer;
}

.playButton:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Create SafetyButtons**

```typescript
import { useTranslation } from 'react-i18next';
import styles from './SafetyButtons.module.css';

interface SafetyButtonsProps {
  onSafe: () => void;
  onHarmful: () => void;
  disabled?: boolean;
  large?: boolean;
}

export function SafetyButtons({ onSafe, onHarmful, disabled = false, large = false }: SafetyButtonsProps) {
  const { t } = useTranslation('safety-scout');

  return (
    <div className={styles.container} role="group" aria-label={t('safeOrHarmful')}>
      <button
        className={`${styles.button} ${styles.safe} ${large ? styles.large : ''}`}
        onClick={onSafe}
        disabled={disabled}
        aria-label={t('safe')}
      >
        ✅ {t('safe')}
      </button>
      <button
        className={`${styles.button} ${styles.harmful} ${large ? styles.large : ''}`}
        onClick={onHarmful}
        disabled={disabled}
        aria-label={t('harmful')}
      >
        ❌ {t('harmful')}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create SafetyButtons.module.css**

```css
.container {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
}

.button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  border: 3px solid;
  border-radius: var(--radius-lg, 12px);
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.button:hover:not(:disabled) {
  transform: scale(1.05);
}

.button:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.5;
  cursor: default;
}

.safe {
  border-color: var(--color-success, #34a853);
  background: #e6f4ea;
  color: var(--color-success, #34a853);
}

.harmful {
  border-color: var(--color-error, #ea4335);
  background: #fce8e6;
  color: var(--color-error, #ea4335);
}

.large {
  padding: var(--spacing-lg) var(--spacing-2xl, 2rem);
  font-size: 1.5rem;
  min-width: 120px;
  min-height: 64px;
}
```

- [ ] **Step 7: Create ExplanationCard**

```typescript
import type { AgeTier } from '@kids-games-zone/shared';
import styles from './ExplanationCard.module.css';

interface ExplanationCardProps {
  explanation: string;
  isCorrect: boolean;
  ageTier: AgeTier;
}

export function ExplanationCard({ explanation, isCorrect, ageTier }: ExplanationCardProps) {
  const isTiny = ageTier === 'tiny';

  return (
    <div
      className={`${styles.container} ${isCorrect ? styles.correct : styles.incorrect}`}
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">{isCorrect ? '🎉' : '💡'}</span>
      <p className={`${styles.text} ${isTiny ? styles.textLarge : ''}`}>{explanation}</p>
    </div>
  );
}
```

- [ ] **Step 8: Create ExplanationCard.module.css**

```css
.container {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md, 8px);
  width: 100%;
  max-width: 400px;
}

.correct {
  background: #e6f4ea;
  border: 2px solid var(--color-success, #34a853);
}

.incorrect {
  background: #fef7e0;
  border: 2px solid #f9ab00;
}

.icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.text {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0;
  line-height: 1.5;
}

.textLarge {
  font-size: 1.25rem;
}
```

- [ ] **Step 9: Commit**

```bash
git add games/safety-scout/src/components/
git commit -m "feat(safety-scout): add CategoryPicker, ObjectCard, SafetyButtons, ExplanationCard"
```

---

### Task 5: Locale files

**Files:**

- Create: `games/safety-scout/src/locales/en/safety-scout.json`
- Create: `games/safety-scout/src/locales/fr/safety-scout.json`

- [ ] **Step 1: Create English locale**

```json
{
  "title": "Safety Scout",
  "instruction": "Is this object safe or harmful? Tap to answer!",
  "instructionTiny": "Is this safe? Tap the green or red button!",
  "letsGo": "Let's Go!",
  "pickCategory": "Pick a Category",
  "categories": "Object categories",
  "randomMix": "Random Mix",
  "safe": "Safe",
  "harmful": "Harmful",
  "safeOrHarmful": "Is this safe or harmful?",
  "correct": "That's right!",
  "incorrect": "Not quite!",
  "nextObject": "Next",
  "objectOf": "Object {{current}} of {{total}}",
  "celebrationTitle": "Safety Expert!",
  "finalScore": "You got {{score}} of {{total}} correct!",
  "category.kitchen": "Kitchen",
  "category.bathroom": "Bathroom",
  "category.living-room": "Living Room",
  "category.outdoor": "Outdoor",
  "category.garage": "Garage",
  "category.playground": "Playground"
}
```

- [ ] **Step 2: Create French locale**

```json
{
  "title": "Scout de sécurité",
  "instruction": "Cet objet est-il sûr ou dangereux ? Appuie pour répondre !",
  "instructionTiny": "C'est sûr ? Appuie sur le bouton vert ou rouge !",
  "letsGo": "C'est parti !",
  "pickCategory": "Choisis une catégorie",
  "categories": "Catégories d'objets",
  "randomMix": "Mélange aléatoire",
  "safe": "Sûr",
  "harmful": "Dangereux",
  "safeOrHarmful": "C'est sûr ou dangereux ?",
  "correct": "C'est exact !",
  "incorrect": "Pas tout à fait !",
  "nextObject": "Suivant",
  "objectOf": "Objet {{current}} sur {{total}}",
  "celebrationTitle": "Expert en sécurité !",
  "finalScore": "Tu as obtenu {{score}} sur {{total}} correct !",
  "category.kitchen": "Cuisine",
  "category.bathroom": "Salle de bain",
  "category.living-room": "Salon",
  "category.outdoor": "Extérieur",
  "category.garage": "Garage",
  "category.playground": "Aire de jeux"
}
```

- [ ] **Step 3: Commit**

```bash
git add games/safety-scout/src/locales/
git commit -m "feat(safety-scout): add English and French locale files"
```

---

### Task 6: Main SafetyScout component and plugin export

**Files:**

- Create: `games/safety-scout/src/SafetyScout.tsx`
- Create: `games/safety-scout/src/SafetyScout.module.css`
- Create: `games/safety-scout/src/index.ts`

- [ ] **Step 1: Create SafetyScout component**

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
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { selectObjects, getCategories } from './utils/objectSelector';
import { useSafetyRound } from './hooks/useSafetyRound';
import { CategoryPicker } from './components/CategoryPicker';
import { ObjectCard } from './components/ObjectCard';
import { SafetyButtons } from './components/SafetyButtons';
import { ExplanationCard } from './components/ExplanationCard';
import allObjects from './data/objects.json';
import styles from './SafetyScout.module.css';

const OBJECTS_PER_ROUND_TINY = 6;
const OBJECTS_PER_ROUND_JUNIOR = 10;

export function SafetyScout({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('safety-scout');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const objectCount = isTiny ? OBJECTS_PER_ROUND_TINY : OBJECTS_PER_ROUND_JUNIOR;

  const categories = useMemo(() => getCategories(allObjects), []);

  const [initialObjects] = useState(() =>
    selectObjects(allObjects, { category: null, difficulty: config.difficulty, count: objectCount }),
  );

  const round = useSafetyRound({ objects: initialObjects, onScorePoint: onScore });

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      const objects = selectObjects(allObjects, { category, difficulty: config.difficulty, count: objectCount });
      round.startRound(objects);
    },
    [config.difficulty, objectCount, round],
  );

  // Audio: speak object name for tiny-tier
  useEffect(() => {
    if (round.phase === 'playing' && isTiny) {
      audioManager.playVoice(`voice:object-${round.currentObject.id}`);
    }
    if (round.phase === 'playing') {
      announce(t('objectOf', { current: round.currentObjectIndex + 1, total: round.maxScore }));
    }
  }, [round.phase, round.currentObjectIndex, round.currentObject.id, isTiny, audioManager, announce, t, round.maxScore]);

  // Audio: feedback
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

  // Tiny-tier background music
  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:game-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  // Tiny-tier: voice explanation after feedback
  useEffect(() => {
    if (round.phase === 'feedback' && isTiny) {
      const explanation = round.currentObject.explanations.tiny;
      if (explanation) {
        audioManager.playVoice(`voice:explain-${round.currentObject.id}`);
      }
    }
  }, [round.phase, isTiny, round.currentObject, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'safety-scout',
      score: round.score,
      maxScore: round.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        objectsCorrect: round.objectsCorrect,
        objectsTotal: round.maxScore,
      },
    };
    onComplete(result);
  }, [round, config.difficulty, onComplete]);

  // Category selection phase
  if (round.phase === 'category-select') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <CategoryPicker categories={categories} onSelect={handleCategorySelect} />
      </GameShell>
    );
  }

  // Instruction phase
  if (round.phase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character="🛡️" />
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
  const explanationTier = isTiny ? 'tiny' : 'junior';

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
        </div>

        <ProgressBar current={round.currentObjectIndex} total={round.maxScore} showLabel />

        <ObjectCard object={round.currentObject} ageTier={ageTier} audioManager={audioManager} />

        {!showFeedback && (
          <SafetyButtons
            onSafe={() => round.submitAnswer(true)}
            onHarmful={() => round.submitAnswer(false)}
            large={isTiny}
          />
        )}

        {showFeedback && (
          <div className={styles.feedbackArea}>
            <ExplanationCard
              explanation={round.currentObject.explanations[explanationTier]}
              isCorrect={round.isCorrect!}
              ageTier={ageTier}
            />
            <OptionButton label={t('nextObject')} state="default" onSelect={round.nextObject} size="large" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 2: Create SafetyScout.module.css**

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

.feedbackArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}
```

- [ ] **Step 3: Create index.ts plugin export**

```typescript
import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { SafetyScout } from './SafetyScout';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'safety-scout',
    name: 'Safety Scout',
    description: 'Learn which objects are safe and which are harmful!',
    thumbnail: '/images/games/safety-scout.webp',
    ageRange: [4, 8],
    skills: ['logic', 'social_skills'],
    version: '1.0.0',
    entryPoint: '../../../games/safety-scout/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 4,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['safety', 'awareness', 'household', 'critical-thinking'],
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
      gameId: 'safety-scout',
      score: _score,
      maxScore: 10,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { objectsCorrect: 0, objectsTotal: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: SafetyScout,
};

export default plugin;
```

- [ ] **Step 4: Commit**

```bash
git add games/safety-scout/src/SafetyScout.tsx games/safety-scout/src/SafetyScout.module.css games/safety-scout/src/index.ts
git commit -m "feat(safety-scout): add main SafetyScout component and plugin export"
```

---

### Task 7: Register game in platform

**Files:**

- Modify: `platform/src/config/gameRegistry.ts`
- Modify: `platform/src/config/featureFlags.json`

- [ ] **Step 1: Add manifest to game registry**

Add this entry to the `gameRegistry` array in `platform/src/config/gameRegistry.ts`:

```typescript
  {
    id: 'safety-scout',
    name: 'Safety Scout',
    description: 'Learn which objects are safe and which are harmful!',
    thumbnail: '/images/games/safety-scout.webp',
    ageRange: [4, 8],
    skills: ['logic', 'social_skills'],
    version: '1.0.0',
    entryPoint: '../../../games/safety-scout/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 4,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['safety', 'awareness', 'household', 'critical-thinking'],
  },
```

- [ ] **Step 2: Add feature flag**

Add to `platform/src/config/featureFlags.json`:

```json
  "game.safety-scout": {
    "enabled": true,
    "description": "Safety Scout game — identify safe and harmful objects"
  },
```

- [ ] **Step 3: Commit**

```bash
git add platform/src/config/gameRegistry.ts platform/src/config/featureFlags.json
git commit -m "feat(safety-scout): register game in platform registry and feature flags"
```

---

### Task 8: Main component tests

**Files:**

- Create: `games/safety-scout/src/__tests__/SafetyScout.test.tsx`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SafetyScout } from '../SafetyScout';
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

describe('SafetyScout', () => {
  it('renders game shell with title', () => {
    render(<SafetyScout {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows category picker initially', () => {
    render(<SafetyScout {...createMockProps()} />);
    expect(screen.getByText('pickCategory')).toBeTruthy();
  });

  it('shows category buttons for all categories', () => {
    render(<SafetyScout {...createMockProps()} />);
    expect(screen.getByText('category.kitchen')).toBeTruthy();
    expect(screen.getByText('category.bathroom')).toBeTruthy();
    expect(screen.getByText('randomMix')).toBeTruthy();
  });

  it('shows instruction after selecting a category', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<SafetyScout {...createTinyProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows safe/harmful buttons after starting', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText('safe')).toBeTruthy();
    expect(screen.getByText('harmful')).toBeTruthy();
  });

  it('shows progress bar during gameplay', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows explanation after answering', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    fireEvent.click(screen.getByText('safe'));
    // Should show feedback with explanation and next button
    expect(screen.getByText('nextObject')).toBeTruthy();
  });

  it('plays correct/incorrect SFX on answer', () => {
    const props = createMockProps();
    render(<SafetyScout {...props} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    fireEvent.click(screen.getByText('safe'));
    expect(props.audioManager.playSFX).toHaveBeenCalled();
  });

  it('has no accessibility violations on category screen', async () => {
    const { container } = render(<SafetyScout {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/safety-scout test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add games/safety-scout/src/__tests__/SafetyScout.test.tsx
git commit -m "test(safety-scout): add main component tests with accessibility checks"
```

---

### Task 9: Typecheck and lint

- [ ] **Step 1: Run typecheck**

Run: `cd /home/jude/code/kids && pnpm --filter @kids-games-zone/safety-scout typecheck`
Expected: No errors.

- [ ] **Step 2: Run lint**

Run: `cd /home/jude/code/kids && pnpm lint`
Expected: No new lint errors.

- [ ] **Step 3: Run full test suite**

Run: `cd /home/jude/code/kids && pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(safety-scout): resolve typecheck and lint issues"
```

(Skip this commit if no fixes were needed.)
