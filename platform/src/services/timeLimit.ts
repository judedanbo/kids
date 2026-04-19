import type { TimeLimitConfig } from '@kids-games-zone/shared';

export type TimeLimitStatus = 'ok' | 'reminder' | 'limit_reached';

/**
 * Checks the current time limit status.
 * @param config - Time limit configuration
 * @param sessionStartTime - When the current session started (epoch ms)
 * @param dailyAccumulatedMinutes - Minutes already played today before this session
 * @returns The current status
 */
export function checkTimeLimit(
  config: TimeLimitConfig,
  sessionStartTime: number,
  dailyAccumulatedMinutes: number,
): TimeLimitStatus {
  if (!config.enabled) return 'ok';

  const now = Date.now();
  const sessionMinutes = (now - sessionStartTime) / 60_000;
  const totalDailyMinutes = dailyAccumulatedMinutes + sessionMinutes;

  // Check session limit
  if (config.sessionLimitMinutes > 0 && sessionMinutes >= config.sessionLimitMinutes) {
    return 'limit_reached';
  }

  // Check daily limit
  if (config.dailyLimitMinutes > 0 && totalDailyMinutes >= config.dailyLimitMinutes) {
    return 'limit_reached';
  }

  // Check reminder threshold
  const sessionRemaining =
    config.sessionLimitMinutes > 0 ? config.sessionLimitMinutes - sessionMinutes : Infinity;
  const dailyRemaining =
    config.dailyLimitMinutes > 0 ? config.dailyLimitMinutes - totalDailyMinutes : Infinity;
  const minRemaining = Math.min(sessionRemaining, dailyRemaining);

  if (config.reminderBeforeEndMinutes > 0 && minRemaining <= config.reminderBeforeEndMinutes) {
    return 'reminder';
  }

  return 'ok';
}

/**
 * Checks if the current time falls within the allowed schedule.
 */
export function isWithinSchedule(config: TimeLimitConfig): boolean {
  if (!config.enabled || !config.schedule) return true;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (!config.schedule.allowedDays.includes(day)) return false;
  if (hour < config.schedule.allowedStartHour || hour >= config.schedule.allowedEndHour)
    return false;

  return true;
}

/** Default time limit config (disabled) */
export const DEFAULT_TIME_LIMIT: TimeLimitConfig = {
  enabled: false,
  dailyLimitMinutes: 60,
  sessionLimitMinutes: 30,
  reminderBeforeEndMinutes: 5,
  cooldownMinutes: 15,
};
