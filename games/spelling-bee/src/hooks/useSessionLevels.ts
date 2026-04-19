import { useState, useCallback, useRef } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import { selectWords, type WordEntry } from '../utils/wordSelector';

export type SessionPhase = 'instruction' | 'playing' | 'level-transition' | 'complete';

export type SessionOutcome = 'victory' | 'out-of-lives' | null;

export const TOTAL_LEVELS = 5;
export const LEVEL_WORD_COUNTS = [3, 4, 5, 6, 7];
export const ADVANCEMENT_THRESHOLD = 0.7;
const SESSION_LIVES = 3;

export interface LevelPlan {
  difficulty: number;
  wordCount: number;
}

export function buildLadder(startDifficulty: number): LevelPlan[] {
  const warmup = Math.max(startDifficulty - 1, 1);
  const atLevel = startDifficulty;
  const stretch = startDifficulty + 1;

  return [
    { difficulty: warmup, wordCount: LEVEL_WORD_COUNTS[0] },
    { difficulty: atLevel, wordCount: LEVEL_WORD_COUNTS[1] },
    { difficulty: atLevel, wordCount: LEVEL_WORD_COUNTS[2] },
    { difficulty: stretch, wordCount: LEVEL_WORD_COUNTS[3] },
    { difficulty: stretch, wordCount: LEVEL_WORD_COUNTS[4] },
  ];
}

export function adjustDifficulty(
  planned: number,
  previousDifficulty: number,
  accuracy: number,
): number {
  if (accuracy >= ADVANCEMENT_THRESHOLD) {
    return planned;
  }
  return Math.min(planned, previousDifficulty);
}

interface UseSessionLevelsOptions {
  startingDifficulty: number;
  ageTier: AgeTier;
  wordPool: WordEntry[];
}

export interface SessionState {
  sessionPhase: SessionPhase;
  currentLevel: number;
  totalLevels: number;
  levelDifficulty: number;
  levelWords: WordEntry[];
  lives: number;
  maxLives: number;
  sessionScore: number;
  sessionMaxScore: number;
  levelsCompleted: number;
  highestDifficulty: number;
  outcome: SessionOutcome;
}

export interface SessionActions {
  dismissInstruction: () => void;
  completeLevel: (wordsCorrect: number, wordsAttempted: number) => void;
  loseLife: () => void;
  startNextLevel: () => void;
  addScore: (points: number) => void;
  restart: () => void;
}

export function useSessionLevels(
  options: UseSessionLevelsOptions,
): SessionState & SessionActions {
  const { startingDifficulty, ageTier, wordPool } = options;
  const isTiny = ageTier === 'tiny';

  const ladderRef = useRef(buildLadder(startingDifficulty));
  const usedWordsRef = useRef<string[]>([]);
  const livesRef = useRef(isTiny ? Infinity : SESSION_LIVES);
  const currentLevelRef = useRef(1);

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('instruction');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [lives, setLives] = useState(isTiny ? Infinity : SESSION_LIVES);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionMaxScore, setSessionMaxScore] = useState(0);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [highestDifficulty, setHighestDifficulty] = useState(startingDifficulty);
  const [outcome, setOutcome] = useState<SessionOutcome>(null);

  const [levelWords, setLevelWords] = useState<WordEntry[]>(() => {
    const plan = ladderRef.current[0];
    const words = selectWords(wordPool, {
      difficulty: plan.difficulty,
      count: plan.wordCount,
      exclude: [],
    });
    usedWordsRef.current = words.map((w) => w.word);
    return words;
  });

  const levelDifficulty = ladderRef.current[currentLevelRef.current - 1].difficulty;

  const dismissInstruction = useCallback(() => {
    setSessionPhase('playing');
  }, []);

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
  }, []);

  const addScore = useCallback((points: number) => {
    setSessionScore((prev) => prev + points);
  }, []);

  // Empty deps are intentional: every non-setter value read inside is a ref
  // (ladderRef, currentLevelRef, livesRef), every setter is React-stable, and
  // the only non-local values (TOTAL_LEVELS, adjustDifficulty) are module
  // constants. Keep this shape when editing — introducing a prop-derived or
  // state-derived read here would silently stale this callback.
  const completeLevel = useCallback(
    (wordsCorrect: number, wordsAttempted: number) => {
      const accuracy = wordsAttempted > 0 ? wordsCorrect / wordsAttempted : 0;
      setSessionMaxScore((prev) => prev + wordsAttempted);
      setLevelsCompleted((prev) => prev + 1);

      const currentDiff = ladderRef.current[currentLevelRef.current - 1].difficulty;
      setHighestDifficulty((prev) => Math.max(prev, currentDiff));

      // Any completion at level 5 is treated as a victory, regardless of
      // that level's accuracy — reaching level 5 is itself an achievement
      // for kids, and tightening to require a passing score would punish
      // players who got unlucky on their final-life attempt.
      if (currentLevelRef.current >= TOTAL_LEVELS) {
        setOutcome('victory');
        setSessionPhase('complete');
        return;
      }
      if (livesRef.current <= 0) {
        setOutcome('out-of-lives');
        setSessionPhase('complete');
        return;
      }

      const nextIdx = currentLevelRef.current;
      const nextPlanned = ladderRef.current[nextIdx].difficulty;
      const adjusted = adjustDifficulty(nextPlanned, currentDiff, accuracy);
      ladderRef.current[nextIdx] = { ...ladderRef.current[nextIdx], difficulty: adjusted };

      for (let i = nextIdx + 1; i < TOTAL_LEVELS; i++) {
        if (ladderRef.current[i].difficulty > adjusted) {
          ladderRef.current[i] = { ...ladderRef.current[i], difficulty: adjusted };
        }
      }

      setSessionPhase('level-transition');
    },
    [],
  );

  const startNextLevel = useCallback(() => {
    const nextLevel = currentLevelRef.current + 1;
    currentLevelRef.current = nextLevel;
    setCurrentLevel(nextLevel);

    const nextPlan = ladderRef.current[nextLevel - 1];
    const words = selectWords(wordPool, {
      difficulty: nextPlan.difficulty,
      count: nextPlan.wordCount,
      exclude: usedWordsRef.current,
    });
    usedWordsRef.current = [...usedWordsRef.current, ...words.map((w) => w.word)];

    setHighestDifficulty((prev) => Math.max(prev, nextPlan.difficulty));
    setLevelWords(words);
    setSessionPhase('playing');
  }, [wordPool]);

  const restart = useCallback(() => {
    ladderRef.current = buildLadder(startingDifficulty);
    usedWordsRef.current = [];
    livesRef.current = isTiny ? Infinity : SESSION_LIVES;
    currentLevelRef.current = 1;

    const plan = ladderRef.current[0];
    const words = selectWords(wordPool, {
      difficulty: plan.difficulty,
      count: plan.wordCount,
      exclude: [],
    });
    usedWordsRef.current = words.map((w) => w.word);

    setCurrentLevel(1);
    setLives(isTiny ? Infinity : SESSION_LIVES);
    setSessionScore(0);
    setSessionMaxScore(0);
    setLevelsCompleted(0);
    setHighestDifficulty(startingDifficulty);
    setLevelWords(words);
    setOutcome(null);
    setSessionPhase('playing');
  }, [startingDifficulty, isTiny, wordPool]);

  return {
    sessionPhase,
    currentLevel,
    totalLevels: TOTAL_LEVELS,
    levelDifficulty,
    levelWords,
    lives,
    maxLives: isTiny ? 0 : SESSION_LIVES,
    sessionScore,
    sessionMaxScore,
    levelsCompleted,
    highestDifficulty,
    outcome,
    dismissInstruction,
    completeLevel,
    loseLife,
    startNextLevel,
    addScore,
    restart,
  };
}
