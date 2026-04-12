import { useState, useCallback, useRef } from 'react';
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
  currentWord: WordEntry;
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

  const [phase, setPhase] = useState<RoundPhase>('playing');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const wordsCorrectRef = useRef(0);

  // Sync lives from props into a ref for reliable reads in callbacks
  const livesRef = useRef(lives);
  livesRef.current = lives;

  const maxScore = words.length;
  const currentWord = words[currentWordIndex] ?? words[0];

  const submitAnswer = useCallback(
    (answer: string) => {
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
