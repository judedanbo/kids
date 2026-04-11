import { useState, useCallback, useRef } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';

export type RoundPhase = 'instruction' | 'playing' | 'feedback' | 'complete';

interface UseSpellingRoundOptions {
  words: WordEntry[];
  ageTier: AgeTier;
  onScorePoint: (points: number) => void;
}

interface SpellingRoundState {
  phase: RoundPhase;
  currentWordIndex: number;
  currentWord: WordEntry;
  score: number;
  maxScore: number;
  lives: number;
  maxLives: number;
  isCorrect: boolean | null;
  wordsCorrect: number;
}

interface SpellingRoundActions {
  dismissInstruction: () => void;
  submitAnswer: (answer: string) => void;
  nextWord: () => void;
}

const LIVES_COUNT = 3;

export function useSpellingRound(options: UseSpellingRoundOptions): SpellingRoundState & SpellingRoundActions {
  const { words, ageTier, onScorePoint } = options;
  const isTiny = ageTier === 'tiny';

  const [phase, setPhase] = useState<RoundPhase>('instruction');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_COUNT);
  const livesRef = useRef(LIVES_COUNT);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const wordsCorrectRef = useRef(0);

  const maxScore = words.length;
  const maxLives = LIVES_COUNT;
  const currentWord = words[currentWordIndex] ?? words[0];

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

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
        livesRef.current -= 1;
        setLives(livesRef.current);
      }
    },
    [currentWord, isTiny, onScorePoint],
  );

  const nextWord = useCallback(() => {
    setIsCorrect(null);

    const isLastWord = currentWordIndex >= words.length - 1;
    const outOfLives = !isTiny && livesRef.current <= 0;

    if (isLastWord || outOfLives) {
      setPhase('complete');
      return;
    }

    setCurrentWordIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentWordIndex, words.length, isTiny]);

  return {
    phase,
    currentWordIndex,
    currentWord,
    score,
    maxScore,
    lives,
    maxLives,
    isCorrect,
    wordsCorrect: wordsCorrectRef.current,
    dismissInstruction,
    submitAnswer,
    nextWord,
  };
}
