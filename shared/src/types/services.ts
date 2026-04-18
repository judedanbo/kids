import type { UserProfile, GameProgress, Reward } from './user';

export interface AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void;
  stopMusic(options?: { fadeOut?: number }): void;
  pauseMusic(): void;
  resumeMusic(): void;
  playSFX(sfxId: string): void;
  playVoice(voiceId: string, onComplete?: () => void): void;
  setVolume(category: 'music' | 'sfx' | 'voice', level: number): void;
  mute(category?: 'music' | 'sfx' | 'voice'): void;
  unmute(category?: 'music' | 'sfx' | 'voice'): void;
  preload(assetIds: string[]): Promise<void>;
  /** Sets the active locale used to resolve voice asset paths (narration/{lang}/). */
  setLanguage(language: string): void;
}

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

export interface AnalyticsEvent {
  id: string;
  type: 'game_start' | 'game_end' | 'level_complete' | 'reward_unlocked' | 'game_error' | 'error' | 'navigation';
  profileId: string;
  gameId?: string;
  timestamp: string;
  data: Record<string, string | number | boolean>;
}

export interface EventFilter {
  profileId?: string;
  gameId?: string;
  type?: AnalyticsEvent['type'];
  startDate?: string;
  endDate?: string;
}
