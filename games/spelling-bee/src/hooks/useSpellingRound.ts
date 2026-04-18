import { useState, useCallback, useEffect, useRef } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';

export type RoundPhase = 'playing' | 'feedback' | 'complete';

interface UseSpellingRoundOptions {
  words: WordEntry[];
  ageTier: AgeTier;
  onScorePoint: (points: number) => void;
  lives: number;
  onLifeLost: () => void;
  onRoundComplete: (wordsCorrect: number, wordsAttempted: number) => void;
}

interface SpellingRoundState {
  phase: RoundPhase;
  currentWordIndex: number;
  currentWord: WordEntry | undefined;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  wordsCorrect: number;
}

interface SpellingRoundActions {
  submitAnswer: (answer: string) => void;
  nextWord: () => void;
}

export function useSpellingRound(
  options: UseSpellingRoundOptions,
): SpellingRoundState & SpellingRoundActions {
  const { words, ageTier, onScorePoint, lives, onLifeLost, onRoundComplete } = options;
  const isTiny = ageTier === 'tiny';

  const isEmpty = words.length === 0;
  const [phase, setPhase] = useState<RoundPhase>(isEmpty ? 'complete' : 'playing');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const wordsCorrectRef = useRef(0);

  // Sync lives from props into a ref for reliable reads in callbacks
  const livesRef = useRef(lives);
  livesRef.current = lives;

  const maxScore = words.length;
  const currentWord = words[currentWordIndex];

  // If constructed with no words, notify the parent once (post-render, via
  // effect) so the session hook can advance past the broken round instead
  // of hanging on it. Calling parent callbacks during render is a React
  // anti-pattern; the effect defers it safely.
  useEffect(() => {
    if (!isEmpty) return;
    if (import.meta.env.DEV) {
      console.error('[spelling-bee] useSpellingRound received empty words array');
    }
    onRoundComplete(0, 0);
    // Intentionally only runs on the first render that sees an empty words
    // array. If the parent re-renders with a non-empty array later, this
    // effect correctly stays idle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty]);

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!currentWord) return;
      const correct = answer.toLowerCase() === currentWord.word.toLowerCase();
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        wordsCorrectRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      } else if (!isTiny) {
        onLifeLost();
      }
    },
    [currentWord, isTiny, onScorePoint, onLifeLost],
  );

  const nextWord = useCallback(() => {
    setIsCorrect(null);

    const isLastWord = currentWordIndex >= words.length - 1;
    const outOfLives = !isTiny && livesRef.current <= 0;

    if (isLastWord || outOfLives) {
      setPhase('complete');
      onRoundComplete(wordsCorrectRef.current, currentWordIndex + 1);
      return;
    }

    setCurrentWordIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentWordIndex, words.length, isTiny, onRoundComplete]);

  return {
    phase,
    currentWordIndex,
    currentWord,
    score,
    maxScore,
    isCorrect,
    wordsCorrect: wordsCorrectRef.current,
    submitAnswer,
    nextWord,
  };
}
