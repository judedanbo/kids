import { describe, it, expect, vi, afterEach } from 'vitest';
import { updateStreak } from '../streaks';

function mockDate(dateStr: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(dateStr + 'T12:00:00'));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('updateStreak', () => {
  it('starts streak at 1 when no previous play', () => {
    mockDate('2026-03-26');
    const result = updateStreak(0, 0, '');
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it('does not change streak when already played today', () => {
    mockDate('2026-03-26');
    const result = updateStreak(3, 5, '2026-03-26T10:00:00.000Z');
    expect(result).toEqual({ currentStreak: 3, longestStreak: 5 });
  });

  it('increments streak when played yesterday', () => {
    mockDate('2026-03-26');
    const result = updateStreak(3, 5, '2026-03-25T18:00:00.000Z');
    expect(result).toEqual({ currentStreak: 4, longestStreak: 5 });
  });

  it('updates longest streak when current exceeds it', () => {
    mockDate('2026-03-26');
    const result = updateStreak(5, 5, '2026-03-25T18:00:00.000Z');
    expect(result).toEqual({ currentStreak: 6, longestStreak: 6 });
  });

  it('resets streak to 1 when gap is more than one day', () => {
    mockDate('2026-03-26');
    const result = updateStreak(5, 10, '2026-03-23T18:00:00.000Z');
    expect(result).toEqual({ currentStreak: 1, longestStreak: 10 });
  });

  it('preserves longest streak on reset', () => {
    mockDate('2026-03-26');
    const result = updateStreak(3, 7, '2026-03-20T10:00:00.000Z');
    expect(result).toEqual({ currentStreak: 1, longestStreak: 7 });
  });

  it('handles first ever play (empty lastPlayedAt)', () => {
    mockDate('2026-03-26');
    const result = updateStreak(0, 0, '');
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1 });
  });
});
