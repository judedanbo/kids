import type { AgeTier } from './game';

export interface TimeLimitConfig {
  enabled: boolean;
  dailyLimitMinutes: number;
  sessionLimitMinutes: number;
  reminderBeforeEndMinutes: number;
  cooldownMinutes: number;
  schedule?: {
    allowedDays: number[];
    allowedStartHour: number;
    allowedEndHour: number;
  };
}

export interface FeatureFlags {
  [flagName: string]: {
    enabled: boolean;
    rolloutPercentage?: number;
    ageTiers?: AgeTier[];
    description: string;
  };
}
