import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSpellingRound } from '../hooks/useSpellingRound';

const wordEntry = (word: string) => ({
  word,
  difficulty: 1,
  image: '',
  definition: '',
  origin: '',
  sentence: '',
});

describe('useSpellingRound', () => {
  it('starts in phase "complete" when words is empty and fires onRoundComplete', () => {
    const onRoundComplete = vi.fn();
    const { result } = renderHook(() =>
      useSpellingRound({
        words: [],
        ageTier: 'junior',
        onScorePoint: vi.fn(),
        lives: 3,
        onLifeLost: vi.fn(),
        onRoundComplete,
      }),
    );

    expect(result.current.phase).toBe('complete');
    expect(onRoundComplete).toHaveBeenCalledWith(0, 0);
    expect(result.current.currentWord).toBeUndefined();
  });

  it('does not throw when reading currentWord for an empty words array', () => {
    expect(() =>
      renderHook(() =>
        useSpellingRound({
          words: [],
          ageTier: 'junior',
          onScorePoint: vi.fn(),
          lives: 3,
          onLifeLost: vi.fn(),
          onRoundComplete: vi.fn(),
        }),
      ),
    ).not.toThrow();
  });

  it('fires onRoundComplete exactly once when nextWord is double-invoked on the final word', () => {
    const onRoundComplete = vi.fn();
    const { result } = renderHook(() =>
      useSpellingRound({
        words: [wordEntry('cat')],
        ageTier: 'junior',
        onScorePoint: vi.fn(),
        lives: 3,
        onLifeLost: vi.fn(),
        onRoundComplete,
      }),
    );

    act(() => {
      result.current.submitAnswer('cat');
    });
    act(() => {
      result.current.nextWord();
      result.current.nextWord();
    });

    expect(onRoundComplete).toHaveBeenCalledTimes(1);
    expect(onRoundComplete).toHaveBeenCalledWith(1, 1);
  });
});
