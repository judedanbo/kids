// Types
export type {
  GameManifest,
  GamePlugin,
  GameConfig,
  GameSettings,
  GameProps,
  GameResult,
  SkillCategory,
  AgeTier,
  UserProfile,
  GameProgress,
  Reward,
  RewardType,
  RewardCriteria,
  TimeLimitConfig,
  FeatureFlags,
  AudioManager,
  StorageManager,
  AnalyticsEvent,
  EventFilter,
} from './types';

// Context providers
export { AgeTierProvider, AgeTierContext } from './context/AgeTierContext';
export { FeatureFlagProvider, FeatureFlagContext } from './context/FeatureFlagContext';

// Hooks
export { useAgeTier } from './hooks/useAgeTier';
export { useFeatureFlag } from './hooks/useFeatureFlag';
export { useGameLifecycle } from './hooks/useGameLifecycle';
