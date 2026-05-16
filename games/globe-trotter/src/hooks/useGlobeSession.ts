import { useState, useCallback, useRef } from 'react';
import type { Question } from '../utils/questionGenerator';

export type SessionPhase = 'instruction' | 'playing' | 'feedback' | 'complete';

interface UseGlobeSessionOptions {
  questions: Question[];
  onScorePoint: (points: number) => void;
}

interface GlobeSessionState {
  phase: SessionPhase;
  currentIndex: number;
  currentQuestion: Question;
  score: number;
  maxScore: number;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  correctCount: number;
}

interface GlobeSessionActions {
  dismissInstruction: () => void;
  submitAnswer: (optionIndex: number) => void;
  next: () => void;
}

export function useGlobeSession(
  options: UseGlobeSessionOptions,
): GlobeSessionState & GlobeSessionActions {
  const { questions, onScorePoint } = options;

  const [phase, setPhase] = useState<SessionPhase>('instruction');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const correctCountRef = useRef(0);

  const maxScore = questions.length;
  const currentQuestion = questions[currentIndex] ?? questions[0];

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

  const submitAnswer = useCallback(
    (optionIndex: number) => {
      setSelectedIndex(optionIndex);
      const correct = optionIndex === currentQuestion.correctIndex;
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        correctCountRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [currentQuestion, onScorePoint],
  );

  const next = useCallback(() => {
    setSelectedIndex(null);
    setIsCorrect(null);

    if (currentIndex >= questions.length - 1) {
      setPhase('complete');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentIndex, questions.length]);

  return {
    phase,
    currentIndex,
    currentQuestion,
    score,
    maxScore,
    selectedIndex,
    isCorrect,
    correctCount: correctCountRef.current,
    dismissInstruction,
    submitAnswer,
    next,
  };
}
