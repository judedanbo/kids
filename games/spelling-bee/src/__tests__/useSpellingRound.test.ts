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
    });
    act(() => {
      result.current.nextWord();
    });

    expect(onRoundComplete).toHaveBeenCalledTimes(1);
    expect(onRoundComplete).toHaveBeenCalledWith(1, 1);
  });

  it('calls onLifeLost on a wrong answer for non-tiny tiers', () => {
    const onLifeLost = vi.fn();
    const { result } = renderHook(() =>
      useSpellingRound({
        words: [wordEntry('cat')],
        ageTier: 'junior',
        onScorePoint: vi.fn(),
        lives: 3,
        onLifeLost,
        onRoundComplete: vi.fn(),
      }),
    );

    act(() => {
      result.current.submitAnswer('dog');
    });

    expect(onLifeLost).toHaveBeenCalledTimes(1);
    expect(result.current.isCorrect).toBe(false);
  });

  it('does not call onLifeLost on wrong answer for tiny tier (no fail state)', () => {
    const onLifeLost = vi.fn();
    const { result } = renderHook(() =>
      useSpellingRound({
        words: [wordEntry('cat')],
        ageTier: 'tiny',
        onScorePoint: vi.fn(),
        lives: Infinity,
        onLifeLost,
        onRoundComplete: vi.fn(),
      }),
    );

    act(() => {
      result.current.submitAnswer('dog');
    });

    expect(onLifeLost).not.toHaveBeenCalled();
    expect(result.current.isCorrect).toBe(false);
  });

  it('ends the round early via onRoundComplete when lives reach 0 mid-round', () => {
    const onRoundComplete = vi.fn();
    const { rerender, result } = renderHook(
      ({ lives }: { lives: number }) =>
        useSpellingRound({
          words: [wordEntry('cat'), wordEntry('dog'), wordEntry('bat')],
          ageTier: 'junior',
          onScorePoint: vi.fn(),
          lives,
          onLifeLost: vi.fn(),
          onRoundComplete,
        }),
      { initialProps: { lives: 1 } },
    );

    act(() => {
      result.current.submitAnswer('wrong');
    });
    rerender({ lives: 0 });
    act(() => {
      result.current.nextWord();
    });

    expect(onRoundComplete).toHaveBeenCalledTimes(1);
    // First word was attempted (and wrong). Round exits early — remaining
    // two words are NOT attempted.
    expect(onRoundComplete).toHaveBeenCalledWith(0, 1);
  });
});
