# Phase 6 — Testing, CI/CD Hardening & Deployment

> **Date:** 2026-04-04
> **Status:** Approved design
> **Duration:** ~2 weeks
> **Depends on:** Phases 0-5 (all complete)

---

## Overview

Phase 6 is the final phase of the Kids Games Zone initial build. It hardens the project for production readiness through comprehensive testing, CI pipeline improvements, developer tooling, and a feature flag system.

**Execution order:** 6C + 6D in parallel → 6A → 6B

This ordering ensures feature flags and the game scaffolder exist before the testing phase, so tests cover the full feature surface and the scaffolder can include test templates.

---

## 6D — Feature Flags

### Architecture

Static JSON config loaded at app start via React context. No server, no runtime fetching — consistent with the project's fully client-side architecture.

**Source of truth:** `platform/src/config/featureFlags.json`

```json
{
  "game.word-puzzle": true,
  "game.math-adventure": true,
  "game.memory-match": true,
  "game.dummy-game": false,
  "daily-challenge": true,
  "high-contrast-mode": true
}
```

### Components

- **`platform/src/config/featureFlags.json`** — flat map of flag names to boolean values
- **`platform/src/context/FeatureFlagContext.tsx`** — React context provider that loads the JSON and exposes flags
- **`useFeatureFlag(name: string): boolean`** hook — reads from context, returns `false` for unknown flags (safe default)

### Integration Points

- **Hub** — filters game cards through feature flags before rendering. A game needs both `manifest.status === "active"` AND its feature flag enabled to appear.
- **Game loader** — checks flag before loading a game plugin (defense in depth for direct URL navigation to `/game/disabled-game`).
- **Beta badge** — if `manifest.status === "beta"` and its flag is enabled, show a "BETA" badge on the game card.

### Future Compatibility

The `useFeatureFlag` hook interface is designed to support a future IndexedDB override layer:

```ts
// Phase 6: reads from static JSON context
// Future: checks IndexedDB overrides first, falls back to JSON defaults
function useFeatureFlag(name: string): boolean
```

The runtime override UI (parental settings panel for toggling beta games) is explicitly deferred.

---

## 6C — Game Developer Guide & Scaffolder

### GAME_DEVELOPER_GUIDE.md

A single document at the repo root covering:

1. **Quick start** — run the scaffolder, what you get, how to launch dev
2. **GamePlugin interface reference** — lifecycle hooks, when each fires, what to return
3. **GameProps reference** — what the platform passes in (config, callbacks, services)
4. **Shared components catalog** — table of all available components with props summary and import path
5. **Audio & storage APIs** — how to play sounds, how progress is auto-saved
6. **Localization** — how to add locale files, namespace convention, how to use `useTranslation`
7. **Styling** — CSS Modules convention, available design tokens, age-tier responsive patterns
8. **Testing** — how to write tests, mocking platform services, coverage targets
9. **Bundle budget** — 100KB gzip per game, how to check with `size-limit`
10. **Checklist** — a pre-submit checklist (a11y, i18n keys, tests, bundle size)

### create-game Scaffolder

**Location:** `scripts/create-game.ts`
**Invocation:** `pnpm create-game` (registered as a root workspace script)

**Prompts for:**
- Game name (kebab-case)
- Display name
- Age range (select from tiny/junior/explorer)
- Skill categories (multi-select)

**Generates `games/<name>/` package with:**
- `package.json` — workspace dependency on `@kids-games-zone/shared`
- `tsconfig.json` — extends `tsconfig.base.json`, project reference to shared
- `src/index.tsx` — `GamePlugin` export with manifest and stub lifecycle hooks
- `src/components/Game.tsx` — starter component using `<GameShell>`
- `src/components/Game.module.css` — starter styles
- `locales/en.json` and `locales/fr.json` — starter locale files with game name
- `src/__tests__/Game.test.tsx` — starter test file

**Post-scaffold actions:**
- Registers the game in `platform/src/config/featureFlags.json` with flag set to `false` (opt-in)
- Prints next steps to the console

---

## 6A — Comprehensive Testing

### Unit & Integration Tests (Vitest + React Testing Library)

**Coverage targets:**
- Shared library: 80%+ — focus on StorageManager, RewardEngine, AudioManager, difficulty algorithm, daily challenge generator
- Per game: 70%+ — game logic, question generators, answer validation
- Platform services: 80%+ — game loader, streaks, time limits, PIN utils, feature flags

**Integration test scenarios (Vitest):**
- Game plugin loading and full lifecycle (load → start → pause → resume → end → unload)
- Profile creation → game play → progress persistence → reward unlock
- Parental PIN flow (setup, verify, lockout, recovery)
- Feature flag toggling hides/shows games in hub
- Difficulty auto-adjustment after multiple game completions

### E2E Tests (Playwright)

**Test suites organized by user journey:**

| Suite | Viewports | Coverage |
|-------|-----------|----------|
| `profile.spec.ts` | mobile, desktop | Create profile, select avatar, set age, optional PIN, switch profiles |
| `hub.spec.ts` | mobile, tablet, desktop | Browse games, filter by age/skill, continue playing section, feature flag hiding |
| `gameplay.spec.ts` | mobile, desktop | Play each of the 3 games to completion, verify score reported, progress saved |
| `rewards.spec.ts` | mobile, desktop | Earn a reward through gameplay, see celebration, check rewards gallery |
| `parental.spec.ts` | desktop | Adult gate, PIN entry, dashboard stats, set time limit, verify enforcement |
| `offline.spec.ts` | mobile | Load app, go offline, play a game, come back online |
| `a11y.spec.ts` | desktop | axe-core full-page scan on every major route/state |

**Playwright config:**
- 3 viewport presets: mobile (375×667), tablet (768×1024), desktop (1440×900)
- Each suite specifies which viewports it runs at (not all suites need all 3)
- `webServer` config to auto-start the dev server before tests
- Custom fixtures for common setup: `createProfile`, `navigateToGame`, `playGameToCompletion`

**Accessibility E2E (`a11y.spec.ts`):**
- Uses `@axe-core/playwright` for automated scanning
- Scans: Hub, Profile creation, each game mid-play, Rewards gallery, Settings, Parental dashboard
- Catches page-level issues that component-level axe tests miss (landmark structure, heading order, skip links)

---

## 6B — CI/CD Hardening

### Enhanced GitHub Actions Pipeline

Current pipeline (from Phases 0/5):
```
lint → typecheck → test → build → size-limit → lighthouse
```

New pipeline:
```
lint → typecheck → unit tests (with coverage) → build → size-limit → lighthouse → playwright E2E → playwright a11y
```

**Key additions:**
- **Playwright step** — install browsers via `playwright install --with-deps`, run against the built preview server (`pnpm preview`), upload trace files as artifacts on failure
- **A11y step** — runs `a11y.spec.ts` separately so a11y failures are clearly visible in PR checks (not buried in general E2E results)
- **Test results** — upload Playwright HTML report as a CI artifact for easy debugging
- **Coverage enforcement** — Vitest with `--coverage`, enforce minimum thresholds (80% shared, 70% games)

### Changesets

- `@changesets/cli` as a dev dependency
- `.changeset/config.json` configured for the monorepo:
  - Linked versioning for `platform` + `shared`
  - Independent versioning for each game package
- Developers run `pnpm changeset` when making notable changes
- CI checks that a changeset file exists on PRs (warning, not blocking)
- `CHANGELOG.md` generated per package when changesets are consumed

---

## Explicitly Deferred

| Item | Reason | When |
|------|--------|------|
| Deployment platform selection | Keep phase focused; pick when ready to ship | Pre-launch |
| PR preview deploys | Depends on platform choice | After platform selected |
| Auto-deploy on merge | Depends on platform choice | After platform selected |
| Visual regression testing | Nice-to-have, not critical for launch | Future phase |
| Runtime feature flag overrides | Interface is future-compatible; build when needed | Future phase |

---

## Acceptance Criteria

- [ ] Feature flag system works: disabling a flag hides the game from the hub and blocks direct navigation
- [ ] `pnpm create-game` scaffolds a working game package that builds and tests pass
- [ ] GAME_DEVELOPER_GUIDE.md is complete and a new developer could follow it to add a game
- [ ] Unit/integration coverage meets targets (80% shared/platform, 70% games)
- [ ] All 7 Playwright E2E suites pass at specified viewports
- [ ] axe-core E2E scan reports zero critical/serious violations
- [ ] CI pipeline runs all checks and fails PRs on any failure
- [ ] Changesets configured and generating changelogs
