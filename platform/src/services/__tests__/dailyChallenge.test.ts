import { describe, it, expect } from 'vitest';
import { getDailyChallenge, checkChallengeCompletion, hashDateString } from '../dailyChallenge';
import type { UserProfile, GameManifest } from '@kids-games-zone/shared';

const mockRegistry: GameManifest[] = [
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
    releaseDate: '',
    tags: [],
  },
];

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-user',
    name: 'Test',
    avatar: '',
    age: 7,
    ageTier: 'junior',
    createdAt: '2026-01-01',
    parentPin: '',
    preferences: { musicVolume: 1, sfxVolume: 1, voiceVolume: 1, language: 'en', theme: 'light' },
    progress: {},
    rewards: [],
    stats: { totalPlayTime: 0, totalGamesPlayed: 0, currentStreak: 0, longestStreak: 0, lastPlayedAt: '' },
    deletedAt: null,
    ...overrides,
  };
}

describe('hashDateString', () => {
  it('returns a non-negative integer', () => {
    const result = hashDateString('2026-03-26');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('is deterministic', () => {
    expect(hashDateString('2026-03-26')).toBe(hashDateString('2026-03-26'));
  });

  it('produces different results for different dates', () => {
    expect(hashDateString('2026-03-26')).not.toBe(hashDateString('2026-03-27'));
  });
});

describe('getDailyChallenge', () => {
  it('returns a challenge with the correct date', () => {
    const challenge = getDailyChallenge('2026-03-26', mockRegistry);
    expect(challenge.date).toBe('2026-03-26');
    expect(challenge.id).toBe('daily-2026-03-26');
  });

  it('is deterministic for the same date', () => {
    const a = getDailyChallenge('2026-03-26', mockRegistry);
    const b = getDailyChallenge('2026-03-26', mockRegistry);
    expect(a).toEqual(b);
  });

  it('may produce different challenges for different dates', () => {
    const challenges = new Set<string>();
    for (let i = 1; i <= 10; i++) {
      const c = getDailyChallenge(`2026-03-${String(i).padStart(2, '0')}`, mockRegistry);
      challenges.add(c.type);
    }
    // Over 10 days we should see more than 1 type
    expect(challenges.size).toBeGreaterThan(1);
  });
});

describe('checkChallengeCompletion', () => {
  it('detects play_count completion', () => {
    const challenge = { id: 'daily-test', date: '2026-03-26', type: 'play_count' as const, description: 'Play 2 games', target: 2 };
    const profile = makeProfile();
    const results = [
      { gameId: 'a', score: 5, maxScore: 10 },
      { gameId: 'b', score: 8, maxScore: 10 },
    ];
    expect(checkChallengeCompletion(challenge, profile, results)).toBe(true);
  });

  it('returns false when play_count not met', () => {
    const challenge = { id: 'daily-test', date: '2026-03-26', type: 'play_count' as const, description: 'Play 3 games', target: 3 };
    const profile = makeProfile();
    const results = [{ gameId: 'a', score: 5, maxScore: 10 }];
    expect(checkChallengeCompletion(challenge, profile, results)).toBe(false);
  });

  it('detects score_threshold completion', () => {
    const challenge = { id: 'daily-test', date: '2026-03-26', type: 'score_threshold' as const, description: 'Score 80%+', target: 80 };
    const profile = makeProfile();
    const results = [{ gameId: 'a', score: 9, maxScore: 10 }];
    expect(checkChallengeCompletion(challenge, profile, results)).toBe(true);
  });

  it('returns false when score below threshold', () => {
    const challenge = { id: 'daily-test', date: '2026-03-26', type: 'score_threshold' as const, description: 'Score 80%+', target: 80 };
    const profile = makeProfile();
    const results = [{ gameId: 'a', score: 5, maxScore: 10 }];
    expect(checkChallengeCompletion(challenge, profile, results)).toBe(false);
  });

  it('detects try_new_game completion', () => {
    const challenge = { id: 'daily-test', date: '2026-03-26', type: 'try_new_game' as const, description: 'Try a new game', target: 1 };
    const profile = makeProfile({ progress: { 'old-game': { gameId: 'old-game', highScore: 10, currentLevel: 1, maxLevelReached: 1, totalAttempts: 1, totalTimePlayed: 60, lastPlayedAt: '', difficulty: 1 } } });
    const results = [{ gameId: 'new-game', score: 5, maxScore: 10 }];
    expect(checkChallengeCompletion(challenge, profile, results)).toBe(true);
  });

  it('returns false for try_new_game when only played existing games', () => {
    const challenge = { id: 'daily-test', date: '2026-03-26', type: 'try_new_game' as const, description: 'Try a new game', target: 1 };
    const profile = makeProfile({ progress: { 'old-game': { gameId: 'old-game', highScore: 10, currentLevel: 1, maxLevelReached: 1, totalAttempts: 1, totalTimePlayed: 60, lastPlayedAt: '', difficulty: 1 } } });
    const results = [{ gameId: 'old-game', score: 5, maxScore: 10 }];
    expect(checkChallengeCompletion(challenge, profile, results)).toBe(false);
  });
});
