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
          // Fire-and-forget is safe: `openCursor()` synchronously registers a
          // request on the versionchange `tx`, so `openDB()` keeps `tx` alive
          // until `tx.done` settles. idb bridges `await` across microtasks so
          // the cursor loop doesn't lose the tx. Do NOT await anything else
          // before the first openCursor call.
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

  async listActiveProfiles(): Promise<UserProfile[]> {
    const all = await this.listProfiles();
    return all.filter((p) => p.deletedAt === null);
  }

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

  async resetProfileProgress(profileId: string): Promise<void> {
    const db = this.getDB();

    // Two separate transactions by design: the stores tx is scoped narrowly
    // so adding `profiles` later (to fold the row write in) would require
    // widening the tx. `profile.progress` is eventual-consistency over the
    // progress store; a crash between the two writes leaves the profile row
    // briefly stale but the store-of-record clean.
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

  async saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void> {
    const record: ProgressRecord = { profileId, gameId, data: progress };
    await this.getDB().put('progress', record);
  }

  async loadProgress(profileId: string, gameId: string): Promise<GameProgress | null> {
    const record: ProgressRecord | undefined = await this.getDB().get('progress', [
      profileId,
      gameId,
    ]);
    return record?.data ?? null;
  }

  async saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void> {
    const record: CheckpointRecord = { profileId, gameId, data };
    await this.getDB().put('checkpoints', record);
  }

  async loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null> {
    const record: CheckpointRecord | undefined = await this.getDB().get('checkpoints', [
      profileId,
      gameId,
    ]);
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
