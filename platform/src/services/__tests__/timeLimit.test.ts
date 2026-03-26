import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkTimeLimit, isWithinSchedule } from '../timeLimit';
import type { TimeLimitConfig } from '@kids-games-zone/shared';

const baseConfig: TimeLimitConfig = {
  enabled: true,
  dailyLimitMinutes: 60,
  sessionLimitMinutes: 30,
  reminderBeforeEndMinutes: 5,
  cooldownMinutes: 15,
};

describe('checkTimeLimit', () => {
  it('returns ok when disabled', () => {
    const config = { ...baseConfig, enabled: false };
    expect(checkTimeLimit(config, Date.now() - 3600_000, 50)).toBe('ok');
  });

  it('returns ok when within limits', () => {
    const sessionStart = Date.now() - 10 * 60_000; // 10 min ago
    expect(checkTimeLimit(baseConfig, sessionStart, 20)).toBe('ok');
  });

  it('returns reminder when approaching session limit', () => {
    const sessionStart = Date.now() - 26 * 60_000; // 26 min into 30 min session
    expect(checkTimeLimit(baseConfig, sessionStart, 0)).toBe('reminder');
  });

  it('returns limit_reached when session limit exceeded', () => {
    const sessionStart = Date.now() - 31 * 60_000; // 31 min
    expect(checkTimeLimit(baseConfig, sessionStart, 0)).toBe('limit_reached');
  });

  it('returns limit_reached when daily limit exceeded', () => {
    const sessionStart = Date.now() - 5 * 60_000; // 5 min session
    expect(checkTimeLimit(baseConfig, sessionStart, 56)).toBe('limit_reached');
  });

  it('returns reminder when approaching daily limit', () => {
    const sessionStart = Date.now() - 2 * 60_000; // 2 min session
    expect(checkTimeLimit(baseConfig, sessionStart, 54)).toBe('reminder');
  });
});

describe('isWithinSchedule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when no schedule configured', () => {
    const config = { ...baseConfig, schedule: undefined };
    expect(isWithinSchedule(config)).toBe(true);
  });

  it('returns true when disabled', () => {
    const config = { ...baseConfig, enabled: false };
    expect(isWithinSchedule(config)).toBe(true);
  });

  it('returns true when within schedule', () => {
    vi.useFakeTimers();
    // Wednesday 10:00 AM
    vi.setSystemTime(new Date('2026-03-25T10:00:00'));
    const config: TimeLimitConfig = {
      ...baseConfig,
      schedule: { allowedDays: [0, 1, 2, 3, 4, 5, 6], allowedStartHour: 8, allowedEndHour: 20 },
    };
    expect(isWithinSchedule(config)).toBe(true);
  });

  it('returns false outside allowed hours', () => {
    vi.useFakeTimers();
    // Wednesday 21:00
    vi.setSystemTime(new Date('2026-03-25T21:00:00'));
    const config: TimeLimitConfig = {
      ...baseConfig,
      schedule: { allowedDays: [0, 1, 2, 3, 4, 5, 6], allowedStartHour: 8, allowedEndHour: 20 },
    };
    expect(isWithinSchedule(config)).toBe(false);
  });
});
