# Profile Reset and Delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let parents reset a child's game progress, soft-delete profiles with restore, and permanently purge profiles — all from an expanded Parental Dashboard.

**Architecture:** Add a `deletedAt` nullable timestamp to `UserProfile` (soft-delete flag). Extend `IndexedDBStorageManager` with `softDeleteProfile`, `restoreProfile`, `purgeProfile` (cascading delete), `resetProfileProgress`, and `listActiveProfiles`. Add four reducer actions to `PlatformContext`. Filter deleted profiles from `ProfileSelect`. Add a new "Profiles" section to `ParentalDashboard` with per-row actions gated by a reusable typed-name confirmation modal for destructive operations.

**Tech Stack:** React 19, Vite 6, TypeScript strict, `idb` (IndexedDB), `react-i18next`, Vitest, Testing Library, `fake-indexeddb` for storage tests.

**Spec:** `docs/superpowers/specs/2026-04-12-profile-reset-and-delete-design.md`

---

## File Structure

**Shared types** (`shared/src/types/`)
- `user.ts` — add `deletedAt: string | null` to `UserProfile`.
- `services.ts` — update `StorageManager` interface: replace `deleteProfile` with `purgeProfile`; add `listActiveProfiles`, `softDeleteProfile`, `restoreProfile`, `resetProfileProgress`.

**Platform storage** (`platform/src/services/`)
- `storage.ts` — DB v2 migration; implement new methods; replace `deleteProfile` with `purgeProfile`.
- `storage.test.ts` — new test cases.

**Platform context** (`platform/src/context/`)
- `PlatformContext.tsx` — four new reducer actions.
- `PlatformContext.test.tsx` — reducer test cases for new actions.

**UI components** (`platform/src/components/`)
- `TypedConfirmModal/TypedConfirmModal.tsx` — **new** reusable modal; user must type an expected string to confirm.
- `TypedConfirmModal/TypedConfirmModal.module.css` — styles.
- `TypedConfirmModal/index.ts` — barrel.
- `TypedConfirmModal/TypedConfirmModal.test.tsx` — tests.

**Pages** (`platform/src/pages/`)
- `ParentalDashboard.tsx` — new "Profiles" section + per-row actions + wiring to `TypedConfirmModal`.
- `ParentalDashboard.module.css` — styles for the new section.
- `ParentalDashboard.test.tsx` — **new** component tests (file may not exist yet).
- `ProfileSelect.tsx` — filter out profiles where `deletedAt !== null`; show creator when active list is empty.

**i18n** (`platform/src/locales/`)
- `en/common.json` — new `parental.profiles.*` strings.
- `fr/common.json` — same keys, French.

---

## Task 1: Add `deletedAt` field to `UserProfile` type

**Files:**
- Modify: `shared/src/types/user.ts`

- [ ] **Step 1: Add the `deletedAt` field**

Open `shared/src/types/user.ts`. Inside the `UserProfile` interface, add the new field right after `stats`:

```ts
export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  age: number;
  ageTier: AgeTier;
  createdAt: string;
  parentPin: string;
  preferences: {
    musicVolume: number;
    sfxVolume: number;
    voiceVolume: number;
    language: string;
    theme: string;
  };
  progress: Record<string, GameProgress>;
  rewards: Reward[];
  stats: {
    totalPlayTime: number;
    totalGamesPlayed: number;
    currentStreak: number;
    longestStreak: number;
    lastPlayedAt: string;
  };
  /** ISO timestamp set when the profile is soft-deleted. `null` for active profiles. */
  deletedAt: string | null;
}
```

- [ ] **Step 2: Run typecheck across workspace to see what breaks**

Run: `pnpm typecheck`
Expected: TypeScript errors listing every place a `UserProfile` is constructed without `deletedAt`. You will see errors in at least: `platform/src/services/storage.test.ts`, `platform/src/context/PlatformContext.test.tsx`, and `platform/src/components/ProfileCreator/ProfileCreator.tsx` (wherever profiles are created). Note them — we will fix in later tasks/steps.

- [ ] **Step 3: Fix the `ProfileCreator` so new profiles default to `deletedAt: null`**

Locate the profile-construction site. Run:
`pnpm --filter platform exec grep -n "id: " src/components/ProfileCreator/ProfileCreator.tsx` (or open the file and find the literal `UserProfile` being built).

Add `deletedAt: null` to the object literal that constructs a new profile. Example shape (adapt to the real code):

```ts
const profile: UserProfile = {
  id: globalThis.crypto.randomUUID(),
  // ...existing fields
  deletedAt: null,
};
```

- [ ] **Step 4: Fix the test fixture in `storage.test.ts`**

Open `platform/src/services/storage.test.ts`. In `makeProfile`, add `deletedAt: null` before the `...overrides` spread:

```ts
function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    // ...existing fields through stats
    stats: {
      totalPlayTime: 0,
      totalGamesPlayed: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedAt: '',
    },
    deletedAt: null,
    ...overrides,
  };
}
```

- [ ] **Step 5: Fix any other test fixtures that build `UserProfile`**

Run: `pnpm --filter platform exec grep -rn "ageTier:" src --include="*.ts" --include="*.tsx"`

For every literal profile object that does not already include `deletedAt`, add `deletedAt: null`. Likely files: `PlatformContext.test.tsx`, `featureFlags.integration.test.tsx`, any mock profile fixtures.

- [ ] **Step 6: Re-run typecheck**

Run: `pnpm typecheck`
Expected: PASS with no errors.

- [ ] **Step 7: Run existing tests to confirm nothing regressed**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add shared/src/types/user.ts platform/src/components/ProfileCreator platform/src/services/storage.test.ts platform/src/context/PlatformContext.test.tsx platform/src/__tests__
git commit -m "feat(types): add deletedAt field to UserProfile for soft-delete"
```

---

## Task 2: Update `StorageManager` interface

**Files:**
- Modify: `shared/src/types/services.ts`

- [ ] **Step 1: Replace `deleteProfile` and add new method signatures**

Open `shared/src/types/services.ts`. Replace the `StorageManager` interface with:

```ts
export interface StorageManager {
  saveProfile(profile: UserProfile): Promise<void>;
  loadProfile(profileId: string): Promise<UserProfile | null>;
  listProfiles(): Promise<UserProfile[]>;
  /** Returns only profiles where `deletedAt === null`. */
  listActiveProfiles(): Promise<UserProfile[]>;
  saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void>;
  loadProgress(profileId: string, gameId: string): Promise<GameProgress | null>;
  saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void>;
  loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null>;
  /**
   * Marks the profile as deleted by setting `deletedAt`. The profile row and
   * all its progress/checkpoints/rewards/events are retained until
   * `purgeProfile` is called.
   */
  softDeleteProfile(profileId: string): Promise<void>;
  /** Clears `deletedAt`, making the profile active again. */
  restoreProfile(profileId: string): Promise<void>;
  /**
   * Permanently removes the profile row plus cascades: deletes all rows in
   * `progress`, `checkpoints`, `rewards`, and `events` matching the given
   * `profileId`. Irreversible.
   */
  purgeProfile(profileId: string): Promise<void>;
  /**
   * Wipes progress + checkpoints for a profile and clears
   * `profile.progress` on the profile row. Leaves rewards, events, stats,
   * and preferences untouched.
   */
  resetProfileProgress(profileId: string): Promise<void>;
  unlockReward(profileId: string, reward: Reward): Promise<void>;
  getRewards(profileId: string): Promise<Reward[]>;
  logEvent(event: AnalyticsEvent): Promise<void>;
  getEvents(filter: EventFilter): Promise<AnalyticsEvent[]>;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Errors in `platform/src/services/storage.ts` because the class no longer satisfies the interface (missing new methods, still has old `deleteProfile`). These will be fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/services.ts
git commit -m "feat(types): extend StorageManager with soft-delete and reset methods"
```

---

## Task 3: Implement new storage methods and DB v2 migration

**Files:**
- Modify: `platform/src/services/storage.ts`
- Modify: `platform/src/services/storage.test.ts`

- [ ] **Step 1: Write failing tests for `listActiveProfiles`, soft-delete, and restore**

Open `platform/src/services/storage.test.ts`. Inside the existing `describe('profiles', ...)` block, add:

```ts
it('listActiveProfiles excludes soft-deleted profiles', async () => {
  const active = makeProfile({ name: 'Active Kid' });
  const deleted = makeProfile({
    name: 'Deleted Kid',
    deletedAt: new Date().toISOString(),
  });
  await storage.saveProfile(active);
  await storage.saveProfile(deleted);

  const activeList = await storage.listActiveProfiles();
  expect(activeList).toHaveLength(1);
  expect(activeList[0].name).toBe('Active Kid');

  const allList = await storage.listProfiles();
  expect(allList).toHaveLength(2);
});

it('softDeleteProfile sets deletedAt but keeps row', async () => {
  const profile = makeProfile();
  await storage.saveProfile(profile);

  await storage.softDeleteProfile(profile.id);

  const loaded = await storage.loadProfile(profile.id);
  expect(loaded).not.toBeNull();
  expect(loaded?.deletedAt).toBeTypeOf('string');
});

it('restoreProfile clears deletedAt', async () => {
  const profile = makeProfile({ deletedAt: new Date().toISOString() });
  await storage.saveProfile(profile);

  await storage.restoreProfile(profile.id);

  const loaded = await storage.loadProfile(profile.id);
  expect(loaded?.deletedAt).toBeNull();
});

it('softDeleteProfile on a missing profile throws', async () => {
  await expect(storage.softDeleteProfile('nope')).rejects.toThrow();
});
```

- [ ] **Step 2: Write failing tests for `purgeProfile` (cascade) and `resetProfileProgress`**

Still in `storage.test.ts`, add a new describe block at the end of the outer `describe('IndexedDBStorageManager', ...)`:

```ts
describe('cascade operations', () => {
  it('purgeProfile deletes profile and all related data', async () => {
    const profile = makeProfile();
    await storage.saveProfile(profile);
    await storage.saveProgress(profile.id, 'g1', makeProgress());
    await storage.saveCheckpoint(profile.id, 'g1', { foo: 'bar' });
    await storage.unlockReward(profile.id, {
      id: 'r1',
      type: 'star',
      name: 'Star',
      description: '',
      icon: '⭐',
      criteria: { type: 'completion', threshold: 1 },
    });
    await storage.logEvent({
      id: globalThis.crypto.randomUUID(),
      type: 'game_start',
      profileId: profile.id,
      timestamp: new Date().toISOString(),
      data: {},
    });

    await storage.purgeProfile(profile.id);

    expect(await storage.loadProfile(profile.id)).toBeNull();
    expect(await storage.loadProgress(profile.id, 'g1')).toBeNull();
    expect(await storage.loadCheckpoint(profile.id, 'g1')).toBeNull();
    expect(await storage.getRewards(profile.id)).toEqual([]);
    expect(await storage.getEvents({ profileId: profile.id })).toEqual([]);
  });

  it('purgeProfile does not touch other profiles data', async () => {
    const a = makeProfile({ name: 'A' });
    const b = makeProfile({ name: 'B' });
    await storage.saveProfile(a);
    await storage.saveProfile(b);
    await storage.saveProgress(a.id, 'g1', makeProgress());
    await storage.saveProgress(b.id, 'g1', makeProgress());

    await storage.purgeProfile(a.id);

    expect(await storage.loadProfile(b.id)).not.toBeNull();
    expect(await storage.loadProgress(b.id, 'g1')).not.toBeNull();
  });

  it('resetProfileProgress wipes progress and checkpoints only', async () => {
    const profile = makeProfile();
    profile.progress = { g1: makeProgress() };
    await storage.saveProfile(profile);
    await storage.saveProgress(profile.id, 'g1', makeProgress());
    await storage.saveCheckpoint(profile.id, 'g1', { level: 5 });
    await storage.unlockReward(profile.id, {
      id: 'r1',
      type: 'star',
      name: 'Star',
      description: '',
      icon: '⭐',
      criteria: { type: 'completion', threshold: 1 },
    });
    await storage.logEvent({
      id: globalThis.crypto.randomUUID(),
      type: 'game_end',
      profileId: profile.id,
      timestamp: new Date().toISOString(),
      data: {},
    });

    await storage.resetProfileProgress(profile.id);

    expect(await storage.loadProgress(profile.id, 'g1')).toBeNull();
    expect(await storage.loadCheckpoint(profile.id, 'g1')).toBeNull();
    expect(await storage.getRewards(profile.id)).toHaveLength(1);
    expect(await storage.getEvents({ profileId: profile.id })).toHaveLength(1);

    const reloaded = await storage.loadProfile(profile.id);
    expect(reloaded?.progress).toEqual({});
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter platform test -- storage.test`
Expected: FAIL — the new methods don't exist yet.

- [ ] **Step 4: Bump DB version to 2 with backfill migration**

Open `platform/src/services/storage.ts`. Replace the `init` method with:

```ts
async init(): Promise<void> {
  this.db = await openDB(this.dbName, 2, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
        profileStore.createIndex('name', 'name');

        const progressStore = db.createObjectStore('progress', {
          keyPath: ['profileId', 'gameId'],
        });
        progressStore.createIndex('profileId', 'profileId');
        progressStore.createIndex('gameId', 'gameId');

        db.createObjectStore('checkpoints', {
          keyPath: ['profileId', 'gameId'],
        });

        const rewardStore = db.createObjectStore('rewards', {
          keyPath: 'id',
          autoIncrement: true,
        });
        rewardStore.createIndex('profileId', 'profileId');

        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('profileId', 'profileId');
        eventStore.createIndex('timestamp', 'timestamp');
        eventStore.createIndex('type', 'type');
      }

      if (oldVersion < 2) {
        // Backfill `deletedAt: null` on every existing profile row.
        (async () => {
          const profileStore = tx.objectStore('profiles');
          let cursor = await profileStore.openCursor();
          while (cursor) {
            const value = cursor.value as UserProfile;
            if (value.deletedAt === undefined) {
              await cursor.update({ ...value, deletedAt: null });
            }
            cursor = await cursor.continue();
          }
        })();
      }
    },
  });
}
```

Also make sure `checkpoints` also has a `profileId` index — we'll need it for the `purgeProfile` cascade. Because the object store uses a compound key `[profileId, gameId]`, we can use `IDBKeyRange` on the compound key instead of an index. For `resetProfileProgress` and `purgeProfile`, we'll iterate and match. No index change needed.

- [ ] **Step 5: Add `listActiveProfiles`**

Below the existing `listProfiles` method, add:

```ts
async listActiveProfiles(): Promise<UserProfile[]> {
  const all = await this.listProfiles();
  return all.filter((p) => p.deletedAt === null);
}
```

- [ ] **Step 6: Add `softDeleteProfile` and `restoreProfile`**

After `listActiveProfiles`, add:

```ts
async softDeleteProfile(profileId: string): Promise<void> {
  const profile = await this.loadProfile(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }
  const updated: UserProfile = {
    ...profile,
    deletedAt: new Date().toISOString(),
  };
  await this.saveProfile(updated);
}

async restoreProfile(profileId: string): Promise<void> {
  const profile = await this.loadProfile(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }
  const updated: UserProfile = { ...profile, deletedAt: null };
  await this.saveProfile(updated);
}
```

- [ ] **Step 7: Replace `deleteProfile` with `purgeProfile` (cascade)**

Find the existing `deleteProfile` method (the one-liner that just deletes from the `profiles` store) and replace it with:

```ts
async purgeProfile(profileId: string): Promise<void> {
  const db = this.getDB();
  const tx = db.transaction(
    ['profiles', 'progress', 'checkpoints', 'rewards', 'events'],
    'readwrite',
  );

  // Profile row
  await tx.objectStore('profiles').delete(profileId);

  // Progress + checkpoints: compound key [profileId, gameId]. Iterate a
  // bound key range that matches all entries for this profileId.
  const profileKeyRange = IDBKeyRange.bound([profileId], [profileId, []]);
  for (const storeName of ['progress', 'checkpoints'] as const) {
    const store = tx.objectStore(storeName);
    let cursor = await store.openCursor(profileKeyRange);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }

  // Rewards: scan the `profileId` index.
  const rewardStore = tx.objectStore('rewards');
  const rewardIndex = rewardStore.index('profileId');
  let rewardCursor = await rewardIndex.openCursor(profileId);
  while (rewardCursor) {
    await rewardCursor.delete();
    rewardCursor = await rewardCursor.continue();
  }

  // Events: scan the `profileId` index.
  const eventStore = tx.objectStore('events');
  const eventIndex = eventStore.index('profileId');
  let eventCursor = await eventIndex.openCursor(profileId);
  while (eventCursor) {
    await eventCursor.delete();
    eventCursor = await eventCursor.continue();
  }

  await tx.done;
}
```

Remove the old `deleteProfile` method entirely.

Add import for `IDBKeyRange` if the linter flags it — `IDBKeyRange` is a global browser type, so no import is typically needed, but some `fake-indexeddb` setups require `import { IDBKeyRange } from 'fake-indexeddb';` in the test file. Our test file already imports `'fake-indexeddb/auto'` which polyfills `IDBKeyRange` globally — no change needed.

- [ ] **Step 8: Add `resetProfileProgress`**

After `purgeProfile`, add:

```ts
async resetProfileProgress(profileId: string): Promise<void> {
  const db = this.getDB();

  // Delete all progress + checkpoints for this profile.
  const tx = db.transaction(['progress', 'checkpoints'], 'readwrite');
  const profileKeyRange = IDBKeyRange.bound([profileId], [profileId, []]);
  for (const storeName of ['progress', 'checkpoints'] as const) {
    const store = tx.objectStore(storeName);
    let cursor = await store.openCursor(profileKeyRange);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;

  // Clear `progress` on the profile row itself.
  const profile = await this.loadProfile(profileId);
  if (profile) {
    await this.saveProfile({ ...profile, progress: {} });
  }
}
```

- [ ] **Step 9: Update the existing "deletes a profile" test to use `purgeProfile`**

In `storage.test.ts`, find the test `it('deletes a profile', ...)` and rename + update it:

```ts
it('purgeProfile deletes the profile row', async () => {
  const profile = makeProfile();
  await storage.saveProfile(profile);
  await storage.purgeProfile(profile.id);

  const loaded = await storage.loadProfile(profile.id);
  expect(loaded).toBeNull();
});
```

- [ ] **Step 10: Run storage tests and verify they pass**

Run: `pnpm --filter platform test -- storage.test`
Expected: PASS for all tests including the new ones.

- [ ] **Step 11: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add platform/src/services/storage.ts platform/src/services/storage.test.ts
git commit -m "feat(storage): add soft-delete, restore, purge (cascade), and progress reset"
```

---

## Task 4: Add reducer actions to `PlatformContext`

**Files:**
- Modify: `platform/src/context/PlatformContext.tsx`
- Modify: `platform/src/context/PlatformContext.test.tsx`

- [ ] **Step 1: Write failing reducer tests**

Open `platform/src/context/PlatformContext.test.tsx`. Find the file and add the following tests (place them in the existing `describe` block for the reducer; if the reducer is not exported, export it first — see Step 2). Use `makeProfile` from the existing test helpers or define a local one.

```ts
describe('SOFT_DELETE_PROFILE', () => {
  it('sets deletedAt on the matching profile in state', () => {
    const p = makeProfile({ id: 'p1' });
    const state = { ...initialTestState, profiles: [p] };

    const next = platformReducer(state, {
      type: 'SOFT_DELETE_PROFILE',
      payload: { profileId: 'p1' },
    });

    expect(next.profiles[0].deletedAt).toBeTypeOf('string');
  });

  it('clears currentProfile if it matches the deleted profile', () => {
    const p = makeProfile({ id: 'p1' });
    const state = { ...initialTestState, profiles: [p], currentProfile: p };

    const next = platformReducer(state, {
      type: 'SOFT_DELETE_PROFILE',
      payload: { profileId: 'p1' },
    });

    expect(next.currentProfile).toBeNull();
  });

  it('does not clear currentProfile when a different profile is deleted', () => {
    const a = makeProfile({ id: 'a' });
    const b = makeProfile({ id: 'b' });
    const state = { ...initialTestState, profiles: [a, b], currentProfile: a };

    const next = platformReducer(state, {
      type: 'SOFT_DELETE_PROFILE',
      payload: { profileId: 'b' },
    });

    expect(next.currentProfile?.id).toBe('a');
  });
});

describe('RESTORE_PROFILE', () => {
  it('clears deletedAt on the matching profile', () => {
    const p = makeProfile({ id: 'p1', deletedAt: new Date().toISOString() });
    const state = { ...initialTestState, profiles: [p] };

    const next = platformReducer(state, {
      type: 'RESTORE_PROFILE',
      payload: { profileId: 'p1' },
    });

    expect(next.profiles[0].deletedAt).toBeNull();
  });
});

describe('PURGE_PROFILE', () => {
  it('removes the profile from the list', () => {
    const a = makeProfile({ id: 'a' });
    const b = makeProfile({ id: 'b' });
    const state = { ...initialTestState, profiles: [a, b] };

    const next = platformReducer(state, {
      type: 'PURGE_PROFILE',
      payload: { profileId: 'a' },
    });

    expect(next.profiles).toHaveLength(1);
    expect(next.profiles[0].id).toBe('b');
  });

  it('clears currentProfile if it was purged', () => {
    const a = makeProfile({ id: 'a' });
    const state = { ...initialTestState, profiles: [a], currentProfile: a };

    const next = platformReducer(state, {
      type: 'PURGE_PROFILE',
      payload: { profileId: 'a' },
    });

    expect(next.currentProfile).toBeNull();
  });
});

describe('RESET_PROFILE_PROGRESS', () => {
  it('clears progress on the matching profile in the list', () => {
    const p = makeProfile({ id: 'p1' });
    p.progress = { g1: makeProgress() };
    const state = { ...initialTestState, profiles: [p] };

    const next = platformReducer(state, {
      type: 'RESET_PROFILE_PROGRESS',
      payload: { profileId: 'p1' },
    });

    expect(next.profiles[0].progress).toEqual({});
  });

  it('also clears progress on currentProfile if it matches', () => {
    const p = makeProfile({ id: 'p1' });
    p.progress = { g1: makeProgress() };
    const state = { ...initialTestState, profiles: [p], currentProfile: p };

    const next = platformReducer(state, {
      type: 'RESET_PROFILE_PROGRESS',
      payload: { profileId: 'p1' },
    });

    expect(next.currentProfile?.progress).toEqual({});
  });
});
```

Note: if the existing test file does not already have a `makeProfile`/`makeProgress` helper or `initialTestState`, create them at the top of the file — copy the shape from `storage.test.ts`. `initialTestState` should be a valid `GlobalState`:

```ts
const initialTestState: GlobalState = {
  currentProfile: null,
  profiles: [],
  gameRegistry: [],
  session: { activeGameId: null, startedAt: null, elapsedTime: 0 },
  settings: {
    theme: 'light',
    language: 'en',
    timeLimits: {
      enabled: false,
      dailyLimitMinutes: 60,
      sessionLimitMinutes: 30,
      reminderBeforeEndMinutes: 5,
      cooldownMinutes: 15,
    },
    highContrast: false,
    backgroundMusicEnabled: true,
    musicDuringGameplay: false,
  },
};
```

- [ ] **Step 2: Export `platformReducer` from `PlatformContext.tsx`**

Open `platform/src/context/PlatformContext.tsx`. Change the reducer declaration from `function platformReducer(...)` to `export function platformReducer(...)` so tests can import it.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter platform test -- PlatformContext.test`
Expected: FAIL — the action types don't exist in the union, and the reducer doesn't handle them.

- [ ] **Step 4: Add the four actions to the `PlatformAction` union**

In `PlatformContext.tsx`, extend the `PlatformAction` union with:

```ts
export type PlatformAction =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'ADD_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROGRESS'; payload: { profileId: string; gameId: string; progress: GameProgress } }
  | { type: 'REGISTER_GAME'; payload: GameManifest }
  | { type: 'START_SESSION'; payload: { gameId: string } }
  | { type: 'END_SESSION' }
  | { type: 'UNLOCK_REWARD'; payload: { profileId: string; reward: Reward } }
  | { type: 'UPDATE_STATS'; payload: { profileId: string; stats: Partial<UserProfile['stats']> } }
  | { type: 'LOAD_PROFILES'; payload: UserProfile[] }
  | { type: 'SET_SETTINGS'; payload: Partial<PlatformSettings> }
  | { type: 'SOFT_DELETE_PROFILE'; payload: { profileId: string } }
  | { type: 'RESTORE_PROFILE'; payload: { profileId: string } }
  | { type: 'PURGE_PROFILE'; payload: { profileId: string } }
  | { type: 'RESET_PROFILE_PROGRESS'; payload: { profileId: string } };
```

- [ ] **Step 5: Implement the reducer cases**

In the `switch` inside `platformReducer`, add these cases before the `default`:

```ts
case 'SOFT_DELETE_PROFILE': {
  const { profileId } = action.payload;
  const now = new Date().toISOString();
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId ? { ...p, deletedAt: now } : p,
    ),
    currentProfile:
      state.currentProfile?.id === profileId ? null : state.currentProfile,
  };
}

case 'RESTORE_PROFILE': {
  const { profileId } = action.payload;
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId ? { ...p, deletedAt: null } : p,
    ),
  };
}

case 'PURGE_PROFILE': {
  const { profileId } = action.payload;
  return {
    ...state,
    profiles: state.profiles.filter((p) => p.id !== profileId),
    currentProfile:
      state.currentProfile?.id === profileId ? null : state.currentProfile,
  };
}

case 'RESET_PROFILE_PROGRESS': {
  const { profileId } = action.payload;
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId ? { ...p, progress: {} } : p,
    ),
    currentProfile:
      state.currentProfile?.id === profileId
        ? { ...state.currentProfile, progress: {} }
        : state.currentProfile,
  };
}
```

- [ ] **Step 6: Run tests and verify they pass**

Run: `pnpm --filter platform test -- PlatformContext.test`
Expected: PASS for all new cases and existing ones.

- [ ] **Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add platform/src/context/PlatformContext.tsx platform/src/context/PlatformContext.test.tsx
git commit -m "feat(context): reducer actions for soft-delete, restore, purge, reset"
```

---

## Task 5: Filter deleted profiles from `ProfileSelect`

**Files:**
- Modify: `platform/src/pages/ProfileSelect.tsx`

- [ ] **Step 1: Filter active profiles and route to creator when empty**

Open `platform/src/pages/ProfileSelect.tsx`. Replace the current body with:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '../context/PlatformContext';
import { ProfileCreator } from '../components/ProfileCreator/ProfileCreator';
import type { UserProfile } from '@kids-games-zone/shared';
import styles from './ProfileSelect.module.css';

export default function ProfileSelect() {
  const { state, dispatch, storageManager } = usePlatform();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const activeProfiles = useMemo(
    () => state.profiles.filter((p) => p.deletedAt === null),
    [state.profiles],
  );

  const [showCreator, setShowCreator] = useState(activeProfiles.length === 0);

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

  if (showCreator || activeProfiles.length === 0) {
    return (
      <ProfileCreator
        onComplete={handleCreateProfile}
        onCancel={activeProfiles.length > 0 ? () => setShowCreator(false) : undefined}
      />
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('profile.whoIsPlaying')}</h1>
      <div className={styles.profileGrid}>
        {activeProfiles.map((profile) => (
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
          <span className={styles.createLabel}>{t('profile.newPlayer')}</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck and tests**

Run: `pnpm typecheck && pnpm --filter platform test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add platform/src/pages/ProfileSelect.tsx
git commit -m "feat(profile-select): hide soft-deleted profiles from picker"
```

---

## Task 6: Build reusable `TypedConfirmModal` component

**Files:**
- Create: `platform/src/components/TypedConfirmModal/TypedConfirmModal.tsx`
- Create: `platform/src/components/TypedConfirmModal/TypedConfirmModal.module.css`
- Create: `platform/src/components/TypedConfirmModal/index.ts`
- Create: `platform/src/components/TypedConfirmModal/TypedConfirmModal.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `platform/src/components/TypedConfirmModal/TypedConfirmModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypedConfirmModal } from './TypedConfirmModal';

describe('TypedConfirmModal', () => {
  it('disables confirm until the input matches (case-insensitive)', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <TypedConfirmModal
        title="Delete Alice?"
        description="Type Alice to confirm."
        expected="Alice"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    expect(confirmBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/type alice/i), 'alice');
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancel invokes onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <TypedConfirmModal
        title="T"
        description="D"
        expected="X"
        confirmLabel="Go"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not fire onConfirm when disabled and form submitted', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <TypedConfirmModal
        title="T"
        description="D"
        expected="Alice"
        confirmLabel="Go"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText(/type alice/i), 'bob');
    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter platform test -- TypedConfirmModal`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `TypedConfirmModal.tsx`**

Create `platform/src/components/TypedConfirmModal/TypedConfirmModal.tsx`:

```tsx
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TypedConfirmModal.module.css';

interface TypedConfirmModalProps {
  title: string;
  description: ReactNode;
  /** The exact string (case-insensitive match) the user must type. */
  expected: string;
  /** Label for the destructive confirm button. */
  confirmLabel: string;
  /** Optional extra warning line shown below the description. */
  warning?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TypedConfirmModal({
  title,
  description,
  expected,
  confirmLabel,
  warning,
  onConfirm,
  onCancel,
}: TypedConfirmModalProps) {
  const { t } = useTranslation('common');
  const [value, setValue] = useState('');
  const inputId = useId();
  const matches = value.trim().toLowerCase() === expected.trim().toLowerCase();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches) onConfirm();
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={`${inputId}-title`}>
      <div className={styles.card}>
        <h2 id={`${inputId}-title`} className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        {warning && <p className={styles.warning}>{warning}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor={inputId}>
            {t('typedConfirm.typeToConfirm', { expected })}
          </label>
          <input
            id={inputId}
            className={styles.input}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              {t('typedConfirm.cancel')}
            </button>
            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={!matches}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `TypedConfirmModal.module.css`**

Create `platform/src/components/TypedConfirmModal/TypedConfirmModal.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4, 1rem);
}

.card {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-6, 1.5rem);
  max-width: 32rem;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.title {
  margin: 0 0 var(--space-3, 0.75rem) 0;
  font-size: var(--font-size-xl, 1.25rem);
  color: var(--color-text, #111);
}

.description {
  margin: 0 0 var(--space-3, 0.75rem) 0;
  color: var(--color-text-muted, #444);
  line-height: 1.5;
}

.warning {
  margin: 0 0 var(--space-4, 1rem) 0;
  color: var(--color-danger, #b91c1c);
  font-weight: 600;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 0.75rem);
}

.label {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text-muted, #444);
}

.input {
  padding: var(--space-3, 0.75rem);
  font-size: var(--font-size-base, 1rem);
  border: 2px solid var(--color-border, #d1d5db);
  border-radius: var(--radius-md, 8px);
  background: var(--color-bg, #fff);
  color: var(--color-text, #111);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
}

.actions {
  display: flex;
  gap: var(--space-3, 0.75rem);
  justify-content: flex-end;
  margin-top: var(--space-2, 0.5rem);
}

.cancelBtn,
.confirmBtn {
  padding: var(--space-3, 0.75rem) var(--space-5, 1.25rem);
  font-size: var(--font-size-base, 1rem);
  border-radius: var(--radius-md, 8px);
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.cancelBtn {
  background: var(--color-surface-muted, #f3f4f6);
  color: var(--color-text, #111);
}

.confirmBtn {
  background: var(--color-danger, #b91c1c);
  color: white;
}

.confirmBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Create barrel `index.ts`**

Create `platform/src/components/TypedConfirmModal/index.ts`:

```ts
export { TypedConfirmModal } from './TypedConfirmModal';
```

- [ ] **Step 6: Add i18n strings for the modal**

Open `platform/src/locales/en/common.json`. Add at the top level (alphabetical order next to other keys is fine):

```json
"typedConfirm.typeToConfirm": "Type \"{{expected}}\" to confirm:",
"typedConfirm.cancel": "Cancel",
```

Open `platform/src/locales/fr/common.json`. Add:

```json
"typedConfirm.typeToConfirm": "Tapez \"{{expected}}\" pour confirmer :",
"typedConfirm.cancel": "Annuler",
```

- [ ] **Step 7: Run component tests and verify they pass**

Run: `pnpm --filter platform test -- TypedConfirmModal`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add platform/src/components/TypedConfirmModal platform/src/locales/en/common.json platform/src/locales/fr/common.json
git commit -m "feat(ui): add TypedConfirmModal for destructive-action confirmation"
```

---

## Task 7: Add Profiles section to `ParentalDashboard`

**Files:**
- Modify: `platform/src/pages/ParentalDashboard.tsx`
- Modify: `platform/src/pages/ParentalDashboard.module.css`
- Modify: `platform/src/locales/en/common.json`
- Modify: `platform/src/locales/fr/common.json`
- Create: `platform/src/pages/ParentalDashboard.test.tsx` (if absent)

- [ ] **Step 1: Add i18n strings**

Open `platform/src/locales/en/common.json`. Add (next to the existing `parental.*` keys):

```json
"parental.profiles.title": "Profiles",
"parental.profiles.headerProfile": "Profile",
"parental.profiles.headerStatus": "Status",
"parental.profiles.headerLastPlayed": "Last played",
"parental.profiles.headerActions": "Actions",
"parental.profiles.statusActive": "Active",
"parental.profiles.statusDeleted": "Deleted",
"parental.profiles.resetProgress": "Reset progress",
"parental.profiles.delete": "Delete",
"parental.profiles.restore": "Restore",
"parental.profiles.deletePermanently": "Delete permanently",
"parental.profiles.never": "Never",
"parental.profiles.confirmResetTitle": "Reset {{name}}'s progress?",
"parental.profiles.confirmResetBody": "Game progress and checkpoints will be cleared. Rewards, stats, and activity history will be kept.",
"parental.profiles.confirmResetAction": "Reset progress",
"parental.profiles.confirmDeleteTitle": "Delete {{name}}?",
"parental.profiles.confirmDeleteBody": "{{name}} will be hidden from the profile picker. You can restore them later from this screen.",
"parental.profiles.confirmDeleteAction": "Delete",
"parental.profiles.confirmRestoreTitle": "Restore {{name}}?",
"parental.profiles.confirmRestoreBody": "{{name}} will appear again in the profile picker.",
"parental.profiles.confirmRestoreAction": "Restore",
"parental.profiles.confirmPurgeTitle": "Permanently delete {{name}}?",
"parental.profiles.confirmPurgeBody": "All of {{name}}'s progress, rewards, and activity will be erased.",
"parental.profiles.confirmPurgeWarning": "This cannot be undone.",
"parental.profiles.confirmPurgeAction": "Delete permanently"
```

Add the same keys to `platform/src/locales/fr/common.json` translated:

```json
"parental.profiles.title": "Profils",
"parental.profiles.headerProfile": "Profil",
"parental.profiles.headerStatus": "Statut",
"parental.profiles.headerLastPlayed": "Dernière partie",
"parental.profiles.headerActions": "Actions",
"parental.profiles.statusActive": "Actif",
"parental.profiles.statusDeleted": "Supprimé",
"parental.profiles.resetProgress": "Réinitialiser la progression",
"parental.profiles.delete": "Supprimer",
"parental.profiles.restore": "Restaurer",
"parental.profiles.deletePermanently": "Supprimer définitivement",
"parental.profiles.never": "Jamais",
"parental.profiles.confirmResetTitle": "Réinitialiser la progression de {{name}} ?",
"parental.profiles.confirmResetBody": "La progression des jeux et les points de contrôle seront effacés. Les récompenses, statistiques et historique seront conservés.",
"parental.profiles.confirmResetAction": "Réinitialiser",
"parental.profiles.confirmDeleteTitle": "Supprimer {{name}} ?",
"parental.profiles.confirmDeleteBody": "{{name}} sera masqué du sélecteur de profils. Vous pourrez le restaurer plus tard depuis cet écran.",
"parental.profiles.confirmDeleteAction": "Supprimer",
"parental.profiles.confirmRestoreTitle": "Restaurer {{name}} ?",
"parental.profiles.confirmRestoreBody": "{{name}} réapparaîtra dans le sélecteur de profils.",
"parental.profiles.confirmRestoreAction": "Restaurer",
"parental.profiles.confirmPurgeTitle": "Supprimer définitivement {{name}} ?",
"parental.profiles.confirmPurgeBody": "Toute la progression, les récompenses et l'activité de {{name}} seront effacées.",
"parental.profiles.confirmPurgeWarning": "Cette action est irréversible.",
"parental.profiles.confirmPurgeAction": "Supprimer définitivement"
```

- [ ] **Step 2: Add styles for the Profiles section**

Open `platform/src/pages/ParentalDashboard.module.css`. Append:

```css
.profileRow {
  display: flex;
  align-items: center;
  gap: var(--space-3, 0.75rem);
}

.profileAvatar {
  font-size: 1.5rem;
  line-height: 1;
}

.profileName {
  font-weight: 600;
}

.statusBadge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.statusActive {
  background: var(--color-success-muted, #d1fae5);
  color: var(--color-success, #065f46);
}

.statusDeleted {
  background: var(--color-surface-muted, #f3f4f6);
  color: var(--color-text-muted, #6b7280);
}

.profileActions {
  display: flex;
  gap: var(--space-2, 0.5rem);
  flex-wrap: wrap;
}

.profileActions button {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border, #d1d5db);
  background: var(--color-surface, #fff);
  cursor: pointer;
}

.profileActions .dangerBtn {
  color: var(--color-danger, #b91c1c);
  border-color: var(--color-danger, #b91c1c);
}

.profileActions .dangerBtn:hover {
  background: var(--color-danger, #b91c1c);
  color: white;
}
```

- [ ] **Step 3: Extend `ParentalDashboard.tsx` with the Profiles section**

Open `platform/src/pages/ParentalDashboard.tsx`. The existing `Dashboard` sub-component currently renders three sections: Activity Summary, Play Time Chart, Game Progress Table. Add a fourth section — Profiles — below them.

First, add new imports at the top of the file:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '../context/PlatformContext';
import { AdultGate } from '../components/AdultGate';
import { PinEntry } from '../components/PinEntry';
import { TypedConfirmModal } from '../components/TypedConfirmModal';
import type { AnalyticsEvent, UserProfile } from '@kids-games-zone/shared';
import styles from './ParentalDashboard.module.css';
```

The `Dashboard` sub-component already receives `dispatch` and `storageManager` as props; we need `state.profiles` too, so call `usePlatform` inside `Dashboard` for the profile list. Leave the existing signature and body untouched except for the first lines.

Just after the existing `const { t } = useTranslation('common');` line inside `Dashboard`, add:

```tsx
const { state } = usePlatform();
const allProfiles = state.profiles;
```

Then, after the existing `gameProgress` declaration and before the `return`, add:

```tsx
// --- Profile management ---
// Reset and restore use window.confirm (non-destructive / reversible).
// Delete and permanent delete use TypedConfirmModal (require typing name).
type PendingAction =
  | { kind: 'delete'; profile: UserProfile }
  | { kind: 'purge'; profile: UserProfile }
  | null;

const [pending, setPending] = useState<PendingAction>(null);
const [actionError, setActionError] = useState<string | null>(null);

function formatLastPlayed(iso: string): string {
  if (!iso) return t('parental.profiles.never');
  const d = new Date(iso);
  return d.toLocaleDateString();
}

async function handleReset(p: UserProfile) {
  const ok = window.confirm(
    t('parental.profiles.confirmResetTitle', { name: p.name }) +
      '\n\n' +
      t('parental.profiles.confirmResetBody'),
  );
  if (!ok) return;
  setActionError(null);
  try {
    await storageManager.resetProfileProgress(p.id);
    dispatch({ type: 'RESET_PROFILE_PROGRESS', payload: { profileId: p.id } });
  } catch (err) {
    setActionError((err as Error).message);
  }
}

async function handleRestore(p: UserProfile) {
  const ok = window.confirm(
    t('parental.profiles.confirmRestoreTitle', { name: p.name }) +
      '\n\n' +
      t('parental.profiles.confirmRestoreBody', { name: p.name }),
  );
  if (!ok) return;
  setActionError(null);
  try {
    await storageManager.restoreProfile(p.id);
    dispatch({ type: 'RESTORE_PROFILE', payload: { profileId: p.id } });
  } catch (err) {
    setActionError((err as Error).message);
  }
}

async function confirmPending() {
  if (!pending) return;
  setActionError(null);
  const { kind, profile: p } = pending;
  try {
    if (kind === 'delete') {
      await storageManager.softDeleteProfile(p.id);
      dispatch({ type: 'SOFT_DELETE_PROFILE', payload: { profileId: p.id } });
    } else {
      await storageManager.purgeProfile(p.id);
      dispatch({ type: 'PURGE_PROFILE', payload: { profileId: p.id } });
    }
    setPending(null);
  } catch (err) {
    setActionError((err as Error).message);
  }
}
```

Now add the new section JSX inside the returned element, after the "Game Progress Table" section:

```tsx
{/* Profiles */}
<section className={styles.section}>
  <h2 className={styles.sectionTitle}>{t('parental.profiles.title')}</h2>
  {actionError && <p className={styles.error}>{actionError}</p>}
  <div className={styles.tableContainer}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">{t('parental.profiles.headerProfile')}</th>
          <th scope="col">{t('parental.profiles.headerStatus')}</th>
          <th scope="col">{t('parental.profiles.headerLastPlayed')}</th>
          <th scope="col">{t('parental.profiles.headerActions')}</th>
        </tr>
      </thead>
      <tbody>
        {allProfiles.map((p) => {
          const isDeleted = p.deletedAt !== null;
          return (
            <tr key={p.id}>
              <td>
                <span className={styles.profileRow}>
                  <span className={styles.profileAvatar}>{p.avatar}</span>
                  <span className={styles.profileName}>{p.name}</span>
                </span>
              </td>
              <td>
                <span
                  className={`${styles.statusBadge} ${
                    isDeleted ? styles.statusDeleted : styles.statusActive
                  }`}
                >
                  {isDeleted
                    ? t('parental.profiles.statusDeleted')
                    : t('parental.profiles.statusActive')}
                </span>
              </td>
              <td>
                {isDeleted ? '—' : formatLastPlayed(p.stats.lastPlayedAt)}
              </td>
              <td>
                <div className={styles.profileActions}>
                  {!isDeleted && (
                    <>
                      <button onClick={() => handleReset(p)}>
                        {t('parental.profiles.resetProgress')}
                      </button>
                      <button
                        className={styles.dangerBtn}
                        onClick={() => setPending({ kind: 'delete', profile: p })}
                      >
                        {t('parental.profiles.delete')}
                      </button>
                    </>
                  )}
                  {isDeleted && (
                    <>
                      <button onClick={() => handleRestore(p)}>
                        {t('parental.profiles.restore')}
                      </button>
                      <button
                        className={styles.dangerBtn}
                        onClick={() => setPending({ kind: 'purge', profile: p })}
                      >
                        {t('parental.profiles.deletePermanently')}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>

{/* Typed-confirmation modals for destructive actions */}
{pending?.kind === 'delete' && (
  <TypedConfirmModal
    title={t('parental.profiles.confirmDeleteTitle', { name: pending.profile.name })}
    description={t('parental.profiles.confirmDeleteBody', { name: pending.profile.name })}
    expected={pending.profile.name}
    confirmLabel={t('parental.profiles.confirmDeleteAction')}
    onConfirm={confirmPending}
    onCancel={() => setPending(null)}
  />
)}
{pending?.kind === 'purge' && (
  <TypedConfirmModal
    title={t('parental.profiles.confirmPurgeTitle', { name: pending.profile.name })}
    description={t('parental.profiles.confirmPurgeBody', { name: pending.profile.name })}
    warning={t('parental.profiles.confirmPurgeWarning')}
    expected={pending.profile.name}
    confirmLabel={t('parental.profiles.confirmPurgeAction')}
    onConfirm={confirmPending}
    onCancel={() => setPending(null)}
  />
)}
```

- [ ] **Step 4: Write a component test for the Profiles section**

Check if `platform/src/pages/ParentalDashboard.test.tsx` exists:
Run: `ls platform/src/pages/ParentalDashboard.test.tsx 2>&1 || echo missing`

If missing, create it. If present, append. Example file:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import ParentalDashboard from './ParentalDashboard';
import { PlatformProvider } from '../context/PlatformContext';
import type { StorageManager, AudioManager, UserProfile } from '@kids-games-zone/shared';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'p1',
    name: 'Alice',
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
    deletedAt: null,
    ...overrides,
  };
}

function makeStorageStub(profiles: UserProfile[]): StorageManager {
  return {
    saveProfile: vi.fn().mockResolvedValue(undefined),
    loadProfile: vi.fn(),
    listProfiles: vi.fn().mockResolvedValue(profiles),
    listActiveProfiles: vi.fn().mockResolvedValue(profiles.filter((p) => !p.deletedAt)),
    saveProgress: vi.fn(),
    loadProgress: vi.fn(),
    saveCheckpoint: vi.fn(),
    loadCheckpoint: vi.fn(),
    softDeleteProfile: vi.fn().mockResolvedValue(undefined),
    restoreProfile: vi.fn().mockResolvedValue(undefined),
    purgeProfile: vi.fn().mockResolvedValue(undefined),
    resetProfileProgress: vi.fn().mockResolvedValue(undefined),
    unlockReward: vi.fn(),
    getRewards: vi.fn().mockResolvedValue([]),
    logEvent: vi.fn(),
    getEvents: vi.fn().mockResolvedValue([]),
  } as unknown as StorageManager;
}

const stubAudio = {} as AudioManager;

function renderDashboard(profiles: UserProfile[], storage: StorageManager) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <PlatformProvider storageManager={storage} audioManager={stubAudio} gameRegistry={[]}>
          <ParentalDashboard />
        </PlatformProvider>
      </I18nextProvider>
    </MemoryRouter>,
  );
}

async function passAdultGate(user: ReturnType<typeof userEvent.setup>) {
  // AdultGate shows a math problem "What is A x B?"
  const heading = await screen.findByText(/what is/i);
  const match = heading.textContent!.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) throw new Error('Unable to parse adult gate problem');
  const answer = parseInt(match[1], 10) * parseInt(match[2], 10);
  await user.type(screen.getByRole('spinbutton'), String(answer));
  await user.click(screen.getByRole('button', { name: /verify/i }));
}

describe('ParentalDashboard — Profiles section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Profiles section with active rows', async () => {
    const user = userEvent.setup();
    const alice = makeProfile({ id: 'a', name: 'Alice' });
    const bob = makeProfile({ id: 'b', name: 'Bob' });
    const storage = makeStorageStub([alice, bob]);

    renderDashboard([alice, bob], storage);
    await passAdultGate(user);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /profiles/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('typed-confirm modal guards delete and calls storage.softDeleteProfile', async () => {
    const user = userEvent.setup();
    const alice = makeProfile({ id: 'a', name: 'Alice' });
    const storage = makeStorageStub([alice]);

    renderDashboard([alice], storage);
    await passAdultGate(user);

    await waitFor(() => screen.getByRole('heading', { name: /profiles/i }));

    const deleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
    await user.click(deleteBtns[0]);

    const input = await screen.findByLabelText(/type "Alice"/i);
    const confirmBtn = screen.getByRole('button', { name: /^delete$/i, hidden: false });
    expect(confirmBtn).toBeDisabled();

    await user.type(input, 'Alice');
    expect(confirmBtn).toBeEnabled();
    await user.click(confirmBtn);

    await waitFor(() =>
      expect(storage.softDeleteProfile).toHaveBeenCalledWith('a'),
    );
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Build the platform to catch anything the test setup missed**

Run: `pnpm --filter platform build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add platform/src/pages/ParentalDashboard.tsx platform/src/pages/ParentalDashboard.module.css platform/src/pages/ParentalDashboard.test.tsx platform/src/locales/en/common.json platform/src/locales/fr/common.json
git commit -m "feat(parental): Profiles section with reset, soft-delete, restore, purge"
```

---

## Task 8: Manual smoke test in the browser

**Files:** none (manual verification)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: Dev server on http://localhost:3000.

- [ ] **Step 2: Exercise the golden path**

In the browser:

1. Create at least two profiles via the `ProfileCreator`.
2. Play a game briefly to generate progress + rewards + events on one profile.
3. Navigate to Settings → Parental Dashboard. Complete the adult gate and PIN (if set).
4. In the **Profiles** section:
   - Click **Reset progress** for the played profile → confirm. Verify rewards and activity chart remain, but the Game Progress table row for that profile's game is now zeroed.
   - Click **Delete** on a profile → type the name → confirm. Verify the profile disappears from the Profiles "Active" rows (it now shows as "Deleted") and is absent from `/profile` picker.
   - Click **Restore** on the deleted profile → confirm. Verify it reappears in the picker.
   - Click **Delete** again, then **Delete permanently** → type name → confirm. Verify the profile is gone from both the dashboard table and the picker. Reload the page and confirm it stays gone.
5. Delete the **currently-active** profile. Verify the app navigates to `/profile` (ProfileSelect).
6. Delete the **last active** profile. Verify the app routes to the profile-creation flow (ProfileCreator) with no cancel option.

- [ ] **Step 3: Stop the dev server**

Ctrl+C the dev server.

- [ ] **Step 4: If smoke test reveals issues, fix and commit. Otherwise mark task complete.**

---

## Final verification

- [ ] **Step 1: Run everything**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter platform build`
Expected: All PASS.

- [ ] **Step 2: Confirm spec coverage**

Re-read `docs/superpowers/specs/2026-04-12-profile-reset-and-delete-design.md`. Confirm every listed requirement has a corresponding implementation:

- `deletedAt` field ✅ (Task 1)
- `listActiveProfiles` / `softDeleteProfile` / `restoreProfile` / `purgeProfile` / `resetProfileProgress` ✅ (Task 3)
- DB v2 migration ✅ (Task 3)
- Four reducer actions ✅ (Task 4)
- `ProfileSelect` filtering + last-profile routing ✅ (Task 5)
- Typed-confirmation modal ✅ (Task 6)
- Parental Dashboard Profiles section + all four actions ✅ (Task 7)
- i18n strings ✅ (Tasks 6 & 7)
- `PurgeProfile` / `softDeleteProfile` of currently-active profile redirects to `/profile` ✅ (reducer clears `currentProfile` → dashboard's existing `if (!profile) navigate('/profile')` guard fires)

- [ ] **Step 3: Push the branch and open a PR (only if explicitly requested by the user)**
