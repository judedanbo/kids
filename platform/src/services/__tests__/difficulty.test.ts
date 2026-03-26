import { describe, it, expect } from 'vitest';
import { calculateNextDifficulty } from '../difficulty';

describe('calculateNextDifficulty', () => {
  it('returns current difficulty when fewer than 3 results', () => {
    const scores = [
      { score: 10, maxScore: 10 },
      { score: 10, maxScore: 10 },
    ];
    expect(calculateNextDifficulty(scores, 3)).toBe(3);
  });

  it('returns current difficulty with 0 results', () => {
    expect(calculateNextDifficulty([], 2)).toBe(2);
  });

  it('increases difficulty when avg score >= 85%', () => {
    const scores = [
      { score: 9, maxScore: 10 },
      { score: 9, maxScore: 10 },
      { score: 8, maxScore: 10 },
    ];
    // avg = 0.867
    expect(calculateNextDifficulty(scores, 2)).toBe(3);
  });

  it('decreases difficulty when avg score <= 40%', () => {
    const scores = [
      { score: 3, maxScore: 10 },
      { score: 4, maxScore: 10 },
      { score: 3, maxScore: 10 },
    ];
    // avg = 0.333
    expect(calculateNextDifficulty(scores, 3)).toBe(2);
  });

  it('maintains difficulty when avg score is between thresholds', () => {
    const scores = [
      { score: 6, maxScore: 10 },
      { score: 7, maxScore: 10 },
      { score: 5, maxScore: 10 },
    ];
    // avg = 0.60
    expect(calculateNextDifficulty(scores, 3)).toBe(3);
  });

  it('does not exceed max difficulty of 5', () => {
    const scores = [
      { score: 10, maxScore: 10 },
      { score: 10, maxScore: 10 },
      { score: 10, maxScore: 10 },
    ];
    expect(calculateNextDifficulty(scores, 5)).toBe(5);
  });

  it('does not go below min difficulty of 1', () => {
    const scores = [
      { score: 1, maxScore: 10 },
      { score: 0, maxScore: 10 },
      { score: 1, maxScore: 10 },
    ];
    expect(calculateNextDifficulty(scores, 1)).toBe(1);
  });

  it('only considers last 5 results', () => {
    const scores = [
      { score: 1, maxScore: 10 }, // old, should be ignored
      { score: 1, maxScore: 10 }, // old, should be ignored
      { score: 9, maxScore: 10 },
      { score: 9, maxScore: 10 },
      { score: 9, maxScore: 10 },
      { score: 9, maxScore: 10 },
      { score: 9, maxScore: 10 },
    ];
    // last 5 avg = 0.9
    expect(calculateNextDifficulty(scores, 2)).toBe(3);
  });

  it('handles maxScore of 0 gracefully', () => {
    const scores = [
      { score: 0, maxScore: 0 },
      { score: 5, maxScore: 10 },
      { score: 5, maxScore: 10 },
    ];
    // avg = (0 + 0.5 + 0.5) / 3 = 0.333
    expect(calculateNextDifficulty(scores, 3)).toBe(2);
  });
});
