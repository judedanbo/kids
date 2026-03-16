# Phase 2: Platform Shell & Core Services — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the platform shell — state management, IndexedDB storage, stub audio, routing with bottom tab bar, profile system, game hub, game plugin loader with error boundaries, and a dummy game that validates the entire pipeline end-to-end.

**Architecture:** The platform shell (`platform/`) is a React 19 + Vite 6 app that wraps everything in a `PlatformProvider` (React Context + `useReducer`). IndexedDB persistence via `idb`. Games are loaded as dynamic imports via `import.meta.glob`. A bottom `NavBar` provides navigation across Hub, Profile, Rewards, and Settings pages. The `GameWrapper` page orchestrates game plugin lifecycle, auto-save, and visibility-change pause/resume.

**Tech Stack:** React 19, React Router 7, TypeScript 5.7 (strict), idb (IndexedDB), Framer Motion 11, CSS Modules, Vitest + React Testing Library, fake-indexeddb (test).

**Spec:** `docs/superpowers/specs/2026-03-15-phase2-platform-shell-design.md`

---

## File Map

### New files

| Path | Responsibility |
|------|---------------|
| `platform/vitest.config.ts` | Vitest config for platform package (jsdom, CSS modules) |
| `platform/src/test-setup.ts` | Testing library jest-dom setup |
| `platform/src/services/storage.ts` | StorageManager implementation using idb |
| `platform/src/services/storage.test.ts` | Storage service tests (fake-indexeddb) |
| `platform/src/services/audio.ts` | StubAudioManager (console-logging no-ops) |
| `platform/src/services/audio.test.ts` | Audio stub tests |
| `platform/src/context/PlatformContext.tsx` | GlobalState, reducer, PlatformProvider, usePlatform hook |
| `platform/src/context/PlatformContext.test.tsx` | PlatformContext tests |
| `platform/src/components/NavBar/NavBar.tsx` | Bottom tab bar navigation |
| `platform/src/components/NavBar/NavBar.module.css` | NavBar styles |
| `platform/src/components/LoadingSpinner/LoadingSpinner.tsx` | CSS-only loading spinner |
| `platform/src/components/LoadingSpinner/LoadingSpinner.module.css` | LoadingSpinner styles |
| `platform/src/components/GameErrorBoundary.tsx` | Error boundary for game loading |
| `platform/src/components/ProfileCreator/ProfileCreator.tsx` | Multi-step profile creation wizard |
| `platform/src/components/ProfileCreator/ProfileCreator.module.css` | ProfileCreator styles |
| `platform/src/components/GameCard/GameCard.tsx` | Game card for hub grid |
| `platform/src/components/GameCard/GameCard.module.css` | GameCard styles |
| `platform/src/pages/Hub.tsx` | Game hub home screen |
| `platform/src/pages/Hub.module.css` | Hub page styles |
| `platform/src/pages/ProfileSelect.tsx` | Profile picker + creation flow |
| `platform/src/pages/ProfileSelect.module.css` | ProfileSelect styles |
| `platform/src/pages/GameWrapper.tsx` | Game plugin host page |
| `platform/src/pages/Rewards.tsx` | Placeholder rewards page |
| `platform/src/pages/Settings.tsx` | Placeholder settings page |
| `platform/src/services/gameLoader.ts` | Dynamic import game loader |
| `platform/src/config/gameRegistry.ts` | Static game manifest registry |
| `games/dummy-game/package.json` | Dummy game workspace package |
| `games/dummy-game/tsconfig.json` | Dummy game TypeScript config |
| `games/dummy-game/src/index.ts` | GamePlugin export |
| `games/dummy-game/src/DummyGame.tsx` | Dummy game component |
| `games/dummy-game/src/DummyGame.module.css` | Dummy game styles |

### Modified files

| Path | Change |
|------|--------|
| `package.json` (root) | Add `fake-indexeddb` devDependency |
| `platform/package.json` | Add `idb`, `framer-motion` deps; add vitest/testing devDeps |
| `platform/tsconfig.json` | Add `vitest/globals` types |
| `platform/src/App.tsx` | Rewrite with React Router routes, NavBar |
| `platform/src/main.tsx` | Wrap with BrowserRouter and PlatformProvider |
| `platform/src/styles/global.css` | Add page layout and nav-bar spacing styles |
| `pnpm-workspace.yaml` | Already includes `games/*` — no change needed |

---

## Chunk 1: Dependencies & Services (Tasks 1-3)

Install dependencies, set up platform test infrastructure, implement StorageManager and StubAudioManager.

### Task 1: Install dependencies and configure platform test infrastructure

**Files:**
- Modify: `package.json` (root)
- Modify: `platform/package.json`
- Modify: `platform/tsconfig.json`
- Create: `platform/vitest.config.ts`
- Create: `platform/src/test-setup.ts`

- [ ] **Step 1: Add fake-indexeddb to root devDependencies**

In `/home/jude/code/kids/package.json`, add to `devDependencies`:

```json
"fake-indexeddb": "^6.0.0"
```

- [ ] **Step 2: Add dependencies to platform package.json**

Replace `/home/jude/code/kids/platform/package.json` with:

```json
{
  "name": "@kids-games-zone/platform",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@kids-games-zone/shared": "workspace:*",
    "idb": "^8.0.0",
    "framer-motion": "^11.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 3: Update platform tsconfig.json to include vitest globals**

Replace `/home/jude/code/kids/platform/tsconfig.json` with:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@shared/*": ["../shared/src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 4: Create platform vitest config**

Create `/home/jude/code/kids/platform/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
```

- [ ] **Step 5: Create platform test setup file**

Create `/home/jude/code/kids/platform/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Install and verify**

Run: `cd /home/jude/code/kids && pnpm install`
Expected: Clean install with no errors.

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: Pass (no tests yet, `passWithNoTests` is configured).

- [ ] **Step 7: Commit**

```bash
git add package.json platform/package.json platform/tsconfig.json platform/vitest.config.ts platform/src/test-setup.ts pnpm-lock.yaml
git commit -m "feat: add Phase 2 dependencies and platform test infrastructure

Add idb, framer-motion to platform. Add fake-indexeddb to root.
Configure Vitest with jsdom for platform component/service tests."
```

---

### Task 2: Implement StorageManager with IndexedDB

**Files:**
- Create: `platform/src/services/storage.test.ts`
- Create: `platform/src/services/storage.ts`

- [ ] **Step 1: Write storage service tests**

Create `/home/jude/code/kids/platform/src/services/storage.test.ts`:

```typescript
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBStorageManager } from './storage';
import type { UserProfile, GameProgress, Reward, AnalyticsEvent } from '@kids-games-zone/shared';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: crypto.randomUUID(),
    name: 'Test Kid',
    avatar: '🦊',
    age: 7,
    ageTier: 'junior',
    createdAt: new Date().toISOString(),
    parentPin: '',
    preferences: {
      musicVolume: 0.7,
      sfxVolume: 1,
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
    ...overrides,
  };
}

function makeProgress(overrides: Partial<GameProgress> = {}): GameProgress {
  return {
    gameId: 'test-game',
    highScore: 100,
    currentLevel: 3,
    maxLevelReached: 3,
    totalAttempts: 5,
    totalTimePlayed: 600,
    lastPlayedAt: new Date().toISOString(),
    difficulty: 2,
    ...overrides,
  };
}

describe('IndexedDBStorageManager', () => {
  let storage: IndexedDBStorageManager;

  beforeEach(async () => {
    // Each test gets a unique DB name to avoid conflicts
    storage = new IndexedDBStorageManager(`test-db-${crypto.randomUUID()}`);
    await storage.init();
  });

  describe('profiles', () => {
    it('saves and loads a profile', async () => {
      const profile = makeProfile({ name: 'Alice' });
      await storage.saveProfile(profile);

      const loaded = await storage.loadProfile(profile.id);
      expect(loaded).toEqual(profile);
    });

    it('returns null for non-existent profile', async () => {
      const loaded = await storage.loadProfile('nonexistent');
      expect(loaded).toBeNull();
    });

    it('lists all profiles', async () => {
      const p1 = makeProfile({ name: 'Alice' });
      const p2 = makeProfile({ name: 'Bob' });
      await storage.saveProfile(p1);
      await storage.saveProfile(p2);

      const profiles = await storage.listProfiles();
      expect(profiles).toHaveLength(2);
      expect(profiles.map((p) => p.name).sort()).toEqual(['Alice', 'Bob']);
    });

    it('deletes a profile', async () => {
      const profile = makeProfile();
      await storage.saveProfile(profile);
      await storage.deleteProfile(profile.id);

      const loaded = await storage.loadProfile(profile.id);
      expect(loaded).toBeNull();
    });

    it('overwrites existing profile on save', async () => {
      const profile = makeProfile({ name: 'Alice' });
      await storage.saveProfile(profile);

      const updated = { ...profile, name: 'Alice Updated' };
      await storage.saveProfile(updated);

      const loaded = await storage.loadProfile(profile.id);
      expect(loaded?.name).toBe('Alice Updated');
    });
  });

  describe('progress', () => {
    it('saves and loads progress by compound key', async () => {
      const progress = makeProgress({ gameId: 'word-puzzle' });
      await storage.saveProgress('profile-1', 'word-puzzle', progress);

      const loaded = await storage.loadProgress('profile-1', 'word-puzzle');
      expect(loaded).toEqual(progress);
    });

    it('returns null for non-existent progress', async () => {
      const loaded = await storage.loadProgress('profile-1', 'nonexistent');
      expect(loaded).toBeNull();
    });

    it('overwrites progress for same profile+game', async () => {
      const progress1 = makeProgress({ highScore: 50 });
      await storage.saveProgress('profile-1', 'test-game', progress1);

      const progress2 = makeProgress({ highScore: 200 });
      await storage.saveProgress('profile-1', 'test-game', progress2);

      const loaded = await storage.loadProgress('profile-1', 'test-game');
      expect(loaded?.highScore).toBe(200);
    });
  });

  describe('checkpoints', () => {
    it('saves and loads checkpoint data', async () => {
      const checkpoint = { level: 3, items: ['sword', 'shield'] };
      await storage.saveCheckpoint('profile-1', 'test-game', checkpoint);

      const loaded = await storage.loadCheckpoint('profile-1', 'test-game');
      expect(loaded).toEqual(checkpoint);
    });

    it('returns null when no checkpoint exists', async () => {
      const loaded = await storage.loadCheckpoint('profile-1', 'nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('rewards', () => {
    it('unlocks and retrieves rewards', async () => {
      const reward: Reward = {
        id: 'star-1',
        type: 'star',
        name: 'First Star',
        description: 'Complete your first game',
        icon: '⭐',
        unlockedAt: new Date().toISOString(),
        criteria: { type: 'completion', threshold: 1 },
      };

      await storage.unlockReward('profile-1', reward);
      const rewards = await storage.getRewards('profile-1');
      expect(rewards).toHaveLength(1);
      expect(rewards[0].name).toBe('First Star');
    });

    it('returns empty array when no rewards', async () => {
      const rewards = await storage.getRewards('profile-1');
      expect(rewards).toEqual([]);
    });
  });

  describe('events', () => {
    it('logs and retrieves events', async () => {
      const event: AnalyticsEvent = {
        id: crypto.randomUUID(),
        type: 'game_start',
        profileId: 'profile-1',
        gameId: 'test-game',
        timestamp: new Date().toISOString(),
        data: { difficulty: 2 },
      };

      await storage.logEvent(event);
      const events = await storage.getEvents({ profileId: 'profile-1' });
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('game_start');
    });

    it('filters events by type', async () => {
      const e1: AnalyticsEvent = {
        id: crypto.randomUUID(),
        type: 'game_start',
        profileId: 'profile-1',
        timestamp: new Date().toISOString(),
        data: {},
      };
      const e2: AnalyticsEvent = {
        id: crypto.randomUUID(),
        type: 'game_end',
        profileId: 'profile-1',
        timestamp: new Date().toISOString(),
        data: {},
      };

      await storage.logEvent(e1);
      await storage.logEvent(e2);

      const filtered = await storage.getEvents({ profileId: 'profile-1', type: 'game_start' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('game_start');
    });

    it('returns empty array with no matching events', async () => {
      const events = await storage.getEvents({ profileId: 'nonexistent' });
      expect(events).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failure (TDD red)**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: Fails because `./storage` module does not exist yet.

- [ ] **Step 3: Implement StorageManager**

Create `/home/jude/code/kids/platform/src/services/storage.ts`:

```typescript
import { openDB, type IDBPDatabase } from 'idb';
import type {
  UserProfile,
  GameProgress,
  Reward,
  StorageManager,
  AnalyticsEvent,
  EventFilter,
} from '@kids-games-zone/shared';

interface ProgressRecord {
  profileId: string;
  gameId: string;
  data: GameProgress;
}

interface CheckpointRecord {
  profileId: string;
  gameId: string;
  data: unknown;
}

interface RewardRecord {
  id?: number;
  profileId: string;
  reward: Reward;
}

export class IndexedDBStorageManager implements StorageManager {
  private db: IDBPDatabase | null = null;
  private readonly dbName: string;

  constructor(dbName: string = 'kids-games-zone') {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    this.db = await openDB(this.dbName, 1, {
      upgrade(db) {
        // Profiles store
        const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
        profileStore.createIndex('name', 'name');

        // Progress store (compound key)
        const progressStore = db.createObjectStore('progress', {
          keyPath: ['profileId', 'gameId'],
        });
        progressStore.createIndex('profileId', 'profileId');
        progressStore.createIndex('gameId', 'gameId');

        // Checkpoints store (compound key)
        db.createObjectStore('checkpoints', {
          keyPath: ['profileId', 'gameId'],
        });

        // Rewards store (auto-increment)
        const rewardStore = db.createObjectStore('rewards', {
          keyPath: 'id',
          autoIncrement: true,
        });
        rewardStore.createIndex('profileId', 'profileId');

        // Events store
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('profileId', 'profileId');
        eventStore.createIndex('timestamp', 'timestamp');
        eventStore.createIndex('type', 'type');
      },
    });
  }

  private getDB(): IDBPDatabase {
    if (!this.db) {
      throw new Error('StorageManager not initialized. Call init() first.');
    }
    return this.db;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await this.getDB().put('profiles', profile);
  }

  async loadProfile(profileId: string): Promise<UserProfile | null> {
    const profile = await this.getDB().get('profiles', profileId);
    return profile ?? null;
  }

  async listProfiles(): Promise<UserProfile[]> {
    return this.getDB().getAll('profiles');
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.getDB().delete('profiles', profileId);
  }

  async saveProgress(
    profileId: string,
    gameId: string,
    progress: GameProgress,
  ): Promise<void> {
    const record: ProgressRecord = { profileId, gameId, data: progress };
    await this.getDB().put('progress', record);
  }

  async loadProgress(
    profileId: string,
    gameId: string,
  ): Promise<GameProgress | null> {
    const record: ProgressRecord | undefined = await this.getDB().get('progress', [
      profileId,
      gameId,
    ]);
    return record?.data ?? null;
  }

  async saveCheckpoint(
    profileId: string,
    gameId: string,
    data: unknown,
  ): Promise<void> {
    const record: CheckpointRecord = { profileId, gameId, data };
    await this.getDB().put('checkpoints', record);
  }

  async loadCheckpoint(
    profileId: string,
    gameId: string,
  ): Promise<unknown | null> {
    const record: CheckpointRecord | undefined = await this.getDB().get(
      'checkpoints',
      [profileId, gameId],
    );
    return record?.data ?? null;
  }

  async unlockReward(profileId: string, reward: Reward): Promise<void> {
    const record: RewardRecord = { profileId, reward };
    await this.getDB().add('rewards', record);
  }

  async getRewards(profileId: string): Promise<Reward[]> {
    const records: RewardRecord[] = await this.getDB().getAllFromIndex(
      'rewards',
      'profileId',
      profileId,
    );
    return records.map((r) => r.reward);
  }

  async logEvent(event: AnalyticsEvent): Promise<void> {
    await this.getDB().put('events', event);
  }

  async getEvents(filter: EventFilter): Promise<AnalyticsEvent[]> {
    const db = this.getDB();
    let events: AnalyticsEvent[];

    if (filter.profileId) {
      events = await db.getAllFromIndex('events', 'profileId', filter.profileId);
    } else {
      events = await db.getAll('events');
    }

    return events.filter((event) => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.gameId && event.gameId !== filter.gameId) return false;
      if (filter.startDate && event.timestamp < filter.startDate) return false;
      if (filter.endDate && event.timestamp > filter.endDate) return false;
      return true;
    });
  }
}
```

- [ ] **Step 4: Run tests — expect pass (TDD green)**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: All storage tests pass.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add platform/src/services/storage.ts platform/src/services/storage.test.ts
git commit -m "feat: implement IndexedDB StorageManager with idb

CRUD for profiles, progress, checkpoints, rewards, events.
Compound key [profileId, gameId] for progress lookups.
Full test suite using fake-indexeddb."
```

---

### Task 3: Implement StubAudioManager

**Files:**
- Create: `platform/src/services/audio.test.ts`
- Create: `platform/src/services/audio.ts`

- [ ] **Step 1: Write audio stub tests**

Create `/home/jude/code/kids/platform/src/services/audio.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StubAudioManager } from './audio';

describe('StubAudioManager', () => {
  let audio: StubAudioManager;

  beforeEach(() => {
    audio = new StubAudioManager();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('logs playMusic calls', () => {
    audio.playMusic('bgm-01', { loop: true });
    expect(console.log).toHaveBeenCalledWith('[AudioManager] playMusic:', 'bgm-01', { loop: true });
  });

  it('logs stopMusic calls', () => {
    audio.stopMusic({ fadeOut: 500 });
    expect(console.log).toHaveBeenCalledWith('[AudioManager] stopMusic:', { fadeOut: 500 });
  });

  it('logs playSFX calls', () => {
    audio.playSFX('click');
    expect(console.log).toHaveBeenCalledWith('[AudioManager] playSFX:', 'click');
  });

  it('calls onComplete callback for playVoice', () => {
    const onComplete = vi.fn();
    audio.playVoice('welcome', onComplete);
    expect(onComplete).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('[AudioManager] playVoice:', 'welcome');
  });

  it('logs setVolume calls', () => {
    audio.setVolume('music', 0.5);
    expect(console.log).toHaveBeenCalledWith('[AudioManager] setVolume:', 'music', 0.5);
  });

  it('logs mute/unmute calls', () => {
    audio.mute('sfx');
    expect(console.log).toHaveBeenCalledWith('[AudioManager] mute:', 'sfx');

    audio.unmute();
    expect(console.log).toHaveBeenCalledWith('[AudioManager] unmute:', 'all');
  });

  it('resolves preload promise', async () => {
    await expect(audio.preload(['asset1', 'asset2'])).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith('[AudioManager] preload:', ['asset1', 'asset2']);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (TDD red)**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: Fails because `./audio` module does not exist yet.

- [ ] **Step 3: Implement StubAudioManager**

Create `/home/jude/code/kids/platform/src/services/audio.ts`:

```typescript
import type { AudioManager } from '@kids-games-zone/shared';

export class StubAudioManager implements AudioManager {
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

- [ ] **Step 4: Run tests — expect pass (TDD green)**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: All tests pass (storage + audio).

- [ ] **Step 5: Commit**

```bash
git add platform/src/services/audio.ts platform/src/services/audio.test.ts
git commit -m "feat: add StubAudioManager with console logging

Implements AudioManager interface with no-op methods that log to console.
Real audio backend deferred to Phase 3."
```

---

## Chunk 2: State Management & Routing (Tasks 4-6)

PlatformContext, routing setup, NavBar, placeholder pages, LoadingSpinner, GameErrorBoundary.

### Task 4: PlatformContext — state management

**Files:**
- Create: `platform/src/context/PlatformContext.tsx`
- Create: `platform/src/context/PlatformContext.test.tsx`

- [ ] **Step 1: Write PlatformContext tests**

Create `/home/jude/code/kids/platform/src/context/PlatformContext.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformProvider, usePlatform } from './PlatformContext';
import type { UserProfile, GameManifest } from '@kids-games-zone/shared';
import type { StorageManager, AudioManager } from '@kids-games-zone/shared';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-id',
    name: 'Test Kid',
    avatar: '🦊',
    age: 7,
    ageTier: 'junior',
    createdAt: new Date().toISOString(),
    parentPin: '',
    preferences: {
      musicVolume: 0.7,
      sfxVolume: 1,
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
    ...overrides,
  };
}

const mockStorage: StorageManager = {
  saveProfile: vi.fn().mockResolvedValue(undefined),
  loadProfile: vi.fn().mockResolvedValue(null),
  listProfiles: vi.fn().mockResolvedValue([]),
  deleteProfile: vi.fn().mockResolvedValue(undefined),
  saveProgress: vi.fn().mockResolvedValue(undefined),
  loadProgress: vi.fn().mockResolvedValue(null),
  saveCheckpoint: vi.fn().mockResolvedValue(undefined),
  loadCheckpoint: vi.fn().mockResolvedValue(null),
  unlockReward: vi.fn().mockResolvedValue(undefined),
  getRewards: vi.fn().mockResolvedValue([]),
  logEvent: vi.fn().mockResolvedValue(undefined),
  getEvents: vi.fn().mockResolvedValue([]),
};

const mockAudio: AudioManager = {
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
  playSFX: vi.fn(),
  playVoice: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  preload: vi.fn().mockResolvedValue(undefined),
};

function TestConsumer() {
  const { state, dispatch } = usePlatform();
  return (
    <div>
      <div data-testid="profile-name">
        {state.currentProfile?.name ?? 'none'}
      </div>
      <div data-testid="profile-count">{state.profiles.length}</div>
      <button
        onClick={() =>
          dispatch({ type: 'ADD_PROFILE', payload: makeProfile({ name: 'Alice' }) })
        }
      >
        Add Profile
      </button>
      <button
        onClick={() =>
          dispatch({ type: 'SET_PROFILE', payload: makeProfile({ name: 'Bob' }) })
        }
      >
        Set Profile
      </button>
      <button onClick={() => dispatch({ type: 'START_SESSION', payload: { gameId: 'test' } })}>
        Start Session
      </button>
      <button onClick={() => dispatch({ type: 'END_SESSION' })}>End Session</button>
      <div data-testid="active-game">{state.session.activeGameId ?? 'none'}</div>
    </div>
  );
}

describe('PlatformContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial state with no profile', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    expect(screen.getByTestId('profile-name').textContent).toBe('none');
    expect(screen.getByTestId('profile-count').textContent).toBe('0');
  });

  it('handles ADD_PROFILE action', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    act(() => {
      screen.getByText('Add Profile').click();
    });

    expect(screen.getByTestId('profile-count').textContent).toBe('1');
  });

  it('handles SET_PROFILE action', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    act(() => {
      screen.getByText('Set Profile').click();
    });

    expect(screen.getByTestId('profile-name').textContent).toBe('Bob');
  });

  it('handles START_SESSION and END_SESSION', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    act(() => {
      screen.getByText('Start Session').click();
    });
    expect(screen.getByTestId('active-game').textContent).toBe('test');

    act(() => {
      screen.getByText('End Session').click();
    });
    expect(screen.getByTestId('active-game').textContent).toBe('none');
  });
});
```

- [ ] **Step 2: Run tests — expect failure (TDD red)**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: Fails because `PlatformContext` module does not exist yet.

- [ ] **Step 3: Implement PlatformContext**

Create `/home/jude/code/kids/platform/src/context/PlatformContext.tsx`:

```tsx
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  UserProfile,
  GameManifest,
  GameProgress,
  Reward,
  StorageManager,
  AudioManager,
} from '@kids-games-zone/shared';

// --- State types ---

export interface PlatformSettings {
  theme: 'light' | 'dark';
  language: string;
}

export interface GlobalState {
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

// --- Actions ---

export type PlatformAction =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'ADD_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROGRESS'; payload: { profileId: string; gameId: string; progress: GameProgress } }
  | { type: 'REGISTER_GAME'; payload: GameManifest }
  | { type: 'START_SESSION'; payload: { gameId: string } }
  | { type: 'END_SESSION' }
  | { type: 'UNLOCK_REWARD'; payload: { profileId: string; reward: Reward } }
  | { type: 'LOAD_PROFILES'; payload: UserProfile[] }
  | { type: 'SET_SETTINGS'; payload: Partial<PlatformSettings> };

// --- Reducer ---

function platformReducer(state: GlobalState, action: PlatformAction): GlobalState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, currentProfile: action.payload };

    case 'ADD_PROFILE':
      return {
        ...state,
        profiles: [...state.profiles, action.payload],
      };

    case 'UPDATE_PROGRESS': {
      const { profileId, gameId, progress } = action.payload;
      if (state.currentProfile && state.currentProfile.id === profileId) {
        return {
          ...state,
          currentProfile: {
            ...state.currentProfile,
            progress: { ...state.currentProfile.progress, [gameId]: progress },
          },
        };
      }
      return state;
    }

    case 'REGISTER_GAME':
      return {
        ...state,
        gameRegistry: [...state.gameRegistry, action.payload],
      };

    case 'START_SESSION':
      return {
        ...state,
        session: {
          activeGameId: action.payload.gameId,
          startedAt: new Date().toISOString(),
          elapsedTime: 0,
        },
      };

    case 'END_SESSION':
      return {
        ...state,
        session: {
          activeGameId: null,
          startedAt: null,
          elapsedTime: 0,
        },
      };

    case 'UNLOCK_REWARD': {
      const { profileId, reward } = action.payload;
      if (state.currentProfile && state.currentProfile.id === profileId) {
        return {
          ...state,
          currentProfile: {
            ...state.currentProfile,
            rewards: [...state.currentProfile.rewards, reward],
          },
        };
      }
      return state;
    }

    case 'LOAD_PROFILES':
      return { ...state, profiles: action.payload };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

// --- Context ---

interface PlatformContextValue {
  state: GlobalState;
  dispatch: React.Dispatch<PlatformAction>;
  storageManager: StorageManager;
  audioManager: AudioManager;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

// --- Provider ---

interface PlatformProviderProps {
  children: ReactNode;
  storageManager: StorageManager;
  audioManager: AudioManager;
  gameRegistry: GameManifest[];
}

const initialState: GlobalState = {
  currentProfile: null,
  profiles: [],
  gameRegistry: [],
  session: {
    activeGameId: null,
    startedAt: null,
    elapsedTime: 0,
  },
  settings: {
    theme: 'light',
    language: 'en',
  },
};

export function PlatformProvider({
  children,
  storageManager,
  audioManager,
  gameRegistry,
}: PlatformProviderProps) {
  const [state, dispatch] = useReducer(platformReducer, {
    ...initialState,
    gameRegistry,
  });

  // Hydrate profiles from IndexedDB on mount
  useEffect(() => {
    async function hydrate() {
      try {
        const profiles = await storageManager.listProfiles();
        dispatch({ type: 'LOAD_PROFILES', payload: profiles });

        // Set last active profile if available
        if (profiles.length > 0) {
          const sorted = [...profiles].sort(
            (a, b) =>
              new Date(b.stats.lastPlayedAt || b.createdAt).getTime() -
              new Date(a.stats.lastPlayedAt || a.createdAt).getTime(),
          );
          dispatch({ type: 'SET_PROFILE', payload: sorted[0] });
        }
      } catch (err) {
        console.warn('[PlatformProvider] Failed to hydrate from IndexedDB:', err);
      }
    }
    hydrate();
  }, [storageManager]);

  // Persist current profile changes to IndexedDB
  useEffect(() => {
    if (state.currentProfile) {
      storageManager.saveProfile(state.currentProfile).catch((err) => {
        console.warn('[PlatformProvider] Failed to persist profile:', err);
      });
    }
  }, [state.currentProfile, storageManager]);

  return (
    <PlatformContext.Provider
      value={{ state, dispatch, storageManager, audioManager }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

// --- Hook ---

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run tests — expect pass (TDD green)**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: All tests pass.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add platform/src/context/PlatformContext.tsx platform/src/context/PlatformContext.test.tsx
git commit -m "feat: add PlatformContext with reducer and provider

GlobalState with profiles, session, settings, gameRegistry.
PlatformProvider hydrates from IndexedDB and persists profile changes.
usePlatform hook for consuming state and dispatch."
```

---

### Task 5: Routing, NavBar, and placeholder pages

**Files:**
- Modify: `platform/src/App.tsx`
- Modify: `platform/src/main.tsx`
- Modify: `platform/src/styles/global.css`
- Create: `platform/src/components/NavBar/NavBar.tsx`
- Create: `platform/src/components/NavBar/NavBar.module.css`
- Create: `platform/src/pages/Rewards.tsx`
- Create: `platform/src/pages/Settings.tsx`

- [ ] **Step 1: Create NavBar component**

Create `/home/jude/code/kids/platform/src/components/NavBar/NavBar.tsx`:

```tsx
import { NavLink, useLocation } from 'react-router-dom';
import styles from './NavBar.module.css';

const tabs = [
  { icon: '🏠', label: 'Home', path: '/' },
  { icon: '👤', label: 'Profile', path: '/profile' },
  { icon: '🏆', label: 'Rewards', path: '/rewards' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
] as const;

export function NavBar() {
  const location = useLocation();

  // Hide NavBar on game routes
  if (location.pathname.startsWith('/game/')) {
    return null;
  }

  return (
    <nav className={styles.navbar} aria-label="Main navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
          end={tab.path === '/'}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create NavBar styles**

Create `/home/jude/code/kids/platform/src/components/NavBar/NavBar.module.css`:

```css
.navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-xs) 0;
  z-index: 50;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: var(--touch-target-size);
  min-height: var(--touch-target-size);
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
  border: none;
  background: none;
  cursor: pointer;
}

.tab.active {
  color: var(--color-primary);
  font-weight: 700;
}

.icon {
  font-size: 1.5rem;
  line-height: 1;
}

.label {
  font-size: 0.7rem;
  font-family: var(--font-family-body);
}
```

- [ ] **Step 3: Create Rewards placeholder page**

Create `/home/jude/code/kids/platform/src/pages/Rewards.tsx`:

```tsx
export function Rewards() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
      <h1>Rewards</h1>
      <p>Your rewards gallery is coming soon!</p>
    </div>
  );
}
```

- [ ] **Step 4: Create Settings placeholder page**

Create `/home/jude/code/kids/platform/src/pages/Settings.tsx`:

```tsx
export function Settings() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
      <h1>Settings</h1>
      <p>Settings and parental controls coming soon!</p>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite App.tsx with routing**

Replace `/home/jude/code/kids/platform/src/App.tsx` with:

```tsx
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar/NavBar';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';

const Hub = lazy(() => import('./pages/Hub'));
const ProfileSelect = lazy(() => import('./pages/ProfileSelect'));
const GameWrapper = lazy(() => import('./pages/GameWrapper'));

function App() {
  return (
    <>
      <div className="page-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/profile" element={<ProfileSelect />} />
            <Route path="/game/:gameId" element={<GameWrapper />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/parental" element={<Settings />} />
          </Routes>
        </Suspense>
      </div>
      <NavBar />
    </>
  );
}

export default App;
```

- [ ] **Step 6: Update main.tsx**

Replace `/home/jude/code/kids/platform/src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PlatformProvider } from './context/PlatformContext';
import { IndexedDBStorageManager } from './services/storage';
import { StubAudioManager } from './services/audio';
import { gameRegistry } from './config/gameRegistry';
import './styles/global.css';

const storageManager = new IndexedDBStorageManager();
storageManager.init().catch((err) => {
  console.warn('IndexedDB initialization failed. Running in-memory only:', err);
});

const audioManager = new StubAudioManager();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider
        storageManager={storageManager}
        audioManager={audioManager}
        gameRegistry={gameRegistry}
      >
        <App />
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 7: Update global.css with page layout styles**

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

.page-content {
  min-height: 100vh;
  padding-bottom: 72px; /* Space for fixed NavBar */
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
```

- [ ] **Step 8: Create stub files for lazy imports**

The lazy-loaded pages (Hub, ProfileSelect, GameWrapper) don't exist yet. Create minimal stubs so the app compiles. These will be replaced in later tasks.

Create `/home/jude/code/kids/platform/src/pages/Hub.tsx`:

```tsx
export default function Hub() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
      <h1>Game Hub</h1>
      <p>Games will appear here soon!</p>
    </div>
  );
}
```

Create `/home/jude/code/kids/platform/src/pages/ProfileSelect.tsx`:

```tsx
export default function ProfileSelect() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
      <h1>Profiles</h1>
      <p>Profile selection coming soon!</p>
    </div>
  );
}
```

Create `/home/jude/code/kids/platform/src/pages/GameWrapper.tsx`:

```tsx
export default function GameWrapper() {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
      <h1>Game Loading...</h1>
      <p>Game wrapper coming soon!</p>
    </div>
  );
}
```

Create `/home/jude/code/kids/platform/src/config/gameRegistry.ts`:

```typescript
import type { GameManifest } from '@kids-games-zone/shared';

export const gameRegistry: GameManifest[] = [];
```

- [ ] **Step 9: Verify build and typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm build`
Expected: Successful build.

- [ ] **Step 10: Commit**

```bash
git add platform/src/App.tsx platform/src/main.tsx platform/src/styles/global.css \
  platform/src/components/NavBar/NavBar.tsx platform/src/components/NavBar/NavBar.module.css \
  platform/src/pages/Rewards.tsx platform/src/pages/Settings.tsx \
  platform/src/pages/Hub.tsx platform/src/pages/ProfileSelect.tsx platform/src/pages/GameWrapper.tsx \
  platform/src/config/gameRegistry.ts
git commit -m "feat: add routing, NavBar, and placeholder pages

React Router v7 with lazy-loaded Hub, ProfileSelect, GameWrapper.
Bottom NavBar hidden on /game/* routes.
Placeholder Rewards and Settings pages.
PlatformProvider + services wired in main.tsx."
```

---

### Task 6: LoadingSpinner and GameErrorBoundary

**Files:**
- Create: `platform/src/components/LoadingSpinner/LoadingSpinner.tsx`
- Create: `platform/src/components/LoadingSpinner/LoadingSpinner.module.css`
- Create: `platform/src/components/GameErrorBoundary.tsx`

- [ ] **Step 1: Create LoadingSpinner component**

Create `/home/jude/code/kids/platform/src/components/LoadingSpinner/LoadingSpinner.tsx`:

```tsx
import styles from './LoadingSpinner.module.css';

export function LoadingSpinner() {
  return (
    <div className={styles.container} role="status" aria-label="Loading">
      <div className={styles.spinner}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>
      <p className={styles.text}>Loading...</p>
    </div>
  );
}
```

- [ ] **Step 2: Create LoadingSpinner styles**

Create `/home/jude/code/kids/platform/src/components/LoadingSpinner/LoadingSpinner.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: var(--spacing-md);
}

.spinner {
  display: flex;
  gap: var(--spacing-sm);
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-round);
  background-color: var(--color-primary);
  animation: bounce 0.6s ease-in-out infinite alternate;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
  background-color: var(--color-secondary);
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
  background-color: var(--color-success);
}

@keyframes bounce {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot {
    animation: none;
    opacity: 0.6;
  }

  .dot:nth-child(2) {
    opacity: 0.8;
  }

  .dot:nth-child(3) {
    opacity: 1;
  }
}

.text {
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-family: var(--font-family-body);
}
```

- [ ] **Step 3: Create GameErrorBoundary**

Create `/home/jude/code/kids/platform/src/components/GameErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GameErrorBoundaryProps {
  children: ReactNode;
  onGoHome?: () => void;
  onRetry?: () => void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GameErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[GameErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onGoHome?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '2rem',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '4rem' }}>😿</div>
          <h2
            style={{
              fontFamily: 'var(--font-family-display)',
              color: 'var(--color-text-primary)',
            }}
          >
            Oops! Something went wrong
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
            Don&apos;t worry, it&apos;s not your fault! Let&apos;s try again or go back to the games.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-medium)',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                fontFamily: 'var(--font-family-body)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-medium)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family-body)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--color-border)',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 4: Verify typecheck and build**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm build`
Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add platform/src/components/LoadingSpinner/LoadingSpinner.tsx \
  platform/src/components/LoadingSpinner/LoadingSpinner.module.css \
  platform/src/components/GameErrorBoundary.tsx
git commit -m "feat: add LoadingSpinner and GameErrorBoundary components

CSS-only bouncing dot spinner with reduced-motion support.
Error boundary shows friendly message with retry/home buttons."
```

---

## Chunk 3: Profile System (Tasks 7-8)

Profile creation wizard and profile selection page.

### Task 7: ProfileCreator component

**Files:**
- Create: `platform/src/components/ProfileCreator/ProfileCreator.tsx`
- Create: `platform/src/components/ProfileCreator/ProfileCreator.module.css`

- [ ] **Step 1: Create ProfileCreator component**

Create `/home/jude/code/kids/platform/src/components/ProfileCreator/ProfileCreator.tsx`:

```tsx
import { useState } from 'react';
import type { UserProfile, AgeTier } from '@kids-games-zone/shared';
import styles from './ProfileCreator.module.css';

interface ProfileCreatorProps {
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

type Step = 'name' | 'age' | 'avatar' | 'confirm';

const AVATARS = ['🦉', '🦊', '🐱', '🐶', '🐸', '🦁', '🐼', '🐰', '🦄', '🐙'];

function getAgeTier(age: number): AgeTier {
  if (age <= 5) return 'tiny';
  if (age <= 8) return 'junior';
  return 'explorer';
}

export function ProfileCreator({ onComplete, onCancel }: ProfileCreatorProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState('');

  function handleNameSubmit() {
    if (name.trim().length >= 1 && name.trim().length <= 20) {
      setStep('age');
    }
  }

  function handleAgeSelect(selectedAge: number) {
    setAge(selectedAge);
    setStep('avatar');
  }

  function handleAvatarSelect(selectedAvatar: string) {
    setAvatar(selectedAvatar);
    setStep('confirm');
  }

  function handleConfirm() {
    if (!age) return;

    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatar,
      age,
      ageTier: getAgeTier(age),
      createdAt: new Date().toISOString(),
      parentPin: '',
      preferences: {
        musicVolume: 0.7,
        sfxVolume: 1,
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
    };

    onComplete(profile);
  }

  function handleBack() {
    switch (step) {
      case 'age':
        setStep('name');
        break;
      case 'avatar':
        setStep('age');
        break;
      case 'confirm':
        setStep('avatar');
        break;
      default:
        onCancel?.();
    }
  }

  return (
    <div className={styles.creator}>
      {step !== 'name' && (
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
      )}

      {step === 'name' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>What&apos;s your name?</h2>
          <input
            className={styles.nameInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Type your name..."
            maxLength={20}
            autoFocus
            aria-label="Your name"
          />
          <button
            className={styles.nextButton}
            onClick={handleNameSubmit}
            disabled={name.trim().length < 1}
          >
            Next
          </button>
          {onCancel && (
            <button className={styles.cancelButton} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}

      {step === 'age' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>How old are you?</h2>
          <div className={styles.ageGrid}>
            {Array.from({ length: 10 }, (_, i) => i + 3).map((ageOption) => (
              <button
                key={ageOption}
                className={`${styles.ageButton} ${age === ageOption ? styles.selected : ''}`}
                onClick={() => handleAgeSelect(ageOption)}
              >
                {ageOption}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'avatar' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>Pick your avatar!</h2>
          <div className={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                className={`${styles.avatarButton} ${avatar === emoji ? styles.selected : ''}`}
                onClick={() => handleAvatarSelect(emoji)}
                aria-label={`Select ${emoji} avatar`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>Ready to play?</h2>
          <div className={styles.summary}>
            <div className={styles.summaryAvatar}>{avatar}</div>
            <div className={styles.summaryName}>{name.trim()}</div>
            <div className={styles.summaryAge}>
              Age {age} • {age ? getAgeTier(age) : ''} tier
            </div>
          </div>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            Let&apos;s go!
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ProfileCreator styles**

Create `/home/jude/code/kids/platform/src/components/ProfileCreator/ProfileCreator.module.css`:

```css
.creator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  max-width: 500px;
  margin: 0 auto;
}

.backButton {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-family: var(--font-family-body);
}

.stepContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  width: 100%;
}

.prompt {
  font-family: var(--font-family-display);
  font-size: 2rem;
  color: var(--color-primary);
  text-align: center;
}

.nameInput {
  width: 100%;
  max-width: 320px;
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-medium);
  font-size: 1.5rem;
  text-align: center;
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  outline: none;
  transition: border-color var(--transition-fast);
}

.nameInput:focus {
  border-color: var(--color-primary);
}

.nextButton,
.confirmButton {
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-medium);
  background-color: var(--color-primary);
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: var(--font-family-body);
  cursor: pointer;
  border: none;
  box-shadow: var(--shadow-button);
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}

.nextButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nextButton:not(:disabled):hover,
.confirmButton:hover {
  transform: scale(1.02);
}

.cancelButton {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  font-family: var(--font-family-body);
  margin-top: var(--spacing-sm);
}

.ageGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-md);
  width: 100%;
  max-width: 400px;
}

.ageButton {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--radius-medium);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
  font-family: var(--font-family-body);
}

.ageButton:hover {
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.ageButton.selected {
  border-color: var(--color-primary);
  background-color: var(--color-bg-secondary);
}

.avatarGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-md);
  width: 100%;
  max-width: 400px;
}

.avatarButton {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--radius-medium);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  font-size: 2.5rem;
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.avatarButton:hover {
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.avatarButton.selected {
  border-color: var(--color-primary);
  background-color: var(--color-bg-secondary);
}

.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  background-color: var(--color-surface);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-card);
}

.summaryAvatar {
  font-size: 4rem;
}

.summaryName {
  font-family: var(--font-family-display);
  font-size: 1.75rem;
  color: var(--color-text-primary);
}

.summaryAge {
  font-size: 1rem;
  color: var(--color-text-secondary);
  text-transform: capitalize;
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add platform/src/components/ProfileCreator/ProfileCreator.tsx \
  platform/src/components/ProfileCreator/ProfileCreator.module.css
git commit -m "feat: add ProfileCreator multi-step wizard component

Four steps: name, age (3-12), avatar (10 emojis), confirm.
Auto-assigns age tier. Uses crypto.randomUUID() for profile ID."
```

---

### Task 8: ProfileSelect page

**Files:**
- Modify: `platform/src/pages/ProfileSelect.tsx`
- Create: `platform/src/pages/ProfileSelect.module.css`

- [ ] **Step 1: Implement ProfileSelect page**

Replace `/home/jude/code/kids/platform/src/pages/ProfileSelect.tsx` with:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../context/PlatformContext';
import { ProfileCreator } from '../components/ProfileCreator/ProfileCreator';
import type { UserProfile } from '@kids-games-zone/shared';
import styles from './ProfileSelect.module.css';

export default function ProfileSelect() {
  const { state, dispatch, storageManager } = usePlatform();
  const navigate = useNavigate();
  const [showCreator, setShowCreator] = useState(state.profiles.length === 0);

  function handleSelectProfile(profile: UserProfile) {
    dispatch({ type: 'SET_PROFILE', payload: profile });
    navigate('/');
  }

  async function handleCreateProfile(profile: UserProfile) {
    await storageManager.saveProfile(profile);
    dispatch({ type: 'ADD_PROFILE', payload: profile });
    dispatch({ type: 'SET_PROFILE', payload: profile });
    navigate('/');
  }

  if (showCreator) {
    return (
      <ProfileCreator
        onComplete={handleCreateProfile}
        onCancel={state.profiles.length > 0 ? () => setShowCreator(false) : undefined}
      />
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Who&apos;s playing?</h1>
      <div className={styles.profileGrid}>
        {state.profiles.map((profile) => (
          <button
            key={profile.id}
            className={`${styles.profileCard} ${
              state.currentProfile?.id === profile.id ? styles.active : ''
            }`}
            onClick={() => handleSelectProfile(profile)}
          >
            <span className={styles.avatar}>{profile.avatar}</span>
            <span className={styles.name}>{profile.name}</span>
          </button>
        ))}
        <button
          className={styles.createCard}
          onClick={() => setShowCreator(true)}
        >
          <span className={styles.createIcon}>+</span>
          <span className={styles.createLabel}>New Player</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfileSelect styles**

Create `/home/jude/code/kids/platform/src/pages/ProfileSelect.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  max-width: 600px;
  margin: 0 auto;
}

.title {
  font-family: var(--font-family-display);
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.profileGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-lg);
  width: 100%;
}

.profileCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-large);
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  box-shadow: var(--shadow-card);
}

.profileCard:hover {
  transform: scale(1.03);
  border-color: var(--color-primary);
}

.profileCard.active {
  border-color: var(--color-primary);
  background-color: var(--color-bg-secondary);
}

.avatar {
  font-size: 3rem;
}

.name {
  font-family: var(--font-family-body);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.createCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background-color: transparent;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-large);
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.createCard:hover {
  border-color: var(--color-primary);
  transform: scale(1.03);
}

.createIcon {
  font-size: 2.5rem;
  color: var(--color-text-secondary);
  line-height: 1;
}

.createLabel {
  font-family: var(--font-family-body);
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm build`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add platform/src/pages/ProfileSelect.tsx platform/src/pages/ProfileSelect.module.css
git commit -m "feat: add ProfileSelect page with profile picker grid

Shows existing profiles with avatar + name cards.
Create New Player card opens ProfileCreator wizard.
Auto-shows creator when no profiles exist."
```

---

## Chunk 4: Game Hub (Tasks 9-10)

GameCard component and Hub page with filtering and search.

### Task 9: GameCard component

**Files:**
- Create: `platform/src/components/GameCard/GameCard.tsx`
- Create: `platform/src/components/GameCard/GameCard.module.css`

- [ ] **Step 1: Create GameCard component**

Create `/home/jude/code/kids/platform/src/components/GameCard/GameCard.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ProgressBar } from '@kids-games-zone/shared';
import type { GameManifest, GameProgress } from '@kids-games-zone/shared';
import styles from './GameCard.module.css';

interface GameCardProps {
  manifest: GameManifest;
  progress?: GameProgress;
  isRecent?: boolean;
}

const SKILL_COLORS: Record<string, string> = {
  literacy: '#4a90d9',
  numeracy: '#ff8c42',
  logic: '#9b59b6',
  memory: '#2ecc71',
  creativity: '#e74c3c',
  motor_skills: '#f39c12',
  science: '#1abc9c',
  social_skills: '#e91e63',
};

const SKILL_ICONS: Record<string, string> = {
  literacy: '📚',
  numeracy: '🔢',
  logic: '🧩',
  memory: '🧠',
  creativity: '🎨',
  motor_skills: '🏃',
  science: '🔬',
  social_skills: '🤝',
};

export function GameCard({ manifest, progress, isRecent }: GameCardProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const isLocked = manifest.status === 'coming_soon' || manifest.status === 'retired';
  const primarySkill = manifest.skills[0];
  const bgColor = SKILL_COLORS[primarySkill] ?? '#4a90d9';
  const skillIcon = SKILL_ICONS[primarySkill] ?? '🎮';

  function handleClick() {
    if (!isLocked) {
      navigate(`/game/${manifest.id}`);
    }
  }

  return (
    <motion.button
      className={`${styles.card} ${isRecent ? styles.recent : ''} ${isLocked ? styles.locked : ''}`}
      onClick={handleClick}
      whileHover={
        !isLocked && !shouldReduceMotion ? { scale: 1.03 } : undefined
      }
      whileTap={
        !isLocked && !shouldReduceMotion ? { scale: 0.98 } : undefined
      }
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label={`${manifest.name}${isLocked ? ' (locked)' : ''}`}
      disabled={isLocked}
    >
      <div className={styles.thumbnail} style={{ backgroundColor: bgColor }}>
        <span className={styles.thumbnailIcon}>{skillIcon}</span>
        {isLocked && <span className={styles.lockOverlay}>🔒</span>}
        {!progress && !isLocked && <span className={styles.newBadge}>New!</span>}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{manifest.name}</h3>

        <div className={styles.pills}>
          <span className={styles.agePill}>
            Ages {manifest.ageRange[0]}-{manifest.ageRange[1]}
          </span>
          {manifest.skills.slice(0, 2).map((skill) => (
            <span key={skill} className={styles.skillPill}>
              {SKILL_ICONS[skill] ?? '🎮'}
            </span>
          ))}
        </div>

        {progress && !isLocked && (
          <div className={styles.progressContainer}>
            <ProgressBar
              current={progress.currentLevel}
              total={manifest.maxDifficulty}
            />
          </div>
        )}
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 2: Create GameCard styles**

Create `/home/jude/code/kids/platform/src/components/GameCard/GameCard.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast);
  text-align: left;
  width: 100%;
}

.card.recent {
  border-color: var(--color-primary);
}

.card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.thumbnail {
  position: relative;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnailIcon {
  font-size: 2.5rem;
}

.lockOverlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-round);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.newBadge {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  background-color: var(--color-secondary);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-small);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: var(--font-family-body);
}

.info {
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.name {
  font-family: var(--font-family-body);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pills {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  align-items: center;
}

.agePill {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: var(--radius-small);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-family: var(--font-family-body);
}

.skillPill {
  font-size: 0.85rem;
}

.progressContainer {
  margin-top: var(--spacing-xs);
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add platform/src/components/GameCard/GameCard.tsx \
  platform/src/components/GameCard/GameCard.module.css
git commit -m "feat: add GameCard component with Framer Motion hover

Colored thumbnail with skill icon, age pill, progress bar.
Recent highlight border, new badge, locked state overlay."
```

---

### Task 10: Hub page

**Files:**
- Modify: `platform/src/pages/Hub.tsx`
- Create: `platform/src/pages/Hub.module.css`

- [ ] **Step 1: Implement Hub page**

Replace `/home/jude/code/kids/platform/src/pages/Hub.tsx` with:

```tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgeTier } from '@kids-games-zone/shared';
import { usePlatform } from '../context/PlatformContext';
import { GameCard } from '../components/GameCard/GameCard';
import type { GameManifest, SkillCategory } from '@kids-games-zone/shared';
import styles from './Hub.module.css';

export default function Hub() {
  const { state } = usePlatform();
  const navigate = useNavigate();
  const ageTier = useAgeTier();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const profile = state.currentProfile;

  // Redirect to profile if none selected
  if (!profile) {
    navigate('/profile');
    return null;
  }

  // Filter games by age
  const ageFilteredGames = state.gameRegistry.filter(
    (game) => game.ageRange[0] <= profile.age && profile.age <= game.ageRange[1],
  );

  // Get available skill categories from filtered games
  const skillCategories = useMemo(() => {
    const categories = new Set<string>();
    ageFilteredGames.forEach((game) => {
      game.skills.forEach((skill) => categories.add(skill));
    });
    return Array.from(categories);
  }, [ageFilteredGames]);

  // Apply search + skill filter
  const filteredGames = useMemo(() => {
    let games = ageFilteredGames;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      games = games.filter((game) =>
        game.name.toLowerCase().includes(query),
      );
    }

    if (activeFilter !== 'all') {
      games = games.filter((game) =>
        game.skills.includes(activeFilter as SkillCategory),
      );
    }

    return games;
  }, [ageFilteredGames, searchQuery, activeFilter]);

  // Recent games (last 3 played)
  const recentGames = useMemo(() => {
    const progressEntries = Object.entries(profile.progress);
    if (progressEntries.length === 0) return [];

    return progressEntries
      .sort(([, a], [, b]) =>
        new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime(),
      )
      .slice(0, 3)
      .map(([gameId]) => state.gameRegistry.find((g) => g.id === gameId))
      .filter((g): g is GameManifest => g !== undefined);
  }, [profile.progress, state.gameRegistry]);

  const showSearch = ageTier === 'junior' || ageTier === 'explorer';

  return (
    <div className={styles.hub}>
      {/* Welcome header */}
      <header className={styles.header}>
        <h1 className={styles.welcome}>
          Welcome back, {profile.name}!
        </h1>
      </header>

      {/* Continue Playing */}
      {recentGames.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Continue Playing</h2>
          <div className={styles.recentRow}>
            {recentGames.map((game) => (
              <GameCard
                key={game.id}
                manifest={game}
                progress={profile.progress[game.id]}
                isRecent
              />
            ))}
          </div>
        </section>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search games"
          />
        </div>
      )}

      {/* Filter pills */}
      {skillCategories.length > 0 && (
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          {skillCategories.map((category) => (
            <button
              key={category}
              className={`${styles.filterPill} ${activeFilter === category ? styles.filterActive : ''}`}
              onClick={() => setActiveFilter(category)}
            >
              {category.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Game grid */}
      {filteredGames.length > 0 ? (
        <div className={styles.gameGrid}>
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              manifest={game}
              progress={profile.progress[game.id]}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No games found! Try a different search or filter.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Hub styles**

Create `/home/jude/code/kids/platform/src/pages/Hub.module.css`:

```css
.hub {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.welcome {
  font-family: var(--font-family-display);
  font-size: 2rem;
  color: var(--color-primary);
}

.section {
  margin-bottom: var(--spacing-xl);
}

.sectionTitle {
  font-family: var(--font-family-display);
  font-size: 1.4rem;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.recentRow {
  display: flex;
  gap: var(--spacing-md);
  overflow-x: auto;
  padding-bottom: var(--spacing-sm);
  -webkit-overflow-scrolling: touch;
}

.recentRow > * {
  min-width: 180px;
  max-width: 220px;
  flex-shrink: 0;
}

.searchContainer {
  margin-bottom: var(--spacing-md);
}

.searchInput {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-medium);
  font-size: 1rem;
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  outline: none;
  transition: border-color var(--transition-fast);
}

.searchInput:focus {
  border-color: var(--color-primary);
}

.filterRow {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding-bottom: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  -webkit-overflow-scrolling: touch;
}

.filterPill {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-large);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-family: var(--font-family-body);
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  text-transform: capitalize;
}

.filterPill:hover {
  border-color: var(--color-primary);
}

.filterActive {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.gameGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .gameGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .gameGrid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

.emptyState {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm build`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add platform/src/pages/Hub.tsx platform/src/pages/Hub.module.css
git commit -m "feat: add Hub page with welcome header, search, filters, game grid

Welcome back greeting, continue playing row, search bar (junior/explorer only),
skill category filter pills, responsive CSS Grid game card layout."
```

---

## Chunk 5: Game Loading & Dummy Game (Tasks 11-14)

Game loader service, GameWrapper orchestration, dummy game package, registry integration, and final verification.

### Task 11: Game loader service

**Files:**
- Create: `platform/src/services/gameLoader.ts`

- [ ] **Step 1: Create gameLoader**

Create `/home/jude/code/kids/platform/src/services/gameLoader.ts`:

```typescript
import type { GamePlugin, GameManifest } from '@kids-games-zone/shared';

// Vite glob import — discovers all game entry points at build time.
// Each key is a relative path; each value is a dynamic import function.
const gameModules = import.meta.glob<{ default: GamePlugin }>(
  '../../games/*/src/index.ts',
);

export async function loadGame(manifest: GameManifest): Promise<GamePlugin> {
  const importFn = gameModules[manifest.entryPoint];

  if (!importFn) {
    throw new Error(
      `Game "${manifest.id}" not found at entry point "${manifest.entryPoint}". ` +
        `Available entries: ${Object.keys(gameModules).join(', ')}`,
    );
  }

  const module = await importFn();
  return module.default;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add platform/src/services/gameLoader.ts
git commit -m "feat: add game loader service using import.meta.glob

Discovers game entry points at build time via Vite glob.
Matches manifest.entryPoint to dynamic import function."
```

---

### Task 12: GameWrapper page

**Files:**
- Modify: `platform/src/pages/GameWrapper.tsx`

- [ ] **Step 1: Implement GameWrapper**

Replace `/home/jude/code/kids/platform/src/pages/GameWrapper.tsx` with:

```tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameLifecycle } from '@kids-games-zone/shared';
import { usePlatform } from '../context/PlatformContext';
import { loadGame } from '../services/gameLoader';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { LoadingSpinner } from '../components/LoadingSpinner/LoadingSpinner';
import type { GamePlugin, GameResult, GameConfig } from '@kids-games-zone/shared';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export default function GameWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, dispatch, storageManager, audioManager } = usePlatform();
  const [plugin, setPlugin] = useState<GamePlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const checkpointRef = useRef<unknown>(null);

  // Find manifest in registry
  const manifest = state.gameRegistry.find((g) => g.id === gameId);
  const profile = state.currentProfile;

  // Load game plugin
  useEffect(() => {
    if (!manifest) {
      setLoading(false);
      setError('Game not found');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const loadedPlugin = await loadGame(manifest!);
        if (!cancelled) {
          setPlugin(loadedPlugin);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[GameWrapper] Failed to load game:', err);
          setError('Failed to load game');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  // Use lifecycle hook when plugin is loaded
  const lifecycle = plugin ? useGameLifecycle(plugin) : null;

  // Start session and game lifecycle
  useEffect(() => {
    if (!lifecycle || !manifest || !profile) return;
    if (lifecycle.state !== 'IDLE') return;

    dispatch({ type: 'START_SESSION', payload: { gameId: manifest.id } });

    async function startGame() {
      await lifecycle!.load();

      const config: GameConfig = {
        difficulty: profile!.progress[manifest!.id]?.difficulty ?? 1,
        profile: profile!,
        settings: {
          soundEnabled: profile!.preferences.sfxVolume > 0,
          musicEnabled: profile!.preferences.musicVolume > 0,
          language: profile!.preferences.language,
          highContrastMode: false,
        },
      };

      lifecycle!.start(config);
    }

    startGame();
  }, [lifecycle, manifest, profile, dispatch]);

  // Visibility change: pause/resume
  useEffect(() => {
    if (!lifecycle) return;

    function handleVisibility() {
      if (document.hidden) {
        lifecycle!.pause();
      } else {
        lifecycle!.resume();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [lifecycle]);

  // Auto-save checkpoint every 30 seconds
  useEffect(() => {
    if (!lifecycle || lifecycle.state !== 'PLAYING' || !profile || !gameId) return;

    const interval = setInterval(() => {
      if (checkpointRef.current) {
        storageManager
          .saveCheckpoint(profile.id, gameId, checkpointRef.current)
          .catch((err) => console.warn('[GameWrapper] Checkpoint save failed:', err));
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [lifecycle?.state, profile, gameId, storageManager]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      dispatch({ type: 'END_SESSION' });
    };
  }, [dispatch]);

  const handleScore = useCallback((points: number) => {
    setScore((prev) => prev + points);
  }, []);

  const handleComplete = useCallback(
    (result: GameResult) => {
      if (!profile || !gameId) return;

      setCompleted(true);

      const existingProgress = profile.progress[gameId];
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          profileId: profile.id,
          gameId,
          progress: {
            gameId,
            highScore: Math.max(result.score, existingProgress?.highScore ?? 0),
            currentLevel: result.difficulty,
            maxLevelReached: Math.max(
              result.difficulty,
              existingProgress?.maxLevelReached ?? 0,
            ),
            totalAttempts: (existingProgress?.totalAttempts ?? 0) + 1,
            totalTimePlayed:
              (existingProgress?.totalTimePlayed ?? 0) + result.timeSpent,
            lastPlayedAt: new Date().toISOString(),
            difficulty: result.difficulty,
          },
        },
      });

      storageManager.saveProgress(profile.id, gameId, {
        gameId,
        highScore: Math.max(result.score, existingProgress?.highScore ?? 0),
        currentLevel: result.difficulty,
        maxLevelReached: Math.max(
          result.difficulty,
          existingProgress?.maxLevelReached ?? 0,
        ),
        totalAttempts: (existingProgress?.totalAttempts ?? 0) + 1,
        totalTimePlayed:
          (existingProgress?.totalTimePlayed ?? 0) + result.timeSpent,
        lastPlayedAt: new Date().toISOString(),
        difficulty: result.difficulty,
      });

      storageManager.logEvent({
        id: crypto.randomUUID(),
        type: 'game_end',
        profileId: profile.id,
        gameId,
        timestamp: new Date().toISOString(),
        data: {
          score: result.score,
          maxScore: result.maxScore,
          timeSpent: result.timeSpent,
        },
      });
    },
    [profile, gameId, dispatch, storageManager],
  );

  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Error state
  if (error) {
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
        <h2>{error}</h2>
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

  // Loading state
  if (loading || !plugin || !profile) {
    return <LoadingSpinner />;
  }

  // Completed state
  if (completed) {
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
        <h2 style={{ fontFamily: 'var(--font-family-display)', color: 'var(--color-primary)' }}>
          Great job!
        </h2>
        <p style={{ fontSize: '1.25rem' }}>Score: {score}</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              setCompleted(false);
              setScore(0);
              setPlugin(null);
              setLoading(true);
              // Re-trigger load
              loadGame(manifest!).then((p) => {
                setPlugin(p);
                setLoading(false);
              });
            }}
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
            Play Again
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-medium)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Game is active
  const GameComponent = plugin.GameComponent;

  return (
    <GameErrorBoundary onGoHome={() => navigate('/')} onRetry={() => window.location.reload()}>
      <GameComponent
        config={{
          difficulty: profile.progress[gameId!]?.difficulty ?? 1,
          profile,
          settings: {
            soundEnabled: profile.preferences.sfxVolume > 0,
            musicEnabled: profile.preferences.musicVolume > 0,
            language: profile.preferences.language,
            highContrastMode: false,
          },
        }}
        onScore={handleScore}
        onComplete={handleComplete}
        onExit={handleExit}
        audioManager={audioManager}
        storageManager={storageManager}
      />
    </GameErrorBoundary>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add platform/src/pages/GameWrapper.tsx
git commit -m "feat: add GameWrapper page with lifecycle orchestration

Loads game plugin dynamically, manages lifecycle (load/start/pause/resume/end).
Visibility change handling for pause/resume. Auto-save checkpoint every 30s.
Progress update and event logging on completion."
```

---

### Task 13: Dummy game package

**Files:**
- Create: `games/dummy-game/package.json`
- Create: `games/dummy-game/tsconfig.json`
- Create: `games/dummy-game/src/index.ts`
- Create: `games/dummy-game/src/DummyGame.tsx`
- Create: `games/dummy-game/src/DummyGame.module.css`

- [ ] **Step 1: Create dummy-game package.json**

Create `/home/jude/code/kids/games/dummy-game/package.json`:

```json
{
  "name": "dummy-game",
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
    "@kids-games-zone/shared": "workspace:*"
  }
}
```

- [ ] **Step 2: Create dummy-game tsconfig.json**

Create `/home/jude/code/kids/games/dummy-game/tsconfig.json`:

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

- [ ] **Step 3: Create DummyGame component**

Create `/home/jude/code/kids/games/dummy-game/src/DummyGame.tsx`:

```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import styles from './DummyGame.module.css';

const TOTAL_ROUNDS = 5;

export function DummyGame({ config: _config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [buttonState, setButtonState] = useState<'default' | 'correct'>('default');
  const startTimeRef = useRef(Date.now());

  const handleClick = useCallback(() => {
    if (round >= TOTAL_ROUNDS) return;

    const newRound = round + 1;
    const newScore = score + 1;

    setRound(newRound);
    setScore(newScore);
    setButtonState('correct');
    onScore(1);
    audioManager.playSFX('correct');

    // Reset button state after brief delay
    setTimeout(() => setButtonState('default'), 300);

    if (newRound >= TOTAL_ROUNDS) {
      setShowCelebration(true);
    }
  }, [round, score, onScore, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'dummy-game',
      score,
      maxScore: TOTAL_ROUNDS,
      timeSpent,
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: { clicks: score },
    };
    onComplete(result);
  }, [score, onComplete]);

  // Prevent stale ref
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  if (showCelebration) {
    return (
      <GameShell title="Click Counter" onBack={onExit}>
        <CelebrationOverlay
          title="Amazing!"
          score={score}
          maxScore={TOTAL_ROUNDS}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  return (
    <GameShell title="Click Counter" onBack={onExit}>
      <div className={styles.gameArea}>
        <ScoreDisplay score={score} maxScore={TOTAL_ROUNDS} showStars />
        <ProgressBar current={round} total={TOTAL_ROUNDS} showLabel />
        <div className={styles.buttonArea}>
          <OptionButton
            label={`Click me! (${round}/${TOTAL_ROUNDS})`}
            state={buttonState}
            onSelect={handleClick}
            size="large"
          />
        </div>
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 4: Create DummyGame styles**

Create `/home/jude/code/kids/games/dummy-game/src/DummyGame.module.css`:

```css
.gameArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-xl);
  max-width: 400px;
  margin: 0 auto;
}

.buttonArea {
  margin-top: var(--spacing-lg);
}
```

- [ ] **Step 5: Create dummy-game plugin entry point**

Create `/home/jude/code/kids/games/dummy-game/src/index.ts`:

```typescript
import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { DummyGame } from './DummyGame';

let _startTime = 0;
let _score = 0;

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

  onLoad: async () => {
    // No assets to preload for the dummy game
  },

  onStart: (_config: GameConfig) => {
    _startTime = Date.now();
    _score = 0;
  },

  onPause: () => {
    console.log('[DummyGame] Paused');
  },

  onResume: () => {
    console.log('[DummyGame] Resumed');
  },

  onEnd: () => {
    const timeSpent = Math.round((Date.now() - _startTime) / 1000);
    return {
      gameId: 'dummy-game',
      score: _score,
      maxScore: 5,
      timeSpent,
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: { clicks: _score },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
  },

  GameComponent: DummyGame,
};

export default plugin;
```

- [ ] **Step 6: Install dummy-game workspace**

Run: `cd /home/jude/code/kids && pnpm install`
Expected: Clean install, dummy-game recognized as workspace package.

- [ ] **Step 7: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors across all packages.

- [ ] **Step 8: Commit**

```bash
git add games/dummy-game/
git commit -m "feat: add dummy-game package with GamePlugin implementation

Click Counter game: 5 rounds using shared GameShell, OptionButton,
ProgressBar, ScoreDisplay, CelebrationOverlay. Validates full pipeline."
```

---

### Task 14: Game registry, final integration, and verification

**Files:**
- Modify: `platform/src/config/gameRegistry.ts`
- Modify: `platform/src/App.tsx`

- [ ] **Step 1: Update game registry with dummy game manifest**

Replace `/home/jude/code/kids/platform/src/config/gameRegistry.ts` with:

```typescript
import type { GameManifest } from '@kids-games-zone/shared';

export const gameRegistry: GameManifest[] = [
  {
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
];
```

- [ ] **Step 2: Update App.tsx to wrap Hub with AgeTierProvider**

Replace `/home/jude/code/kids/platform/src/App.tsx` with:

```tsx
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AgeTierProvider } from '@kids-games-zone/shared';
import { NavBar } from './components/NavBar/NavBar';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';
import { usePlatform } from './context/PlatformContext';
import type { AgeTier } from '@kids-games-zone/shared';

const Hub = lazy(() => import('./pages/Hub'));
const ProfileSelect = lazy(() => import('./pages/ProfileSelect'));
const GameWrapper = lazy(() => import('./pages/GameWrapper'));

function getAgeTier(age: number | undefined): AgeTier {
  if (!age || age <= 5) return 'tiny';
  if (age <= 8) return 'junior';
  return 'explorer';
}

function App() {
  const { state } = usePlatform();
  const tier = getAgeTier(state.currentProfile?.age);

  return (
    <AgeTierProvider tier={tier}>
      <div className="page-content" data-age-tier={tier}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/profile" element={<ProfileSelect />} />
            <Route path="/game/:gameId" element={<GameWrapper />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/parental" element={<Settings />} />
          </Routes>
        </Suspense>
      </div>
      <NavBar />
    </AgeTierProvider>
  );
}

export default App;
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: Zero errors. Fix any lint issues.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: Zero errors across all workspace packages.

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: All tests pass across all packages.

- [ ] **Step 6: Run build**

Run: `pnpm build`
Expected: Successful production build.

- [ ] **Step 7: Manual verification**

Run: `pnpm dev`

Verify:
1. App opens at `http://localhost:3000`
2. Redirects to `/profile` since no profiles exist
3. ProfileCreator wizard works: enter name, select age, pick avatar, confirm
4. Hub shows "Welcome back, {name}!" with the Click Counter game card
5. Clicking the game card navigates to `/game/dummy-game`
6. Dummy game loads: GameShell header, OptionButton, ProgressBar, ScoreDisplay
7. Clicking the button 5 times triggers CelebrationOverlay
8. After celebration, shows "Great job!" with Play Again and Go Home buttons
9. NavBar shows on Hub/Profile/Rewards/Settings, hidden during game
10. Switching tabs triggers visibilitychange (check console for pause/resume logs)
11. Profile and progress persist after page refresh

- [ ] **Step 8: Commit**

```bash
git add platform/src/config/gameRegistry.ts platform/src/App.tsx
git commit -m "feat: integrate game registry and AgeTierProvider for Phase 2

Wire dummy game manifest into static registry.
AgeTierProvider wraps app based on active profile's age.
data-age-tier attribute on page-content for CSS token overrides."
```

- [ ] **Step 9: Final commit — mark Phase 2 complete**

Update `plans/development-plan.md` if it tracks phase status. Otherwise skip this step.

```bash
git add -A
git commit -m "chore: Phase 2 platform shell complete

All acceptance criteria met:
- Profile creation, selection, and IndexedDB persistence
- Hub with filtered game cards by age tier
- Dummy game loads via dynamic import with full lifecycle
- Pause/resume on visibility change
- Auto-save checkpoint timer
- GameErrorBoundary with friendly UI
- StubAudioManager console logging
- Bottom NavBar, hidden during gameplay
- All routes navigable
- pnpm lint, typecheck, test, build all pass"
```
