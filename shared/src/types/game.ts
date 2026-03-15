import type { ComponentType } from 'react';
import type { UserProfile } from './user';

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

export interface GameConfig {
  difficulty: number;
  profile: UserProfile;
  settings: Record<string, unknown>;
}

export interface GameProps {
  config: GameConfig;
  onScore: (points: number) => void;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
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
