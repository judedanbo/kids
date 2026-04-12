import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
  InstructionBubble,
  GameTimer,
  useAnnounce,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { generateRound } from './utils/questionGenerator';
import type { Question } from './utils/questionGenerator';
import { VisualAid } from './components/VisualAid';
import styles from './MathAdventure.module.css';

const TOTAL_QUESTIONS = 10;

type OptionState = 'default' | 'correct' | 'incorrect';

export function MathAdventure({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('math-adventure');
  const announce = useAnnounce();
  const [showInstruction, setShowInstruction] = useState(true);
  const [questions] = useState<Question[]>(() => generateRound(config.difficulty, TOTAL_QUESTIONS));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionStates, setOptionStates] = useState<Record<number, OptionState>>({});
  const [showCelebration, setShowCelebration] = useState(false);

  // Metrics
  const questionsCorrectRef = useRef(0);
  const totalAttemptsRef = useRef<number[]>([]);
  const opCountsRef = useRef({ add: 0, subtract: 0, multiply: 0 });
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!showInstruction) {
      announce(t('questionOf', { current: currentIndex + 1, total: questions.length, text: currentQuestion.displayText }));
    }
  }, [currentIndex, showInstruction, announce, t, currentQuestion.displayText, questions.length]);

  const handleDismissInstruction = useCallback(() => {
    setShowInstruction(false);
  }, []);

  const advanceQuestion = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      audioManager.playSFX('celebrate');
      setShowCelebration(true);
    } else {
      setCurrentIndex(nextIndex);
      setAttempts(0);
      setSelectedOption(null);
      setOptionStates({});
    }
  }, [currentIndex, audioManager]);

  const handleOptionSelect = useCallback(
    (option: number) => {
      if (selectedOption !== null) return;

      const isCorrect = option === currentQuestion.correctAnswer;
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (isCorrect) {
        setSelectedOption(option);
        setOptionStates((prev) => ({ ...prev, [option]: 'correct' }));
        audioManager.playSFX('correct');
        announce(t('correct'));

        const points = newAttempts === 1 ? 10 : newAttempts === 2 ? 5 : 2;
        setScore((prev) => prev + points);
        onScore(points);

        // Track metrics
        questionsCorrectRef.current += 1;
        totalAttemptsRef.current.push(newAttempts);
        const op = currentQuestion.operation;
        opCountsRef.current[op] += 1;

        setTimeout(() => {
          advanceQuestion();
        }, 800);
      } else {
        setOptionStates((prev) => ({ ...prev, [option]: 'incorrect' }));
        audioManager.playSFX('incorrect');
        announce(t('incorrect'));

        setTimeout(() => {
          setOptionStates((prev) => {
            // Keep it as 'incorrect' (disabled) after the flash
            return { ...prev, [option]: 'incorrect' };
          });
        }, 600);
      }
    },
    [selectedOption, attempts, currentQuestion, audioManager, onScore, advanceQuestion, announce, t],
  );

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const totalAttempts = totalAttemptsRef.current;
    const avgAttempts =
      totalAttempts.length > 0
        ? totalAttempts.reduce((a, b) => a + b, 0) / totalAttempts.length
        : 1;

    const result: GameResult = {
      gameId: 'math-adventure',
      score,
      maxScore: TOTAL_QUESTIONS * 10,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        questionsCorrect: questionsCorrectRef.current,
        avgAttempts: Math.round(avgAttempts * 100) / 100,
        additionCount: opCountsRef.current.add,
        subtractionCount: opCountsRef.current.subtract,
        multiplicationCount: opCountsRef.current.multiply,
      },
    };
    onComplete(result);
  }, [score, config.difficulty, onComplete]);

  if (showCelebration) {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={score}
          maxScore={TOTAL_QUESTIONS * 10}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  if (showInstruction) {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <div className={styles.gameArea}>
          <InstructionBubble text={t('instruction')} character="🧮" characterSrc="/images/games/mascots/calculator.webp" />
          <OptionButton label={t('letsGo')} state="default" onSelect={handleDismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  const showVisualAid = config.difficulty <= 2;

  return (
    <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={score} maxScore={TOTAL_QUESTIONS * 10} showStars />
          <GameTimer mode="countup" paused={showCelebration} />
        </div>
        <ProgressBar current={currentIndex} total={TOTAL_QUESTIONS} showLabel />
        <div className={styles.questionArea}>
          <p aria-live="assertive" aria-atomic="true" className={styles.questionText}>{currentQuestion.displayText}</p>
          {attempts > 1 && (
            <p
              className={styles.attemptHint}
              aria-label={t('attempt', { count: attempts })}
            >
              {t('attempt', { count: attempts })}
            </p>
          )}
        </div>
        {showVisualAid && (
          <VisualAid
            operandA={currentQuestion.operandA}
            operandB={currentQuestion.operandB}
            operation={currentQuestion.operation}
          />
        )}
        <div className={styles.optionsGrid}>
          {currentQuestion.options.map((option, idx) => (
            <OptionButton
              key={`${currentIndex}-${idx}`}
              label={String(option)}
              state={optionStates[option] ?? 'default'}
              disabled={selectedOption !== null || optionStates[option] === 'incorrect'}
              onSelect={() => handleOptionSelect(option)}
            />
          ))}
        </div>
      </div>
    </GameShell>
  );
}
