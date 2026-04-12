import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBStorageManager } from './storage';
import type { UserProfile, GameProgress, Reward, AnalyticsEvent } from '@kids-games-zone/shared';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: globalThis.crypto.randomUUID(),
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
    deletedAt: null,
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
    storage = new IndexedDBStorageManager(`test-db-${globalThis.crypto.randomUUID()}`);
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
        id: globalThis.crypto.randomUUID(),
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
        id: globalThis.crypto.randomUUID(),
        type: 'game_start',
        profileId: 'profile-1',
        timestamp: new Date().toISOString(),
        data: {},
      };
      const e2: AnalyticsEvent = {
        id: globalThis.crypto.randomUUID(),
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
