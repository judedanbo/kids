# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kids Games Zone — a modular educational games platform for children ages 3-12. pnpm monorepo with a React platform shell that lazy-loads independent game plugins.

## Commands

```bash
pnpm dev              # Start platform dev server (port 3000)
pnpm build            # Production build (typecheck + vite build)
pnpm lint             # ESLint across all .ts/.tsx files
pnpm typecheck        # tsc --noEmit across all workspace packages
pnpm test             # Vitest across all packages (passWithNoTests)
pnpm format           # Prettier format all files
pnpm format:check     # Check formatting without writing

# Run commands for a specific package
pnpm --filter platform dev
pnpm --filter @kids-games-zone/shared typecheck
pnpm --filter word-puzzle test    # (when game packages exist)
```

## Architecture

**Monorepo layout** (`pnpm-workspace.yaml`):

- `platform/` — React 19 + Vite 6 app. The hub/shell that handles routing, profiles, state, and loads games.
- `shared/` — Shared TypeScript types, UI components, hooks, design tokens. Published as `@kids-games-zone/shared`.
- `games/<name>/` — Each game is a self-contained workspace package that exports a `GamePlugin` interface.
- `plans/` — Requirements, technical specs, and phased development plan.

**Game plugin system**: Every game implements the `GamePlugin` interface (`shared/src/types/game.ts`) with lifecycle hooks (`onLoad`, `onStart`, `onPause`, `onResume`, `onEnd`, `onUnload`) and a `GameComponent` React component that receives `GameProps`. The platform dynamically imports games via `React.lazy()` based on `GameManifest.entryPoint`.

**Type hierarchy**: `shared/src/types/game.ts` defines the game architecture types (`GameManifest`, `GamePlugin`, `GameProps`, `GameResult`). `shared/src/types/user.ts` defines user/data types (`UserProfile`, `GameProgress`, `Reward`). All exported via barrel at `shared/src/index.ts`.

**Age tiers**: `tiny` (3-5), `junior` (6-8), `explorer` (9-12) — affect UI sizing, difficulty, feedback intensity.

## Key Conventions

- **Path alias**: `@shared/*` resolves to `shared/src/*` (configured in both `tsconfig.base.json` and `platform/vite.config.ts`).
- **Styling**: CSS Modules + CSS custom properties (design tokens in `platform/src/styles/global.css`). No CSS-in-JS, no Tailwind.
- **ESLint**: Flat config (`eslint.config.js`). Includes jsx-a11y for accessibility enforcement.
- **TypeScript**: Strict mode. Unused vars must be prefixed with `_`.
- **Shared package**: Uses `composite: true` in tsconfig for project references from platform.
- **No server**: Fully client-side. IndexedDB for persistence. No external analytics (COPPA compliance).

## Development Plan

See `plans/development-plan.md` for the phased roadmap. Current status tracked there. Key spec documents:

- `plans/games-zone-requirements.md` — High-level requirements
- `plans/technical-specs.md` — Detailed technical specifications with all interfaces and data models
