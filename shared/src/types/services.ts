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
  saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void>;
  loadProgress(profileId: string, gameId: string): Promise<GameProgress | null>;
  saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void>;
  loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null>;
  deleteProfile(profileId: string): Promise<void>;
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
