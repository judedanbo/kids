# Phase 2 — Platform Shell & Core Services

**Date:** 2026-03-15
**Status:** Approved
**Scope:** State management, IndexedDB storage, stub audio, routing, game hub, profile system, game plugin loader, dummy game

---

## Summary

Phase 2 builds the platform shell — the functional application that hosts games. It delivers state management (React Context + useReducer), IndexedDB persistence via `idb`, a stub AudioManager, React Router routing with a bottom tab bar, the game hub home screen, a profile creation/selection system, the game plugin loader with error boundaries, and a dummy game that validates the entire pipeline end-to-end.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audio service | Stub AudioManager (no-op) | Real implementation deferred — will use adapter pattern for swappable audio backend |
| IndexedDB library | `idb` (~1.4KB) | Thin promise wrapper, schema versioning, negligible bundle cost |
| Profile PIN | Deferred to Phase 4 | PIN hashing + verification is a coherent unit with parental controls |
| Navigation | Bottom tab bar everywhere | Consistent across devices, thumb-friendly, kids don't need to learn different patterns |
| Hub layout | Welcome + Grid | Personalized greeting, uniform game card grid, highlight border on recently-played games |
| Dummy game | Light demo using shared components | Exercises GameShell, OptionButton, ProgressBar, CelebrationOverlay inside the plugin system |
| Rewards/Settings pages | Placeholders | Routes wired for nav bar, real content in Phase 4 |

---

## 2A. State Management

### `platform/src/context/PlatformContext.tsx`

React Context + `useReducer` for global state.

**State shape:**

```typescript
interface PlatformSettings {
  theme: 'light' | 'dark';
  language: string;
}

interface GlobalState {
  currentProfile: UserProfile | null;
  profiles: UserProfile[];
  gameRegistry: GameManifest[];
  session: {
    activeGameId: string | null;
    startedAt: string | null;
    elapsedTime: number;
  };
  settings: PlatformSettings;
}
```

**Actions:**

```typescript
type PlatformAction =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'ADD_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROGRESS'; payload: { profileId: string; gameId: string; progress: GameProgress } }
  | { type: 'REGISTER_GAME'; payload: GameManifest }
  | { type: 'START_SESSION'; payload: { gameId: string } }
  | { type: 'END_SESSION' }
  | { type: 'UNLOCK_REWARD'; payload: { profileId: string; reward: Reward } }
  | { type: 'LOAD_PROFILES'; payload: UserProfile[] }
  | { type: 'SET_SETTINGS'; payload: Partial<PlatformSettings> };
```

**`PlatformProvider`** wraps the entire app. On mount:
1. Loads profiles from IndexedDB via StorageManager
2. Sets the last active profile (or null if none)
3. Loads game registry

State changes that affect persistence (SET_PROFILE, ADD_PROFILE, UPDATE_PROGRESS, UNLOCK_REWARD) trigger async writes to IndexedDB. The pattern: `PlatformProvider` watches specific state slices via `useEffect` (e.g., `useEffect(() => { storage.saveProfile(state.currentProfile) }, [state.currentProfile])`). The reducer stays pure and synchronous; persistence is a side effect of state changes.

On mount, the game registry is loaded from the static config file (`gameRegistry.ts`), not from IndexedDB. Game manifests are bundled with the app.

**`PlatformSettings` vs. `UserProfile.preferences`:** `PlatformSettings` holds app-level defaults (theme, language). Per-profile `preferences` override these when a profile is active. The platform reads `currentProfile.preferences` when a profile is set, falling back to `PlatformSettings` for unset values.

**`usePlatform()` hook:** Returns `{ state, dispatch }` from context. Used by all platform pages.

---

## 2B. Storage Service

### `platform/src/services/storage.ts`

Implements the `StorageManager` interface from `shared/src/types/services.ts` using `idb`.

**IndexedDB database:** `kids-games-zone`

**Schema (version 1):**

| Store | Key Path | Indexes |
|-------|----------|---------|
| `profiles` | `id` | `name` |
| `progress` | `[profileId, gameId]` (compound) | `profileId`, `gameId`, `lastPlayedAt` |
| `rewards` | auto-increment | `profileId`, `rewardId` |
| `events` | `id` | `profileId`, `timestamp`, `type` |

**Schema versioning:** The `idb` `openDB` upgrade callback handles migrations. Version 1 creates all four stores. Future versions add migration logic inside the same callback with version checks.

**Implementation details:**
- `saveProfile` / `loadProfile` / `listProfiles` / `deleteProfile` — CRUD on `profiles` store
- `saveProgress` / `loadProgress` — uses compound key `[profileId, gameId]`
- `saveCheckpoint` / `loadCheckpoint` — stores checkpoint data as a JSON blob inside the `progress` record's `checkpointData` field
- `unlockReward` / `getRewards` — adds to `rewards` store, queries by `profileId` index
- `logEvent` / `getEvents` — writes to `events` store, `getEvents` filters by `EventFilter` fields using index cursors

**Auto-save checkpoint:** The `GameWrapper` page (not the storage service) runs a 30-second interval timer during active play. It calls `storageManager.saveCheckpoint()` with the game's current state.

**Singleton:** Created once at app startup, passed via context. Not instantiated per-component.

---

## 2C. Audio Service (Stub)

### `platform/src/services/audio.ts`

Implements the `AudioManager` interface with no-op methods.

```typescript
class StubAudioManager implements AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void {
    console.log('[AudioManager] playMusic:', trackId, options);
  }
  stopMusic(options?: { fadeOut?: number }): void {
    console.log('[AudioManager] stopMusic:', options);
  }
  playSFX(sfxId: string): void {
    console.log('[AudioManager] playSFX:', sfxId);
  }
  playVoice(voiceId: string, onComplete?: () => void): void {
    console.log('[AudioManager] playVoice:', voiceId);
    onComplete?.();
  }
  setVolume(category: 'music' | 'sfx' | 'voice', level: number): void {
    console.log('[AudioManager] setVolume:', category, level);
  }
  mute(category?: 'music' | 'sfx' | 'voice'): void {
    console.log('[AudioManager] mute:', category ?? 'all');
  }
  unmute(category?: 'music' | 'sfx' | 'voice'): void {
    console.log('[AudioManager] unmute:', category ?? 'all');
  }
  async preload(assetIds: string[]): Promise<void> {
    console.log('[AudioManager] preload:', assetIds);
  }
}
```

**Design for replaceability:** The stub is a class implementing the interface. The real AudioManager (built separately, later) will also implement the interface and use an internal adapter for the audio backend (Howler.js, Web Audio API, etc.). The platform creates the audio manager instance at startup and passes it through context — swapping the implementation is a one-line change at the creation site.

> **Deviation from development plan:** The dev plan specifies a full Howler.js AudioManager in Phase 2. This spec intentionally defers it — a stub satisfies the plugin contract and avoids adding a dependency + audio files until Phase 3 when a real game needs audio. The dev plan acceptance criterion "Audio manager plays SFX on correct/incorrect actions" is revised to "Stub AudioManager logs SFX calls to console" for Phase 2.

**Singleton:** Created once, provided alongside StorageManager via the `PlatformProvider`.

**IndexedDB unavailability:** If IndexedDB initialization fails (private browsing, quota exceeded), the storage service catches the error and logs a warning. The app continues to function with in-memory state only — profiles and progress won't persist across sessions, but the app remains usable. A subtle banner ("Progress won't be saved in this browser mode") is shown.

---

## 2D. Game Hub (Home Screen)

### `platform/src/pages/Hub.tsx`

Welcome + Grid layout.

**Structure:**
1. **Welcome header** — "Welcome back, {profile.name}!" centered at top
2. **Continue Playing** — horizontal scrollable row showing the last 3 played games (by `lastPlayedAt` from progress). Each card is a compact version of the game card with a progress indicator. Only shown if the profile has play history.
3. **Search bar** — visible for junior (6-8) and explorer (9-12) profiles, hidden for tiny (3-5). Filters the game grid by name match. Uses `useAgeTier()` to determine visibility.
4. **Filter pills** — horizontal scrollable row: "All" (default), then one pill per skill category present in the game registry. Active filter highlighted with `--color-primary`. Filter state resets on each Hub visit (no persistence needed).
5. **Game card grid** — CSS Grid, responsive columns:
   - Mobile (< 768px): 2 columns
   - Tablet (768px+): 3 columns
   - Desktop (1024px+): 4-5 columns (auto-fill with min 200px)
6. **Empty state** — if no games match the filter or age tier, show a friendly message

**Filtering logic:**
- Age tier filter: `game.ageRange[0] <= profile.age && profile.age <= game.ageRange[1]`
- Skill category filter: `game.skills.includes(selectedCategory)` or "All" shows everything
- Games with `status: "coming_soon"` or `status: "retired"` shown at 50% opacity with lock icon

### `platform/src/components/GameCard/GameCard.tsx`

Individual game card in the hub grid.

**Props:**
- `manifest: GameManifest`
- `progress?: GameProgress`
- `isRecent?: boolean` — highlight border if recently played

**Rendering:**
- Colored thumbnail area (uses a background color derived from the game's first skill category + emoji icon)
- Game name (bold, `--font-family-body`)
- Age badge + skill icon (small pills)
- `<ProgressBar>` from shared library showing `progress.currentLevel / manifest.maxDifficulty`
- If `isRecent`: `--color-primary` border (2px)
- If no progress: "New! ✨" badge
- If locked: 50% opacity + lock icon overlay
- Click → `navigate('/game/${manifest.id}')`
- Hover/tap: Framer Motion `scale: 1.03` with spring transition

**CSS Module:** `GameCard.module.css` with responsive sizing via design tokens.

---

## 2E. Game Plugin Loader

### `platform/src/services/gameLoader.ts`

**Function:** `loadGame(manifest: GameManifest): Promise<GamePlugin>`

Uses dynamic `import()` to load the game module from `manifest.entryPoint`. Returns the default export (which must conform to `GamePlugin`).

For Phase 2, game entry points are relative paths resolved by Vite's dynamic import. The dummy game's entry point is something like `../../games/dummy-game/src/index.ts` (resolved at build time).

### `platform/src/pages/GameWrapper.tsx`

The page rendered at `/game/:gameId`.

**Flow:**
1. Read `gameId` from route params
2. Look up manifest in `state.gameRegistry`
3. If not found → show "Game not found" with "Go Home" button
4. Load game via `gameLoader.loadGame(manifest)`
5. Render game component inside `<Suspense>` and `<GameErrorBoundary>`
6. Use `useGameLifecycle` hook to orchestrate lifecycle
7. Build `GameProps`: config (difficulty from profile progress or default 1), callbacks, stub audioManager, storageManager
8. On `onScore` → update local score state
9. On `onComplete(result)` → dispatch `UPDATE_PROGRESS`, show "Play Again?" or navigate to hub
10. On `onExit` → navigate to hub

**Visibility change handling:**
```typescript
useEffect(() => {
  function handleVisibility() {
    if (document.hidden) {
      lifecycle.pause();
    } else {
      lifecycle.resume();
    }
  }
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [lifecycle]);
```

**Auto-save checkpoint:** 30-second interval during PLAYING state. Calls `storageManager.saveCheckpoint(profileId, gameId, checkpointData)`. Timer pauses when game is paused, clears on unmount.

### `platform/src/components/GameErrorBoundary.tsx`

Class component wrapping every loaded game.

**On error:**
- Shows friendly screen: "Oops! Something went wrong" with a sad character
- "Try Again" button — resets error state, re-renders game
- "Go Home" button — navigates to hub
- Logs error via `storageManager.logEvent({ type: 'game_error', ... })`
- Never exposes technical details to children

### `platform/src/components/LoadingSpinner/LoadingSpinner.tsx`

Simple CSS-only bouncing animation shown during `<Suspense>` loading.

- Centered in viewport
- Uses `--color-primary` and `--color-secondary` for the animation
- "Loading..." text below the spinner
- Respects `prefers-reduced-motion`

---

## 2F. Routing

### `platform/src/App.tsx`

React Router v7 setup (the platform has `react-router-dom@^7.0.0` installed; the development plan references "v6" but v7 is what's actually in the codebase).

```tsx
<BrowserRouter>
  <PlatformProvider>
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/profile" element={<ProfileSelect />} />
      <Route path="/game/:gameId" element={<GameWrapper />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/parental" element={<Settings />} />
    </Routes>
    <NavBar />
  </PlatformProvider>
</BrowserRouter>
```

**Note:** `NavBar` is rendered outside `<Routes>` so it persists across all pages. It is hidden on the `/game/:gameId` route (games have their own header via `<GameShell>`).

The `/settings/parental` route renders the same placeholder `Settings` component for now. Phase 4 will replace it with the PIN-gated parental dashboard.

### `platform/src/components/NavBar/NavBar.tsx`

Bottom tab bar.

**Props:** None (reads current route from React Router).

**Tabs:**
| Icon | Label | Path |
|------|-------|------|
| 🏠 | Home | `/` |
| 👤 | Profile | `/profile` |
| 🏆 | Rewards | `/rewards` |
| ⚙️ | Settings | `/settings` |

**Behavior:**
- Fixed to bottom, `z-index: 50`
- Active tab: `--color-primary` color, bold label
- Inactive tabs: `--color-text-secondary`
- Uses `NavLink` from React Router for active state detection
- Hidden when route matches `/game/*` (full-screen game experience)
- Touch target size: `--touch-target-size` per age tier

### Placeholder Pages

**`platform/src/pages/Rewards.tsx`:**
```tsx
<div>
  <h1>Rewards</h1>
  <p>Your rewards gallery is coming soon!</p>
</div>
```

**`platform/src/pages/Settings.tsx`:**
```tsx
<div>
  <h1>Settings</h1>
  <p>Settings and parental controls coming soon!</p>
</div>
```

---

## 2G. Profile System

### `platform/src/pages/ProfileSelect.tsx`

Profile picker and creator.

**Profile picker (when profiles exist):**
- Grid of profile cards: avatar (large emoji) + name
- Click a profile → dispatch `SET_PROFILE`, navigate to `/`
- "Create New Profile" card at the end of the grid (+ icon)

**Profile creator (when no profiles, or "Create New" clicked):**
Rendered by `platform/src/components/ProfileCreator/ProfileCreator.tsx`.

**Steps:**
1. **Name** — text input with large font, "What's your name?" prompt. Minimum 1 character, maximum 20.
2. **Age** — grid of big number buttons (3 through 12). "How old are you?" prompt.
3. **Avatar** — grid of 10 emoji avatars: 🦉🦊🐱🐶🐸🦁🐼🐰🦄🐙. "Pick your avatar!" prompt.
4. **Confirm** — shows summary (avatar, name, age, tier badge). "Let's go!" button.

**On confirm:**
- Auto-assign age tier: 3-5 → tiny, 6-8 → junior, 9-12 → explorer
- Generate profile ID via `crypto.randomUUID()` (no `uuid` package needed — native browser API)
- Initialize defaults:
  - `parentPin: ''` (empty string — Phase 4 adds PIN setup)
  - `preferences: { musicVolume: 0.7, sfxVolume: 1, voiceVolume: 1, language: 'en', theme: 'default' }`
  - `progress: {}`
  - `rewards: []`
  - `stats: { totalPlayTime: 0, totalGamesPlayed: 0, currentStreak: 0, longestStreak: 0, lastPlayedAt: '' }`
  - `createdAt: new Date().toISOString()`
- Save to IndexedDB via `storageManager.saveProfile()`
- Dispatch `ADD_PROFILE` and `SET_PROFILE`
- Navigate to Hub

**No PIN setup** — deferred to Phase 4 with parental controls.

**First launch:** When the app starts with zero profiles, it automatically redirects to `/profile` for creation. The Hub's welcome header requires an active profile.

---

## 2H. Dummy Game

### `games/dummy-game/`

First game workspace package. Validates the entire plugin pipeline end-to-end.

**Gameplay:** 5 rounds. Each round shows an `<OptionButton>` with "Click me! ({n}/5)". Clicking it increments the score. After 5 clicks, `<CelebrationOverlay>` appears, then `onComplete(result)` is called.

**Uses shared components:**
- `<GameShell>` — wrapper with title "Click Counter" and pause/back buttons
- `<OptionButton>` — the clickable target, shows "correct" state briefly on click
- `<ProgressBar>` — shows progress (n/5)
- `<ScoreDisplay>` — shows current score
- `<CelebrationOverlay>` — fires on completion

**Plugin structure:**

```typescript
// games/dummy-game/src/index.ts
const plugin: GamePlugin = {
  manifest: {
    id: 'dummy-game',
    name: 'Click Counter',
    description: 'Click the button 5 times!',
    thumbnail: '',
    ageRange: [3, 12],
    skills: ['motor_skills'],
    version: '1.0.0',
    entryPoint: '../../games/dummy-game/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 1,
    estimatedPlayTime: 1,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '2026-03-15',
    tags: ['demo'],
  },
  onLoad: async () => {},
  onStart: () => {},
  onPause: () => {},
  onResume: () => {},
  onEnd: () => ({
      gameId: 'dummy-game',
      score: 5,
      maxScore: 5,
      timeSpent: 0, // calculated from session start
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: { clicks: 5 },
    }),
  onUnload: () => {},
  GameComponent: DummyGame,
};
```

**Package setup:**
- `package.json`: workspace package `dummy-game` with peer deps on react and `@kids-games-zone/shared`
- `tsconfig.json`: extends base, has `jsx: "react-jsx"`, references shared

**Dynamic import mechanism:** Vite requires `import.meta.glob` for dynamic imports with variable paths. The `gameLoader.ts` will use a pre-built map of game IDs to lazy import functions:

```typescript
const gameModules = import.meta.glob('../../games/*/src/index.ts');
```

This lets Vite code-split each game at build time. The `loadGame` function matches `manifest.entryPoint` against this glob map.

**Game registration:** A static `platform/src/config/gameRegistry.ts` file imports the dummy game's manifest and exports an array. The `PlatformProvider` uses this to populate `state.gameRegistry` on mount.

---

## Dependencies

### New packages

| Package | Location | Purpose |
|---------|----------|---------|
| `idb` | `platform/package.json` dependencies | IndexedDB wrapper |
| `framer-motion` | `platform/package.json` dependencies | GameCard hover animations (already a root devDep, needs to be a platform dep too) |

### No `uuid` package needed

Use `crypto.randomUUID()` (native browser API, available in all modern browsers) for profile ID generation.

### Existing from Phase 1

Framer Motion is already a root devDep and shared peer dep. Adding it to platform's `package.json` ensures it's available for platform components (GameCard animations).

---

## File Structure Summary

```
platform/src/
├── App.tsx                              # (update) routing setup
├── main.tsx                             # (update) wrap with PlatformProvider
├── context/
│   └── PlatformContext.tsx              # GlobalState, reducer, PlatformProvider, usePlatform
├── services/
│   ├── storage.ts                       # StorageManager implementation (idb)
│   ├── audio.ts                         # StubAudioManager
│   └── gameLoader.ts                    # Dynamic import loader
├── config/
│   └── gameRegistry.ts                  # Static game manifest registry
├── pages/
│   ├── Hub.tsx                          # Game hub home screen
│   ├── ProfileSelect.tsx                # Profile picker + creation
│   ├── GameWrapper.tsx                  # Game plugin host page
│   ├── Rewards.tsx                      # Placeholder
│   └── Settings.tsx                     # Placeholder
├── components/
│   ├── NavBar/
│   │   ├── NavBar.tsx
│   │   └── NavBar.module.css
│   ├── GameCard/
│   │   ├── GameCard.tsx
│   │   └── GameCard.module.css
│   ├── GameErrorBoundary.tsx
│   ├── LoadingSpinner/
│   │   ├── LoadingSpinner.tsx
│   │   └── LoadingSpinner.module.css
│   └── ProfileCreator/
│       ├── ProfileCreator.tsx
│       └── ProfileCreator.module.css
└── styles/
    └── global.css                       # (exists, updated in Phase 1)

games/dummy-game/
├── src/
│   ├── DummyGame.tsx
│   ├── DummyGame.module.css
│   ├── DummyGame.test.tsx
│   └── index.ts                         # GamePlugin export
├── package.json
└── tsconfig.json
```

---

## Acceptance Criteria

- [ ] Profile creation, selection, and persistence work across browser restarts
- [ ] Hub displays game cards filtered by the active profile's age tier
- [ ] Dummy game loads via dynamic import, starts, receives `GameProps`, and reports results back to the platform
- [ ] Game pause/resume triggers on browser visibility change (`visibilitychange` event — more reliable than blur/focus for tab switching)
- [ ] Auto-save checkpoint fires every 30 seconds during active gameplay
- [ ] `GameErrorBoundary` catches errors and shows a friendly screen
- [ ] Stub AudioManager logs calls to console
- [ ] All data persists in IndexedDB; clearing storage resets everything
- [ ] Bottom nav bar works on all pages, hidden during gameplay
- [ ] Navigation between all routes works (Hub, Profile, Game, Rewards, Settings)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass
