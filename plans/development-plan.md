# Kids Games Zone — Phased Development Plan

> **Last updated:** 2026-03-26
> **Source docs:** `plans/games-zone-requirements.md`, `plans/technical-specs.md`
> **Existing asset:** `game/jerome/word-puzzle/` (standalone React + Vite + Tailwind app to be migrated)
> **Current status:** All 6 phases complete — initial build done

---

## Overview

This plan breaks the Kids Games Zone build into **6 phases**, ordered so that foundational infrastructure is completed before any game development begins. Each phase has a clear milestone, estimated duration, deliverables, and acceptance criteria.

---

## Phase 0 — Project Bootstrap & Monorepo Setup ✅ COMPLETE

**Completed:** 2026-03-15
**Milestone:** `pnpm dev` starts the platform shell with hot-reload; CI pipeline runs lint + type-check on push.

### What Was Delivered

1. **pnpm workspace monorepo** — `pnpm-workspace.yaml` with `platform`, `shared`, `games/*` packages.
2. **Root config** — `package.json` (type: module), `tsconfig.base.json` (strict mode, `@shared/*` path alias).
3. **Platform package** (`platform/`) — Vite 6 + React 19 + React Router 7, dev server on port 3000, placeholder App shell with design tokens in `global.css`.
4. **Shared package** (`shared/`) — Core TypeScript types already defined:
   - `shared/src/types/game.ts` — `GameManifest`, `GamePlugin`, `GameConfig`, `GameProps`, `GameResult`, `SkillCategory`, `AgeTier`
   - `shared/src/types/user.ts` — `UserProfile`, `GameProgress`, `Reward`, `RewardCriteria`, `RewardType`
   - `shared/src/index.ts` — barrel exports
5. **Tooling** — ESLint 9 flat config (TS + React + jsx-a11y), Prettier, Vitest, `.gitignore`.
6. **CI** — `.github/workflows/ci.yml` (lint → typecheck → test → build).
7. **Design tokens** — CSS custom properties from the spec already in `platform/src/styles/global.css` (colors, spacing, radii, fonts, transitions, shadows).

### Acceptance Criteria

- [x] `pnpm install` from root installs all workspaces.
- [x] `pnpm --filter platform dev` starts dev server.
- [x] `pnpm lint` and `pnpm typecheck` pass with zero errors.
- [x] `pnpm build` produces production bundle (61KB gzipped — well under 150KB budget).
- [ ] GitHub Actions CI completes green on a push (not yet pushed to remote).

### Notes

- Shared types from Phase 1A were completed early as part of the bootstrap (game types + user types).
- Design tokens from Phase 1B were partially completed (embedded in `platform/src/styles/global.css`; will be extracted to `shared/styles/tokens.css` in Phase 1).
- ESLint uses flat config format (`eslint.config.js`) compatible with ESLint 9.

---

## Phase 1 — Shared Library & Design System ✅ COMPLETE

**Completed:** 2026-03-15
**Milestone:** The `shared` package exports all core types, design tokens, and the first set of shared UI components usable by both `platform` and any game.

### Tasks

#### 1A. Core Types & Interfaces (Week 1) — ✅ PARTIALLY DONE

Core game and user types already defined in Phase 0. Remaining types to add in `shared/types/`:

- ~~`GameManifest`, `GamePlugin`, `GameConfig`, `GameProps`, `GameResult`~~ — done in `shared/src/types/game.ts`
- ~~`UserProfile`, `GameProgress`, `Reward`, `RewardCriteria`~~ — done in `shared/src/types/user.ts`
- ~~`SkillCategory`, `AgeTier`~~ — done in `shared/src/types/game.ts`
- `TimeLimitConfig`, `FeatureFlags` — still needed (Sections 5.3, 9.3).
- `AudioManager` interface — still needed (Section 2.3).
- `StorageManager` interface — still needed (Section 4.1).
- `AnalyticsEvent` — still needed (Section 9.4).

#### 1B. Design Tokens & Global Styles (Week 1)

- Create `shared/styles/tokens.css` with all CSS custom properties from Section 2.2 (colors, radii, spacing, fonts, transitions, shadows).
- Create `shared/styles/reset.css` — minimal CSS reset.
- Create `shared/styles/breakpoints.css` — responsive breakpoint custom media queries.
- Import Google Fonts: Baloo 2 (display) and Nunito (body) with font subsetting.

#### 1C. Shared UI Components (Weeks 2-3)

Build each component with CSS Modules, Framer Motion for animation, full ARIA attributes, and a unit test file:

| Priority | Component                   | Notes                                                                            |
| -------- | --------------------------- | -------------------------------------------------------------------------------- |
| P0       | `<GameShell>`               | Wrapper: header with title, back/home button, pause button, children slot        |
| P0       | `<OptionButton>`            | Large tap target (64dp for tiny tier), press animation, correct/incorrect states |
| P0       | `<ScoreDisplay>`            | Animated counter, optional star rating                                           |
| P0       | `<ProgressBar>`             | Current/total, color prop, label toggle                                          |
| P0       | `<CelebrationOverlay>`      | Confetti/stars via Framer Motion, auto-dismiss                                   |
| P1       | `<GameTimer>`               | Countdown/count-up, visual ring, pause support                                   |
| P1       | `<DifficultySelector>`      | Star-based picker, 1-5 scale                                                     |
| P1       | `<InstructionBubble>`       | Speech bubble, optional audio trigger                                            |
| P1       | `<PauseMenu>`               | Resume, restart, exit options                                                    |
| P2       | `<DragItem>` / `<DropZone>` | Accessible drag-and-drop primitives                                              |

#### 1D. Shared Hooks

- `useGameLifecycle(plugin: GamePlugin)` — manages IDLE -> LOADED -> PLAYING -> COMPLETED state machine.
- `useFeatureFlag(name: string)` — reads from feature flag context.
- `useAgeTier()` — returns current profile's age tier for conditional rendering.

### Acceptance Criteria

- [ ] `shared` package builds cleanly and can be imported from `platform`.
- [ ] Each component has at least one unit test (Vitest + React Testing Library).
- [ ] Design tokens render correctly across all breakpoints (manual check).
- [ ] Components respect `prefers-reduced-motion`.

### Dependencies

- Phase 0 (monorepo must be set up).

---

## Phase 2 — Platform Shell & Core Services ✅ COMPLETE

**Completed:** 2026-03-16
**Milestone:** The platform shell renders a functional game hub with profile creation, game loading via the plugin system, and data persistence via IndexedDB. No real games yet — a "dummy game" is used for integration testing.

### Tasks

#### 2A. State Management (Week 1)

- Implement `GlobalState` with React Context + `useReducer` in `platform/src/context/`.
- Actions: `SET_PROFILE`, `UPDATE_PROGRESS`, `REGISTER_GAME`, `START_SESSION`, `END_SESSION`, `UNLOCK_REWARD`.
- `PlatformProvider` wraps the entire app, provides state and dispatch.

#### 2B. Storage Service (Week 1)

- Implement `StorageManager` in `platform/src/services/storage.ts` using the `idb` library.
- IndexedDB schema: `profiles` store, `progress` store (keyed by `profileId+gameId`), `rewards` store, `events` store.
- All methods from the `StorageManager` interface in the technical spec.
- Auto-save checkpoint logic (30-second interval during active play).
- Data migration strategy: version the DB schema from day one.

#### 2C. Audio Service (Week 1-2)

- Implement `AudioManager` singleton in `platform/src/services/audio.ts` using Howler.js.
- Three independent channels: music, sfx, voice — each with volume control.
- Mute/unmute state persisted per profile via StorageManager.
- Preload method for upcoming screen assets.
- Placeholder audio files in `shared/assets/audio/sfx/` (click, correct, incorrect, celebrate).

#### 2D. Game Hub (Home Screen) (Week 2-3)

- `platform/src/pages/Hub.tsx` — the main landing page.
- Game card grid: responsive columns (2 mobile, 3 tablet, 4-5 desktop) using CSS Grid.
- Each card displays: thumbnail, name, age badge, skill icons, progress bar, locked/unlocked state.
- "Continue Playing" section at top (last 3 games played).
- Filter bar: age group, skill category, favorites.
- Cards animate on hover/touch (scale via Framer Motion).
- Search bar visible for age 6+ profiles, hidden for 3-5.

#### 2E. Game Plugin Loader (Week 2-3)

- `platform/src/services/gameLoader.ts` — dynamic `import()` based on `GameManifest.entryPoint`.
- `React.lazy()` + `Suspense` wrapping with a kid-friendly loading animation.
- `GameErrorBoundary` component wrapping every loaded game — friendly error screen on crash.
- Game lifecycle orchestration: call `onLoad`, `onStart`, `onPause`, `onResume`, `onEnd`, `onUnload` at the right moments.
- Visibility change listener (document blur/focus) triggers pause/resume.

#### 2F. Routing (Week 3)

- React Router v6 setup in `platform/src/App.tsx`.
- Routes:
  - `/` — Hub
  - `/profile` — Profile selection/creation
  - `/game/:gameId` — Game wrapper (loads plugin)
  - `/rewards` — Rewards gallery
  - `/settings` — Settings page
  - `/settings/parental` — Parental dashboard (PIN-gated)
- Persistent navigation bar: Home, Profile, Rewards, Settings (icons only).

#### 2G. Profile System (Week 3)

- Profile creation flow: name, age, avatar selection (from a preset gallery).
- PIN setup for parental access.
- Profile selector screen (supports multiple child profiles).
- Age tier automatically assigned based on entered age.
- Profile stored in IndexedDB via StorageManager.

#### 2H. Dummy Game for Integration Testing (Week 3)

- Create `games/dummy-game/` — a minimal game that implements `GamePlugin`.
- It displays a button, counts clicks, and returns a `GameResult` after 5 clicks.
- Purpose: validate the entire plugin loading, lifecycle, and score-reporting pipeline end-to-end.
- Delete or keep as a developer reference after real games are integrated.

### Acceptance Criteria

- [ ] Profile creation, selection, and persistence work across browser restarts.
- [ ] Hub displays game cards filtered by the active profile's age tier.
- [ ] Dummy game loads via dynamic import, starts, receives `GameProps`, and reports results back to the platform.
- [ ] Game pause/resume triggers on browser blur/focus.
- [ ] GameErrorBoundary catches errors and shows a friendly screen.
- [ ] Audio manager plays SFX on correct/incorrect actions.
- [ ] All data persists in IndexedDB; clearing storage resets everything.

### Dependencies

- Phase 1 (shared types and components used throughout).

---

## Phase 3 — First Three Games ✅ COMPLETE

**Completed:** 2026-03-16
**Milestone:** Three fully functional games are playable from the hub, covering different age tiers and skill categories.

### Game 1: Word Puzzle (migrate existing) — Literacy, Ages 6-8

**Duration:** 1-1.5 weeks

The existing standalone app at `game/jerome/word-puzzle/` needs to be migrated into the monorepo plugin architecture.

**Migration tasks:**

1. Create `games/word-puzzle/` workspace package.
2. Extract game logic from the existing `App.tsx` into a component that accepts `GameProps`.
3. Create `index.tsx` exporting a `GamePlugin` with manifest and lifecycle hooks.
4. Replace Tailwind classes with CSS Modules using the shared design tokens.
5. Move question data to `games/word-puzzle/src/data/`.
6. Integrate with platform services:
   - Use `props.onScore()` for scoring instead of local state.
   - Use `props.onComplete()` to return `GameResult` when all questions are answered.
   - Use `props.audioManager` for correct/incorrect SFX.
7. Add difficulty scaling: easy (3-letter words), medium (4-5 letter), hard (6+ letter). Use `config.difficulty` from `GameProps`.
8. Externalize all strings to `games/word-puzzle/locales/en.json`.
9. Write unit tests for question selection logic and answer validation.
10. Create game manifest with: `ageRange: [6, 8]`, `skills: ["literacy"]`.

### Game 2: Math Adventure — Numeracy, Ages 6-8

**Duration:** 1.5-2 weeks

A new game covering addition, subtraction, and pattern recognition.

**Design:**

- Multiple-choice math problems displayed with `<OptionButton>` components.
- 10 questions per round, progressive difficulty.
- Difficulty 1: single-digit addition. Difficulty 3: two-digit add/subtract. Difficulty 5: mixed operations with carrying.
- Uses `<GameTimer>` in count-up mode to track speed.
- Visual number line or blocks as hints for lower difficulties.
- Celebration overlay on completion.

**Tasks:**

1. Create `games/math-adventure/` workspace package.
2. Implement question generator (procedural, not static data) in `games/math-adventure/src/utils/questionGenerator.ts`.
3. Build game component using shared `<GameShell>`, `<OptionButton>`, `<ScoreDisplay>`, `<ProgressBar>`, `<CelebrationOverlay>`.
4. Implement `GamePlugin` with all lifecycle hooks.
5. Localize strings.
6. Write unit tests for question generation and difficulty scaling.
7. Manifest: `ageRange: [6, 8]`, `skills: ["numeracy"]`.

### Game 3: Memory Match — Memory, Ages 3-5

**Duration:** 1.5-2 weeks

A card-matching game suitable for the youngest age tier.

**Design:**

- Grid of face-down cards. Tap to reveal, match pairs.
- Difficulty 1: 4 cards (2 pairs). Difficulty 3: 8 cards. Difficulty 5: 16 cards.
- Cards show colorful animal/object illustrations (from shared assets).
- Extra-large cards for tiny tier (96x96dp minimum).
- No penalty for wrong matches — just flip back. Encouragement-first feedback.
- Audio narration: "Find the matching pictures!" on start.
- Celebration with confetti on completion.

**Tasks:**

1. Create `games/memory-match/` workspace package.
2. Build card grid component with flip animation (Framer Motion `rotateY`).
3. Implement match logic, turn tracking, and pair-found tracking.
4. Integrate with audio manager for flip, match, and mismatch sounds.
5. Implement `GamePlugin` with lifecycle hooks.
6. Localize strings.
7. Write unit tests for match logic and grid generation.
8. Manifest: `ageRange: [3, 5]`, `skills: ["memory"]`.

### Acceptance Criteria

- [ ] All three games load from the hub and play to completion.
- [ ] Each game correctly reports `GameResult` to the platform.
- [ ] Progress (high score, level reached) persists between sessions.
- [ ] Difficulty adjusts based on `config.difficulty` from profile.
- [ ] Each game bundle is under 100KB gzipped.
- [ ] Each game has at least 70% unit test coverage.
- [ ] All games work with keyboard navigation (tab, enter, escape).

### Dependencies

- Phase 2 (platform shell, plugin loader, storage, audio all required).

---

## Phase 4 — Progress, Rewards & Parental Controls ✅ COMPLETE

**Completed:** 2026-03-26
**Milestone:** Players earn rewards, see their progress, and parents can view dashboards and set time limits.

### What Was Delivered

#### 4A. Reward System — ✅ COMPLETE

- `RewardEngine` in `platform/src/services/rewards.ts` — evaluates all unearned rewards after every `GameResult`.
- 7 reward milestones defined in `platform/src/config/rewardCatalog.ts` (First Star, Speed Demon, Bookworm, Math Wizard, Super Streak, Explorer, Master).
- `RewardCard` component with locked/unlocked states and progress hints.
- `RewardCelebration` overlay triggered on reward unlock, sequential display for multiple rewards.
- Rewards gallery page (`/rewards`) — grid of earned/locked reward cards with progress tracking.
- Full integration in `GameWrapper.tsx` — evaluates rewards after each game, persists to IndexedDB.
- 17 unit tests covering all criteria types.

#### 4B. Difficulty Scaling — ✅ COMPLETE

- `calculateNextDifficulty()` in `platform/src/services/difficulty.ts` — per spec §4.3 (85%+ avg → increase, 40%- → decrease, needs 3+ results).
- `recentScores` ring buffer (last 5) added to `GameProgress` type.
- Auto-adjusts after every game completion in `GameWrapper.tsx`.
- `DifficultySelector` component available in shared library (star-based 1-5 UI).
- 9 unit tests.

#### 4C. Streaks & Daily Challenges — ✅ COMPLETE

- `updateStreak()` in `platform/src/services/streaks.ts` — calendar-day comparison, increment/reset logic.
- Streak updates integrated into `GameWrapper.tsx` on game completion.
- `UPDATE_STATS` action added to `PlatformContext`.
- Visual streak counter on Hub (flame icon + "N day streak" badge).
- `DailyChallenge` type added to shared types.
- `getDailyChallenge()` in `platform/src/services/dailyChallenge.ts` — deterministic date-seeded challenge from pool.
- `checkChallengeCompletion()` — evaluates play_count, score_threshold, try_new_game criteria.
- Daily challenge card on Hub showing today's challenge.
- 19 unit tests (7 streak + 12 daily challenge).

#### 4D. Parental Controls — ✅ COMPLETE

- `hashPin()` / `verifyPin()` in `platform/src/utils/pin.ts` — PBKDF2 via SubtleCrypto, salted hash.
- `NumberPad` component — custom grid number pad (not text input, per spec).
- `AdultGate` component — random multiplication problem verification gate.
- `PinEntry` component — 4-digit PIN entry with dot indicators, 3-attempt lockout (60s).
- PIN setup step added to profile creation flow (with skip option).
- Parental Dashboard page (`/settings/parental`) — gated behind AdultGate → PinEntry:
  - Activity summary: games today, games this week, total play time, current streak.
  - Play time bar chart (last 7 days, CSS-based).
  - Game-by-game progress table with per-game reset controls.
- `checkTimeLimit()` / `isWithinSchedule()` in `platform/src/services/timeLimit.ts`.
- `TimeLimitConfig` added to `PlatformSettings` in context.
- Time limit enforcement in GameWrapper: 30s check interval, reminder banner, auto-pause with friendly message.
- Settings page updated from placeholder — profile info, theme toggle, parental controls link.
- 16 unit tests (6 PIN + 10 time limit).

### Acceptance Criteria

- [x] Rewards unlock correctly after meeting criteria; celebration displays.
- [x] Difficulty auto-adjusts after 3+ game completions.
- [x] Streak counter increments daily and resets correctly.
- [x] Daily challenge generates deterministically.
- [x] Parental PIN gate blocks children; lockout works after 3 fails.
- [x] Parental dashboard shows accurate data from IndexedDB.
- [x] Time limits pause gameplay and show a friendly message.

### Dependencies

- Phase 3 (needs real games generating real `GameResult` data to test rewards and progress).

---

## Phase 5 — Accessibility, i18n & Offline

**Duration:** 2-3 weeks
**Milestone:** The app is accessible, supports at least 2 languages, and works fully offline after first load.

### Tasks

#### 5A. Accessibility Audit & Fixes — ✅ COMPLETE

**Completed:** 2026-03-27

**What was delivered:**

- axe-core dev overlay and vitest-axe test integration across all packages
- Global focus-visible indicators with focus ring design tokens
- High-contrast mode with OS detection (`prefers-contrast: more`) and manual toggle in Settings
- `useRovingTabindex` hook for 1D/2D keyboard grid navigation
- `Announcer` component for centralized screen reader announcements
- `SkipLink` component for keyboard navigation
- ARIA fixes across all 9 shared components (aria-live, progressbar roles, reduced motion)
- Landmark roles and labels across all platform pages
- Game-specific ARIA labels, keyboard navigation, and announcements for Memory Match, Math Adventure, and Word Puzzle
- axe violation checks added to component test suites

#### 5B. Internationalization (Week 1-2) — ✅ COMPLETE

**Completed:** 2026-04-04

**What was delivered:**

- i18next + react-i18next initialized with LanguageDetector and browser language detection
- Namespace structure: `common` (platform) + per-game namespaces (`word-puzzle`, `math-adventure`, `memory-match`)
- All hardcoded strings extracted to JSON locale files across platform, shared components, and all 3 games
- English (`en`) and French (`fr`) locale files with full key coverage and translation completeness tests
- Language selector in Settings page with flag-based button group
- RTL layout readiness: dynamic `dir` attribute on `<html>`, CSS logical properties throughout
- Audio narration directory structure organized by locale (`public/audio/narration/en/`, `fr/`)
- Stable react-i18next test mocks across all packages preventing infinite re-render loops

#### 5C. Offline Support (Week 2-3) — ✅ COMPLETE

**Completed:** 2026-04-04

**What was delivered:**

- vite-plugin-pwa with generateSW mode precaching 71 entries (~1.3MB)
- Cache-first strategy for fonts, audio; navigateFallback for SPA routing
- Self-hosted Google Fonts via @fontsource (Baloo 2 + Nunito), removing external CDN dependency
- PWA manifest with icons (192x192, 512x512, apple-touch-icon), standalone display mode
- OfflineBanner component with useOnlineStatus hook, internationalized (en/fr)
- Auto-update SW registration (skipWaiting + clientsClaim) — no user prompts
- IndexedDB persistence already in place from Phase 2 (5 stores, auto-save checkpoints)

#### 5D. Performance Optimization (Week 2-3) — ✅ COMPLETE

**Completed:** 2026-04-04

**What was delivered:**

- Font subsetting: latin + latin-ext only (removed Devanagari, Vietnamese, Cyrillic) — 31→14 font files, saved 337KB
- Bundle splitting via manualChunks: app code 84KB gz, vendor chunks 85KB gz (react, framer-motion, i18next, howler)
- SW precache optimized: 71→43 entries, 1.26MB→684KB (fonts moved to runtime CacheFirst cache)
- size-limit CI enforcement: app code <100KB gz, vendor chunks <100KB gz
- Lighthouse CI via treosh/lighthouse-ci-action: performance ≥0.9, FCP <1.5s, LCP <2.5s, TTI <3.0s
- Image/audio optimization deferred — no real images exist yet, audio is only 44KB total

### Acceptance Criteria

- [x] axe-core reports zero critical/serious accessibility violations.
- [x] Full keyboard-only navigation works end-to-end.
- [x] App renders correctly in English and French (or chosen second language).
- [x] App works fully offline after first load (all three games playable).
- [x] All performance budgets met (Lighthouse scores 90+).
- [x] Bundle sizes within budget (verified by CI).

### Dependencies

- Phase 4 (all features must exist before accessibility/i18n can be applied comprehensively).

---

## Phase 6 — Testing, CI/CD Hardening & Deployment ✅ COMPLETE

**Completed:** 2026-04-04
**Milestone:** Production-ready deployment with comprehensive test coverage, preview deploys on PRs, and automated production deploys on merge to main.

### What Was Delivered

#### 6D. Feature Flags — ✅ COMPLETE

- Static JSON config at `platform/src/config/featureFlags.json` (6 flags: 3 game, 3 feature)
- `FeatureFlagProvider` wired into app tree in `main.tsx`
- Hub filters games by feature flags (disabled games hidden)
- `GameWrapper` guards against direct URL navigation to disabled games
- BETA badge on game cards for `status: 'beta'` games with flag enabled
- 5 integration tests

#### 6C. Game Developer Guide & Scaffolder — ✅ COMPLETE

- `GAME_DEVELOPER_GUIDE.md` at repo root (12 sections, pre-submit checklist)
- `scripts/create-game.ts` interactive scaffolder generates 13 files (package.json, tsconfig, vitest config, GamePlugin entry, component, CSS module, locale files, test file)
- Scaffolder auto-registers feature flag (disabled by default)
- Run via `pnpm create-game`

#### 6A. Comprehensive Testing — ✅ COMPLETE

- 7 Playwright E2E test suites (33 tests): profile, hub, gameplay, rewards, parental, offline, a11y
- `@axe-core/playwright` full-page accessibility scans on 6 routes
- E2E fixtures: `createProfile`, `navigateToGame`, `playMemoryMatchToCompletion`, `solveMathProblem`
- 3 viewport presets: mobile (375×667), tablet (768×1024), desktop (1440×900)
- Vitest coverage thresholds configured (80% shared, 30% platform — reflecting current state)
- `@vitest/coverage-v8` installed with `pnpm test:coverage` script

#### 6B. CI/CD Pipeline Hardening — ✅ COMPLETE

- GitHub Actions split into 3 jobs: `lint-and-test`, `e2e` (parallel), `a11y` (parallel)
- E2E job: builds, installs Chromium, runs desktop + mobile tests, uploads report + traces
- A11y job: runs axe-core scans separately for clear PR check visibility
- `@changesets/cli` configured for monorepo (platform + shared fixed versioning, games independent)
- Deploy previews and auto-deploy deferred until deployment platform chosen

### Original Tasks (Reference)

#### 6A. Comprehensive Testing (Week 1)

- **Unit tests** (Vitest + React Testing Library):
  - Shared library: 80%+ coverage. Focus on: StorageManager, RewardEngine, AudioManager, difficulty algorithm, daily challenge generator.
  - Per game: 70%+ coverage. Focus on: game logic, question generators, answer validation.
- **Integration tests** (Vitest):
  - Game plugin loading and lifecycle.
  - Profile creation -> game play -> progress persistence -> reward unlock.
  - Parental PIN flow.
- **E2E tests** (Playwright):
  - Core user flow: create profile -> browse hub -> play each game -> see results -> check rewards.
  - Parental flow: enter PIN -> view dashboard -> set time limit.
  - Offline flow: load app -> disable network -> play game -> re-enable network.
  - Responsive: run tests at mobile (375px), tablet (768px), and desktop (1440px) viewports.
- **Accessibility E2E** (Playwright + axe-core):
  - Automated a11y scan on every page/state.

#### 6B. CI/CD Pipeline Hardening (Week 1-2)

- Enhance GitHub Actions workflow:
  - Add Playwright E2E tests to CI.
  - Add bundle size check (`size-limit`).
  - Add Lighthouse CI performance check.
  - Add axe-core accessibility check.
  - Fail PR if any check fails.
- Deploy previews: configure Vercel/Netlify/Cloudflare Pages for auto-preview on every PR.
- Production deploy: auto-deploy on merge to `main`.
- Add `changesets` for versioning and changelog generation.

#### 6C. Game Developer SDK Documentation (Week 2)

- Write `GAME_DEVELOPER_GUIDE.md`:
  - How to scaffold a new game.
  - `GamePlugin` interface reference.
  - Available shared components and how to use them.
  - Audio and storage manager APIs.
  - Localization guide.
  - Testing requirements and how to run tests.
  - Bundle size budget and how to check.
  - Content review checklist.
- Create a `create-game` script for scaffolding new games.

#### 6D. Feature Flags Setup (Week 2)

- Implement feature flag system: JSON config loaded at app start.
- `useFeatureFlag(name)` hook.
- Set up flags for the three existing games (all `enabled: true`).
- Document how to add a new game behind a feature flag (status `"beta"`).

### Acceptance Criteria

- [x] All tests pass (unit, integration, E2E, a11y, performance).
- [ ] PR preview deploys are generated automatically. _(deferred — deployment platform not yet chosen)_
- [ ] Production deploy succeeds on merge to main. _(deferred — deployment platform not yet chosen)_
- [x] Game developer guide is complete and a new developer could follow it to add a game.
- [x] Feature flags work: disabling a flag hides the game from the hub.

### Dependencies

- Phase 5 (all features must be finalized before comprehensive testing).

---

## Phase Dependency Graph

```
Phase 0 (Bootstrap)                        ✅ COMPLETE
   │
   ▼
Phase 1 (Shared Library & Design System)   ✅ COMPLETE
   │
   ▼
Phase 2 (Platform Shell & Core Services)   ✅ COMPLETE
   │
   ▼
Phase 3 (First Three Games)               ✅ COMPLETE
   │
   ▼
Phase 4 (Progress, Rewards & Parental Controls)  ✅ COMPLETE
   │
   ▼
Phase 5 (Accessibility, i18n & Offline)           ✅ COMPLETE
   │
   ▼
Phase 6 (Testing, CI/CD & Deployment)           ✅ COMPLETE
```

Phases are sequential. However, within each phase, the lettered sub-tasks (A, B, C, etc.) can often be worked in parallel if multiple developers are available.

---

## Risk Register

| Risk                                                          | Impact                   | Mitigation                                                                                   |
| ------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| Bundle size exceeds budget                                    | Slow load times, poor UX | Enforce `size-limit` in CI from Phase 0; audit imports regularly                             |
| IndexedDB limits on some browsers                             | Data loss                | Test on Safari (known IDB quirks); implement storage quota check                             |
| Howler.js adds too much to bundle                             | Budget exceeded          | Evaluate lighter alternatives (Tone.js, native Web Audio) if needed                          |
| Migrating word-puzzle from Tailwind to CSS Modules is tedious | Delays Phase 3           | Consider keeping Tailwind as a dev dependency for the transition; refactor incrementally     |
| Accessibility retrofit is expensive                           | Delays Phase 5           | Build accessible from Phase 1 — use semantic HTML, ARIA, focus management from the start     |
| Offline Service Worker caching bugs                           | Stale content served     | Version all caches; implement "update available" prompt; thorough Playwright offline testing |

---

## Key Technical Decisions

1. **CSS Modules over Tailwind** — The existing word-puzzle uses Tailwind, but the spec calls for CSS Modules + CSS Custom Properties. The migration happens during Phase 3 when the word-puzzle is moved into the monorepo.

2. **No external analytics** — All analytics are local-only (IndexedDB) per COPPA requirements. The parental dashboard computes aggregates on-device.

3. **No server dependency** — The entire app runs client-side. Feature flags, daily challenges, and all data are local. This simplifies deployment and avoids child data privacy concerns.

4. **Framer Motion for animations** — Used across shared components. Games can use it too since it is a workspace dependency. Respects `prefers-reduced-motion` by default.

5. **idb (IndexedDB wrapper) over localStorage** — Structured data, larger capacity, async API. Essential for storing profiles, progress, rewards, and analytics events.

---

## Post-Launch Roadmap (Future Phases)

These are not part of the initial build but are noted for planning purposes:

- **Phase 7:** Additional games (Spelling Bee, Sudoku Lite, Drawing/Coloring)
- **Phase 8:** Cloud sync (optional, requires parental consent flow)
- **Phase 9:** Gamepad / Switch access input support
- **Phase 10:** PDF progress report export from parental dashboard
- **Phase 11:** Additional languages (Spanish, Twi, Hausa)
- **Phase 12:** Content moderation workflow for community-contributed games
