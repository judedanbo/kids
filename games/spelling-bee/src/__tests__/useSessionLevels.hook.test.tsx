import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionLevels } from '../hooks/useSessionLevels';
import wordsJunior from '../data/words-junior.json';

function setup(startingDifficulty = 2) {
  return renderHook(() =>
    useSessionLevels({
      startingDifficulty,
      ageTier: 'junior',
      wordPool: wordsJunior,
    }),
  );
}

describe('useSessionLevels — outcome and restart', () => {
  it('outcome starts as null', () => {
    const { result } = setup();
    expect(result.current.outcome).toBeNull();
  });

  it('outcome is "victory" when the last level completes with lives remaining', () => {
    const { result } = setup();

    act(() => result.current.dismissInstruction());
    for (let level = 1; level <= 5; level++) {
      const wordCount = result.current.levelWords.length;
      act(() => result.current.completeLevel(wordCount, wordCount));
      if (level < 5) {
        act(() => result.current.startNextLevel());
      }
    }

    expect(result.current.sessionPhase).toBe('complete');
    expect(result.current.outcome).toBe('victory');
  });

  it('outcome is "out-of-lives" when completion is triggered by lives hitting 0', () => {
    const { result } = setup();

    act(() => result.current.dismissInstruction());
    act(() => result.current.loseLife());
    act(() => result.current.loseLife());
    act(() => result.current.loseLife());
    act(() => result.current.completeLevel(0, result.current.levelWords.length));

    expect(result.current.sessionPhase).toBe('complete');
    expect(result.current.outcome).toBe('out-of-lives');
  });

  it('restart() resets lives, score, level, outcome, and phase', () => {
    const { result } = setup(3);

    act(() => result.current.dismissInstruction());
    act(() => result.current.addScore(5));
    act(() => result.current.loseLife());
    act(() => result.current.loseLife());
    act(() => result.current.loseLife());
    act(() => result.current.completeLevel(0, result.current.levelWords.length));

    expect(result.current.outcome).toBe('out-of-lives');

    act(() => result.current.restart());

    expect(result.current.sessionPhase).toBe('playing');
    expect(result.current.outcome).toBeNull();
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.lives).toBe(3);
    expect(result.current.sessionScore).toBe(0);
    expect(result.current.sessionMaxScore).toBe(0);
    expect(result.current.levelsCompleted).toBe(0);
    expect(result.current.levelWords.length).toBeGreaterThan(0);
  });

  it('restart() re-plans the ladder with the original startingDifficulty', () => {
    const { result } = setup(4);
    const initialLevelDifficulty = result.current.levelDifficulty;

    act(() => result.current.dismissInstruction());
    act(() => result.current.completeLevel(0, result.current.levelWords.length));
    act(() => result.current.restart());

    expect(result.current.levelDifficulty).toBe(initialLevelDifficulty);
  });
});
