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
  DailyChallenge,
  AnalyticsEvent,
  EventFilter,
  SpellingWordEntry,
  SpellingWordList,
  SpellingTierFile,
} from './types';

// Context providers
export { AgeTierProvider, AgeTierContext } from './context/AgeTierContext';
export { FeatureFlagProvider, FeatureFlagContext } from './context/FeatureFlagContext';

// Hooks
export { useAgeTier } from './hooks/useAgeTier';
export { useFeatureFlag } from './hooks/useFeatureFlag';
export { useGameLifecycle } from './hooks/useGameLifecycle';
export { useHighContrast } from './hooks/useHighContrast';
export { useRovingTabindex } from './hooks/useRovingTabindex';

// Components
export {
  GameShell,
  OptionButton,
  ScoreDisplay,
  ProgressBar,
  CelebrationOverlay,
  GameTimer,
  DifficultySelector,
  InstructionBubble,
  PauseMenu,
  Announcer,
  useAnnounce,
  SkipLink,
  IconImage,
  ConfirmDialog,
} from './components';
