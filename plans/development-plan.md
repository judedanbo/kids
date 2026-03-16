# Kids Games Zone — Phased Development Plan

> **Last updated:** 2026-03-15
> **Source docs:** `plans/games-zone-requirements.md`, `plans/technical-specs.md`
> **Existing asset:** `game/jerome/word-puzzle/` (standalone React + Vite + Tailwind app to be migrated)
> **Current status:** Phase 0 complete — Phase 1 up next

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

| Priority | Component | Notes |
|----------|-----------|-------|
| P0 | `<GameShell>` | Wrapper: header with title, back/home button, pause button, children slot |
| P0 | `<OptionButton>` | Large tap target (64dp for tiny tier), press animation, correct/incorrect states |
| P0 | `<ScoreDisplay>` | Animated counter, optional star rating |
| P0 | `<ProgressBar>` | Current/total, color prop, label toggle |
| P0 | `<CelebrationOverlay>` | Confetti/stars via Framer Motion, auto-dismiss |
| P1 | `<GameTimer>` | Countdown/count-up, visual ring, pause support |
| P1 | `<DifficultySelector>` | Star-based picker, 1-5 scale |
| P1 | `<InstructionBubble>` | Speech bubble, optional audio trigger |
| P1 | `<PauseMenu>` | Resume, restart, exit options |
| P2 | `<DragItem>` / `<DropZone>` | Accessible drag-and-drop primitives |

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

## Phase 3 — First Three Games
**Duration:** 4-5 weeks
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

## Phase 4 — Progress, Rewards & Parental Controls
**Duration:** 2-3 weeks
**Milestone:** Players earn rewards, see their progress, and parents can view dashboards and set time limits.

### Tasks

#### 4A. Reward System (Week 1)
- Implement `RewardEngine` in `platform/src/services/rewards.ts`.
- Evaluates all unearned rewards against updated profile stats after every `GameResult`.
- Define the initial reward milestones from the spec (First Star, Speed Demon, Bookworm, Math Wizard, Super Streak, Explorer, Master).
- Rewards gallery page (`/rewards`) — grid of earned/locked reward cards with earned date.
- `<CelebrationOverlay>` triggered when a new reward is unlocked.

#### 4B. Difficulty Scaling (Week 1)
- Implement `calculateNextDifficulty()` from Section 4.3.
- Run after every game completion; update `GameProgress.difficulty`.
- Manual override: `<DifficultySelector>` shown on game start screen.
- Platform passes the correct difficulty to the game via `GameConfig`.

#### 4C. Streaks & Daily Challenges (Week 1-2)
- Streak tracking: increment on first game completion each day, reset on miss.
- Visual streak counter on the hub (flame icon + number).
- Daily challenge generator: deterministic from date seed, no server needed.
- Daily challenge card on the hub showing today's challenge and completion status.

#### 4D. Parental Controls (Week 2-3)
- PIN entry screen with custom number pad (not text input).
- Adult verification gate (math problem like "What is 14 x 3?") before PIN entry.
- 3 failed attempts triggers 60-second lockout.
- PIN stored as salted hash (use SubtleCrypto PBKDF2).
- Parental Dashboard page:
  - Per-child activity summary (games played, time, scores).
  - Bar chart: play time by day (last 7 days).
  - Game-by-game progress table.
  - Controls: lock/unlock games, adjust difficulty range, reset progress.
- Time limits:
  - Configurable daily and session limits.
  - Gentle reminder at N minutes before limit.
  - Auto-pause with friendly message at limit.
  - Timer pauses on app background.
  - Daily limit resets at midnight local time.

### Acceptance Criteria
- [ ] Rewards unlock correctly after meeting criteria; celebration displays.
- [ ] Difficulty auto-adjusts after 3+ game completions.
- [ ] Streak counter increments daily and resets correctly.
- [ ] Daily challenge generates deterministically and awards bonus on completion.
- [ ] Parental PIN gate blocks children; lockout works after 3 fails.
- [ ] Parental dashboard shows accurate data from IndexedDB.
- [ ] Time limits pause gameplay and show a friendly message.

### Dependencies
- Phase 3 (needs real games generating real `GameResult` data to test rewards and progress).

---

## Phase 5 — Accessibility, i18n & Offline
**Duration:** 2-3 weeks
**Milestone:** The app is accessible, supports at least 2 languages, and works fully offline after first load.

### Tasks

#### 5A. Accessibility Audit & Fixes (Week 1)
- Run axe-core automated audit across all pages and games.
- Fix all critical and serious violations.
- Ensure all interactive elements have `aria-label`.
- Add `aria-live` regions for score changes, timer updates, game state transitions.
- Verify visible focus indicators on all interactive elements.
- Test full keyboard navigation flow: hub -> game selection -> gameplay -> results -> back to hub.
- Verify `prefers-reduced-motion` disables all animations.
- Add high-contrast mode toggle in settings.
- Verify color contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI elements).

#### 5B. Internationalization (Week 1-2)
- Set up i18next + react-i18next in the platform.
- Create namespace structure: `platform` namespace + one namespace per game.
- Extract all hardcoded strings in platform and all three games to JSON locale files.
- Create English (`en`) locale files as the baseline.
- Create one additional locale (e.g., French `fr`) to validate the pipeline.
- Language selector in settings (flag-based icons).
- Verify RTL layout support with CSS logical properties.
- Audio narration file structure organized by locale.

#### 5C. Offline Support (Week 2-3)
- Implement Service Worker using Workbox (`vite-plugin-pwa`).
- Cache strategies: cache-first for shell, game modules, shared assets, game data.
- Platform shell and all three games pre-cached on first load.
- Offline indicator in the UI when network is unavailable.
- Verify all user data operations work offline (IndexedDB).
- Cache versioning: new Service Worker activates and refreshes stale caches on deploy.
- Test: disable network in DevTools, verify full app usage including game play.

#### 5D. Performance Optimization (Week 2-3)
- Measure against performance budgets:
  - FCP < 1.5s, LCP < 2.5s, TTI < 3.0s.
  - Platform shell < 150KB gzipped.
  - Each game < 100KB gzipped.
- Image optimization: convert to WebP, add responsive `srcset`.
- Audio compression: MP3/OGG, sprites for SFX.
- Font subsetting: only used character ranges.
- Add `size-limit` to CI to enforce bundle budgets.
- Lighthouse CI integration in GitHub Actions.

### Acceptance Criteria
- [ ] axe-core reports zero critical/serious accessibility violations.
- [ ] Full keyboard-only navigation works end-to-end.
- [ ] App renders correctly in English and French (or chosen second language).
- [ ] App works fully offline after first load (all three games playable).
- [ ] All performance budgets met (Lighthouse scores 90+).
- [ ] Bundle sizes within budget (verified by CI).

### Dependencies
- Phase 4 (all features must exist before accessibility/i18n can be applied comprehensively).

---

## Phase 6 — Testing, CI/CD Hardening & Deployment
**Duration:** 2 weeks
**Milestone:** Production-ready deployment with comprehensive test coverage, preview deploys on PRs, and automated production deploys on merge to main.

### Tasks

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
- [ ] All tests pass in CI (unit, integration, E2E, a11y, performance).
- [ ] PR preview deploys are generated automatically.
- [ ] Production deploy succeeds on merge to main.
- [ ] Game developer guide is complete and a new developer could follow it to add a game.
- [ ] Feature flags work: disabling a flag hides the game from the hub.

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
Phase 3 (First Three Games)               ⬅️ UP NEXT
   │
   ▼
Phase 4 (Progress, Rewards & Parental Controls)
   │
   ▼
Phase 5 (Accessibility, i18n & Offline)
   │
   ▼
Phase 6 (Testing, CI/CD & Deployment)
```

Phases are sequential. However, within each phase, the lettered sub-tasks (A, B, C, etc.) can often be worked in parallel if multiple developers are available.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size exceeds budget | Slow load times, poor UX | Enforce `size-limit` in CI from Phase 0; audit imports regularly |
| IndexedDB limits on some browsers | Data loss | Test on Safari (known IDB quirks); implement storage quota check |
| Howler.js adds too much to bundle | Budget exceeded | Evaluate lighter alternatives (Tone.js, native Web Audio) if needed |
| Migrating word-puzzle from Tailwind to CSS Modules is tedious | Delays Phase 3 | Consider keeping Tailwind as a dev dependency for the transition; refactor incrementally |
| Accessibility retrofit is expensive | Delays Phase 5 | Build accessible from Phase 1 — use semantic HTML, ARIA, focus management from the start |
| Offline Service Worker caching bugs | Stale content served | Version all caches; implement "update available" prompt; thorough Playwright offline testing |

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
