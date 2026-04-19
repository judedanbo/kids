import { useState, useCallback, useRef } from 'react';
import type { SafetyObject } from '../utils/objectSelector';

export type SafetyPhase = 'category-select' | 'instruction' | 'playing' | 'feedback' | 'complete';

interface UseSafetyRoundOptions {
  objects: SafetyObject[];
  onScorePoint: (points: number) => void;
}

interface SafetyRoundState {
  phase: SafetyPhase;
  currentObjectIndex: number;
  currentObject: SafetyObject;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  objectsCorrect: number;
}

interface SafetyRoundActions {
  startRound: (objects: SafetyObject[]) => void;
  dismissInstruction: () => void;
  submitAnswer: (answeredSafe: boolean) => void;
  nextObject: () => void;
}

export function useSafetyRound(
  options: UseSafetyRoundOptions,
): SafetyRoundState & SafetyRoundActions {
  const { onScorePoint } = options;

  const [roundObjects, setRoundObjects] = useState<SafetyObject[]>(options.objects);
  const [phase, setPhase] = useState<SafetyPhase>('category-select');
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const objectsCorrectRef = useRef(0);

  const maxScore = roundObjects.length;
  const currentObject = roundObjects[currentObjectIndex] ?? roundObjects[0];

  const startRound = useCallback((objects: SafetyObject[]) => {
    setRoundObjects(objects);
    setCurrentObjectIndex(0);
    setScore(0);
    setIsCorrect(null);
    objectsCorrectRef.current = 0;
    setPhase('instruction');
  }, []);

  const dismissInstruction = useCallback(() => {
    setPhase('playing');
  }, []);

  const submitAnswer = useCallback(
    (answeredSafe: boolean) => {
      const correct = answeredSafe === currentObject.isSafe;
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        objectsCorrectRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      }
    },
    [currentObject, onScorePoint],
  );

  const nextObject = useCallback(() => {
    setIsCorrect(null);

    if (currentObjectIndex >= roundObjects.length - 1) {
      setPhase('complete');
      return;
    }

    setCurrentObjectIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentObjectIndex, roundObjects.length]);

  return {
    phase,
    currentObjectIndex,
    currentObject,
    score,
    maxScore,
    isCorrect,
    objectsCorrect: objectsCorrectRef.current,
    startRound,
    dismissInstruction,
    submitAnswer,
    nextObject,
  };
}
