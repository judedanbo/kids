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
