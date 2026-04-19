# Game Developer Guide — Kids Games Zone

A practical reference for adding new games to the platform. Follow this guide from scaffold to ship.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [GamePlugin Interface](#2-gameplugin-interface)
3. [GameProps](#3-gameprops)
4. [GameManifest](#4-gamemanifest)
5. [Shared Components](#5-shared-components)
6. [Audio](#6-audio)
7. [Localization](#7-localization)
8. [Styling](#8-styling)
9. [Testing](#9-testing)
10. [Bundle Budget](#10-bundle-budget)
11. [Registration](#11-registration)
12. [Pre-submit Checklist](#12-pre-submit-checklist)

---

## 1. Quick Start

### Scaffold a new game

```bash
pnpm create-game
```

You will be prompted for a game name (e.g. `color-match`). The scaffolder generates:

```
games/color-match/
  package.json
  tsconfig.json
  vite.config.ts
  src/
    index.ts            # GamePlugin export (entry point)
    ColorMatch.tsx      # Root GameComponent
    ColorMatch.module.css
    locales/
      en/color-match.json
      fr/color-match.json
    __tests__/
      ColorMatch.test.tsx
```

### Run it

```bash
pnpm dev
```

Open `http://localhost:3000`. The platform automatically discovers registered games and shows them on the Hub.

> The game will not appear until you complete [Registration](#11-registration). The scaffolder adds the manifest and feature flag for you with `enabled: false` — flip it to `true` when ready.

---

## 2. GamePlugin Interface

Every game must export a single default `GamePlugin` object from its `src/index.ts`.

```ts
// shared/src/types/game.ts

export interface GamePlugin {
  manifest: GameManifest;
  onLoad(): Promise<void>;
  onStart(config: GameConfig): void;
  onPause(): void;
  onResume(): void;
  onEnd(): GameResult;
  onUnload(): void;
  GameComponent: ComponentType<GameProps>;
}
```

### Lifecycle hooks

The platform calls these hooks in order. The state machine is:

```
IDLE → onLoad() → LOADED → onStart() → PLAYING
                                           ↓ ↑
                                       onPause() / onResume()
                                           ↓
                                       onEnd() → COMPLETED → onUnload() → IDLE
```

#### `onLoad(): Promise<void>`

Called once when the platform lazy-loads the game module. Use this to preload assets, initialize data structures, or prime caches. Keep it fast — the player sees a loading indicator while this runs.

```ts
onLoad: async () => {
  await audioManager.preload(['correct', 'incorrect', 'celebrate']);
},
```

#### `onStart(config: GameConfig): void`

Called when the player clicks Play. Initialize all mutable game state here. `config` contains the player's profile, selected difficulty, and global settings.

```ts
onStart: (config: GameConfig) => {
  _startTime = Date.now();
  _score = 0;
  _difficulty = config.difficulty;
},
```

#### `onPause(): void`

Called automatically when the browser tab loses focus (visibility change). Save any mid-game state you need to restore on resume.

#### `onResume(): void`

Called when the tab regains focus. Restart timers, resume audio, etc.

#### `onEnd(): GameResult`

Called when the game completes (player wins, loses, or time expires). Return the final `GameResult`. This is the authoritative score the platform persists.

```ts
onEnd: () => {
  const timeSpent = Math.round((Date.now() - _startTime) / 1000);
  return {
    gameId: 'color-match',
    score: _score,
    maxScore: 100,
    timeSpent,
    difficulty: _difficulty,
    completedAt: new Date().toISOString(),
    metrics: { correctAnswers: _correct, totalRounds: _total },
  };
},
```

#### `onUnload(): void`

Called when the platform unmounts the game (player navigates away, or after `onEnd`). Reset all module-level state so the game is clean for the next session.

```ts
onUnload: () => {
  _startTime = 0;
  _score = 0;
  _difficulty = 1;
},
```

### Minimal complete example

```ts
// games/color-match/src/index.ts
import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { ColorMatch } from './ColorMatch';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'color-match',
    name: 'Color Match',
    description: 'Tap the matching colors before time runs out!',
    thumbnail: '/images/games/color-match.webp',
    ageRange: [3, 5],
    skills: ['memory', 'motor_skills'],
    version: '1.0.0',
    entryPoint: '../../../games/color-match/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 3,
    estimatedPlayTime: 3,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '2026-05-01',
    tags: ['colors', 'matching', 'visual'],
  },

  onLoad: async () => {},

  onStart: (config: GameConfig) => {
    _startTime = Date.now();
    _score = 0;
    _difficulty = config.difficulty;
  },

  onPause: () => {},
  onResume: () => {},

  onEnd: () => ({
    gameId: 'color-match',
    score: _score,
    maxScore: 60,
    timeSpent: Math.round((Date.now() - _startTime) / 1000),
    difficulty: _difficulty,
    completedAt: new Date().toISOString(),
    metrics: {},
  }),

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: ColorMatch,
};

export default plugin;
```

---

## 3. GameProps

The platform passes `GameProps` to your `GameComponent`. Destructure only what you need.

```ts
// shared/src/types/game.ts

export interface GameProps {
  config: GameConfig;
  onScore: (points: number) => void;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  audioManager: AudioManager;
  storageManager: StorageManager;
}
```

### `config: GameConfig`

```ts
export interface GameConfig {
  difficulty: number; // 1–maxDifficulty (from manifest)
  profile: UserProfile; // Active player profile
  settings: GameSettings; // Sound, language, high-contrast flags
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  language: string; // e.g. 'en', 'fr'
  highContrastMode: boolean;
}
```

Use `config.difficulty` to scale word count, time limits, grid size, etc. Use `config.profile.ageTier` (`'tiny'` | `'junior'` | `'explorer'`) for additional UI adjustments.

### `onScore(points: number)`

Call this every time the player earns points during play. The platform accumulates the running total in its own state. Do not track the total yourself — just emit increments.

```ts
onScore(10); // player answered correctly
onScore(5); // bonus for speed
```

### `onComplete(result: GameResult)`

Call this exactly once when the game session ends. Pass the full `GameResult` (see `onEnd` above for the shape). This triggers the end-of-game screen and persists progress.

```ts
onComplete({
  gameId: 'color-match',
  score: 45,
  maxScore: 60,
  timeSpent: 87,
  difficulty: 2,
  completedAt: new Date().toISOString(),
  metrics: { correctAnswers: 9, totalRounds: 12 },
});
```

### `onExit()`

Call this when the player taps the Back button or otherwise wants to leave mid-game. The platform navigates to the Hub. You do not need to call `onComplete` first.

### `audioManager: AudioManager`

See [Section 6 — Audio](#6-audio).

### `storageManager: StorageManager`

Use for persisting mid-game checkpoints or loading high scores. The full interface:

```ts
interface StorageManager {
  saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void>;
  loadProgress(profileId: string, gameId: string): Promise<GameProgress | null>;
  saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void>;
  loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null>;
  unlockReward(profileId: string, reward: Reward): Promise<void>;
  getRewards(profileId: string): Promise<Reward[]>;
  // ... profile and analytics methods
}
```

Access the active profile ID via `config.profile.id`.

---

## 4. GameManifest

Declare the manifest inline in your `src/index.ts`. All fields are required.

```ts
export interface GameManifest {
  id: string; // kebab-case, unique across all games
  name: string; // Display name shown on GameCard
  description: string; // One sentence shown below the title
  thumbnail: string; // Path under /public/images/games/<name>.webp
  ageRange: [number, number]; // [minAge, maxAge], e.g. [3, 5] or [6, 12]
  skills: SkillCategory[]; // See skill categories below
  version: string; // Semver, e.g. '1.0.0'
  entryPoint: string; // Relative path from platform/src to your index.ts
  minDifficulty: number; // Minimum difficulty level (usually 1)
  maxDifficulty: number; // Maximum difficulty level (1–10 recommended)
  estimatedPlayTime: number; // Minutes per session
  offlineCapable: boolean; // true if game works without network
  status: 'active' | 'beta' | 'coming_soon' | 'retired';
  releaseDate: string; // ISO date string, e.g. '2026-05-01'
  tags: string[]; // Searchable keywords
}
```

### Skill categories

```ts
type SkillCategory =
  | 'literacy'
  | 'numeracy'
  | 'logic'
  | 'memory'
  | 'creativity'
  | 'motor_skills'
  | 'science'
  | 'social_skills';
```

### Entry point convention

The `entryPoint` field is a path **relative to `platform/src/`** to your game's `index.ts`:

```ts
entryPoint: '../../../games/color-match/src/index.ts',
```

This matches the pattern used by every existing game:

| Game           | Entry point                                  |
| -------------- | -------------------------------------------- |
| word-puzzle    | `../../../games/word-puzzle/src/index.ts`    |
| memory-match   | `../../../games/memory-match/src/index.ts`   |
| math-adventure | `../../../games/math-adventure/src/index.ts` |

### Status values

| Value         | Meaning                                          |
| ------------- | ------------------------------------------------ |
| `active`      | Fully released; shown to all players             |
| `beta`        | Released with a Beta badge; shown to all players |
| `coming_soon` | Placeholder card; not playable                   |
| `retired`     | Hidden from the Hub                              |

---

## 5. Shared Components

Import everything from `@kids-games-zone/shared`. All components handle accessibility (ARIA, focus management, reduced-motion) automatically.

```ts
import {
  GameShell,
  OptionButton,
  ScoreDisplay,
  ProgressBar,
  CelebrationOverlay,
  GameTimer,
  DifficultySelector,
  InstructionBubble,
  PauseMenu,
} from '@kids-games-zone/shared';
```

### Component reference

| Component            | Key props                                                                                                                                 | Notes                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameShell`          | `title`, `onBack?`, `onPause?`, `showPauseButton?`, `children`                                                                            | Wraps every game. Renders header with Back button, title, and pause button. Includes `SkipLink` and `Announcer` for accessibility. Press Escape to trigger `onPause`. |
| `OptionButton`       | `label`, `state?` (`'default'`/`'correct'`/`'incorrect'`), `onSelect?`, `icon?`, `disabled?`, `selected?`, `size?` (`'normal'`/`'large'`) | Animated tap button. Shows ✓/✗ icons for feedback states. Respects `prefers-reduced-motion`.                                                                          |
| `ScoreDisplay`       | `score`, `maxScore?`, `showStars?`, `starCount?`, `animate?`                                                                              | Animates score changes with a spring. Live region for screen readers.                                                                                                 |
| `ProgressBar`        | `current`, `total`, `color?`, `showLabel?`, `label?`                                                                                      | `role="progressbar"` with aria attributes. Accepts custom CSS color via `color` prop.                                                                                 |
| `CelebrationOverlay` | `onComplete?`, `title?`, `score?`, `maxScore?`, `type?` (`'confetti'`/`'stars'`), `duration?`, `intensity?`                               | Fires confetti/stars on mount, auto-dismisses after `duration` ms. Skips animation when `prefers-reduced-motion` is set.                                              |
| `GameTimer`          | `mode` (`'countdown'`/`'countup'`), `duration?`, `paused?`, `onExpire?`, `onTick?`, `size?`                                               | SVG ring timer. Announces time every 10 s via `aria-live`. Turns red at 10 s remaining in countdown mode.                                                             |
| `DifficultySelector` | `current`, `onChange`, `levels?`, `labels?`                                                                                               | Star-based selector. Full keyboard support (arrow keys). `role="radiogroup"`.                                                                                         |
| `InstructionBubble`  | `text`, `audioSrc?`, `character?`, `onAudioPlay?`                                                                                         | Speech-bubble for game instructions. Optional character emoji/image. Optional audio replay button.                                                                    |
| `PauseMenu`          | `onResume`, `onRestart`, `onExit`                                                                                                         | Modal dialog with focus trap. Escape key resumes. Use inside `AnimatePresence` from framer-motion for enter/exit animation.                                           |

### Usage example

```tsx
import {
  GameShell,
  InstructionBubble,
  OptionButton,
  ScoreDisplay,
  ProgressBar,
  CelebrationOverlay,
  PauseMenu,
  GameTimer,
} from '@kids-games-zone/shared';
import type { GameProps } from '@kids-games-zone/shared';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function ColorMatch({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('color-match');
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);

  return (
    <GameShell title={t('title')} onBack={onExit} onPause={() => setPaused(true)}>
      <ScoreDisplay score={score} maxScore={60} showStars />
      <GameTimer mode="countdown" duration={60} paused={paused} onExpire={handleExpire} />
      <ProgressBar current={round} total={totalRounds} showLabel />

      {/* ... game content ... */}

      <AnimatePresence>
        {paused && (
          <PauseMenu onResume={() => setPaused(false)} onRestart={handleRestart} onExit={onExit} />
        )}
      </AnimatePresence>
    </GameShell>
  );
}
```

---

## 6. Audio

The `audioManager` is passed via `GameProps`. It abstracts away all Web Audio API complexity. Respect `config.settings.soundEnabled` and `config.settings.musicEnabled` before playing — the audio manager handles muting internally, but guarding calls avoids unnecessary work.

### Sound effects

```ts
audioManager.playSFX('correct'); // Player answered correctly
audioManager.playSFX('incorrect'); // Wrong answer
audioManager.playSFX('celebrate'); // Game complete
audioManager.playSFX('click'); // UI tap/select
```

SFX IDs are registered in the platform's audio asset manifest. For custom sounds, add your asset file to `public/audio/sfx/` and register it.

### Music

```ts
audioManager.playMusic('game-bgm', { loop: true, fadeIn: 1000 });
audioManager.stopMusic({ fadeOut: 500 });
```

### Voice

```ts
audioManager.playVoice('instruction-en', () => {
  // called when voice line finishes
});
```

### Preloading assets

Preload in `onLoad` to avoid latency during play:

```ts
onLoad: async () => {
  await audioManager.preload(['correct', 'incorrect', 'celebrate', 'click']);
},
```

### Full AudioManager interface

```ts
interface AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void;
  stopMusic(options?: { fadeOut?: number }): void;
  playSFX(sfxId: string): void;
  playVoice(voiceId: string, onComplete?: () => void): void;
  setVolume(category: 'music' | 'sfx' | 'voice', level: number): void;
  mute(category?: 'music' | 'sfx' | 'voice'): void;
  unmute(category?: 'music' | 'sfx' | 'voice'): void;
  preload(assetIds: string[]): Promise<void>;
}
```

---

## 7. Localization

The platform supports English (`en`) and French (`fr`). All user-facing text must be localized — this is required for release.

### Step 1: Create locale files

```
games/color-match/src/locales/en/color-match.json
games/color-match/src/locales/fr/color-match.json
```

**`en/color-match.json`:**

```json
{
  "title": "Color Match",
  "instruction": "Tap the color that matches the word!",
  "letsGo": "Let's Go!",
  "correct": "Great match!",
  "incorrect": "Oops, try again!",
  "celebrationTitle": "You did it!"
}
```

**`fr/color-match.json`:**

```json
{
  "title": "Correspondance de couleurs",
  "instruction": "Appuie sur la couleur qui correspond au mot !",
  "letsGo": "C'est parti !",
  "correct": "Super !",
  "incorrect": "Oups, réessaie !",
  "celebrationTitle": "Bravo !"
}
```

Use `{{variable}}` for interpolation:

```json
{ "score": "Score : {{score}} sur {{max}}" }
```

```ts
t('score', { score: 45, max: 60 });
// → "Score : 45 sur 60"
```

### Step 2: Register in platform/src/i18n.ts

Add your locale imports and extend the `resources` object:

```ts
// platform/src/i18n.ts

import enColorMatch from '../../games/color-match/src/locales/en/color-match.json';
import frColorMatch from '../../games/color-match/src/locales/fr/color-match.json';

i18n.init({
  resources: {
    en: {
      common: enCommon,
      'memory-match': enMemoryMatch,
      'word-puzzle': enWordPuzzle,
      'color-match': enColorMatch, // add this line
    },
    fr: {
      common: frCommon,
      'memory-match': frMemoryMatch,
      'word-puzzle': frWordPuzzle,
      'color-match': frColorMatch, // add this line
    },
  },
  // ...
});
```

### Step 3: Use in your component

```tsx
import { useTranslation } from 'react-i18next';

export function ColorMatch(props: GameProps) {
  const { t } = useTranslation('color-match'); // namespace = game id

  return (
    <GameShell title={t('title')} onBack={props.onExit}>
      <InstructionBubble text={t('instruction')} />
      <OptionButton label={t('letsGo')} onSelect={handleStart} />
    </GameShell>
  );
}
```

The namespace string must exactly match the key you used in `resources` (`'color-match'` in the example above).

---

## 8. Styling

### CSS Modules

Each component gets its own `.module.css` file. Class names are locally scoped.

```
ColorMatch.tsx
ColorMatch.module.css
```

```css
/* ColorMatch.module.css */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.card {
  min-height: var(--touch-target-size);
  border-radius: var(--radius-medium);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  transition: transform var(--transition-fast);
}
```

```tsx
import styles from './ColorMatch.module.css';

<div className={styles.grid}>
  <button className={styles.card}>Red</button>
</div>;
```

No Tailwind, no CSS-in-JS, no inline style objects (unless applying dynamic CSS custom properties).

### Design tokens

All tokens come from `shared/src/styles/tokens.css` and are available globally as CSS custom properties.

| Token                    | Value                  | Use for                          |
| ------------------------ | ---------------------- | -------------------------------- |
| `--color-primary`        | `#4a90d9`              | Primary actions, highlights      |
| `--color-secondary`      | `#ff8c42`              | Secondary actions, accents       |
| `--color-success`        | `#4caf50`              | Correct feedback                 |
| `--color-error`          | `#e57373`              | Incorrect feedback               |
| `--color-bg-primary`     | `#fff8f0`              | Page/container backgrounds       |
| `--color-bg-secondary`   | `#f0f4ff`              | Card/panel backgrounds           |
| `--color-surface`        | `#ffffff`              | Elevated surfaces                |
| `--color-text-primary`   | `#333333`              | Body text                        |
| `--color-text-secondary` | `#666666`              | Captions, labels                 |
| `--color-border`         | `#e0d5c8`              | Dividers, card borders           |
| `--radius-small`         | `8px`                  | Small chips, tags                |
| `--radius-medium`        | `16px`                 | Cards, buttons                   |
| `--radius-large`         | `24px`                 | Large panels, modals             |
| `--radius-round`         | `50%`                  | Circular elements                |
| `--spacing-xs`           | `4px`                  | Tight gaps                       |
| `--spacing-sm`           | `8px`                  | Inner padding                    |
| `--spacing-md`           | `16px`                 | Standard gaps                    |
| `--spacing-lg`           | `24px`                 | Section spacing                  |
| `--spacing-xl`           | `32px`                 | Page-level spacing               |
| `--font-family-display`  | `'Baloo 2', cursive`   | Headings, titles                 |
| `--font-family-body`     | `'Nunito', sans-serif` | Body copy                        |
| `--font-size-base`       | tier-dependent         | Set on `:root`, use `em`/`rem`   |
| `--touch-target-size`    | tier-dependent         | Minimum interactive element size |
| `--transition-fast`      | `150ms ease`           | Hover/tap responses              |
| `--transition-normal`    | `300ms ease-in-out`    | State transitions                |
| `--shadow-card`          | `0 4px 12px …`         | Card elevation                   |
| `--shadow-button`        | `0 2px 8px …`          | Button elevation                 |

All tokens automatically adapt to dark theme (`[data-theme="dark"]`) and high-contrast mode (`[data-high-contrast="true"]`) — you get this for free when you use the tokens consistently.

### Age-tier adaptive styles

The platform sets `data-age-tier` on the `<body>` element based on the active profile. Use this attribute for tier-specific overrides:

| Tier       | Ages | `--touch-target-size` | `--font-size-base` |
| ---------- | ---- | --------------------- | ------------------ |
| `tiny`     | 3–5  | `64px`                | `24px`             |
| `junior`   | 6–8  | `48px`                | `18px`             |
| `explorer` | 9–12 | `48px`                | `16px`             |

```css
/* Default (junior) */
.card {
  padding: var(--spacing-md);
}

/* Larger tap targets for tiny players */
[data-age-tier='tiny'] .card {
  padding: var(--spacing-lg);
  font-size: 1.2em;
}

/* More information density for explorers */
[data-age-tier='explorer'] .grid {
  grid-template-columns: repeat(4, 1fr);
}
```

Always size interactive elements to at least `var(--touch-target-size)` in both dimensions.

---

## 9. Testing

### Setup

Tests run with Vitest + React Testing Library + vitest-axe. Configuration is inherited from the workspace root.

```bash
pnpm --filter color-match test        # run tests for your game
pnpm --filter color-match test --ui   # open Vitest UI
pnpm test                             # run all workspace tests
```

### Mock props helper

Copy this `createMockProps` pattern into your `__tests__/ColorMatch.test.tsx`. It constructs a valid `GameProps` object with all callbacks mocked:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ColorMatch } from '../ColorMatch';
import type { GameProps } from '@kids-games-zone/shared';

function createMockProps(overrides: Partial<GameProps> = {}): GameProps {
  return {
    config: {
      difficulty: 1,
      profile: {
        id: 'test',
        name: 'Test',
        avatar: '',
        age: 5,
        ageTier: 'tiny',
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
      playSFX: vi.fn(),
      playMusic: vi.fn(),
      stopMusic: vi.fn(),
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
```

### What to test

```tsx
describe('ColorMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders without crashing
  it('renders the game title', () => {
    render(<ColorMatch {...createMockProps()} />);
    expect(screen.getByText('Color Match')).toBeTruthy();
  });

  // 2. Core interaction fires onScore
  it('calls onScore when player matches correctly', () => {
    const props = createMockProps();
    render(<ColorMatch {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /red/i }));
    expect(props.onScore).toHaveBeenCalledWith(expect.any(Number));
  });

  // 3. Audio feedback
  it('plays correct SFX on match', () => {
    const props = createMockProps();
    render(<ColorMatch {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /red/i }));
    expect(props.audioManager.playSFX).toHaveBeenCalledWith('correct');
  });

  // 4. Game completion
  it('calls onComplete when all rounds finish', () => {
    // ... simulate completing all rounds
    expect(props.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 'color-match' }),
    );
  });

  // 5. Accessibility — run axe on the initial render
  it('has no accessibility violations', async () => {
    const { container } = render(<ColorMatch {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  }, 15000);
});
```

### Accessibility requirements

- Pass `axe(container)` with no violations on the game's initial state.
- All interactive elements must have accessible names (`aria-label`, visible text, or associated `<label>`).
- Focus must be visible and follow a logical tab order.
- Touch targets must meet `var(--touch-target-size)` for the target age tier.
- Do not suppress reduced-motion preferences — use `useReducedMotion()` from framer-motion.

---

## 10. Bundle Budget

Each game package must stay under **100 KB gzip**. The platform lazy-loads games, so a bloated game package delays the first interactive frame for the player.

### Check your bundle size

```bash
pnpm --filter platform build
pnpm --filter platform size:check
```

The output reports per-chunk gzip sizes. Your game's chunk should appear separately because of the `React.lazy()` split.

### Staying within budget

- Do not bundle large sprite sheets or audio files — serve them from `/public/` and reference by URL.
- Avoid importing large utility libraries (lodash, moment, etc.). Use native alternatives.
- Keep game-specific dependencies minimal. Heavy shared dependencies (React, framer-motion) are already in the platform bundle and are not re-included in your chunk.
- If you need a large dependency that is game-specific, consider code-splitting within your game using dynamic `import()`.

---

## 11. Registration

Two files need to be updated before the platform knows about your game.

### Step 1: Add to gameRegistry.ts

```ts
// platform/src/config/gameRegistry.ts
import type { GameManifest } from '@kids-games-zone/shared';

export const gameRegistry: GameManifest[] = [
  // ... existing entries ...
  {
    id: 'color-match',
    name: 'Color Match',
    description: 'Tap the matching colors before time runs out!',
    thumbnail: '/images/games/color-match.webp',
    ageRange: [3, 5],
    skills: ['memory', 'motor_skills'],
    version: '1.0.0',
    entryPoint: '../../../games/color-match/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 3,
    estimatedPlayTime: 3,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '2026-05-01',
    tags: ['colors', 'matching', 'visual'],
  },
];
```

The `id` here must exactly match the `id` field in your `GamePlugin.manifest`.

### Step 2: Add feature flag to featureFlags.json

```json
// platform/src/config/featureFlags.json
{
  "game.color-match": {
    "enabled": false,
    "description": "Color Match game — tap matching colors"
  }
}
```

Set `enabled: false` initially. The GameWrapper component guards the game route behind this flag — when false, the game card links to a "coming soon" page instead of launching the game. Flip to `true` once the game passes QA.

The flag key format is always `game.<game-id>`.

---

## 12. Pre-submit Checklist

Before opening a pull request, verify every item below.

### Code

- [ ] `GamePlugin` default export from `src/index.ts` implements all six lifecycle methods
- [ ] `manifest.id` is unique, kebab-case, and matches the feature flag key (`game.<id>`)
- [ ] `manifest.entryPoint` uses the correct relative path from `platform/src/`
- [ ] All game state is reset in `onUnload()` so the game can be re-played cleanly
- [ ] `onComplete` is called exactly once per session with a valid `GameResult`
- [ ] `onScore` is called with increments (not the total)
- [ ] No TypeScript errors: `pnpm typecheck` passes

### Linting and formatting

- [ ] `pnpm lint` passes with no errors or warnings
- [ ] `pnpm format:check` passes (run `pnpm format` to fix)

### Testing

- [ ] Tests are in `src/__tests__/<GameName>.test.tsx`
- [ ] `createMockProps` helper is used for all test cases
- [ ] Core user interactions are covered (start, correct answer, wrong answer, complete)
- [ ] `axe(container)` accessibility check passes
- [ ] `pnpm --filter <game-name> test` passes

### Accessibility

- [ ] All buttons and interactive elements have accessible names
- [ ] Focus order is logical and visible
- [ ] Interactive elements meet minimum touch target size (`var(--touch-target-size)`)
- [ ] Animations respect `prefers-reduced-motion` (use `useReducedMotion()`)
- [ ] Color is never the only means of conveying information

### Localization

- [ ] `src/locales/en/<game-name>.json` exists with all string keys
- [ ] `src/locales/fr/<game-name>.json` exists with all string keys translated
- [ ] Both locale files registered in `platform/src/i18n.ts`
- [ ] `useTranslation('<game-name>')` used in the component (not hardcoded strings)

### Styling

- [ ] CSS Modules used (no inline styles, no global class names)
- [ ] Design tokens used for colors, spacing, radii, and typography
- [ ] Game is usable at all three age tiers (tiny, junior, explorer)
- [ ] Dark theme and high-contrast mode are functional (tokens handle this automatically)

### Bundle and registration

- [ ] Bundle size is under 100 KB gzip (`pnpm --filter platform size:check`)
- [ ] Manifest added to `platform/src/config/gameRegistry.ts`
- [ ] Feature flag added to `platform/src/config/featureFlags.json` with `enabled: false`
- [ ] Thumbnail image added to `public/images/games/<game-name>.webp`
- [ ] Game package added to `pnpm-workspace.yaml` (if not done by scaffolder)

### Final verification

- [ ] `pnpm build` succeeds with no errors
- [ ] Game launches and plays through to completion in `pnpm dev`
- [ ] Game works at all three difficulty levels
- [ ] Back button and pause menu work correctly
