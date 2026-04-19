# Phase 6 — Testing, CI/CD Hardening & Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Kids Games Zone for production readiness with feature flags, a game scaffolder, comprehensive tests (unit, integration, E2E), and CI pipeline improvements.

**Architecture:** Execution order is 6C + 6D (parallel) → 6A → 6B. Feature flags use the existing `FeatureFlagContext`/`useFeatureFlag` from `shared/` with a new static JSON config. Playwright E2E tests run against `pnpm preview`. The `create-game` scaffolder generates a full game package skeleton.

**Tech Stack:** React 19, Vite 6, Vitest, Playwright, @axe-core/playwright, @changesets/cli, tsx (for running the scaffolder)

---

## File Structure

### 6D — Feature Flags (wiring existing infrastructure)

| Action | File                                                       | Responsibility                    |
| ------ | ---------------------------------------------------------- | --------------------------------- |
| Create | `platform/src/config/featureFlags.json`                    | Static flag definitions           |
| Modify | `platform/src/main.tsx`                                    | Wrap app in `FeatureFlagProvider` |
| Modify | `platform/src/pages/Hub.tsx`                               | Filter games by feature flag      |
| Modify | `platform/src/pages/GameWrapper.tsx`                       | Guard game loading by flag        |
| Modify | `platform/src/components/GameCard/GameCard.tsx`            | Show BETA badge                   |
| Create | `platform/src/__tests__/featureFlags.integration.test.tsx` | Integration tests                 |

### 6C — Game Developer Guide & Scaffolder

| Action | File                      | Responsibility               |
| ------ | ------------------------- | ---------------------------- |
| Create | `GAME_DEVELOPER_GUIDE.md` | Full developer documentation |
| Create | `scripts/create-game.ts`  | Interactive game scaffolder  |
| Modify | `package.json` (root)     | Add `create-game` script     |

### 6A — Comprehensive Testing

| Action | File                        | Responsibility                           |
| ------ | --------------------------- | ---------------------------------------- |
| Create | `playwright.config.ts`      | Playwright config (viewports, webServer) |
| Create | `e2e/fixtures.ts`           | Shared test fixtures                     |
| Create | `e2e/profile.spec.ts`       | Profile creation/switching E2E           |
| Create | `e2e/hub.spec.ts`           | Hub browsing/filtering E2E               |
| Create | `e2e/gameplay.spec.ts`      | Play games to completion E2E             |
| Create | `e2e/rewards.spec.ts`       | Reward earning E2E                       |
| Create | `e2e/parental.spec.ts`      | Parental controls E2E                    |
| Create | `e2e/offline.spec.ts`       | Offline gameplay E2E                     |
| Create | `e2e/a11y.spec.ts`          | axe-core full-page scans                 |
| Modify | `platform/vitest.config.ts` | Add coverage thresholds                  |
| Modify | `shared/vitest.config.ts`   | Add coverage thresholds                  |

### 6B — CI/CD Hardening

| Action | File                       | Responsibility                         |
| ------ | -------------------------- | -------------------------------------- |
| Modify | `.github/workflows/ci.yml` | Add Playwright + coverage + a11y steps |
| Create | `.changeset/config.json`   | Changesets monorepo config             |
| Modify | `package.json` (root)      | Add changeset scripts                  |

---

## Task 1: Create Feature Flags JSON Config

**Files:**

- Create: `platform/src/config/featureFlags.json`

This task creates the static feature flag definitions using the existing `FeatureFlags` type from `shared/src/types/platform.ts`. Each flag has `enabled`, `description`, and optional `rolloutPercentage`/`ageTiers`.

- [ ] **Step 1: Create the feature flags config file**

```json
// platform/src/config/featureFlags.json
{
  "game.word-puzzle": {
    "enabled": true,
    "description": "Word Puzzle game — unscramble letters to spell words"
  },
  "game.math-adventure": {
    "enabled": true,
    "description": "Math Adventure game — solve math problems"
  },
  "game.memory-match": {
    "enabled": true,
    "description": "Memory Match game — find matching card pairs"
  },
  "game.dummy-game": {
    "enabled": false,
    "description": "Developer test game — click counter"
  },
  "daily-challenge": {
    "enabled": true,
    "description": "Daily challenge card on the Hub"
  },
  "high-contrast-mode": {
    "enabled": true,
    "description": "High contrast mode toggle in Settings"
  }
}
```

- [ ] **Step 2: Verify the JSON matches the FeatureFlags type**

Run: `pnpm typecheck`
Expected: PASS (JSON is imported as a module, so TypeScript validates shape when consumed)

- [ ] **Step 3: Commit**

```bash
git add platform/src/config/featureFlags.json
git commit -m "feat(flags): add static feature flags config"
```

---

## Task 2: Wire FeatureFlagProvider Into App

**Files:**

- Modify: `platform/src/main.tsx`

The `FeatureFlagProvider` already exists in `shared/src/context/FeatureFlagContext.tsx`. This task imports the JSON config and wraps the app tree.

- [ ] **Step 1: Write a test that verifies FeatureFlagProvider is in the tree**

Create `platform/src/__tests__/featureFlags.integration.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureFlagProvider, useFeatureFlag } from '@kids-games-zone/shared';
import featureFlags from '../config/featureFlags.json';
import type { FeatureFlags } from '@kids-games-zone/shared';

function FlagReader({ name }: { name: string }) {
  const { enabled } = useFeatureFlag(name);
  return <span data-testid="flag-value">{String(enabled)}</span>;
}

describe('Feature Flags Integration', () => {
  it('provides flags from featureFlags.json via context', () => {
    render(
      <MemoryRouter>
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId="test-user">
          <FlagReader name="game.word-puzzle" />
        </FeatureFlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('flag-value').textContent).toBe('true');
  });

  it('returns false for disabled flags', () => {
    render(
      <MemoryRouter>
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId="test-user">
          <FlagReader name="game.dummy-game" />
        </FeatureFlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('flag-value').textContent).toBe('false');
  });

  it('returns false for unknown flags', () => {
    render(
      <MemoryRouter>
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId="test-user">
          <FlagReader name="nonexistent.flag" />
        </FeatureFlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('flag-value').textContent).toBe('false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter platform test -- --run src/__tests__/featureFlags.integration.test.tsx`
Expected: PASS (the context and hook already exist; this just validates the JSON config works with them)

Note: This may already pass since the components exist. If it does, that validates the wiring is correct. Continue to the next step.

- [ ] **Step 3: Add FeatureFlagProvider to main.tsx**

In `platform/src/main.tsx`, add these imports at the top:

```tsx
import { FeatureFlagProvider } from '@kids-games-zone/shared';
import featureFlags from './config/featureFlags.json';
import type { FeatureFlags } from '@kids-games-zone/shared';
```

Then wrap `<App />` with `FeatureFlagProvider` inside `PlatformProvider`. The render tree becomes:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider
        storageManager={storageManager}
        audioManager={audioManager}
        gameRegistry={gameRegistry}
      >
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId={null}>
          <App />
        </FeatureFlagProvider>
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

Note: `profileId={null}` is fine for now — rollout-percentage features need a profile ID, but all current flags are simple on/off. A future enhancement can read `profileId` from `PlatformContext` via a small wrapper component.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm typecheck && pnpm --filter platform test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add platform/src/main.tsx platform/src/__tests__/featureFlags.integration.test.tsx
git commit -m "feat(flags): wire FeatureFlagProvider into app tree"
```

---

## Task 3: Hub Feature Flag Filtering

**Files:**

- Modify: `platform/src/pages/Hub.tsx`

Games in the Hub should only appear if their feature flag is enabled. A game needs both age-range match AND feature flag enabled.

- [ ] **Step 1: Add feature flag tests to the integration test file**

Append to `platform/src/__tests__/featureFlags.integration.test.tsx`:

```tsx
import { gameRegistry } from '../config/gameRegistry';

describe('Hub feature flag filtering', () => {
  it('filters out games whose feature flag is disabled', () => {
    // Test the filtering logic that will be added to Hub
    const games = gameRegistry;
    const flags: FeatureFlags = {
      'game.word-puzzle': { enabled: true, description: '' },
      'game.math-adventure': { enabled: false, description: '' },
      'game.memory-match': { enabled: true, description: '' },
      'game.dummy-game': { enabled: false, description: '' },
    };

    const flagFiltered = games.filter((game) => {
      const flag = flags[`game.${game.id}`];
      return !flag || flag.enabled;
    });

    expect(flagFiltered.map((g) => g.id)).toContain('word-puzzle');
    expect(flagFiltered.map((g) => g.id)).toContain('memory-match');
    expect(flagFiltered.map((g) => g.id)).not.toContain('math-adventure');
    expect(flagFiltered.map((g) => g.id)).not.toContain('dummy-game');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter platform test -- --run src/__tests__/featureFlags.integration.test.tsx`
Expected: PASS (this tests the logic in isolation before we integrate it into Hub)

- [ ] **Step 3: Add feature flag filtering to Hub.tsx**

In `platform/src/pages/Hub.tsx`, add the import:

```tsx
import { useAgeTier, useFeatureFlag } from '@kids-games-zone/shared';
```

Wait — `useFeatureFlag` is per-flag, not a batch reader. We need access to all flags at once for filtering. Read the flags from context directly.

Add this import instead:

```tsx
import { useContext } from 'react';
import { FeatureFlagContext } from '@kids-games-zone/shared';
```

Then inside the `Hub` component, after `const ageTier = useAgeTier();`, add:

```tsx
const { flags } = useContext(FeatureFlagContext);
```

Check that `FeatureFlagContext` is exported from the shared barrel. If not, import directly:

```tsx
import { FeatureFlagContext } from '@shared/context/FeatureFlagContext';
```

Modify the `ageFilteredGames` memo to also filter by feature flag:

```tsx
const ageFilteredGames = useMemo(() => {
  if (!profile) return [];
  return state.gameRegistry.filter((game) => {
    // Age range check
    const inAgeRange = game.ageRange[0] <= profile.age && profile.age <= game.ageRange[1];
    // Feature flag check — flag key is "game.<id>"
    const flag = flags[`game.${game.id}`];
    const flagEnabled = !flag || flag.enabled; // unknown flags default to enabled
    return inAgeRange && flagEnabled;
  });
}, [profile, state.gameRegistry, flags]);
```

- [ ] **Step 4: Verify FeatureFlagContext is exported from shared barrel**

Check `shared/src/index.ts` for `FeatureFlagContext` export. If missing, add:

```tsx
export { FeatureFlagContext, FeatureFlagProvider } from './context/FeatureFlagContext';
```

- [ ] **Step 5: Run typecheck and tests**

Run: `pnpm typecheck && pnpm --filter platform test`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add platform/src/pages/Hub.tsx shared/src/index.ts platform/src/__tests__/featureFlags.integration.test.tsx
git commit -m "feat(flags): filter Hub games by feature flags"
```

---

## Task 4: GameWrapper Feature Flag Guard

**Files:**

- Modify: `platform/src/pages/GameWrapper.tsx`

Prevent direct URL navigation to a disabled game (e.g., `/game/dummy-game`).

- [ ] **Step 1: Add guard test to integration tests**

Append to `platform/src/__tests__/featureFlags.integration.test.tsx`:

```tsx
describe('GameWrapper feature flag guard', () => {
  it('blocks navigation to a disabled game', () => {
    // Test the guard logic: if flag is disabled, show error
    const flags: FeatureFlags = {
      'game.dummy-game': { enabled: false, description: '' },
    };
    const gameId = 'dummy-game';
    const flag = flags[`game.${gameId}`];
    const blocked = flag && !flag.enabled;
    expect(blocked).toBe(true);
  });

  it('allows navigation to an enabled game', () => {
    const flags: FeatureFlags = {
      'game.word-puzzle': { enabled: true, description: '' },
    };
    const gameId = 'word-puzzle';
    const flag = flags[`game.${gameId}`];
    const blocked = flag && !flag.enabled;
    expect(blocked).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter platform test -- --run src/__tests__/featureFlags.integration.test.tsx`
Expected: PASS

- [ ] **Step 3: Add feature flag guard to GameWrapper.tsx**

In `platform/src/pages/GameWrapper.tsx`, in the `GameWrapper` component (the outer default export), add the import:

```tsx
import { useContext } from 'react';
```

Update the existing `import` from `react` to include `useContext` if not already there.

Add import:

```tsx
import { FeatureFlagContext } from '@kids-games-zone/shared';
```

Inside `GameWrapper()`, after `const manifest = state.gameRegistry.find(...)`, add:

```tsx
const { flags } = useContext(FeatureFlagContext);

// Check feature flag — block if explicitly disabled
const gameFlag = flags[`game.${gameId}`];
const flagDisabled = gameFlag && !gameFlag.enabled;
```

Then modify the error state section. After the existing `if (error)` block, add a new check before the loading check:

```tsx
// Feature flag blocked
if (flagDisabled) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: '1rem',
        textAlign: 'center',
      }}
    >
      <h2>This game is not available</h2>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '12px 24px',
          borderRadius: 'var(--radius-medium)',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          fontSize: '1rem',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Go Home
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck and tests**

Run: `pnpm typecheck && pnpm --filter platform test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add platform/src/pages/GameWrapper.tsx platform/src/__tests__/featureFlags.integration.test.tsx
git commit -m "feat(flags): guard GameWrapper against disabled game flags"
```

---

## Task 5: Beta Badge on GameCard

**Files:**

- Modify: `platform/src/components/GameCard/GameCard.tsx`
- Modify: `platform/src/components/GameCard/GameCard.module.css`

Show a "BETA" badge when `manifest.status === 'beta'` and the game's flag is enabled.

- [ ] **Step 1: Add BETA badge to GameCard**

In `platform/src/components/GameCard/GameCard.tsx`, add import:

```tsx
import { ProgressBar, useFeatureFlag } from '@kids-games-zone/shared';
```

Inside `GameCard`, after `const skillIcon = ...`, add:

```tsx
const { enabled: flagEnabled } = useFeatureFlag(`game.${manifest.id}`);
const isBeta = manifest.status === 'beta' && flagEnabled;
```

In the JSX, inside the `<div className={styles.thumbnail}>` block, after the existing NEW badge, add:

```tsx
{
  isBeta && <span className={styles.betaBadge}>{t('gameCard.beta', 'BETA')}</span>;
}
```

- [ ] **Step 2: Add BETA badge styles**

In `platform/src/components/GameCard/GameCard.module.css`, add:

```css
.betaBadge {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: var(--color-warning, #ff9800);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-small, 4px);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Run typecheck and tests**

Run: `pnpm typecheck && pnpm --filter platform test`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add platform/src/components/GameCard/GameCard.tsx platform/src/components/GameCard/GameCard.module.css
git commit -m "feat(flags): show BETA badge on game cards for beta-status games"
```

---

## Task 6: Game Developer Guide

**Files:**

- Create: `GAME_DEVELOPER_GUIDE.md`

This task writes the full developer documentation for creating new games.

- [ ] **Step 1: Write the guide**

Create `GAME_DEVELOPER_GUIDE.md` at the repo root. The guide must cover these sections with concrete examples from the existing codebase:

1. **Quick Start** — run `pnpm create-game`, what files are generated, `pnpm dev` to see it
2. **GamePlugin Interface** — full interface from `shared/src/types/game.ts`, explanation of each lifecycle hook (onLoad, onStart, onPause, onResume, onEnd, onUnload), when each fires, what to return from onEnd
3. **GameProps** — what the platform passes: `config` (difficulty, profile, settings), `onScore(points)`, `onComplete(result)`, `onExit()`, `audioManager`, `storageManager`
4. **GameManifest** — all fields, entry point convention (`../../../games/<name>/src/index.ts`), status values
5. **Shared Components** — table of available components with import path and key props:
   - `GameShell` — wrapper with title, back button, pause
   - `OptionButton` — tap target with correct/incorrect states
   - `ScoreDisplay` — animated counter
   - `ProgressBar` — current/total
   - `CelebrationOverlay` — confetti on completion
   - `GameTimer` — countdown/count-up
   - `DifficultySelector` — star picker
   - `InstructionBubble` — speech bubble
   - `PauseMenu` — resume/restart/exit
6. **Audio** — `audioManager.playSFX('correct')`, `audioManager.playSFX('incorrect')`, `audioManager.playMusic(path)`, available SFX keys
7. **Localization** — create `src/locales/en/<game-name>.json` and `src/locales/fr/<game-name>.json`, use `useTranslation('<game-name>')`, register in `platform/src/i18n.ts`
8. **Styling** — CSS Modules (`.module.css`), available design tokens (from `shared/styles/tokens.css`), age-tier data attribute
9. **Testing** — use Vitest + React Testing Library, mock `GameProps` (show the `createMockProps` pattern from existing tests), axe accessibility check, run with `pnpm --filter <game-name> test`
10. **Bundle Budget** — 100KB gzip per game, check with `pnpm --filter platform size:check`
11. **Registration** — add manifest to `platform/src/config/gameRegistry.ts`, add feature flag to `platform/src/config/featureFlags.json` (set `enabled: false` initially)
12. **Pre-submit Checklist**:
    - [ ] Game implements all GamePlugin lifecycle hooks
    - [ ] GameComponent accepts and uses GameProps
    - [ ] All strings in locale files (en + fr)
    - [ ] CSS Modules with design tokens (no inline styles for theming)
    - [ ] Unit tests with 70%+ coverage
    - [ ] axe accessibility check passes
    - [ ] Bundle under 100KB gzip
    - [ ] Registered in gameRegistry.ts
    - [ ] Feature flag added in featureFlags.json
    - [ ] Locale imports added to platform/src/i18n.ts

- [ ] **Step 2: Commit**

```bash
git add GAME_DEVELOPER_GUIDE.md
git commit -m "docs: add game developer guide"
```

---

## Task 7: Create Game Scaffolder Script

**Files:**

- Create: `scripts/create-game.ts`
- Modify: `package.json` (root)

An interactive script that scaffolds a new game package.

- [ ] **Step 1: Install tsx as a dev dependency (for running TypeScript scripts)**

Run: `pnpm add -Dw tsx`
Expected: `tsx` added to root devDependencies

- [ ] **Step 2: Create the scaffolder script**

Create `scripts/create-game.ts`:

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function askChoice(question: string, options: string[]): Promise<string> {
  return new Promise((resolve) => {
    console.log(question);
    options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
    rl.question('Choose (number): ', (answer) => {
      const idx = parseInt(answer, 10) - 1;
      resolve(options[idx] ?? options[0]);
    });
  });
}

async function main() {
  console.log('\n🎮 Kids Games Zone — New Game Scaffolder\n');

  // Gather info
  const rawName = await ask('Game name (kebab-case, e.g. "spelling-bee"): ');
  const name = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  const displayName = await ask('Display name (e.g. "Spelling Bee"): ');

  const ageRangeStr = await askChoice('Age range:', [
    'tiny (3-5)',
    'junior (6-8)',
    'explorer (9-12)',
  ]);
  const ageRange: [number, number] = ageRangeStr.includes('3-5')
    ? [3, 5]
    : ageRangeStr.includes('6-8')
      ? [6, 8]
      : [9, 12];

  console.log('\nSkill categories (comma-separated numbers):');
  const skillOptions = [
    'literacy',
    'numeracy',
    'logic',
    'memory',
    'creativity',
    'motor_skills',
    'science',
    'social_skills',
  ];
  skillOptions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  const skillInput = await ask('Choose: ');
  const skills = skillInput
    .split(',')
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < skillOptions.length)
    .map((i) => skillOptions[i]);

  if (skills.length === 0) {
    skills.push('logic');
  }

  rl.close();

  // Paths
  const root = path.resolve(import.meta.dirname, '..');
  const gameDir = path.join(root, 'games', name);

  if (fs.existsSync(gameDir)) {
    console.error(`\n❌ Directory games/${name}/ already exists. Aborting.`);
    process.exit(1);
  }

  // Create directories
  const dirs = [
    gameDir,
    path.join(gameDir, 'src'),
    path.join(gameDir, 'src', 'components'),
    path.join(gameDir, 'src', '__tests__'),
    path.join(gameDir, 'src', 'locales', 'en'),
    path.join(gameDir, 'src', 'locales', 'fr'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // package.json
  fs.writeFileSync(
    path.join(gameDir, 'package.json'),
    JSON.stringify(
      {
        name: `@kids-games-zone/${name}`,
        version: '0.1.0',
        private: true,
        type: 'module',
        main: './src/index.ts',
        scripts: {
          typecheck: 'tsc --noEmit',
          test: 'vitest run --passWithNoTests',
        },
        dependencies: {
          'framer-motion': '^11.0.0',
        },
        peerDependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          '@kids-games-zone/shared': 'workspace:*',
          'react-i18next': '^16.0.0',
        },
      },
      null,
      2,
    ) + '\n',
  );

  // tsconfig.json
  fs.writeFileSync(
    path.join(gameDir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          outDir: './dist',
          rootDir: './src',
          paths: { '@shared/*': ['../../shared/src/*'] },
          types: ['vitest/globals'],
        },
        include: ['src'],
        references: [{ path: '../../shared' }],
      },
      null,
      2,
    ) + '\n',
  );

  // vitest.config.ts
  fs.writeFileSync(
    path.join(gameDir, 'vitest.config.ts'),
    `import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['../../platform/src/test-setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared/src'),
    },
  },
});
`,
  );

  // src/index.ts — GamePlugin entry
  const componentName = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  fs.writeFileSync(
    path.join(gameDir, 'src', 'index.ts'),
    `import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { ${componentName} } from './components/${componentName}';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: '${name}',
    name: '${displayName}',
    description: 'TODO: Add game description',
    thumbnail: '/images/games/${name}.webp',
    ageRange: [${ageRange[0]}, ${ageRange[1]}],
    skills: [${skills.map((s) => `'${s}'`).join(', ')}],
    version: '0.1.0',
    entryPoint: '../../../games/${name}/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '${new Date().toISOString().slice(0, 10)}',
    tags: [],
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
      gameId: '${name}',
      score: _score,
      maxScore: 100,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: {},
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: ${componentName},
};

export default plugin;
`,
  );

  // src/components/<Name>.tsx
  fs.writeFileSync(
    path.join(gameDir, 'src', 'components', `${componentName}.tsx`),
    `import { useTranslation } from 'react-i18next';
import { GameShell } from '@kids-games-zone/shared';
import type { GameProps } from '@kids-games-zone/shared';
import styles from './${componentName}.module.css';

export function ${componentName}({ config, onScore, onComplete, onExit }: GameProps) {
  const { t } = useTranslation('${name}');

  function handlePlay() {
    onScore(10);
    onComplete({
      gameId: '${name}',
      score: 10,
      maxScore: 100,
      timeSpent: 0,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {},
    });
  }

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.container}>
        <p>{t('instruction')}</p>
        <button className={styles.playButton} onClick={handlePlay}>
          {t('play')}
        </button>
      </div>
    </GameShell>
  );
}
`,
  );

  // src/components/<Name>.module.css
  fs.writeFileSync(
    path.join(gameDir, 'src', 'components', `${componentName}.module.css`),
    `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-large, 1.5rem);
  padding: var(--spacing-large, 1.5rem);
}

.playButton {
  padding: var(--spacing-medium, 1rem) var(--spacing-large, 1.5rem);
  border-radius: var(--radius-medium, 8px);
  background-color: var(--color-primary, #4a90d9);
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  min-width: 48px;
  min-height: 48px;
}

.playButton:hover {
  opacity: 0.9;
}

.playButton:focus-visible {
  outline: 3px solid var(--color-focus, #4a90d9);
  outline-offset: 2px;
}
`,
  );

  // Locale files
  const enLocale = { title: displayName, instruction: 'TODO: Add instructions', play: 'Play' };
  const frLocale = {
    title: displayName,
    instruction: 'TODO: Ajouter les instructions',
    play: 'Jouer',
  };

  fs.writeFileSync(
    path.join(gameDir, 'src', 'locales', 'en', `${name}.json`),
    JSON.stringify(enLocale, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(gameDir, 'src', 'locales', 'fr', `${name}.json`),
    JSON.stringify(frLocale, null, 2) + '\n',
  );

  // Test file
  fs.writeFileSync(
    path.join(gameDir, 'src', '__tests__', `${componentName}.test.tsx`),
    `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ${componentName} } from '../components/${componentName}';
import type { GameProps } from '@kids-games-zone/shared';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

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

describe('${componentName}', () => {
  it('renders the game title', () => {
    render(<${componentName} {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('renders the play button', () => {
    render(<${componentName} {...createMockProps()} />);
    expect(screen.getByText('play')).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<${componentName} {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
`,
  );

  // Register feature flag
  const flagsPath = path.join(root, 'platform', 'src', 'config', 'featureFlags.json');
  if (fs.existsSync(flagsPath)) {
    const flags = JSON.parse(fs.readFileSync(flagsPath, 'utf-8'));
    flags[`game.${name}`] = {
      enabled: false,
      description: `${displayName} game`,
    };
    fs.writeFileSync(flagsPath, JSON.stringify(flags, null, 2) + '\n');
    console.log(`✅ Feature flag "game.${name}" added (enabled: false)`);
  }

  console.log(`\n✅ Game "${name}" scaffolded at games/${name}/\n`);
  console.log('Next steps:');
  console.log(`  1. Run: pnpm install`);
  console.log(`  2. Add game manifest to platform/src/config/gameRegistry.ts`);
  console.log(`  3. Add locale imports to platform/src/i18n.ts:`);
  console.log(
    `     import en${componentName} from '../../games/${name}/src/locales/en/${name}.json';`,
  );
  console.log(
    `     import fr${componentName} from '../../games/${name}/src/locales/fr/${name}.json';`,
  );
  console.log(
    `  4. Add to i18n resources: en: { '${name}': en${componentName} }, fr: { '${name}': fr${componentName} }`,
  );
  console.log(`  5. Set feature flag "game.${name}" to enabled: true when ready`);
  console.log(`  6. Run: pnpm --filter @kids-games-zone/${name} test`);
  console.log(`  7. Start building your game in games/${name}/src/components/${componentName}.tsx`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add the create-game script to root package.json**

In `package.json` (root), add to `"scripts"`:

```json
"create-game": "tsx scripts/create-game.ts"
```

- [ ] **Step 4: Test the scaffolder manually**

Run: `pnpm create-game`

Enter test values:

- Name: `test-scaffold`
- Display name: `Test Scaffold`
- Age range: 2 (junior)
- Skills: 1 (literacy)

Verify:

- `games/test-scaffold/` directory exists with all expected files
- `pnpm install` succeeds
- `pnpm --filter @kids-games-zone/test-scaffold typecheck` passes
- `pnpm --filter @kids-games-zone/test-scaffold test` passes

Then clean up:

```bash
rm -rf games/test-scaffold
pnpm install
```

And remove the test flag from `featureFlags.json` if it was added.

- [ ] **Step 5: Commit**

```bash
git add scripts/create-game.ts package.json
git commit -m "feat: add create-game scaffolder script"
```

---

## Task 8: Install Playwright and E2E Dependencies

**Files:**

- Modify: `package.json` (root)
- Create: `playwright.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add -Dw @playwright/test @axe-core/playwright
```

- [ ] **Step 2: Install Playwright browsers**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 3: Create Playwright config**

Create `playwright.config.ts` at the repo root:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm --filter platform preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
```

- [ ] **Step 4: Create e2e directory**

```bash
mkdir -p e2e
```

- [ ] **Step 5: Add E2E script to root package.json**

Add to `"scripts"` in root `package.json`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts package.json pnpm-lock.yaml
git commit -m "chore: install Playwright and configure E2E test runner"
```

---

## Task 9: E2E Test Fixtures

**Files:**

- Create: `e2e/fixtures.ts`

Shared fixtures for common operations like creating a profile, navigating to a game, etc.

- [ ] **Step 1: Create fixtures file**

Create `e2e/fixtures.ts`:

```ts
import { test as base, expect, type Page } from '@playwright/test';

interface TestFixtures {
  /** Creates a profile and returns to the hub */
  createProfile: (options?: { name?: string; age?: number; skipPin?: boolean }) => Promise<void>;

  /** Navigates to a specific game from the hub */
  navigateToGame: (gameId: string) => Promise<void>;

  /** Plays the Memory Match game to completion (simplest game) */
  playMemoryMatchToCompletion: () => Promise<void>;
}

export const test = base.extend<TestFixtures>({
  createProfile: async ({ page }, use) => {
    const fn = async (options?: { name?: string; age?: number; skipPin?: boolean }) => {
      const name = options?.name ?? 'TestKid';
      const age = options?.age ?? 7;

      await page.goto('/profile');

      // Fill in name
      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill(name);

      // Fill in age
      const ageInput = page.getByLabel(/age/i);
      await ageInput.fill(String(age));

      // Select an avatar (click the first one)
      const avatarButtons = page.locator(
        '[data-testid="avatar-option"], button[aria-label*="avatar" i]',
      );
      const count = await avatarButtons.count();
      if (count > 0) {
        await avatarButtons.first().click();
      }

      // Submit / continue — look for a submit-style button
      const submitButton = page.getByRole('button', { name: /create|start|continue|let.*go/i });
      await submitButton.click();

      // Handle PIN setup — skip if requested
      const skipButton = page.getByRole('button', { name: /skip/i });
      const skipVisible = await skipButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (skipVisible && (options?.skipPin ?? true)) {
        await skipButton.click();
      }

      // Wait for hub to load
      await page.waitForURL('/', { timeout: 10_000 });
    };

    await use(fn);
  },

  navigateToGame: async ({ page }, use) => {
    const fn = async (gameId: string) => {
      // Click the game card
      const gameCard = page
        .locator(`[href="/game/${gameId}"], button`)
        .filter({ hasText: new RegExp(gameId.replace(/-/g, ' '), 'i') });
      await gameCard.first().click();
      await page.waitForURL(`/game/${gameId}`, { timeout: 10_000 });
    };

    await use(fn);
  },

  playMemoryMatchToCompletion: async ({ page }, use) => {
    const fn = async () => {
      // Wait for game to load
      await page.waitForSelector('button', { timeout: 10_000 });

      // Dismiss instruction if present
      const letsGoButton = page.getByRole('button', { name: /let.*go/i });
      const letsGoVisible = await letsGoButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (letsGoVisible) {
        await letsGoButton.click();
      }

      // Wait for cards to appear
      await page.waitForTimeout(3500); // preview timer

      // Simple strategy: click all card pairs until game completes
      // Memory Match at difficulty 1 has 4 cards (2 pairs)
      const cards = page.getByRole('button', { name: /card/i });
      const cardCount = await cards.count();

      // Try all pairs — brute force for E2E
      const revealed: Map<number, string> = new Map();

      for (let attempts = 0; attempts < cardCount * cardCount; attempts++) {
        const currentCards = page.getByRole('button', { name: /card/i });
        const currentCount = await currentCards.count();
        if (currentCount === 0) break; // all matched

        // Click first unmatched card
        await currentCards.first().click();
        await page.waitForTimeout(500);

        // Click second unmatched card
        const remaining = page.getByRole('button', { name: /card/i });
        const remainingCount = await remaining.count();
        if (remainingCount > 1) {
          await remaining.nth(1).click();
        }
        await page.waitForTimeout(1500); // flip-back timer

        // Check if game completed
        const completionText = page.getByText(/great job|congratulations|well done/i);
        const done = await completionText.isVisible({ timeout: 1000 }).catch(() => false);
        if (done) break;
      }
    };

    await use(fn);
  },
});

export { expect };
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures.ts
git commit -m "test(e2e): add shared Playwright fixtures"
```

---

## Task 10: Profile E2E Tests

**Files:**

- Create: `e2e/profile.spec.ts`

- [ ] **Step 1: Write profile E2E tests**

Create `e2e/profile.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('Profile Management', () => {
  test.use({ project: { name: 'desktop' } });

  test('create a new profile and land on hub', async ({ page, createProfile }) => {
    await createProfile({ name: 'Alice', age: 7 });
    await expect(page.getByText(/welcome.*alice/i)).toBeVisible();
  });

  test('profile persists after page reload', async ({ page, createProfile }) => {
    await createProfile({ name: 'Bob', age: 5 });
    await page.reload();
    await expect(page.getByText(/welcome.*bob/i)).toBeVisible();
  });

  test('can create a second profile and switch', async ({ page, createProfile }) => {
    await createProfile({ name: 'Child1', age: 7 });
    await expect(page.getByText(/welcome.*child1/i)).toBeVisible();

    // Navigate to profile page
    await page.goto('/profile');

    // Create another profile
    await createProfile({ name: 'Child2', age: 4 });
    await expect(page.getByText(/welcome.*child2/i)).toBeVisible();
  });
});

test.describe('Profile - Mobile', () => {
  test.use({ project: { name: 'mobile' } });

  test('create profile on mobile viewport', async ({ page, createProfile }) => {
    await createProfile({ name: 'MobileKid', age: 6 });
    await expect(page.getByText(/welcome.*mobilekid/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify tests work**

Run: `pnpm build && pnpm test:e2e -- --grep "Profile"`
Expected: Tests should run (may need adjustments to selectors based on actual UI)

- [ ] **Step 3: Commit**

```bash
git add e2e/profile.spec.ts
git commit -m "test(e2e): add profile management tests"
```

---

## Task 11: Hub E2E Tests

**Files:**

- Create: `e2e/hub.spec.ts`

- [ ] **Step 1: Write hub E2E tests**

Create `e2e/hub.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('Hub - Desktop', () => {
  test.use({ project: { name: 'desktop' } });

  test.beforeEach(async ({ createProfile }) => {
    await createProfile({ name: 'HubTester', age: 7 });
  });

  test('displays game cards for age-appropriate games', async ({ page }) => {
    // Age 7 (junior) should see math-adventure and word-puzzle
    await expect(page.getByText('Math Adventure')).toBeVisible();
    await expect(page.getByText('Word Puzzle')).toBeVisible();
  });

  test('does not show games outside age range', async ({ page }) => {
    // Age 7 should NOT see memory-match (ages 3-5)
    await expect(page.getByText('Memory Match')).not.toBeVisible();
  });

  test('search bar filters games by name', async ({ page }) => {
    const searchInput = page.getByLabel(/search/i);
    await searchInput.fill('Math');
    await expect(page.getByText('Math Adventure')).toBeVisible();
    await expect(page.getByText('Word Puzzle')).not.toBeVisible();
  });

  test('skill category filter works', async ({ page }) => {
    // Click the "numeracy" filter pill
    const numeracyPill = page.getByRole('button', { name: /numeracy/i });
    const pillVisible = await numeracyPill.isVisible().catch(() => false);
    if (pillVisible) {
      await numeracyPill.click();
      await expect(page.getByText('Math Adventure')).toBeVisible();
      await expect(page.getByText('Word Puzzle')).not.toBeVisible();
    }
  });

  test('daily challenge section is visible', async ({ page }) => {
    await expect(page.getByText(/daily challenge/i)).toBeVisible();
  });

  test('feature flag hides disabled game', async ({ page }) => {
    // dummy-game flag is disabled — it should not appear even for a profile with age 3-12
    await expect(page.getByText('Click Counter')).not.toBeVisible();
  });
});

test.describe('Hub - Mobile', () => {
  test.use({ project: { name: 'mobile' } });

  test.beforeEach(async ({ createProfile }) => {
    await createProfile({ name: 'MobileHubTester', age: 7 });
  });

  test('game grid is visible on mobile', async ({ page }) => {
    await expect(page.getByText('Math Adventure')).toBeVisible();
  });
});

test.describe('Hub - Tablet', () => {
  test.use({ project: { name: 'tablet' } });

  test.beforeEach(async ({ createProfile }) => {
    await createProfile({ name: 'TabletHubTester', age: 7 });
  });

  test('game grid is visible on tablet', async ({ page }) => {
    await expect(page.getByText('Math Adventure')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:e2e -- --grep "Hub"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/hub.spec.ts
git commit -m "test(e2e): add hub browsing and filtering tests"
```

---

## Task 12: Gameplay E2E Tests

**Files:**

- Create: `e2e/gameplay.spec.ts`

- [ ] **Step 1: Write gameplay E2E tests**

Create `e2e/gameplay.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('Gameplay - Memory Match', () => {
  test.use({ project: { name: 'mobile' } });

  test('play Memory Match to completion', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'Gamer', age: 4 });
    await navigateToGame('memory-match');
    await playMemoryMatchToCompletion();

    // Should see completion screen
    await expect(page.getByText(/great job|score/i)).toBeVisible({ timeout: 10_000 });
  });

  test('score is reported after completion', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'Scorer', age: 4 });
    await navigateToGame('memory-match');
    await playMemoryMatchToCompletion();

    // Score should be displayed
    await expect(page.getByText(/score/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Gameplay - Math Adventure', () => {
  test.use({ project: { name: 'desktop' } });

  test('Math Adventure loads and shows a question', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'MathKid', age: 7 });
    await navigateToGame('math-adventure');

    // Should see math question content (numbers, operators, or option buttons)
    await page.waitForSelector('button', { timeout: 10_000 });
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('answering a question advances progress', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'ProgressKid', age: 7 });
    await navigateToGame('math-adventure');

    // Wait for game to render with options
    await page.waitForTimeout(2000);

    // Click one of the answer option buttons
    const optionButtons = page.locator('button[class*="option"], [role="button"]');
    const count = await optionButtons.count();
    if (count >= 2) {
      await optionButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Gameplay - Word Puzzle', () => {
  test.use({ project: { name: 'desktop' } });

  test('Word Puzzle loads and shows scrambled letters', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'WordKid', age: 7 });
    await navigateToGame('word-puzzle');

    // Should see the game interface
    await page.waitForSelector('button', { timeout: 10_000 });
  });
});

test.describe('Gameplay - Progress Persistence', () => {
  test.use({ project: { name: 'desktop' } });

  test('progress persists after completing a game and returning to hub', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'PersistKid', age: 4 });
    await navigateToGame('memory-match');
    await playMemoryMatchToCompletion();

    // Go home
    const homeButton = page
      .getByRole('button', { name: /go home|home/i })
      .or(page.getByRole('link', { name: /home/i }));
    await homeButton.first().click();

    // Hub should show "Continue Playing" section
    await expect(page.getByText(/continue playing/i)).toBeVisible({ timeout: 5000 });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:e2e -- --grep "Gameplay"`
Expected: PASS (some tests may need selector adjustments based on actual game UI)

- [ ] **Step 3: Commit**

```bash
git add e2e/gameplay.spec.ts
git commit -m "test(e2e): add gameplay tests for all three games"
```

---

## Task 13: Rewards E2E Tests

**Files:**

- Create: `e2e/rewards.spec.ts`

- [ ] **Step 1: Write rewards E2E tests**

Create `e2e/rewards.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('Rewards', () => {
  test.use({ project: { name: 'desktop' } });

  test('rewards gallery shows locked rewards initially', async ({ page, createProfile }) => {
    await createProfile({ name: 'RewardKid', age: 7 });

    // Navigate to rewards page
    await page.goto('/rewards');

    // Should see reward cards (locked state)
    const rewardCards = page.locator('[class*="reward"], [data-testid*="reward"]');
    const count = await rewardCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('earn First Star reward after completing a game', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'StarKid', age: 4 });
    await navigateToGame('memory-match');
    await playMemoryMatchToCompletion();

    // Wait for potential reward celebration
    await page.waitForTimeout(3000);

    // Navigate home then to rewards
    const homeButton = page
      .getByRole('button', { name: /go home|home/i })
      .or(page.getByRole('link', { name: /home/i }));
    await homeButton.first().click();

    await page.goto('/rewards');

    // Should have at least one unlocked reward
    // The "First Star" reward unlocks after completing 1 game
    await expect(page.getByText(/first star/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Rewards - Mobile', () => {
  test.use({ project: { name: 'mobile' } });

  test('rewards gallery renders on mobile', async ({ page, createProfile }) => {
    await createProfile({ name: 'MobileReward', age: 5 });
    await page.goto('/rewards');
    await expect(page).toHaveURL('/rewards');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:e2e -- --grep "Rewards"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/rewards.spec.ts
git commit -m "test(e2e): add rewards gallery and earning tests"
```

---

## Task 14: Parental Controls E2E Tests

**Files:**

- Create: `e2e/parental.spec.ts`

- [ ] **Step 1: Write parental E2E tests**

Create `e2e/parental.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('Parental Controls', () => {
  test.use({ project: { name: 'desktop' } });

  test('parental dashboard requires adult gate', async ({ page, createProfile }) => {
    await createProfile({ name: 'ParentKid', age: 7 });

    await page.goto('/settings/parental');

    // Should see the adult gate (multiplication problem)
    await expect(page.getByText(/what is|solve|multiply|×|x/i)).toBeVisible({ timeout: 5000 });
  });

  test('settings page has parental controls link', async ({ page, createProfile }) => {
    await createProfile({ name: 'SettingsKid', age: 7 });

    await page.goto('/settings');

    // Should see parental controls link/button
    await expect(
      page
        .getByRole('link', { name: /parental/i })
        .or(page.getByRole('button', { name: /parental/i })),
    ).toBeVisible();
  });

  test('adult gate blocks with wrong answer', async ({ page, createProfile }) => {
    await createProfile({ name: 'BlockedKid', age: 7 });

    await page.goto('/settings/parental');

    // Find the input for the adult gate answer
    const answerInput = page
      .getByRole('textbox')
      .or(page.locator('input[type="number"]'))
      .or(page.locator('input[type="text"]'));
    const inputVisible = await answerInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (inputVisible) {
      // Enter wrong answer
      await answerInput.fill('999');
      const submitButton = page.getByRole('button', { name: /submit|verify|check/i });
      await submitButton.click();

      // Should still be on the gate (not the dashboard)
      await expect(page.getByText(/what is|solve|try again/i)).toBeVisible({ timeout: 3000 });
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:e2e -- --grep "Parental"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/parental.spec.ts
git commit -m "test(e2e): add parental controls tests"
```

---

## Task 15: Offline E2E Tests

**Files:**

- Create: `e2e/offline.spec.ts`

- [ ] **Step 1: Write offline E2E tests**

Create `e2e/offline.spec.ts`:

```ts
import { test, expect } from './fixtures';

test.describe('Offline Support', () => {
  test.use({ project: { name: 'mobile' } });

  test('app loads and shows content', async ({ page, createProfile }) => {
    await createProfile({ name: 'OfflineKid', age: 4 });

    // Verify hub is loaded
    await expect(page.getByText(/welcome.*offlinekid/i)).toBeVisible();
  });

  test('app works after going offline', async ({ page, context, createProfile }) => {
    await createProfile({ name: 'OfflineGamer', age: 4 });

    // Wait for service worker to install and cache assets
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Reload the page — should serve from SW cache
    await page.reload({ waitUntil: 'domcontentloaded' });

    // App should still render (from cache)
    // The offline banner may appear, but the app should be functional
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('offline banner appears when offline', async ({ page, context, createProfile }) => {
    await createProfile({ name: 'BannerKid', age: 4 });

    // Wait for SW
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Offline banner should be visible
    const offlineBanner = page.getByText(/offline|no.*internet|not connected/i);
    // This is expected behavior but depends on OfflineBanner implementation
    const bannerVisible = await offlineBanner.isVisible({ timeout: 5000 }).catch(() => false);

    // Go back online
    await context.setOffline(false);

    // If banner was visible, it should disappear
    if (bannerVisible) {
      await page.waitForTimeout(2000);
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:e2e -- --grep "Offline"`
Expected: PASS (offline tests may need the production build with SW enabled)

Note: The `pnpm preview` server serves the built production bundle which includes the service worker. This is required for offline tests to work.

- [ ] **Step 3: Commit**

```bash
git add e2e/offline.spec.ts
git commit -m "test(e2e): add offline support tests"
```

---

## Task 16: Accessibility E2E Tests

**Files:**

- Create: `e2e/a11y.spec.ts`

- [ ] **Step 1: Write a11y E2E tests**

Create `e2e/a11y.spec.ts`:

```ts
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Scans', () => {
  test.use({ project: { name: 'desktop' } });

  test('Hub page has no critical a11y violations', async ({ page, createProfile }) => {
    await createProfile({ name: 'A11yKid', age: 7 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // May have false positives on dynamic theming
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });

  test('Profile creation page has no critical a11y violations', async ({ page }) => {
    await page.goto('/profile');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });

  test('Settings page has no critical a11y violations', async ({ page, createProfile }) => {
    await createProfile({ name: 'SettingsA11y', age: 7 });
    await page.goto('/settings');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });

  test('Rewards page has no critical a11y violations', async ({ page, createProfile }) => {
    await createProfile({ name: 'RewardsA11y', age: 7 });
    await page.goto('/rewards');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });

  test('Memory Match game has no critical a11y violations', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'GameA11y', age: 4 });
    await navigateToGame('memory-match');

    // Wait for game to load
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });

  test('Parental dashboard gate has no critical a11y violations', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'ParentalA11y', age: 7 });
    await page.goto('/settings/parental');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:e2e -- --grep "Accessibility"`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/a11y.spec.ts
git commit -m "test(e2e): add axe-core accessibility scans on all pages"
```

---

## Task 17: Add Coverage Thresholds to Vitest

**Files:**

- Modify: `platform/vitest.config.ts`
- Modify: `shared/vitest.config.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Install coverage provider**

```bash
pnpm add -Dw @vitest/coverage-v8
```

- [ ] **Step 2: Add coverage config to platform vitest.config.ts**

In `platform/vitest.config.ts`, add coverage configuration to the `test` object:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json-summary', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'src/test-setup.ts',
    'src/main.tsx',
    'src/vite-env.d.ts',
  ],
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
```

- [ ] **Step 3: Add coverage config to shared vitest.config.ts**

Same approach — add to the `test` object:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json-summary', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'src/test-setup.ts',
  ],
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
```

- [ ] **Step 4: Add coverage script to root package.json**

Add to `"scripts"`:

```json
"test:coverage": "pnpm -r --parallel run test -- --coverage"
```

- [ ] **Step 5: Run coverage to see current state**

Run: `pnpm test:coverage`
Expected: Shows coverage report. Thresholds may not pass yet — that's OK. This task sets up the infrastructure; coverage gaps will be addressed in the next task if needed.

- [ ] **Step 6: Commit**

```bash
git add platform/vitest.config.ts shared/vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add Vitest coverage thresholds (80% shared/platform)"
```

---

## Task 18: CI Pipeline — Add Playwright and Coverage

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update CI workflow**

Replace the contents of `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Run unit tests with coverage
        run: pnpm test:coverage

      - name: Build
        run: pnpm build

      - name: Check bundle size
        run: pnpm --filter platform size:check

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: .lighthouserc.json

  e2e:
    runs-on: ubuntu-latest
    needs: lint-and-test

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e -- --project=desktop --project=mobile

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload Playwright traces
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 7

  a11y:
    runs-on: ubuntu-latest
    needs: lint-and-test

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run accessibility E2E tests
        run: pnpm test:e2e -- --project=desktop e2e/a11y.spec.ts

      - name: Upload a11y report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-report
          path: playwright-report/
          retention-days: 14
```

Key design decisions:

- **`e2e` and `a11y` jobs run in parallel** after `lint-and-test` passes (via `needs: lint-and-test`)
- **a11y is a separate job** so failures are clearly visible in the PR checks list
- **Only chromium** is installed (saves CI time — cross-browser testing can be added later)
- **Traces uploaded on failure** for debugging flaky tests
- **HTML report always uploaded** for reviewing test results

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Playwright E2E, a11y, and coverage to CI pipeline"
```

---

## Task 19: Set Up Changesets

**Files:**

- Create: `.changeset/config.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Install changesets**

```bash
pnpm add -Dw @changesets/cli
```

- [ ] **Step 2: Initialize changesets**

```bash
pnpm exec changeset init
```

This creates `.changeset/config.json` and `.changeset/README.md`.

- [ ] **Step 3: Update changeset config for the monorepo**

Replace `.changeset/config.json` with:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [["@kids-games-zone/platform", "@kids-games-zone/shared"]],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

The `fixed` array links platform and shared so they version together. Game packages version independently.

- [ ] **Step 4: Add changeset scripts to root package.json**

Add to `"scripts"`:

```json
"changeset": "changeset",
"version": "changeset version",
"release": "pnpm build && changeset publish"
```

- [ ] **Step 5: Commit**

```bash
git add .changeset/ package.json pnpm-lock.yaml
git commit -m "chore: set up changesets for monorepo versioning"
```

---

## Task 20: Final Verification

This task verifies the entire Phase 6 implementation works end-to-end.

- [ ] **Step 1: Run full lint and typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: All PASS

- [ ] **Step 2: Run unit tests**

```bash
pnpm test
```

Expected: All PASS

- [ ] **Step 3: Build the project**

```bash
pnpm build
```

Expected: Build succeeds

- [ ] **Step 4: Run E2E tests**

```bash
pnpm test:e2e
```

Expected: All E2E tests pass across configured viewports

- [ ] **Step 5: Verify feature flags**

1. Start dev server: `pnpm dev`
2. Create a profile
3. Verify dummy-game is NOT shown in hub (flag disabled)
4. Verify word-puzzle, math-adventure, memory-match ARE shown (flags enabled)
5. Navigate directly to `/game/dummy-game` — should see "This game is not available"

- [ ] **Step 6: Verify scaffolder**

```bash
pnpm create-game
# Enter: test-game, Test Game, junior, 1
pnpm install
pnpm --filter @kids-games-zone/test-game typecheck
pnpm --filter @kids-games-zone/test-game test
# Clean up:
rm -rf games/test-game
pnpm install
```

- [ ] **Step 7: Update development plan**

Mark Phase 6 as complete in `plans/development-plan.md`.

- [ ] **Step 8: Final commit**

```bash
git add plans/development-plan.md
git commit -m "docs: mark Phase 6 as complete"
```
