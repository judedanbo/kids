# Phase 1 — Shared Library & Design System

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Types, design tokens, 9 shared UI components, 3 shared hooks

---

## Summary

Phase 1 builds the shared foundation that the platform shell (Phase 2) and all games (Phase 3+) depend on. It delivers the remaining TypeScript interfaces, a complete design token system with light/dark theming, 9 reusable UI components, and 3 shared hooks.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component scope | P0 + P1 (9 components) | DragItem/DropZone (P2) deferred — no Phase 3 game needs drag-and-drop |
| Animation library | Framer Motion | Rich declarative API, gesture support, built-in prefers-reduced-motion. ~30KB but shell budget has room (61KB current) |
| Celebration effects | canvas-confetti (~3KB) + Framer Motion overlay | canvas-confetti handles particle burst performantly; Framer Motion handles overlay structure/dismiss |
| Component theming API | Props + CSS custom properties | Props for common cases (color, size), CSS custom properties for advanced theming. Props map to custom properties internally |
| Default theme | Light mode | Warm pastels (#FFF8F0), matches kid-app conventions. Dark mode available via `[data-theme="dark"]` on `<html>` |
| Testing strategy | Behavioral tests | Test interactions, callbacks, ARIA attributes, reduced-motion. One test file per component. Visual regression deferred to Phase 6 |

---

## 1A. Remaining Types

Two new files in `shared/src/types/`:

### `platform.ts`

```typescript
interface TimeLimitConfig {
  enabled: boolean;
  dailyLimitMinutes: number;
  sessionLimitMinutes: number;
  reminderBeforeEndMinutes: number;
  cooldownMinutes: number;
  schedule?: {
    allowedDays: number[];       // 0=Sun, 6=Sat
    allowedStartHour: number;
    allowedEndHour: number;
  };
}

interface FeatureFlags {
  [flagName: string]: {
    enabled: boolean;
    rolloutPercentage?: number;  // 0-100
    ageTiers?: AgeTier[];
    description: string;
  };
}
```

### `services.ts`

```typescript
interface AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void;
  stopMusic(options?: { fadeOut?: number }): void;
  playSFX(sfxId: string): void;
  playVoice(voiceId: string, onComplete?: () => void): void;
  setVolume(category: "music" | "sfx" | "voice", level: number): void;
  mute(category?: "music" | "sfx" | "voice"): void;
  unmute(category?: "music" | "sfx" | "voice"): void;
  preload(assetIds: string[]): Promise<void>;
}

interface StorageManager {
  saveProfile(profile: UserProfile): Promise<void>;
  loadProfile(profileId: string): Promise<UserProfile | null>;
  listProfiles(): Promise<UserProfile[]>;
  saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void>;
  loadProgress(profileId: string, gameId: string): Promise<GameProgress | null>;
  saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void>;
  loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null>;
  unlockReward(profileId: string, reward: Reward): Promise<void>;
  getRewards(profileId: string): Promise<Reward[]>;
  logEvent(event: AnalyticsEvent): Promise<void>;
  getEvents(filter: EventFilter): Promise<AnalyticsEvent[]>;
}

interface AnalyticsEvent {
  id: string;
  type: "game_start" | "game_end" | "level_complete" | "reward_unlocked" | "error" | "navigation";
  profileId: string;
  gameId?: string;
  timestamp: string;
  data: Record<string, string | number | boolean>;
}

interface EventFilter {
  profileId?: string;
  gameId?: string;
  type?: AnalyticsEvent["type"];
  startDate?: string;
  endDate?: string;
}
```

All types re-exported through `shared/src/types/index.ts` and the root barrel `shared/src/index.ts`.

---

## 1B. Design Tokens & Styles

Three files in `shared/src/styles/`:

### `tokens.css`

Extracted from `platform/src/styles/global.css` with additions for theming.

**Existing tokens** (move from platform):
- Colors: `--color-primary`, `--color-secondary`, `--color-success`, `--color-error`, `--color-bg-primary`, `--color-bg-secondary`
- Spacing: `--spacing-xs` through `--spacing-xl`
- Radii: `--radius-small` through `--radius-round`
- Typography: `--font-family-display`, `--font-family-body`
- Transitions: `--transition-fast`, `--transition-normal`, `--transition-slow`
- Shadows: `--shadow-card`, `--shadow-button`

**New semantic tokens** for theming:
- `--color-surface` — component background (white in light, #2a2a4a in dark)
- `--color-surface-raised` — elevated surface (white in light, #333360 in dark)
- `--color-text-primary` — main text (#333 in light, #eee in dark)
- `--color-text-secondary` — subdued text (#666 in light, #aaa in dark)
- `--color-border` — borders (#e0d5c8 in light, #2a2a4a in dark)
- `--color-overlay` — modal backdrops

**Age-tier tokens:**
- `--touch-target-size` — 64px (tiny), 48px (junior/explorer)
- `--font-size-base` — 24px (tiny), 18px (junior), 16px (explorer)

**Theme structure:**
```css
:root { /* light mode — default */ }
[data-theme="dark"] { /* dark overrides */ }
```

### `reset.css`

Minimal reset: `box-sizing: border-box`, margin/padding reset, `img { max-width: 100% }`, font inheritance on form elements. No opinions beyond normalization.

### `breakpoints.css`

Custom media queries:
- `--bp-mobile`: 320px
- `--bp-tablet`: 768px
- `--bp-desktop`: 1024px
- `--bp-large`: 1440px

Platform's `global.css` updated to `@import` from `shared/src/styles/tokens.css` instead of defining tokens inline.

---

## 1C. Shared UI Components

### File structure

Each component follows this pattern:
```
shared/src/components/<Name>/
├── <Name>.tsx
├── <Name>.module.css
└── <Name>.test.tsx
```

All exported via `shared/src/components/index.ts`.

### P0 Components

#### `<GameShell>`

Wrapper for every game. Provides consistent header with back/home navigation, title, and pause button. Children slot for game content.

**Props:**
- `title: string` — game name displayed in header
- `onBack?: () => void` — back button handler
- `onPause?: () => void` — pause button handler
- `showPauseButton?: boolean` — default true
- `children: ReactNode`

**Behavior:**
- Header uses `--color-primary` background with white text
- Back button on left, title centered, pause on right
- Children fill remaining viewport height
- Escape key triggers `onPause`

**Tests:** Renders title, fires onBack/onPause callbacks, Escape key triggers pause.

#### `<OptionButton>`

Large answer/choice button with three visual states and press animation.

**Props:**
- `label: string` — button text
- `icon?: ReactNode` — optional leading icon
- `state?: "default" | "correct" | "incorrect"` — visual state
- `disabled?: boolean`
- `onSelect?: () => void`
- `size?: "normal" | "large"` — large = 64dp for tiny tier

**Behavior:**
- Default: `--color-surface` background, `--color-border` border
- Correct: green background tint + checkmark icon + `--color-success` border
- Incorrect: red background tint + X icon + `--color-error` border
- Press animation: scale to 0.95 via Framer Motion (spring)
- Respects `prefers-reduced-motion`: no scale animation, instant state change
- `aria-disabled` when disabled, `role="button"`

**Tests:** Click fires onSelect, correct/incorrect states render icons, disabled state prevents clicks, ARIA attributes present.

#### `<ScoreDisplay>`

Animated score counter with optional star rating.

**Props:**
- `score: number`
- `maxScore?: number`
- `showStars?: boolean` — default false
- `starCount?: number` — default 5
- `animate?: boolean` — default true

**Behavior:**
- Score number rolls up/down on change using Framer Motion `useSpring`
- Stars filled proportionally based on `score / maxScore`
- Stars use `--color-secondary` (orange) when filled, `--color-border` when empty
- `aria-label` announces "Score: X out of Y, N stars"

**Tests:** Renders score value, stars render correct filled count, aria-label is accurate.

#### `<ProgressBar>`

Visual progress indicator with animated fill.

**Props:**
- `current: number`
- `total: number`
- `color?: string` — CSS color or custom property name
- `showLabel?: boolean` — default false
- `label?: string` — custom label, defaults to "X of Y"

**Behavior:**
- Fill width transitions smoothly via CSS transition
- Color defaults to `--color-primary`, overridable via prop → sets `--progress-bar-color`
- `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

**Tests:** Width matches percentage, label renders when enabled, ARIA attributes correct.

#### `<CelebrationOverlay>`

Full-screen celebration with canvas-confetti burst and Framer Motion overlay.

**Props:**
- `type?: "confetti" | "stars"` — confetti burst style
- `duration?: number` — auto-dismiss in ms, default 3000
- `onComplete?: () => void` — called after dismiss
- `title?: string` — e.g., "Amazing Job!"
- `score?: number`
- `maxScore?: number`
- `intensity?: "low" | "medium" | "high"` — maps to age tier feedback levels

**Behavior:**
- Overlay entrance via Framer Motion `AnimatePresence` (fade + scale)
- canvas-confetti fires on mount with particle count scaled by intensity (low: 50, medium: 100, high: 200)
- Auto-dismisses after `duration` with fade-out
- Respects `prefers-reduced-motion`: no confetti, simple fade only
- `aria-live="polite"` announces the celebration text

**Tests:** Renders title, calls onComplete after duration, confetti not fired when reduced-motion preferred.

### P1 Components

#### `<GameTimer>`

Countdown or count-up timer with SVG ring visual.

**Props:**
- `mode: "countdown" | "countup"`
- `duration?: number` — seconds (required for countdown)
- `paused?: boolean`
- `onExpire?: () => void` — countdown reached zero
- `onTick?: (seconds: number) => void`
- `size?: number` — ring diameter in px, default 80

**Behavior:**
- SVG circle with `stroke-dashoffset` animated proportionally
- Countdown: ring depletes, fires `onExpire` at zero, color shifts to `--color-error` in last 10 seconds
- Count-up: ring fills, no expiry
- Pauses when `paused` prop is true
- `aria-label` announces remaining/elapsed time, `aria-live="polite"` on updates

**Tests:** Timer counts down, fires onExpire at zero, pauses correctly, ARIA label updates.

#### `<DifficultySelector>`

Star-based difficulty picker, 1-5 scale.

**Props:**
- `levels?: number` — default 5
- `current: number`
- `onChange: (level: number) => void`
- `labels?: string[]` — e.g., ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"]

**Behavior:**
- Stars fill on hover (preview) and click (select)
- Selected level label shown below stars
- Stars use `--color-secondary` when filled
- `role="radiogroup"` with individual `role="radio"` per star, arrow key navigation

**Tests:** Click selects level, onChange fires with correct value, keyboard navigation works, ARIA roles present.

#### `<InstructionBubble>`

Speech bubble with optional audio trigger.

**Props:**
- `text: string`
- `audioSrc?: string` — audio file to play
- `character?: string` — character name/avatar
- `onAudioPlay?: () => void`

**Behavior:**
- Speech bubble shape via CSS (rounded corners, tail pointing to character)
- Speaker icon (🔊) shown when `audioSrc` provided, triggers playback on click
- Character name shown below bubble
- `aria-label` on audio button: "Play instruction audio"

**Tests:** Renders text, audio button visible when audioSrc provided, fires onAudioPlay.

#### `<PauseMenu>`

Modal overlay with game control options.

**Props:**
- `onResume: () => void`
- `onRestart: () => void`
- `onExit: () => void`

**Behavior:**
- Centered modal over semi-transparent backdrop
- Framer Motion entrance (scale from 0.9 + fade) and exit
- Resume button uses `--color-primary`, restart and exit use `--color-surface`
- Focus trapped inside modal while open
- Escape key triggers `onResume`
- `role="dialog"`, `aria-modal="true"`, `aria-label="Game paused"`

**Tests:** All three callbacks fire on respective button clicks, Escape triggers resume, ARIA dialog attributes present, focus trapped.

---

## 1D. Shared Hooks

### `useGameLifecycle(plugin: GamePlugin)`

**Location:** `shared/src/hooks/useGameLifecycle.ts`

Manages the game state machine:
```
IDLE → LOADED → PLAYING ↔ PAUSED → COMPLETED → IDLE
```

**Returns:** `{ state, load, start, pause, resume, end, reset }`

**Behavior:**
- `load()` calls `plugin.onLoad()`, transitions IDLE → LOADED
- `start(config)` calls `plugin.onStart(config)`, transitions LOADED → PLAYING
- `pause()` calls `plugin.onPause()`, transitions PLAYING → PAUSED
- `resume()` calls `plugin.onResume()`, transitions PAUSED → PLAYING
- `end()` calls `plugin.onEnd()`, returns `GameResult`, transitions → COMPLETED
- `reset()` calls `plugin.onUnload()`, transitions → IDLE
- Invalid transitions are no-ops (e.g., calling `pause()` when not PLAYING)

**Tests:** Each transition calls correct plugin method, invalid transitions are no-ops, state reflects current lifecycle stage.

### `useAgeTier()`

**Location:** `shared/src/hooks/useAgeTier.ts`

**Returns:** `AgeTier` — `"tiny" | "junior" | "explorer"`

Reads from `AgeTierContext`. The platform sets this context based on the active profile's age. Components use it for conditional sizing and feedback intensity.

**Context:** `AgeTierContext` defined in `shared/src/context/AgeTierContext.tsx` with provider and default value of `"junior"`.

**Tests:** Returns correct tier from context, defaults to "junior" when no provider.

### `useFeatureFlag(name: string)`

**Location:** `shared/src/hooks/useFeatureFlag.ts`

**Returns:** `{ enabled: boolean; config: FeatureFlags[string] | undefined }`

Reads from `FeatureFlagContext`. Returns `{ enabled: false }` for unknown flags.

**Context:** `FeatureFlagContext` defined in `shared/src/context/FeatureFlagContext.tsx`. Provider accepts a `flags: FeatureFlags` prop (loaded from bundled JSON config).

**Tests:** Returns enabled state for known flags, returns false for unknown flags, respects ageTier filtering.

---

## Dependencies

### `shared/package.json` additions

```json
{
  "dependencies": {
    "canvas-confetti": "^1.9.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.0.0"
  }
}
```

### Root `package.json` additions (devDependencies)

```json
{
  "framer-motion": "^11.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "jsdom": "^25.0.0"
}
```

### Vitest config update

Add `jsdom` environment for component tests. Configure `@testing-library/jest-dom` matchers globally.

---

## File Structure Summary

```
shared/src/
├── types/
│   ├── game.ts              # (exists)
│   ├── user.ts              # (exists)
│   ├── platform.ts          # (new)
│   ├── services.ts          # (new)
│   └── index.ts             # (new) barrel
├── components/
│   ├── GameShell/
│   ├── OptionButton/
│   ├── ScoreDisplay/
│   ├── ProgressBar/
│   ├── CelebrationOverlay/
│   ├── GameTimer/
│   ├── DifficultySelector/
│   ├── InstructionBubble/
│   ├── PauseMenu/
│   └── index.ts             # barrel
├── hooks/
│   ├── useGameLifecycle.ts
│   ├── useGameLifecycle.test.ts
│   ├── useAgeTier.ts
│   ├── useAgeTier.test.ts
│   ├── useFeatureFlag.ts
│   ├── useFeatureFlag.test.ts
│   └── index.ts
├── context/
│   ├── AgeTierContext.tsx
│   └── FeatureFlagContext.tsx
├── styles/
│   ├── tokens.css
│   ├── reset.css
│   └── breakpoints.css
└── index.ts                  # (update) re-export all
```

---

## Acceptance Criteria

- [ ] `shared` package builds cleanly and can be imported from `platform`
- [ ] Each of the 9 components has behavioral tests (Vitest + React Testing Library)
- [ ] All 3 hooks have unit tests
- [ ] Design tokens render correctly in both light and dark themes
- [ ] Components use only CSS custom properties — no hardcoded colors
- [ ] Components respect `prefers-reduced-motion`
- [ ] All interactive components have appropriate ARIA attributes
- [ ] `pnpm lint` and `pnpm typecheck` pass with zero errors
- [ ] `pnpm test` passes across all packages
