# Phase 1: Shared Library & Design System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared foundation (types, tokens, components, hooks) that the platform shell and all games depend on.

**Architecture:** The `shared` package (`@kids-games-zone/shared`) is a workspace library consumed by `platform` and `games/*` via pnpm workspace protocol. It exports TypeScript types, React components (CSS Modules + Framer Motion), context providers, and hooks. Components use CSS custom properties from `tokens.css` for theming (light default, dark via `[data-theme="dark"]`).

**Tech Stack:** React 19, TypeScript 5.7 (strict), Framer Motion 11, canvas-confetti, focus-trap-react, CSS Modules, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-15-phase1-shared-library-design.md`

---

## File Map

### New files

| Path                                                                     | Responsibility                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `shared/src/types/platform.ts`                                           | `TimeLimitConfig`, `FeatureFlags` types                                      |
| `shared/src/types/services.ts`                                           | `AudioManager`, `StorageManager`, `AnalyticsEvent`, `EventFilter` interfaces |
| `shared/src/types/index.ts`                                              | Barrel re-export for all type files                                          |
| `shared/src/styles/tokens.css`                                           | All CSS custom properties (light + dark themes)                              |
| `shared/src/styles/reset.css`                                            | Minimal CSS reset                                                            |
| `shared/src/styles/breakpoints.css`                                      | Breakpoint reference values                                                  |
| `shared/src/context/AgeTierContext.tsx`                                  | AgeTier context provider                                                     |
| `shared/src/context/FeatureFlagContext.tsx`                              | Feature flag context provider                                                |
| `shared/src/hooks/useGameLifecycle.ts`                                   | Game state machine hook                                                      |
| `shared/src/hooks/useGameLifecycle.test.ts`                              | Tests for lifecycle hook                                                     |
| `shared/src/hooks/useAgeTier.ts`                                         | Age tier context consumer hook                                               |
| `shared/src/hooks/useAgeTier.test.ts`                                    | Tests for age tier hook                                                      |
| `shared/src/hooks/useFeatureFlag.ts`                                     | Feature flag consumer hook                                                   |
| `shared/src/hooks/useFeatureFlag.test.ts`                                | Tests for feature flag hook                                                  |
| `shared/src/hooks/index.ts`                                              | Barrel export for hooks                                                      |
| `shared/src/components/GameShell/GameShell.tsx`                          | Game wrapper component                                                       |
| `shared/src/components/GameShell/GameShell.module.css`                   | GameShell styles                                                             |
| `shared/src/components/GameShell/GameShell.test.tsx`                     | GameShell tests                                                              |
| `shared/src/components/OptionButton/OptionButton.tsx`                    | Answer/choice button                                                         |
| `shared/src/components/OptionButton/OptionButton.module.css`             | OptionButton styles                                                          |
| `shared/src/components/OptionButton/OptionButton.test.tsx`               | OptionButton tests                                                           |
| `shared/src/components/ScoreDisplay/ScoreDisplay.tsx`                    | Animated score counter                                                       |
| `shared/src/components/ScoreDisplay/ScoreDisplay.module.css`             | ScoreDisplay styles                                                          |
| `shared/src/components/ScoreDisplay/ScoreDisplay.test.tsx`               | ScoreDisplay tests                                                           |
| `shared/src/components/ProgressBar/ProgressBar.tsx`                      | Progress indicator                                                           |
| `shared/src/components/ProgressBar/ProgressBar.module.css`               | ProgressBar styles                                                           |
| `shared/src/components/ProgressBar/ProgressBar.test.tsx`                 | ProgressBar tests                                                            |
| `shared/src/components/CelebrationOverlay/CelebrationOverlay.tsx`        | Celebration with confetti                                                    |
| `shared/src/components/CelebrationOverlay/CelebrationOverlay.module.css` | CelebrationOverlay styles                                                    |
| `shared/src/components/CelebrationOverlay/CelebrationOverlay.test.tsx`   | CelebrationOverlay tests                                                     |
| `shared/src/components/GameTimer/GameTimer.tsx`                          | SVG ring timer                                                               |
| `shared/src/components/GameTimer/GameTimer.module.css`                   | GameTimer styles                                                             |
| `shared/src/components/GameTimer/GameTimer.test.tsx`                     | GameTimer tests                                                              |
| `shared/src/components/DifficultySelector/DifficultySelector.tsx`        | Star-based picker                                                            |
| `shared/src/components/DifficultySelector/DifficultySelector.module.css` | DifficultySelector styles                                                    |
| `shared/src/components/DifficultySelector/DifficultySelector.test.tsx`   | DifficultySelector tests                                                     |
| `shared/src/components/InstructionBubble/InstructionBubble.tsx`          | Speech bubble                                                                |
| `shared/src/components/InstructionBubble/InstructionBubble.module.css`   | InstructionBubble styles                                                     |
| `shared/src/components/InstructionBubble/InstructionBubble.test.tsx`     | InstructionBubble tests                                                      |
| `shared/src/components/PauseMenu/PauseMenu.tsx`                          | Pause modal                                                                  |
| `shared/src/components/PauseMenu/PauseMenu.module.css`                   | PauseMenu styles                                                             |
| `shared/src/components/PauseMenu/PauseMenu.test.tsx`                     | PauseMenu tests                                                              |
| `shared/src/components/index.ts`                                         | Barrel export for all components                                             |
| `shared/vitest.config.ts`                                                | Vitest config for shared package                                             |
| `shared/src/test-setup.ts`                                               | Testing library setup (jest-dom matchers)                                    |

### Modified files

| Path                             | Change                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `shared/src/types/game.ts`       | Add `GameSettings`, update `GameConfig.settings`, add `audioManager`/`storageManager` to `GameProps`                  |
| `shared/src/index.ts`            | Replace direct type imports with barrel re-exports; add component, hook, context exports                              |
| `shared/package.json`            | Add `canvas-confetti`, `focus-trap-react` deps; add `framer-motion` peer dep                                          |
| `shared/tsconfig.json`           | Add `"jsx": "react-jsx"` for component compilation                                                                    |
| `platform/src/styles/global.css` | Replace inline tokens with `@import` from shared; keep app-specific styles                                            |
| `package.json` (root)            | Add `framer-motion`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@types/canvas-confetti` devDeps |

---

## Chunk 1: Foundation (Tasks 1-3)

Dependencies, types, tokens, test infrastructure. Everything else builds on this.

### Task 1: Install dependencies and configure test infrastructure

**Files:**

- Modify: `package.json` (root)
- Modify: `shared/package.json`
- Modify: `shared/tsconfig.json`
- Create: `shared/vitest.config.ts`
- Create: `shared/src/test-setup.ts`

- [ ] **Step 1: Add dependencies to root package.json**

Add to `devDependencies` in `/home/jude/code/kids/package.json`:

```json
"framer-motion": "^11.0.0",
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0",
"@types/canvas-confetti": "^1.6.0",
"jsdom": "^25.0.0"
```

- [ ] **Step 2: Add dependencies to shared package.json**

Update `/home/jude/code/kids/shared/package.json` to add:

```json
{
  "dependencies": {
    "canvas-confetti": "^1.9.0",
    "focus-trap-react": "^10.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.0.0"
  }
}
```

Keep existing `peerDependencies` for react/react-dom, just add framer-motion.

- [ ] **Step 3: Update shared tsconfig.json to support JSX**

Add `"jsx": "react-jsx"` to `compilerOptions` in `/home/jude/code/kids/shared/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create Vitest config for shared package**

Create `/home/jude/code/kids/shared/vitest.config.ts`:

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
      '@shared': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: Create test setup file**

Create `/home/jude/code/kids/shared/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Install and verify**

Run: `cd /home/jude/code/kids && pnpm install`
Expected: Clean install with no errors.

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: Pass (no tests yet, `passWithNoTests` is configured).

- [ ] **Step 7: Commit**

```bash
git add package.json shared/package.json shared/tsconfig.json shared/vitest.config.ts shared/src/test-setup.ts pnpm-lock.yaml
git commit -m "feat: add Phase 1 dependencies and test infrastructure

Add framer-motion, canvas-confetti, focus-trap-react, testing-library.
Configure Vitest with jsdom for shared component tests."
```

---

### Task 2: Add remaining types and update existing types

**Files:**

- Modify: `shared/src/types/game.ts`
- Create: `shared/src/types/platform.ts`
- Create: `shared/src/types/services.ts`
- Create: `shared/src/types/index.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Update game.ts — add GameSettings, update GameConfig and GameProps**

In `/home/jude/code/kids/shared/src/types/game.ts`:

Add the import for service types at the top (after existing imports):

```typescript
import type { AudioManager, StorageManager } from './services';
```

Add `GameSettings` interface before `GameConfig`:

```typescript
export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  language: string;
  highContrastMode: boolean;
}
```

Change `GameConfig.settings` from `Record<string, unknown>` to `GameSettings`:

```typescript
export interface GameConfig {
  difficulty: number;
  profile: UserProfile;
  settings: GameSettings;
}
```

Add `audioManager` and `storageManager` to `GameProps`:

```typescript
export interface GameProps {
  config: GameConfig;
  onScore: (points: number) => void;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  audioManager: AudioManager;
  storageManager: StorageManager;
}
```

- [ ] **Step 2: Create platform.ts**

Create `/home/jude/code/kids/shared/src/types/platform.ts`:

```typescript
import type { AgeTier } from './game';

export interface TimeLimitConfig {
  enabled: boolean;
  dailyLimitMinutes: number;
  sessionLimitMinutes: number;
  reminderBeforeEndMinutes: number;
  cooldownMinutes: number;
  schedule?: {
    allowedDays: number[];
    allowedStartHour: number;
    allowedEndHour: number;
  };
}

export interface FeatureFlags {
  [flagName: string]: {
    enabled: boolean;
    rolloutPercentage?: number;
    ageTiers?: AgeTier[];
    description: string;
  };
}
```

- [ ] **Step 3: Create services.ts**

Create `/home/jude/code/kids/shared/src/types/services.ts`:

```typescript
import type { UserProfile, GameProgress, Reward } from './user';

export interface AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void;
  stopMusic(options?: { fadeOut?: number }): void;
  playSFX(sfxId: string): void;
  playVoice(voiceId: string, onComplete?: () => void): void;
  setVolume(category: 'music' | 'sfx' | 'voice', level: number): void;
  mute(category?: 'music' | 'sfx' | 'voice'): void;
  unmute(category?: 'music' | 'sfx' | 'voice'): void;
  preload(assetIds: string[]): Promise<void>;
}

export interface StorageManager {
  saveProfile(profile: UserProfile): Promise<void>;
  loadProfile(profileId: string): Promise<UserProfile | null>;
  listProfiles(): Promise<UserProfile[]>;
  saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void>;
  loadProgress(profileId: string, gameId: string): Promise<GameProgress | null>;
  saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void>;
  loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null>;
  deleteProfile(profileId: string): Promise<void>;
  unlockReward(profileId: string, reward: Reward): Promise<void>;
  getRewards(profileId: string): Promise<Reward[]>;
  logEvent(event: AnalyticsEvent): Promise<void>;
  getEvents(filter: EventFilter): Promise<AnalyticsEvent[]>;
}

export interface AnalyticsEvent {
  id: string;
  type:
    | 'game_start'
    | 'game_end'
    | 'level_complete'
    | 'reward_unlocked'
    | 'game_error'
    | 'error'
    | 'navigation';
  profileId: string;
  gameId?: string;
  timestamp: string;
  data: Record<string, string | number | boolean>;
}

export interface EventFilter {
  profileId?: string;
  gameId?: string;
  type?: AnalyticsEvent['type'];
  startDate?: string;
  endDate?: string;
}
```

- [ ] **Step 4: Create types barrel**

Create `/home/jude/code/kids/shared/src/types/index.ts`:

```typescript
export type {
  GameManifest,
  GamePlugin,
  GameConfig,
  GameSettings,
  GameProps,
  GameResult,
  SkillCategory,
  AgeTier,
} from './game';

export type { UserProfile, GameProgress, Reward, RewardType, RewardCriteria } from './user';

export type { TimeLimitConfig, FeatureFlags } from './platform';

export type { AudioManager, StorageManager, AnalyticsEvent, EventFilter } from './services';
```

- [ ] **Step 5: Update root barrel**

Replace the contents of `/home/jude/code/kids/shared/src/index.ts`:

```typescript
// Types
export type {
  GameManifest,
  GamePlugin,
  GameConfig,
  GameSettings,
  GameProps,
  GameResult,
  SkillCategory,
  AgeTier,
  UserProfile,
  GameProgress,
  Reward,
  RewardType,
  RewardCriteria,
  TimeLimitConfig,
  FeatureFlags,
  AudioManager,
  StorageManager,
  AnalyticsEvent,
  EventFilter,
} from './types';
```

- [ ] **Step 6: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: All packages pass with zero errors.

- [ ] **Step 7: Commit**

```bash
git add shared/src/types/ shared/src/index.ts
git commit -m "feat: add remaining shared types (services, platform, GameSettings)

Add AudioManager, StorageManager, AnalyticsEvent, TimeLimitConfig,
FeatureFlags interfaces. Update GameProps with service deps and
GameConfig with typed GameSettings."
```

---

### Task 3: Create design tokens, reset, and breakpoints

**Files:**

- Create: `shared/src/styles/tokens.css`
- Create: `shared/src/styles/reset.css`
- Create: `shared/src/styles/breakpoints.css`
- Modify: `platform/src/styles/global.css`

- [ ] **Step 1: Create tokens.css**

Create `/home/jude/code/kids/shared/src/styles/tokens.css`:

```css
/* ============================================================
   Design Tokens — Kids Games Zone
   Single source of truth for all visual design values.
   Light mode is the default; dark mode via [data-theme="dark"].
   ============================================================ */

:root {
  /* --- Brand colors --- */
  --color-primary: #4a90d9;
  --color-secondary: #ff8c42;
  --color-success: #4caf50;
  --color-error: #e57373;
  --color-bg-primary: #fff8f0;
  --color-bg-secondary: #f0f4ff;

  /* --- Semantic surface tokens (light) --- */
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --color-text-primary: #333333;
  --color-text-secondary: #666666;
  --color-border: #e0d5c8;
  --color-overlay: rgba(0, 0, 0, 0.5);

  /* --- Border radii --- */
  --radius-small: 8px;
  --radius-medium: 16px;
  --radius-large: 24px;
  --radius-round: 50%;

  /* --- Spacing scale --- */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* --- Typography --- */
  --font-family-display: 'Baloo 2', cursive;
  --font-family-body: 'Nunito', sans-serif;

  /* --- Transitions --- */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;

  /* --- Shadows --- */
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-button: 0 2px 8px rgba(0, 0, 0, 0.12);

  /* --- Age-tier defaults (junior) --- */
  --touch-target-size: 48px;
  --font-size-base: 18px;
}

/* --- Dark theme overrides --- */
[data-theme='dark'] {
  --color-bg-primary: #1a1a2e;
  --color-bg-secondary: #16213e;
  --color-surface: #2a2a4a;
  --color-surface-raised: #333360;
  --color-text-primary: #eeeeee;
  --color-text-secondary: #aaaaaa;
  --color-border: #2a2a4a;
  --color-overlay: rgba(0, 0, 0, 0.7);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-button: 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* --- Age-tier overrides --- */
[data-age-tier='tiny'] {
  --touch-target-size: 64px;
  --font-size-base: 24px;
}

[data-age-tier='junior'] {
  --touch-target-size: 48px;
  --font-size-base: 18px;
}

[data-age-tier='explorer'] {
  --touch-target-size: 48px;
  --font-size-base: 16px;
}
```

- [ ] **Step 2: Create reset.css**

Create `/home/jude/code/kids/shared/src/styles/reset.css`:

```css
/* ============================================================
   Minimal CSS Reset
   Normalization only — no opinions.
   ============================================================ */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
  border: none;
  background: none;
}

ul,
ol {
  list-style: none;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 3: Create breakpoints.css**

Create `/home/jude/code/kids/shared/src/styles/breakpoints.css`:

```css
/* ============================================================
   Breakpoint Reference
   These values are documented here for consistency.
   Use hardcoded @media queries in component CSS Modules:
     @media (min-width: 768px) { ... }
   Native @custom-media is not supported without PostCSS.
   ============================================================ */

:root {
  --bp-mobile: 320px;
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
  --bp-large: 1440px;
}

/*
  Standard breakpoint queries for reference:
  Mobile:  @media (min-width: 320px)  — small phones
  Tablet:  @media (min-width: 768px)  — tablets (primary target)
  Desktop: @media (min-width: 1024px) — desktop/laptop
  Large:   @media (min-width: 1440px) — large screens
*/
```

- [ ] **Step 4: Update platform global.css**

Replace `/home/jude/code/kids/platform/src/styles/global.css` with:

```css
@import '../../../shared/src/styles/reset.css';
@import '../../../shared/src/styles/tokens.css';

body {
  font-family: var(--font-family-body);
  font-size: var(--font-size-base);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-lg);
}

.app-header h1 {
  font-family: var(--font-family-display);
  font-size: 3rem;
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.app-header p {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.app-main {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 5: Verify the platform still builds**

Run: `pnpm build`
Expected: Successful build with no errors.

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add shared/src/styles/ platform/src/styles/global.css
git commit -m "feat: add design tokens, CSS reset, and breakpoints

Extract tokens from platform global.css to shared/src/styles/tokens.css.
Add light/dark theme support and age-tier token overrides.
Platform global.css now imports from shared."
```

---

## Chunk 2: Context Providers and Hooks (Tasks 4-5)

### Task 4: Create context providers

**Files:**

- Create: `shared/src/context/AgeTierContext.tsx`
- Create: `shared/src/context/FeatureFlagContext.tsx`

- [ ] **Step 1: Create AgeTierContext**

Create `/home/jude/code/kids/shared/src/context/AgeTierContext.tsx`:

```tsx
import { createContext, type ReactNode } from 'react';
import type { AgeTier } from '../types';

export const AgeTierContext = createContext<AgeTier>('junior');

interface AgeTierProviderProps {
  tier: AgeTier;
  children: ReactNode;
}

export function AgeTierProvider({ tier, children }: AgeTierProviderProps) {
  return <AgeTierContext.Provider value={tier}>{children}</AgeTierContext.Provider>;
}
```

- [ ] **Step 2: Create FeatureFlagContext**

Create `/home/jude/code/kids/shared/src/context/FeatureFlagContext.tsx`:

```tsx
import { createContext, type ReactNode } from 'react';
import type { FeatureFlags } from '../types';

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  profileId: string | null;
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  profileId: null,
});

interface FeatureFlagProviderProps {
  flags: FeatureFlags;
  profileId?: string | null;
  children: ReactNode;
}

export function FeatureFlagProvider({
  flags,
  profileId = null,
  children,
}: FeatureFlagProviderProps) {
  return (
    <FeatureFlagContext.Provider value={{ flags, profileId }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add shared/src/context/
git commit -m "feat: add AgeTier and FeatureFlag context providers"
```

---

### Task 5: Create hooks with tests (TDD)

**Files:**

- Create: `shared/src/hooks/useAgeTier.ts`
- Create: `shared/src/hooks/useAgeTier.test.ts`
- Create: `shared/src/hooks/useFeatureFlag.ts`
- Create: `shared/src/hooks/useFeatureFlag.test.ts`
- Create: `shared/src/hooks/useGameLifecycle.ts`
- Create: `shared/src/hooks/useGameLifecycle.test.ts`
- Create: `shared/src/hooks/index.ts`

#### useAgeTier

- [ ] **Step 1: Write failing test for useAgeTier**

Create `/home/jude/code/kids/shared/src/hooks/useAgeTier.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { AgeTierProvider } from '../context/AgeTierContext';
import { useAgeTier } from './useAgeTier';

function wrapper(tier: 'tiny' | 'junior' | 'explorer') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AgeTierProvider tier={tier}>{children}</AgeTierProvider>;
  };
}

describe('useAgeTier', () => {
  it('returns the age tier from context', () => {
    const { result } = renderHook(() => useAgeTier(), {
      wrapper: wrapper('tiny'),
    });
    expect(result.current).toBe('tiny');
  });

  it('defaults to junior when no provider', () => {
    const { result } = renderHook(() => useAgeTier());
    expect(result.current).toBe('junior');
  });

  it('returns explorer when set', () => {
    const { result } = renderHook(() => useAgeTier(), {
      wrapper: wrapper('explorer'),
    });
    expect(result.current).toBe('explorer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL — `useAgeTier` module not found.

- [ ] **Step 3: Implement useAgeTier**

Create `/home/jude/code/kids/shared/src/hooks/useAgeTier.ts`:

```typescript
import { useContext } from 'react';
import { AgeTierContext } from '../context/AgeTierContext';
import type { AgeTier } from '../types';

export function useAgeTier(): AgeTier {
  return useContext(AgeTierContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: 3 tests PASS.

#### useFeatureFlag

- [ ] **Step 5: Write failing test for useFeatureFlag**

Create `/home/jude/code/kids/shared/src/hooks/useFeatureFlag.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { FeatureFlagProvider } from '../context/FeatureFlagContext';
import { AgeTierProvider } from '../context/AgeTierContext';
import { useFeatureFlag } from './useFeatureFlag';
import type { FeatureFlags } from '../types';

const testFlags: FeatureFlags = {
  'new-game': {
    enabled: true,
    description: 'A new game',
  },
  'disabled-feature': {
    enabled: false,
    description: 'Not yet',
  },
  'tier-restricted': {
    enabled: true,
    ageTiers: ['junior', 'explorer'],
    description: 'Not for tiny',
  },
  'rollout-feature': {
    enabled: true,
    rolloutPercentage: 50,
    description: 'Gradual rollout',
  },
};

function wrapper(
  flags: FeatureFlags,
  profileId: string | null = null,
  tier: 'tiny' | 'junior' | 'explorer' = 'junior',
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AgeTierProvider tier={tier}>
        <FeatureFlagProvider flags={flags} profileId={profileId}>
          {children}
        </FeatureFlagProvider>
      </AgeTierProvider>
    );
  };
}

describe('useFeatureFlag', () => {
  it('returns enabled for a known enabled flag', () => {
    const { result } = renderHook(() => useFeatureFlag('new-game'), {
      wrapper: wrapper(testFlags),
    });
    expect(result.current.enabled).toBe(true);
    expect(result.current.config).toBeDefined();
  });

  it('returns disabled for a known disabled flag', () => {
    const { result } = renderHook(() => useFeatureFlag('disabled-feature'), {
      wrapper: wrapper(testFlags),
    });
    expect(result.current.enabled).toBe(false);
  });

  it('returns disabled for an unknown flag', () => {
    const { result } = renderHook(() => useFeatureFlag('nonexistent'), {
      wrapper: wrapper(testFlags),
    });
    expect(result.current.enabled).toBe(false);
    expect(result.current.config).toBeUndefined();
  });

  it('respects ageTier filtering — blocks tiny for tier-restricted flag', () => {
    const { result } = renderHook(() => useFeatureFlag('tier-restricted'), {
      wrapper: wrapper(testFlags, null, 'tiny'),
    });
    expect(result.current.enabled).toBe(false);
  });

  it('respects ageTier filtering — allows junior for tier-restricted flag', () => {
    const { result } = renderHook(() => useFeatureFlag('tier-restricted'), {
      wrapper: wrapper(testFlags, null, 'junior'),
    });
    expect(result.current.enabled).toBe(true);
  });

  it('rollout percentage is stable for same profile ID', () => {
    const result1 = renderHook(() => useFeatureFlag('rollout-feature'), {
      wrapper: wrapper(testFlags, 'profile-abc'),
    });
    const result2 = renderHook(() => useFeatureFlag('rollout-feature'), {
      wrapper: wrapper(testFlags, 'profile-abc'),
    });
    expect(result1.result.current.enabled).toBe(
      result2.result.current.enabled,
    );
  });

  it('rollout returns enabled:true when no profileId and rolloutPercentage set', () => {
    const { result } = renderHook(() => useFeatureFlag('rollout-feature'), {
      wrapper: wrapper(testFlags, null),
    });
    // Without a profile ID, rollout flags should default to enabled
    expect(result.current.enabled).toBe(true);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL — `useFeatureFlag` module not found.

- [ ] **Step 7: Implement useFeatureFlag**

Create `/home/jude/code/kids/shared/src/hooks/useFeatureFlag.ts`:

```typescript
import { useContext } from 'react';
import { FeatureFlagContext } from '../context/FeatureFlagContext';
import { AgeTierContext } from '../context/AgeTierContext';
import type { FeatureFlags } from '../types';

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

interface UseFeatureFlagResult {
  enabled: boolean;
  config: FeatureFlags[string] | undefined;
}

export function useFeatureFlag(name: string): UseFeatureFlagResult {
  const { flags, profileId } = useContext(FeatureFlagContext);
  const ageTier = useContext(AgeTierContext);

  const config = flags[name];

  if (!config || !config.enabled) {
    return { enabled: false, config };
  }

  // Check age tier restriction
  if (config.ageTiers && !config.ageTiers.includes(ageTier)) {
    return { enabled: false, config };
  }

  // Check rollout percentage
  if (config.rolloutPercentage !== undefined && profileId) {
    const hash = hashStringToNumber(`${profileId}:${name}`);
    const bucket = hash % 100;
    if (bucket >= config.rolloutPercentage) {
      return { enabled: false, config };
    }
  }

  return { enabled: true, config };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All useFeatureFlag tests PASS.

#### useGameLifecycle

- [ ] **Step 9: Write failing test for useGameLifecycle**

Create `/home/jude/code/kids/shared/src/hooks/useGameLifecycle.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameLifecycle } from './useGameLifecycle';
import type { GamePlugin, GameConfig, GameResult } from '../types';

function createMockPlugin(overrides?: Partial<GamePlugin>): GamePlugin {
  return {
    manifest: {
      id: 'test-game',
      name: 'Test',
      description: 'A test game',
      thumbnail: '/test.png',
      ageRange: [3, 12],
      skills: ['memory'],
      version: '1.0.0',
      entryPoint: '/games/test',
      minDifficulty: 1,
      maxDifficulty: 5,
      estimatedPlayTime: 5,
      offlineCapable: true,
      status: 'active',
      releaseDate: '2026-01-01',
      tags: [],
    },
    onLoad: vi.fn().mockResolvedValue(undefined),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onEnd: vi.fn().mockReturnValue({
      gameId: 'test-game',
      score: 100,
      maxScore: 100,
      timeSpent: 60,
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: {},
    } satisfies GameResult),
    onUnload: vi.fn(),
    GameComponent: () => null,
    ...overrides,
  };
}

const mockConfig: GameConfig = {
  difficulty: 1,
  profile: {
    id: 'p1',
    name: 'Test Kid',
    avatar: 'owl',
    age: 6,
    ageTier: 'junior',
    createdAt: '2026-01-01',
    parentPin: 'hashed',
    preferences: {
      musicVolume: 0.5,
      sfxVolume: 0.7,
      voiceVolume: 1,
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
};

describe('useGameLifecycle', () => {
  it('starts in IDLE state', () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    expect(result.current.state).toBe('IDLE');
  });

  it('transitions IDLE → LOADED on load()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });

    expect(plugin.onLoad).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('LOADED');
  });

  it('transitions LOADED → PLAYING on start()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });

    expect(plugin.onStart).toHaveBeenCalledWith(mockConfig);
    expect(result.current.state).toBe('PLAYING');
  });

  it('transitions PLAYING → PAUSED on pause()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.pause();
    });

    expect(plugin.onPause).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('PAUSED');
  });

  it('transitions PAUSED → PLAYING on resume()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.pause();
    });
    act(() => {
      result.current.resume();
    });

    expect(plugin.onResume).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('PLAYING');
  });

  it('transitions PLAYING → COMPLETED on end() and returns GameResult', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });

    let gameResult: GameResult | undefined;
    act(() => {
      gameResult = result.current.end();
    });

    expect(plugin.onEnd).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('COMPLETED');
    expect(gameResult?.score).toBe(100);
  });

  it('allows end() from PAUSED state', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.pause();
    });

    let gameResult: GameResult | undefined;
    act(() => {
      gameResult = result.current.end();
    });

    expect(result.current.state).toBe('COMPLETED');
    expect(gameResult?.score).toBe(100);
  });

  it('transitions COMPLETED → IDLE on reset()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.end();
    });
    act(() => {
      result.current.reset();
    });

    expect(plugin.onUnload).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('IDLE');
  });

  it('ignores invalid transitions (pause when IDLE)', () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    act(() => {
      result.current.pause();
    });

    expect(plugin.onPause).not.toHaveBeenCalled();
    expect(result.current.state).toBe('IDLE');
  });

  it('ignores start when not LOADED', () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));

    act(() => {
      result.current.start(mockConfig);
    });

    expect(plugin.onStart).not.toHaveBeenCalled();
    expect(result.current.state).toBe('IDLE');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL — `useGameLifecycle` module not found.

- [ ] **Step 11: Implement useGameLifecycle**

Create `/home/jude/code/kids/shared/src/hooks/useGameLifecycle.ts`:

```typescript
import { useCallback, useRef, useState } from 'react';
import type { GameConfig, GamePlugin, GameResult } from '../types';

type GameState = 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED' | 'COMPLETED';

interface GameLifecycle {
  state: GameState;
  load: () => Promise<void>;
  start: (config: GameConfig) => void;
  pause: () => void;
  resume: () => void;
  end: () => GameResult | undefined;
  reset: () => void;
}

export function useGameLifecycle(plugin: GamePlugin): GameLifecycle {
  const [state, setState] = useState<GameState>('IDLE');
  const stateRef = useRef<GameState>('IDLE');

  const setGameState = useCallback((newState: GameState) => {
    stateRef.current = newState;
    setState(newState);
  }, []);

  const load = useCallback(async () => {
    if (stateRef.current !== 'IDLE') return;
    await plugin.onLoad();
    setGameState('LOADED');
  }, [plugin, setGameState]);

  const start = useCallback(
    (config: GameConfig) => {
      if (stateRef.current !== 'LOADED') return;
      plugin.onStart(config);
      setGameState('PLAYING');
    },
    [plugin, setGameState],
  );

  const pause = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    plugin.onPause();
    setGameState('PAUSED');
  }, [plugin, setGameState]);

  const resume = useCallback(() => {
    if (stateRef.current !== 'PAUSED') return;
    plugin.onResume();
    setGameState('PLAYING');
  }, [plugin, setGameState]);

  const end = useCallback(() => {
    if (stateRef.current !== 'PLAYING' && stateRef.current !== 'PAUSED') return undefined;
    const result = plugin.onEnd();
    setGameState('COMPLETED');
    return result;
  }, [plugin, setGameState]);

  const reset = useCallback(() => {
    if (stateRef.current !== 'COMPLETED') return;
    plugin.onUnload();
    setGameState('IDLE');
  }, [plugin, setGameState]);

  return { state, load, start, pause, resume, end, reset };
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All tests PASS.

- [ ] **Step 13: Create hooks barrel export**

Create `/home/jude/code/kids/shared/src/hooks/index.ts`:

```typescript
export { useAgeTier } from './useAgeTier';
export { useFeatureFlag } from './useFeatureFlag';
export { useGameLifecycle } from './useGameLifecycle';
```

- [ ] **Step 14: Update root barrel with hooks and context exports**

Update `/home/jude/code/kids/shared/src/index.ts` — append after the type exports:

```typescript
// Context providers
export { AgeTierProvider, AgeTierContext } from './context/AgeTierContext';
export { FeatureFlagProvider, FeatureFlagContext } from './context/FeatureFlagContext';

// Hooks
export { useAgeTier } from './hooks/useAgeTier';
export { useFeatureFlag } from './hooks/useFeatureFlag';
export { useGameLifecycle } from './hooks/useGameLifecycle';
```

- [ ] **Step 15: Verify all tests and typecheck**

Run: `pnpm test`
Expected: All tests PASS across all packages.

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 16: Commit**

```bash
git add shared/src/hooks/ shared/src/index.ts
git commit -m "feat: add useAgeTier, useFeatureFlag, useGameLifecycle hooks

TDD implementation with full test coverage. Hooks read from context
providers and manage game state machine lifecycle."
```

---

## Chunk 3: P0 Components — GameShell, OptionButton, ScoreDisplay (Tasks 6-8)

### Task 6: GameShell component

**Files:**

- Create: `shared/src/components/GameShell/GameShell.tsx`
- Create: `shared/src/components/GameShell/GameShell.module.css`
- Create: `shared/src/components/GameShell/GameShell.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/GameShell/GameShell.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { GameShell } from './GameShell';

describe('GameShell', () => {
  it('renders the title', () => {
    render(<GameShell title="Word Puzzle">content</GameShell>);
    expect(screen.getByText('Word Puzzle')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<GameShell title="Test">Game content here</GameShell>);
    expect(screen.getByText('Game content here')).toBeInTheDocument();
  });

  it('fires onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('fires onPause when pause button is clicked', () => {
    const onPause = vi.fn();
    render(
      <GameShell title="Test" onPause={onPause}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('Pause game'));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('hides pause button when showPauseButton is false', () => {
    render(
      <GameShell title="Test" showPauseButton={false}>
        content
      </GameShell>,
    );
    expect(screen.queryByLabelText('Pause game')).not.toBeInTheDocument();
  });

  it('fires onPause on Escape key', () => {
    const onPause = vi.fn();
    render(
      <GameShell title="Test" onPause={onPause}>
        content
      </GameShell>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onPause).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL — `GameShell` module not found.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/GameShell/GameShell.module.css`:

```css
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.backButton,
.pauseButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-target-size);
  min-height: var(--touch-target-size);
  color: #ffffff;
  border-radius: var(--radius-small);
  transition: opacity var(--transition-fast);
}

.backButton:hover,
.pauseButton:hover {
  opacity: 0.8;
}

.title {
  font-family: var(--font-family-display);
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
  flex: 1;
}

.placeholder {
  min-width: var(--touch-target-size);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 4: Implement GameShell**

Create `/home/jude/code/kids/shared/src/components/GameShell/GameShell.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
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
    <div className={styles.shell}>
      <header className={styles.header}>
        {onBack ? (
          <button className={styles.backButton} onClick={onBack} aria-label="Go back">
            ← Back
          </button>
        ) : (
          <div className={styles.placeholder} />
        )}

        <h1 className={styles.title}>{title}</h1>

        {showPauseButton && onPause ? (
          <button className={styles.pauseButton} onClick={onPause} aria-label="Pause game">
            ⏸
          </button>
        ) : (
          <div className={styles.placeholder} />
        )}
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All GameShell tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/GameShell/
git commit -m "feat: add GameShell component with tests

Wrapper with sticky header (back, title, pause), Escape key support,
age-tier-aware touch targets via CSS custom properties."
```

---

### Task 7: OptionButton component

**Files:**

- Create: `shared/src/components/OptionButton/OptionButton.tsx`
- Create: `shared/src/components/OptionButton/OptionButton.module.css`
- Create: `shared/src/components/OptionButton/OptionButton.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/OptionButton/OptionButton.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionButton } from './OptionButton';

describe('OptionButton', () => {
  it('renders the label', () => {
    render(<OptionButton label="Cat" />);
    expect(screen.getByText('Cat')).toBeInTheDocument();
  });

  it('fires onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<OptionButton label="Cat" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('does not fire onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<OptionButton label="Cat" onSelect={onSelect} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows checkmark icon in correct state', () => {
    render(<OptionButton label="Dog" state="correct" />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows X icon in incorrect state', () => {
    render(<OptionButton label="Fish" state="incorrect" />);
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('has aria-disabled when disabled', () => {
    render(<OptionButton label="Cat" disabled />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('has role="button"', () => {
    render(<OptionButton label="Cat" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL — `OptionButton` module not found.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/OptionButton/OptionButton.module.css`:

```css
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  width: 100%;
  min-height: var(--touch-target-size);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-medium);
  color: var(--color-text-primary);
  font-family: var(--font-family-body);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: border-color var(--transition-fast);
  box-shadow: var(--shadow-button);
}

.button:hover:not(.disabled) {
  border-color: var(--color-primary);
}

.button.large {
  min-height: 64px;
  font-size: 1.25em;
}

.button.correct {
  background-color: color-mix(in srgb, var(--color-success) 12%, var(--color-surface));
  border-color: var(--color-success);
  color: var(--color-success);
}

.button.incorrect {
  background-color: color-mix(in srgb, var(--color-error) 12%, var(--color-surface));
  border-color: var(--color-error);
  color: var(--color-error);
}

.button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stateIcon {
  font-weight: bold;
  font-size: 1.2em;
}
```

- [ ] **Step 4: Implement OptionButton**

Create `/home/jude/code/kids/shared/src/components/OptionButton/OptionButton.tsx`:

```tsx
import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './OptionButton.module.css';

interface OptionButtonProps {
  label: string;
  icon?: ReactNode;
  state?: 'default' | 'correct' | 'incorrect';
  disabled?: boolean;
  onSelect?: () => void;
  size?: 'normal' | 'large';
}

export function OptionButton({
  label,
  icon,
  state = 'default',
  disabled = false,
  onSelect,
  size = 'normal',
}: OptionButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const classNames = [
    styles.button,
    state !== 'default' ? styles[state] : '',
    size === 'large' ? styles.large : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (!disabled && onSelect) {
      onSelect();
    }
  }

  return (
    <motion.button
      className={classNames}
      onClick={handleClick}
      aria-disabled={disabled}
      whileTap={!disabled && !shouldReduceMotion ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {state === 'correct' && <span className={styles.stateIcon}>✓</span>}
      {state === 'incorrect' && <span className={styles.stateIcon}>✗</span>}
      {icon}
      {label}
    </motion.button>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All OptionButton tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/OptionButton/
git commit -m "feat: add OptionButton component with tests

Three visual states (default/correct/incorrect), press animation
via Framer Motion, prefers-reduced-motion support, ARIA attributes."
```

---

### Task 8: ScoreDisplay component

**Files:**

- Create: `shared/src/components/ScoreDisplay/ScoreDisplay.tsx`
- Create: `shared/src/components/ScoreDisplay/ScoreDisplay.module.css`
- Create: `shared/src/components/ScoreDisplay/ScoreDisplay.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/ScoreDisplay/ScoreDisplay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ScoreDisplay } from './ScoreDisplay';

describe('ScoreDisplay', () => {
  it('renders the score', () => {
    render(<ScoreDisplay score={850} />);
    expect(screen.getByText('850')).toBeInTheDocument();
  });

  it('renders stars when showStars is true', () => {
    render(<ScoreDisplay score={60} maxScore={100} showStars starCount={5} />);
    // 60/100 = 60%, out of 5 stars = 3 filled
    const stars = screen.getAllByRole('img', { hidden: true });
    expect(stars).toHaveLength(5);
  });

  it('does not render stars by default', () => {
    render(<ScoreDisplay score={50} />);
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('has correct aria-label with score only', () => {
    render(<ScoreDisplay score={750} />);
    expect(screen.getByLabelText('Score: 750')).toBeInTheDocument();
  });

  it('has correct aria-label with score and max', () => {
    render(<ScoreDisplay score={80} maxScore={100} />);
    expect(screen.getByLabelText('Score: 80 out of 100')).toBeInTheDocument();
  });

  it('has correct aria-label with stars', () => {
    render(<ScoreDisplay score={80} maxScore={100} showStars starCount={5} />);
    expect(screen.getByLabelText('Score: 80 out of 100, 4 of 5 stars')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL — `ScoreDisplay` module not found.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/ScoreDisplay/ScoreDisplay.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.score {
  font-family: var(--font-family-display);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-secondary);
  line-height: 1;
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 1.5rem;
  line-height: 1;
}

.starFilled {
  color: var(--color-secondary);
}

.starEmpty {
  color: var(--color-border);
}
```

- [ ] **Step 4: Implement ScoreDisplay**

Create `/home/jude/code/kids/shared/src/components/ScoreDisplay/ScoreDisplay.tsx`:

```tsx
import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  showStars?: boolean;
  starCount?: number;
  animate?: boolean;
}

function AnimatedNumber({ value, animate }: { value: number; animate: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (animate && !shouldReduceMotion) {
      spring.set(value);
      return display.on('change', (v) => setDisplayValue(v));
    } else {
      setDisplayValue(value);
    }
  }, [value, animate, shouldReduceMotion, spring, display]);

  return <>{displayValue}</>;
}

export function ScoreDisplay({
  score,
  maxScore,
  showStars = false,
  starCount = 5,
  animate = true,
}: ScoreDisplayProps) {
  const filledStars = showStars && maxScore ? Math.round((score / maxScore) * starCount) : 0;

  let ariaLabel = `Score: ${score}`;
  if (maxScore) ariaLabel += ` out of ${maxScore}`;
  if (showStars) ariaLabel += `, ${filledStars} of ${starCount} stars`;

  return (
    <div className={styles.container} aria-label={ariaLabel}>
      <motion.span className={styles.score}>
        <AnimatedNumber value={score} animate={animate} />
      </motion.span>

      {showStars && (
        <div className={styles.stars}>
          {Array.from({ length: starCount }, (_, i) => (
            <span
              key={i}
              className={`${styles.star} ${i < filledStars ? styles.starFilled : styles.starEmpty}`}
              role="img"
              aria-hidden="true"
            >
              ★
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All ScoreDisplay tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/ScoreDisplay/
git commit -m "feat: add ScoreDisplay component with tests

Animated score counter via Framer Motion useSpring, optional star
rating, comprehensive aria-label for accessibility."
```

---

## Chunk 4: P0 Components — ProgressBar, CelebrationOverlay (Tasks 9-10)

### Task 9: ProgressBar component

**Files:**

- Create: `shared/src/components/ProgressBar/ProgressBar.tsx`
- Create: `shared/src/components/ProgressBar/ProgressBar.module.css`
- Create: `shared/src/components/ProgressBar/ProgressBar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/ProgressBar/ProgressBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct percentage width', () => {
    const { container } = render(<ProgressBar current={3} total={10} />);
    const fill = container.querySelector('[class*="fill"]');
    expect(fill).toHaveStyle({ width: '30%' });
  });

  it('renders label when showLabel is true', () => {
    render(<ProgressBar current={3} total={10} showLabel />);
    expect(screen.getByText('3 of 10')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<ProgressBar current={3} total={10} showLabel label="Question 3 of 10" />);
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });

  it('does not render label by default', () => {
    render(<ProgressBar current={3} total={10} />);
    expect(screen.queryByText('3 of 10')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<ProgressBar current={3} total={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('clamps percentage between 0 and 100', () => {
    const { container } = render(<ProgressBar current={15} total={10} />);
    const fill = container.querySelector('[class*="fill"]');
    expect(fill).toHaveStyle({ width: '100%' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/ProgressBar/ProgressBar.module.css`:

```css
.container {
  width: 100%;
}

.label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.track {
  width: 100%;
  height: 20px;
  background-color: var(--color-border);
  border-radius: var(--radius-medium);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--progress-bar-color, var(--color-primary)),
    color-mix(in srgb, var(--progress-bar-color, var(--color-primary)) 80%, white)
  );
  border-radius: var(--radius-medium);
  transition: width var(--transition-normal);
}
```

- [ ] **Step 4: Implement ProgressBar**

Create `/home/jude/code/kids/shared/src/components/ProgressBar/ProgressBar.tsx`:

```tsx
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ current, total, color, showLabel = false, label }: ProgressBarProps) {
  const percentage = Math.min(Math.max((current / total) * 100, 0), 100);
  const displayLabel = label ?? `${current} of ${total}`;

  const style = color ? ({ '--progress-bar-color': color } as React.CSSProperties) : undefined;

  return (
    <div className={styles.container}>
      {showLabel && <div className={styles.label}>{displayLabel}</div>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        style={style}
      >
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All ProgressBar tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/ProgressBar/
git commit -m "feat: add ProgressBar component with tests

Animated fill, configurable color via CSS custom property,
optional label, full ARIA progressbar attributes."
```

---

### Task 10: CelebrationOverlay component

**Files:**

- Create: `shared/src/components/CelebrationOverlay/CelebrationOverlay.tsx`
- Create: `shared/src/components/CelebrationOverlay/CelebrationOverlay.module.css`
- Create: `shared/src/components/CelebrationOverlay/CelebrationOverlay.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/CelebrationOverlay/CelebrationOverlay.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { CelebrationOverlay } from './CelebrationOverlay';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => {
  const confettiFn = vi.fn();
  confettiFn.reset = vi.fn();
  return { default: confettiFn };
});

// Mock framer-motion's useReducedMotion
const mockUseReducedMotion = vi.fn().mockReturnValue(false);
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

describe('CelebrationOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the title', () => {
    render(<CelebrationOverlay title="Amazing Job!" />);
    expect(screen.getByText('Amazing Job!')).toBeInTheDocument();
  });

  it('renders score when provided', () => {
    render(<CelebrationOverlay title="Great!" score={950} maxScore={1000} />);
    expect(screen.getByText(/950/)).toBeInTheDocument();
  });

  it('calls onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<CelebrationOverlay title="Done!" duration={2000} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('has aria-live region', () => {
    render(<CelebrationOverlay title="Yay!" />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
  });

  it('does not fire confetti when reduced motion is preferred', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const confetti = (await import('canvas-confetti')).default;

    render(<CelebrationOverlay title="Test" />);

    expect(confetti).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/CelebrationOverlay/CelebrationOverlay.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background-color: var(--color-overlay);
}

.content {
  text-align: center;
  padding: var(--spacing-xl);
}

.title {
  font-family: var(--font-family-display);
  font-size: 2rem;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.stars {
  font-size: 2rem;
  color: var(--color-secondary);
  margin-bottom: var(--spacing-sm);
}

.score {
  font-size: 1rem;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 4: Implement CelebrationOverlay**

Create `/home/jude/code/kids/shared/src/components/CelebrationOverlay/CelebrationOverlay.tsx`:

```tsx
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import styles from './CelebrationOverlay.module.css';

interface CelebrationOverlayProps {
  type?: 'confetti' | 'stars';
  duration?: number;
  onComplete?: () => void;
  title?: string;
  score?: number;
  maxScore?: number;
  intensity?: 'low' | 'medium' | 'high';
}

const PARTICLE_COUNTS = { low: 50, medium: 100, high: 200 } as const;

export function CelebrationOverlay({
  type = 'confetti',
  duration = 3000,
  onComplete,
  title,
  score,
  maxScore,
  intensity = 'medium',
}: CelebrationOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  // Fire confetti on mount
  useEffect(() => {
    if (shouldReduceMotion) return;

    const particleCount = PARTICLE_COUNTS[intensity];

    if (type === 'stars') {
      confetti({
        particleCount,
        spread: 100,
        shapes: ['star'],
        colors: ['#FFD700', '#FF8C42', '#4A90D9'],
      });
    } else {
      confetti({
        particleCount,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    return () => {
      confetti.reset();
    };
  }, [shouldReduceMotion, type, intensity]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      className={styles.overlay}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      role="status"
      aria-live="polite"
    >
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        {score !== undefined && maxScore !== undefined && (
          <div className={styles.score}>
            Score: {score} / {maxScore}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All CelebrationOverlay tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/CelebrationOverlay/
git commit -m "feat: add CelebrationOverlay component with tests

canvas-confetti burst on mount with intensity scaling, Framer Motion
entrance/exit, auto-dismiss, prefers-reduced-motion support."
```

---

## Chunk 5: P1 Components — GameTimer, DifficultySelector, InstructionBubble, PauseMenu (Tasks 11-14)

### Task 11: GameTimer component

**Files:**

- Create: `shared/src/components/GameTimer/GameTimer.tsx`
- Create: `shared/src/components/GameTimer/GameTimer.module.css`
- Create: `shared/src/components/GameTimer/GameTimer.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/GameTimer/GameTimer.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { GameTimer } from './GameTimer';

describe('GameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays initial time for countdown', () => {
    render(<GameTimer mode="countdown" duration={90} />);
    expect(screen.getByLabelText(/1:30 remaining/)).toBeInTheDocument();
  });

  it('counts down each second', () => {
    render(<GameTimer mode="countdown" duration={5} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText(/0:04 remaining/)).toBeInTheDocument();
  });

  it('fires onExpire when countdown reaches zero', () => {
    const onExpire = vi.fn();
    render(<GameTimer mode="countdown" duration={2} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('pauses when paused prop is true', () => {
    const { rerender } = render(<GameTimer mode="countdown" duration={10} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(<GameTimer mode="countdown" duration={10} paused />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should still show 8 seconds (only 2 seconds elapsed before pause)
    expect(screen.getByLabelText(/0:08 remaining/)).toBeInTheDocument();
  });

  it('counts up in countup mode', () => {
    render(<GameTimer mode="countup" />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByLabelText(/0:03 elapsed/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/GameTimer/GameTimer.module.css`:

```css
.container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ring {
  transform: rotate(-90deg);
}

.trackCircle {
  fill: none;
  stroke: var(--color-border);
}

.progressCircle {
  fill: none;
  stroke: var(--timer-color, var(--color-primary));
  stroke-linecap: round;
  transition:
    stroke-dashoffset 1s linear,
    stroke var(--transition-fast);
}

.progressCircle.warning {
  stroke: var(--color-error);
}

.time {
  fill: var(--color-text-primary);
  font-family: var(--font-family-body);
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
}
```

- [ ] **Step 4: Implement GameTimer**

Create `/home/jude/code/kids/shared/src/components/GameTimer/GameTimer.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import styles from './GameTimer.module.css';

interface GameTimerProps {
  mode: 'countdown' | 'countup';
  duration?: number;
  paused?: boolean;
  onExpire?: () => void;
  onTick?: (seconds: number) => void;
  size?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function GameTimer({
  mode,
  duration = 0,
  paused = false,
  onExpire,
  onTick,
  size = 80,
}: GameTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  onExpireRef.current = onExpire;
  onTickRef.current = onTick;

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;

        if (mode === 'countdown' && next >= duration) {
          clearInterval(intervalRef.current);
          onExpireRef.current?.();
          return duration;
        }

        onTickRef.current?.(mode === 'countdown' ? duration - next : next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, mode, duration]);

  const displaySeconds = mode === 'countdown' ? Math.max(duration - elapsed, 0) : elapsed;
  const remaining = mode === 'countdown' ? duration - elapsed : 0;
  const isWarning = mode === 'countdown' && remaining <= 10 && remaining > 0;

  // SVG ring calculations
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress =
    mode === 'countdown' ? elapsed / duration : duration > 0 ? Math.min(elapsed / duration, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  const ariaLabel =
    mode === 'countdown'
      ? `${formatTime(displaySeconds)} remaining`
      : `${formatTime(displaySeconds)} elapsed`;

  return (
    <div className={styles.container} aria-label={ariaLabel} role="timer">
      <svg width={size} height={size} className={styles.ring}>
        <circle
          className={styles.trackCircle}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`${styles.progressCircle} ${isWarning ? styles.warning : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <text className={styles.time} x={size / 2} y={size / 2} fontSize={size * 0.25}>
          {formatTime(displaySeconds)}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All GameTimer tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/GameTimer/
git commit -m "feat: add GameTimer component with tests

SVG ring timer with countdown/countup modes, pause support,
warning color in last 10 seconds, ARIA timer role."
```

---

### Task 12: DifficultySelector component

**Files:**

- Create: `shared/src/components/DifficultySelector/DifficultySelector.tsx`
- Create: `shared/src/components/DifficultySelector/DifficultySelector.module.css`
- Create: `shared/src/components/DifficultySelector/DifficultySelector.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/DifficultySelector/DifficultySelector.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DifficultySelector } from './DifficultySelector';

describe('DifficultySelector', () => {
  it('renders the correct number of stars', () => {
    render(<DifficultySelector current={3} onChange={vi.fn()} levels={5} />);
    const group = screen.getByRole('radiogroup');
    const radios = screen.getAllByRole('radio');
    expect(group).toBeInTheDocument();
    expect(radios).toHaveLength(5);
  });

  it('fires onChange with the selected level', () => {
    const onChange = vi.fn();
    render(<DifficultySelector current={1} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[2]); // click 3rd star
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('shows label for current level', () => {
    render(
      <DifficultySelector
        current={3}
        onChange={vi.fn()}
        labels={['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard']}
      />,
    );
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    const onChange = vi.fn();
    render(<DifficultySelector current={3} onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('wraps around on arrow key at boundaries', () => {
    const onChange = vi.fn();
    render(<DifficultySelector current={5} onChange={onChange} levels={5} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('marks the correct star as checked', () => {
    render(<DifficultySelector current={2} onChange={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveAttribute('aria-checked', 'false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/DifficultySelector/DifficultySelector.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.stars {
  display: flex;
  gap: var(--spacing-sm);
  outline: none;
}

.star {
  font-size: 2rem;
  cursor: pointer;
  transition: transform var(--transition-fast);
  line-height: 1;
  user-select: none;
}

.star:hover {
  transform: scale(1.2);
}

.starFilled {
  color: var(--color-secondary);
}

.starEmpty {
  color: var(--color-border);
}

.label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .star:hover {
    transform: none;
  }
}
```

- [ ] **Step 4: Implement DifficultySelector**

Create `/home/jude/code/kids/shared/src/components/DifficultySelector/DifficultySelector.tsx`:

```tsx
import styles from './DifficultySelector.module.css';

interface DifficultySelectorProps {
  levels?: number;
  current: number;
  onChange: (level: number) => void;
  labels?: string[];
}

export function DifficultySelector({
  levels = 5,
  current,
  onChange,
  labels,
}: DifficultySelectorProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = current >= levels ? 1 : current + 1;
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = current <= 1 ? levels : current - 1;
      onChange(prev);
    }
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.stars}
        role="radiogroup"
        aria-label="Difficulty level"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: levels }, (_, i) => {
          const level = i + 1;
          const filled = level <= current;
          return (
            <span
              key={level}
              className={`${styles.star} ${filled ? styles.starFilled : styles.starEmpty}`}
              role="radio"
              aria-checked={level === current}
              aria-label={`Level ${level}${labels ? `: ${labels[i]}` : ''}`}
              onClick={() => onChange(level)}
            >
              ★
            </span>
          );
        })}
      </div>
      {labels && labels[current - 1] && <span className={styles.label}>{labels[current - 1]}</span>}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All DifficultySelector tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/DifficultySelector/
git commit -m "feat: add DifficultySelector component with tests

Star-based picker with radiogroup ARIA pattern, arrow key
navigation with wrapping, optional level labels."
```

---

### Task 13: InstructionBubble component

**Files:**

- Create: `shared/src/components/InstructionBubble/InstructionBubble.tsx`
- Create: `shared/src/components/InstructionBubble/InstructionBubble.module.css`
- Create: `shared/src/components/InstructionBubble/InstructionBubble.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/InstructionBubble/InstructionBubble.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { InstructionBubble } from './InstructionBubble';

describe('InstructionBubble', () => {
  it('renders the text', () => {
    render(<InstructionBubble text="Find the matching word!" />);
    expect(screen.getByText('Find the matching word!')).toBeInTheDocument();
  });

  it('shows audio button when audioSrc is provided', () => {
    render(<InstructionBubble text="Listen!" audioSrc="/audio/instruction.mp3" />);
    expect(screen.getByLabelText('Play instruction audio')).toBeInTheDocument();
  });

  it('does not show audio button when no audioSrc', () => {
    render(<InstructionBubble text="Just text" />);
    expect(screen.queryByLabelText('Play instruction audio')).not.toBeInTheDocument();
  });

  it('fires onAudioPlay when audio button is clicked', () => {
    const onAudioPlay = vi.fn();
    render(
      <InstructionBubble text="Listen!" audioSrc="/audio/test.mp3" onAudioPlay={onAudioPlay} />,
    );
    fireEvent.click(screen.getByLabelText('Play instruction audio'));
    expect(onAudioPlay).toHaveBeenCalledOnce();
  });

  it('renders character name when provided', () => {
    render(<InstructionBubble text="Hello!" character="Owl Helper" />);
    expect(screen.getByText('Owl Helper')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/InstructionBubble/InstructionBubble.module.css`:

```css
.container {
  display: inline-flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.bubble {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-medium) var(--radius-medium) var(--radius-medium) var(--spacing-xs);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  font-size: var(--font-size-base);
}

.audioButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-target-size);
  min-height: var(--touch-target-size);
  color: var(--color-primary);
  border-radius: var(--radius-round);
  flex-shrink: 0;
  transition: background-color var(--transition-fast);
}

.audioButton:hover {
  background-color: var(--color-bg-secondary);
}

.character {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding-left: var(--spacing-xs);
}
```

- [ ] **Step 4: Implement InstructionBubble**

Create `/home/jude/code/kids/shared/src/components/InstructionBubble/InstructionBubble.tsx`:

```tsx
import styles from './InstructionBubble.module.css';

interface InstructionBubbleProps {
  text: string;
  audioSrc?: string;
  character?: string;
  onAudioPlay?: () => void;
}

function SpeakerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function InstructionBubble({
  text,
  audioSrc,
  character,
  onAudioPlay,
}: InstructionBubbleProps) {
  return (
    <div className={styles.container}>
      <div className={styles.bubble}>
        <span>{text}</span>
        {audioSrc && (
          <button
            className={styles.audioButton}
            onClick={onAudioPlay}
            aria-label="Play instruction audio"
          >
            <SpeakerIcon />
          </button>
        )}
      </div>
      {character && <span className={styles.character}>{character}</span>}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All InstructionBubble tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/InstructionBubble/
git commit -m "feat: add InstructionBubble component with tests

Speech bubble with SVG speaker icon, optional audio trigger,
character attribution."
```

---

### Task 14: PauseMenu component

**Files:**

- Create: `shared/src/components/PauseMenu/PauseMenu.tsx`
- Create: `shared/src/components/PauseMenu/PauseMenu.module.css`
- Create: `shared/src/components/PauseMenu/PauseMenu.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/home/jude/code/kids/shared/src/components/PauseMenu/PauseMenu.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PauseMenu } from './PauseMenu';

describe('PauseMenu', () => {
  const defaultProps = {
    onResume: vi.fn(),
    onRestart: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three buttons', () => {
    render(<PauseMenu {...defaultProps} />);
    expect(screen.getByText(/Resume/)).toBeInTheDocument();
    expect(screen.getByText(/Restart/)).toBeInTheDocument();
    expect(screen.getByText(/Exit/)).toBeInTheDocument();
  });

  it('fires onResume when Resume is clicked', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.click(screen.getByText(/Resume/));
    expect(defaultProps.onResume).toHaveBeenCalledOnce();
  });

  it('fires onRestart when Restart is clicked', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.click(screen.getByText(/Restart/));
    expect(defaultProps.onRestart).toHaveBeenCalledOnce();
  });

  it('fires onExit when Exit is clicked', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.click(screen.getByText(/Exit/));
    expect(defaultProps.onExit).toHaveBeenCalledOnce();
  });

  it('fires onResume on Escape key', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onResume).toHaveBeenCalledOnce();
  });

  it('has dialog role and aria attributes', () => {
    render(<PauseMenu {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Game paused');
  });

  it('traps focus within the modal', () => {
    render(<PauseMenu {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Focus should be within the dialog
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
    // Tab through all buttons — focus-trap-react keeps focus inside
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(buttons.includes(document.activeElement as HTMLElement)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: FAIL.

- [ ] **Step 3: Create CSS module**

Create `/home/jude/code/kids/shared/src/components/PauseMenu/PauseMenu.module.css`:

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

.menu {
  background-color: var(--color-surface);
  border-radius: var(--radius-large);
  padding: var(--spacing-lg) var(--spacing-xl);
  text-align: center;
  min-width: 240px;
  box-shadow: var(--shadow-card);
}

.title {
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.resumeButton,
.secondaryButton {
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
}

.resumeButton:hover,
.secondaryButton:hover {
  opacity: 0.85;
}

.resumeButton {
  background-color: var(--color-primary);
  color: #ffffff;
}

.secondaryButton {
  background-color: var(--color-surface-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 4: Implement PauseMenu**

Create `/home/jude/code/kids/shared/src/components/PauseMenu/PauseMenu.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import styles from './PauseMenu.module.css';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseMenu({ onResume, onRestart, onExit }: PauseMenuProps) {
  const onResumeRef = useRef(onResume);
  onResumeRef.current = onResume;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onResumeRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <FocusTrap>
      <div className={styles.backdrop}>
        <motion.div
          className={styles.menu}
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.title}>⏸ Paused</div>
          <div className={styles.buttons}>
            <button className={styles.resumeButton} onClick={onResume}>
              ▶ Resume
            </button>
            <button className={styles.secondaryButton} onClick={onRestart}>
              ↺ Restart
            </button>
            <button className={styles.secondaryButton} onClick={onExit}>
              🏠 Exit to Hub
            </button>
          </div>
        </motion.div>
      </div>
    </FocusTrap>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kids-games-zone/shared test`
Expected: All PauseMenu tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/src/components/PauseMenu/
git commit -m "feat: add PauseMenu component with tests

Modal overlay with focus-trap-react, Framer Motion entrance/exit,
Escape key resumes, ARIA dialog pattern."
```

---

## Chunk 6: Barrel Exports and Final Verification (Task 15)

### Task 15: Create component barrel, update root barrel, and verify everything

**Files:**

- Create: `shared/src/components/index.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Create component barrel export**

Create `/home/jude/code/kids/shared/src/components/index.ts`:

```typescript
export { GameShell } from './GameShell/GameShell';
export { OptionButton } from './OptionButton/OptionButton';
export { ScoreDisplay } from './ScoreDisplay/ScoreDisplay';
export { ProgressBar } from './ProgressBar/ProgressBar';
export { CelebrationOverlay } from './CelebrationOverlay/CelebrationOverlay';
export { GameTimer } from './GameTimer/GameTimer';
export { DifficultySelector } from './DifficultySelector/DifficultySelector';
export { InstructionBubble } from './InstructionBubble/InstructionBubble';
export { PauseMenu } from './PauseMenu/PauseMenu';
```

- [ ] **Step 2: Update root barrel with component exports**

Append to `/home/jude/code/kids/shared/src/index.ts` (after hook exports):

```typescript
// Components
export {
  GameShell,
  OptionButton,
  ScoreDisplay,
  ProgressBar,
  CelebrationOverlay,
  GameTimer,
  DifficultySelector,
  InstructionBubble,
  PauseMenu,
} from './components';
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS across all packages.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: Zero errors.

- [ ] **Step 6: Run build**

Run: `pnpm build`
Expected: Successful production build.

- [ ] **Step 7: Commit**

```bash
git add shared/src/components/index.ts shared/src/index.ts
git commit -m "feat: add component and hook barrel exports

Complete shared package API: 9 components, 3 hooks, 2 context
providers, all types exported via barrel files."
```

- [ ] **Step 8: Final integration check — verify imports work from platform**

Temporarily add to `platform/src/App.tsx` (just to verify imports resolve, then revert):

```typescript
import { GameShell, OptionButton, ProgressBar, useAgeTier } from '@kids-games-zone/shared';
```

Run: `pnpm typecheck`
Expected: Zero errors — shared package is importable from platform.

Revert the temporary import.

---

## Summary

| Task | What it delivers              | Estimated time |
| ---- | ----------------------------- | -------------- |
| 1    | Dependencies + test infra     | 5 min          |
| 2    | All shared types              | 10 min         |
| 3    | Design tokens + CSS           | 10 min         |
| 4    | Context providers             | 5 min          |
| 5    | 3 hooks with TDD              | 15 min         |
| 6    | GameShell                     | 10 min         |
| 7    | OptionButton                  | 10 min         |
| 8    | ScoreDisplay                  | 10 min         |
| 9    | ProgressBar                   | 10 min         |
| 10   | CelebrationOverlay            | 10 min         |
| 11   | GameTimer                     | 10 min         |
| 12   | DifficultySelector            | 10 min         |
| 13   | InstructionBubble             | 10 min         |
| 14   | PauseMenu                     | 10 min         |
| 15   | Barrel exports + verification | 5 min          |

15 tasks, 6 chunks. Each task produces a working commit. All tests, typecheck, and lint must pass before moving to the next task.
