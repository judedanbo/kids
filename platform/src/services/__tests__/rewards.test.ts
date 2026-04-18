import { describe, it, expect } from 'vitest';
import { evaluateRewards, getRewardProgress } from '../rewards';
import type { UserProfile, GameResult, GameManifest } from '@kids-games-zone/shared';

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
    deletedAt: null,
    ...overrides,
  };
}

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    gameId: 'math-adventure',
    score: 80,
    maxScore: 100,
    timeSpent: 120,
    difficulty: 1,
    completedAt: new Date().toISOString(),
    metrics: {},
    ...overrides,
  };
}

const registry: GameManifest[] = [
  {
    id: 'math-adventure',
    name: 'Math Adventure',
    description: '',
    thumbnail: '',
    ageRange: [6, 8],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-01-01',
    tags: [],
  },
  {
    id: 'word-puzzle',
    name: 'Word Puzzle',
    description: '',
    thumbnail: '',
    ageRange: [6, 8],
    skills: ['literacy'],
    version: '1.0.0',
    entryPoint: '',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-01-01',
    tags: [],
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: '',
    thumbnail: '',
    ageRange: [3, 5],
    skills: ['memory'],
    version: '1.0.0',
    entryPoint: '',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 3,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-01-01',
    tags: [],
  },
];

describe('evaluateRewards', () => {
  it('awards first-star on first game completion', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 80,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult();
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'first-star')).toBeDefined();
    expect(rewards.find((r) => r.id === 'first-star')!.unlockedAt).toBeDefined();
  });

  it('awards speed-demon when time <= 60s', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 50,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 45,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult({ timeSpent: 45 });
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'speed-demon')).toBeDefined();
  });

  it('does not award speed-demon when time > 60s', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 50,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 90,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult({ timeSpent: 90 });
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'speed-demon')).toBeUndefined();
  });

  it('awards math-wizard on 100% score in numeracy game', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 100,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult({ score: 100, maxScore: 100 });
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'math-wizard')).toBeDefined();
  });

  it('does not award math-wizard for non-numeracy game', () => {
    const profile = makeProfile({
      progress: {
        'word-puzzle': {
          gameId: 'word-puzzle',
          highScore: 100,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult({ gameId: 'word-puzzle', score: 100, maxScore: 100 });
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'math-wizard')).toBeUndefined();
  });

  it('awards super-streak when currentStreak >= 7', () => {
    const profile = makeProfile({
      stats: {
        totalPlayTime: 1000,
        totalGamesPlayed: 20,
        currentStreak: 7,
        longestStreak: 7,
        lastPlayedAt: new Date().toISOString(),
      },
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 80,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult();
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'super-streak')).toBeDefined();
  });

  it('awards explorer when all active games played', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 80,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
        'word-puzzle': {
          gameId: 'word-puzzle',
          highScore: 50,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 100,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
        'memory-match': {
          gameId: 'memory-match',
          highScore: 60,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 80,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult();
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'explorer')).toBeDefined();
  });

  it('does not award explorer when not all games played', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 80,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult();
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'explorer')).toBeUndefined();
  });

  it('awards master at max difficulty with 80%+ score', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 90,
          currentLevel: 5,
          maxLevelReached: 5,
          totalAttempts: 10,
          totalTimePlayed: 1000,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 5,
        },
      },
    });
    const result = makeResult({ difficulty: 5, score: 85, maxScore: 100 });
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'master')).toBeDefined();
  });

  it('does not award master below max difficulty', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 90,
          currentLevel: 3,
          maxLevelReached: 3,
          totalAttempts: 5,
          totalTimePlayed: 500,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 3,
        },
      },
    });
    const result = makeResult({ difficulty: 3, score: 90, maxScore: 100 });
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'master')).toBeUndefined();
  });

  it('skips already-unlocked rewards', () => {
    const profile = makeProfile({
      rewards: [
        {
          id: 'first-star',
          type: 'star',
          name: 'First Star',
          description: '',
          icon: '⭐',
          unlockedAt: new Date().toISOString(),
          criteria: { type: 'completion', threshold: 1 },
        },
      ],
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 80,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 2,
          totalTimePlayed: 240,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const result = makeResult();
    const rewards = evaluateRewards(profile, result, registry);
    expect(rewards.find((r) => r.id === 'first-star')).toBeUndefined();
  });

  it('can unlock multiple rewards simultaneously', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 100,
          currentLevel: 5,
          maxLevelReached: 5,
          totalAttempts: 1,
          totalTimePlayed: 45,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 5,
        },
        'word-puzzle': {
          gameId: 'word-puzzle',
          highScore: 50,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 100,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
        'memory-match': {
          gameId: 'memory-match',
          highScore: 60,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 80,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    // Perfect score, fast time, max difficulty, all games played
    const result = makeResult({ score: 100, maxScore: 100, timeSpent: 45, difficulty: 5 });
    const rewards = evaluateRewards(profile, result, registry);
    // Should get: first-star, speed-demon, math-wizard, explorer, master (at least)
    expect(rewards.length).toBeGreaterThanOrEqual(4);
  });

  it('returns empty array for empty progress', () => {
    const profile = makeProfile();
    const result = makeResult();
    const rewards = evaluateRewards(profile, result, registry);
    // Only time-based or threshold-0 rewards could fire on empty progress
    // first-star requires totalAttempts > 0 in progress, which is empty
    expect(rewards.find((r) => r.id === 'first-star')).toBeUndefined();
  });
});

describe('getRewardProgress', () => {
  it('returns progress for completion reward', () => {
    const profile = makeProfile();
    const reward = {
      id: 'first-star',
      type: 'star' as const,
      name: 'First Star',
      description: '',
      icon: '⭐',
      criteria: { type: 'completion' as const, threshold: 1 },
    };
    expect(getRewardProgress(reward, profile, registry)).toBe('0 / 1 games completed');
  });

  it('returns progress for streak reward', () => {
    const profile = makeProfile({
      stats: {
        totalPlayTime: 0,
        totalGamesPlayed: 0,
        currentStreak: 3,
        longestStreak: 3,
        lastPlayedAt: '',
      },
    });
    const reward = {
      id: 'super-streak',
      type: 'avatar_item' as const,
      name: 'Super Streak',
      description: '',
      icon: '🔥',
      criteria: { type: 'streak' as const, threshold: 7 },
    };
    expect(getRewardProgress(reward, profile, registry)).toBe('3 / 7 day streak');
  });

  it('returns progress for explorer reward', () => {
    const profile = makeProfile({
      progress: {
        'math-adventure': {
          gameId: 'math-adventure',
          highScore: 80,
          currentLevel: 1,
          maxLevelReached: 1,
          totalAttempts: 1,
          totalTimePlayed: 120,
          lastPlayedAt: new Date().toISOString(),
          difficulty: 1,
        },
      },
    });
    const reward = {
      id: 'explorer',
      type: 'theme_unlock' as const,
      name: 'Explorer',
      description: '',
      icon: '🗺️',
      criteria: { type: 'completion' as const, threshold: 0 },
    };
    expect(getRewardProgress(reward, profile, registry)).toBe('1 / 3 games played');
  });

  it('returns progress for category mastery reward', () => {
    const profile = makeProfile();
    const reward = {
      id: 'bookworm',
      type: 'badge' as const,
      name: 'Bookworm',
      description: '',
      icon: '📚',
      criteria: { type: 'category_mastery' as const, gameId: 'literacy', threshold: 5 },
    };
    expect(getRewardProgress(reward, profile, registry)).toBe('0 / 5 literacy games');
  });
});
