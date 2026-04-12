import type { ComponentType } from 'react';
import type { UserProfile } from './user';
import type { AudioManager, StorageManager } from './services';

export type SkillCategory =
  | 'literacy'
  | 'numeracy'
  | 'logic'
  | 'memory'
  | 'creativity'
  | 'motor_skills'
  | 'science'
  | 'social_skills';

export type AgeTier = 'tiny' | 'junior' | 'explorer';

export interface GameManifest {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  ageRange: [number, number];
  skills: SkillCategory[];
  version: string;
  entryPoint: string;
  minDifficulty: number;
  maxDifficulty: number;
  estimatedPlayTime: number;
  offlineCapable: boolean;
  status: 'active' | 'beta' | 'coming_soon' | 'retired';
  releaseDate: string;
  tags: string[];
}

export interface GameSettings {
  soundEnabled: boolean;
  /**
   * Whether in-game background music should play during gameplay. Combines the
   * platform master toggle with the "music during gameplay" preference. Games
   * guard their own playMusic calls behind this.
   */
  musicEnabled: boolean;
  /**
   * Platform-wide master toggle for background music. Games use this to decide
   * whether to render a music pause/play control in their shell even when
   * `musicEnabled` is false (e.g. menu music playing on a game home screen).
   */
  backgroundMusicEnabled: boolean;
  language: string;
  highContrastMode: boolean;
}

export interface GameConfig {
  difficulty: number;
  profile: UserProfile;
  settings: GameSettings;
}

export interface GameProps {
  config: GameConfig;
  onScore: (points: number) => void;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  audioManager: AudioManager;
  storageManager: StorageManager;
}

export interface GameResult {
  gameId: string;
  score: number;
  maxScore: number;
  timeSpent: number;
  difficulty: number;
  completedAt: string;
  metrics: Record<string, number>;
}

export interface DailyChallenge {
  id: string;
  date: string;
  type: 'play_count' | 'score_threshold' | 'try_new_game';
  description: string;
  target: number;
  gameId?: string;
  skillCategory?: SkillCategory;
}

export interface GamePlugin {
  manifest: GameManifest;
  onLoad(): Promise<void>;
  onStart(config: GameConfig): void;
  onPause(): void;
  onResume(): void;
  onEnd(): GameResult;
  onUnload(): void;
  GameComponent: ComponentType<GameProps>;
}
