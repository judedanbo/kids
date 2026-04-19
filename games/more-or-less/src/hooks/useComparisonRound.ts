import { useState, useCallback, useRef, useMemo } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import { generateComparison, type Comparison } from '../utils/comparisonGenerator';

export type ComparisonPhase = 'instruction' | 'playing' | 'feedback' | 'complete';

const ROUNDS_BY_TIER: Record<AgeTier, number> = {
  tiny: 6,
  junior: 8,
  explorer: 10,
};

interface UseComparisonRoundOptions {
  ageTier: AgeTier;
  difficulty: number;
  onScorePoint: (points: number) => void;
}

interface ComparisonRoundState {
  phase: ComparisonPhase;
  currentIndex: number;
  totalRounds: number;
  currentComparison: Comparison;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  correctCount: number;
}

interface ComparisonRoundActions {
  dismissInstruction: () => void;
  submitChoice: (choiceIndex: number) => void;
  submitOrder: (orderedValues: number[]) => void;
  nextRound: () => void;
}

export function useComparisonRound(
  options: UseComparisonRoundOptions,
): ComparisonRoundState & ComparisonRoundActions {
  const { ageTier, difficulty, onScorePoint } = options;
  const totalRounds = ROUNDS_BY_TIER[ageTier];

  const comparisons = useMemo(
    () => Array.from({ length: totalRounds }, () => generateComparison(ageTier, difficulty)),
    [ageTier, difficulty, totalRounds],
  );

  const [phase, setPhase] = useState<ComparisonPhase>('instruction');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const correctCountRef = useRef(0);

  const currentComparison = comparisons[currentIndex];
  const maxScore = totalRounds;

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

  const submitChoice = useCallback(
    (choiceIndex: number) => {
      const comp = comparisons[currentIndex];
      if (comp.type === 'ordering') return;

      const correct = choiceIndex === comp.correctIndex;
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        correctCountRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [comparisons, currentIndex, onScorePoint],
  );

  const submitOrder = useCallback(
    (orderedValues: number[]) => {
      const comp = comparisons[currentIndex];
      if (comp.type !== 'ordering') return;

      const correct = orderedValues.every((v, i) => v === comp.correctOrder[i]);
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        correctCountRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [comparisons, currentIndex, onScorePoint],
  );

  const nextRound = useCallback(() => {
    setIsCorrect(null);

    if (currentIndex >= totalRounds - 1) {
      setPhase('complete');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentIndex, totalRounds]);

  return {
    phase,
    currentIndex,
    totalRounds,
    currentComparison,
    score,
    maxScore,
    isCorrect,
    correctCount: correctCountRef.current,
    dismissInstruction,
    submitChoice,
    submitOrder,
    nextRound,
  };
}
