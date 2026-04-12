import { describe, it, expect } from 'vitest';
import { buildLadder, adjustDifficulty, TOTAL_LEVELS, LEVEL_WORD_COUNTS, ADVANCEMENT_THRESHOLD } from '../hooks/useSessionLevels';

describe('buildLadder', () => {
  it('creates 5 levels with warmup/at-level/stretch pattern', () => {
    const ladder = buildLadder(3);
    expect(ladder).toHaveLength(5);
    expect(ladder.map((l) => l.difficulty)).toEqual([2, 3, 3, 4, 4]);
  });

  it('clamps warmup to minimum difficulty 1', () => {
    const ladder = buildLadder(1);
    expect(ladder.map((l) => l.difficulty)).toEqual([1, 1, 1, 2, 2]);
  });

  it('assigns correct word counts per level', () => {
    const ladder = buildLadder(3);
    expect(ladder.map((l) => l.wordCount)).toEqual([3, 4, 5, 6, 7]);
  });

  it('works at high difficulty', () => {
    const ladder = buildLadder(9);
    expect(ladder.map((l) => l.difficulty)).toEqual([8, 9, 9, 10, 10]);
  });
});

describe('adjustDifficulty', () => {
  it('returns planned difficulty when accuracy meets threshold', () => {
    expect(adjustDifficulty(4, 3, 0.8)).toBe(4);
  });

  it('returns planned difficulty when accuracy exactly meets threshold', () => {
    expect(adjustDifficulty(4, 3, ADVANCEMENT_THRESHOLD)).toBe(4);
  });

  it('clamps to previous difficulty when accuracy is below threshold', () => {
    expect(adjustDifficulty(4, 3, 0.5)).toBe(3);
  });

  it('returns planned difficulty when it is at or below previous', () => {
    expect(adjustDifficulty(3, 3, 0.5)).toBe(3);
    expect(adjustDifficulty(2, 3, 0.5)).toBe(2);
  });

  it('clamps correctly at zero accuracy', () => {
    expect(adjustDifficulty(5, 3, 0)).toBe(3);
  });

  it('allows planned difficulty at perfect accuracy', () => {
    expect(adjustDifficulty(10, 3, 1.0)).toBe(10);
  });
});

describe('constants', () => {
  it('has 5 total levels', () => {
    expect(TOTAL_LEVELS).toBe(5);
  });

  it('word counts sum to 25', () => {
    expect(LEVEL_WORD_COUNTS.reduce((a, b) => a + b, 0)).toBe(25);
  });
});
