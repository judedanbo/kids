import type { AgeTier } from './game';

export type RewardType = 'star' | 'badge' | 'avatar_item' | 'theme_unlock' | 'character_unlock';

export interface RewardCriteria {
  type: 'score' | 'streak' | 'completion' | 'time' | 'category_mastery';
  gameId?: string;
  threshold: number;
}

export interface Reward {
  id: string;
  type: RewardType;
  name: string;
  description: string;
  /** Emoji fallback (shown before the image loads or if generation is pending). */
  icon: string;
  /** Optional pre-generated illustration URL, e.g. "/images/ui/reward-first-star.webp". */
  iconSrc?: string;
  unlockedAt?: string;
  criteria: RewardCriteria;
}

export interface GameProgress {
  gameId: string;
  highScore: number;
  currentLevel: number;
  maxLevelReached: number;
  totalAttempts: number;
  totalTimePlayed: number;
  lastPlayedAt: string;
  difficulty: number;
  recentScores?: Array<{ score: number; maxScore: number }>;
  checkpointData?: unknown;
}

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
