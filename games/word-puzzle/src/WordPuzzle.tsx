import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
  InstructionBubble,
  useAnnounce,
  useRovingTabindex,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { ScrambleRow } from './components/ScrambleRow';
import { AnswerSlots } from './components/AnswerSlots';
import { categories, getWordsForRound, getRandomCategoryIndex } from './data/words';
import type { WordEntry } from './data/words';
import { scrambleWord } from './utils/scramble';
import styles from './WordPuzzle.module.css';

const TOTAL_WORDS = 8;

export function WordPuzzle({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('word-puzzle');
  const [showInstruction, setShowInstruction] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const [categoryIndex] = useState<number>(() => getRandomCategoryIndex());
  const [words] = useState<WordEntry[]>(() =>
    getWordsForRound(categoryIndex, config.difficulty, TOTAL_WORDS),
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [placedIndices, setPlacedIndices] = useState<Set<number>>(new Set());
  const [placementOrder, setPlacementOrder] = useState<number[]>([]);
  const [answerSlots, setAnswerSlots] = useState<(string | null)[]>([]);

  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [answerState, setAnswerState] = useState<'default' | 'correct' | 'incorrect'>('default');

  const announce = useAnnounce();
  const { getItemProps: getLetterProps } = useRovingTabindex({
    itemCount: scrambledLetters.length,
    orientation: 'horizontal',
  });

  const startTimeRef = useRef(Date.now());
  const wordsCorrectRef = useRef(0);
  const totalAttemptsRef = useRef<number[]>([]);

  const initWord = useCallback(
    (wordEntry: WordEntry) => {
      const scrambled = scrambleWord(wordEntry.word).split('');
      setScrambledLetters(scrambled);
      setPlacedIndices(new Set());
      setPlacementOrder([]);
      setAnswerSlots(new Array(wordEntry.word.length).fill(null));
      setAttempts(0);
      setAnswerState('default');
    },
    [],
  );

  useEffect(() => {
    if (!showInstruction && words.length > 0) {
      const entry = words[currentIndex];
      initWord(entry);
      const categoryKey = `category_${categories[categoryIndex].name.toLowerCase()}`;
      announce(t('newRound', { category: t(categoryKey), clue: entry.clue }));
    }
  }, [showInstruction, currentIndex, words, initWord, announce, categoryIndex, t]);

  const handleDismissInstruction = useCallback(() => {
    setShowInstruction(false);
    startTimeRef.current = Date.now();
  }, []);

  const checkAnswer = useCallback(
    (slots: (string | null)[], word: string, currentAttempts: number) => {
      const answer = slots.join('').toLowerCase();
      if (answer === word) {
        setAnswerState('correct');
        audioManager.playSFX('correct');
        announce(t('correct', { word }));

        const points = currentAttempts === 0 ? 10 : currentAttempts === 1 ? 5 : 2;
        setScore((prev) => prev + points);
        onScore(points);
        wordsCorrectRef.current += 1;
        totalAttemptsRef.current.push(currentAttempts + 1);

        setTimeout(() => {
          const nextIndex = currentIndex + 1;
          if (nextIndex >= TOTAL_WORDS) {
            audioManager.playSFX('celebrate');
            setShowCelebration(true);
          } else {
            setCurrentIndex(nextIndex);
          }
        }, 800);
      } else {
        setAnswerState('incorrect');
        audioManager.playSFX('incorrect');
        announce(t('incorrect'));
        setAttempts((prev) => prev + 1);

        setTimeout(() => {
          // Clear slots and reset placement
          setAnswerSlots(new Array(word.length).fill(null));
          setPlacedIndices(new Set());
          setPlacementOrder([]);
          setAnswerState('default');
        }, 600);
      }
    },
    [currentIndex, audioManager, onScore, announce, t],
  );

  const handleLetterClick = useCallback(
    (index: number) => {
      if (placedIndices.has(index) || answerState !== 'default') return;

      const letter = scrambledLetters[index];
      const newSlots = [...answerSlots];
      const firstEmpty = newSlots.findIndex((s) => s === null);
      if (firstEmpty === -1) return;

      newSlots[firstEmpty] = letter;
      const newPlaced = new Set(placedIndices);
      newPlaced.add(index);
      const newOrder = [...placementOrder, index];

      setAnswerSlots(newSlots);
      setPlacedIndices(newPlaced);
      setPlacementOrder(newOrder);
      audioManager.playSFX('click');
      announce(t('placedLetter', { letter }));

      // Auto-check when all slots filled
      if (firstEmpty === newSlots.length - 1) {
        checkAnswer(newSlots, words[currentIndex].word, attempts);
      }
    },
    [
      placedIndices,
      answerState,
      scrambledLetters,
      answerSlots,
      placementOrder,
      audioManager,
      announce,
      checkAnswer,
      words,
      currentIndex,
      attempts,
      t,
    ],
  );

  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      if (answerState !== 'default') return;

      // Find the scramble index for this slot position
      // placementOrder maps placement order to scramble indices,
      // but we need to find which placement corresponds to this slot.
      // Walk through placementOrder to find the scramble index that filled this slot.
      const newSlots = [...answerSlots];

      // Find which placement order entry filled this slot
      // Re-simulate filling: the n-th placement fills the n-th empty slot at that time.
      // Easier: find the scramble index by reverse-mapping via slot position.
      // The slot at slotIndex was filled by placementOrder[k] where k is
      // the k-th non-null slot in order.
      // Count non-null slots up to slotIndex to find k:
      let filledCount = 0;
      for (let i = 0; i < slotIndex; i++) {
        if (answerSlots[i] !== null) filledCount++;
      }
      const scrambleIdx = placementOrder[filledCount];

      newSlots[slotIndex] = null;
      const newPlaced = new Set(placedIndices);
      newPlaced.delete(scrambleIdx);
      const newOrder = placementOrder.filter((_, i) => i !== filledCount);

      const removedLetter = answerSlots[slotIndex];
      setAnswerSlots(newSlots);
      setPlacedIndices(newPlaced);
      setPlacementOrder(newOrder);
      audioManager.playSFX('click');
      if (removedLetter) {
        announce(t('removedLetter', { letter: removedLetter }));
      }
    },
    [answerState, answerSlots, placedIndices, placementOrder, audioManager, announce, t],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placementOrder.length > 0 && answerState === 'default') {
        // Undo last placed letter
        const lastScrambleIdx = placementOrder[placementOrder.length - 1];
        const newOrder = placementOrder.slice(0, -1);

        // Find the slot that contains this letter (last non-null slot)
        const newSlots = [...answerSlots];
        // Find last filled slot
        let lastFilledSlot = -1;
        for (let i = newSlots.length - 1; i >= 0; i--) {
          if (newSlots[i] !== null) {
            lastFilledSlot = i;
            break;
          }
        }
        if (lastFilledSlot !== -1) {
          newSlots[lastFilledSlot] = null;
        }

        const newPlaced = new Set(placedIndices);
        newPlaced.delete(lastScrambleIdx);

        setAnswerSlots(newSlots);
        setPlacedIndices(newPlaced);
        setPlacementOrder(newOrder);
      }
    },
    [placementOrder, answerState, answerSlots, placedIndices],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'word-puzzle',
      score,
      maxScore: TOTAL_WORDS * 10,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        wordsCorrect: wordsCorrectRef.current,
        avgAttempts: totalAttemptsRef.current.length > 0
          ? Math.round((totalAttemptsRef.current.reduce((a, b) => a + b, 0) / totalAttemptsRef.current.length) * 100) / 100
          : 1,
        categoryIndex,
      },
    };
    onComplete(result);
  }, [score, config.difficulty, onComplete, categoryIndex]);

  if (showCelebration) {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={score}
          maxScore={TOTAL_WORDS * 10}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  if (showInstruction) {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble
            text={t('instruction')}
            character="🔤"
          />
          <OptionButton label={t('letsGo')} state="default" onSelect={handleDismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  const currentWord = words[currentIndex];
  const categoryKey = `category_${categories[categoryIndex].name.toLowerCase()}`;

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={score} maxScore={TOTAL_WORDS * 10} showStars />
        </div>
        <ProgressBar current={currentIndex} total={TOTAL_WORDS} showLabel />
        <p className={styles.categoryLabel}>{t(categoryKey)}</p>
        <div className={styles.wordArea}>
          <p className={styles.clueText}>{currentWord.clue}</p>
          {attempts > 0 && (
            <p className={styles.attemptHint}>
              {attempts === 1 ? t('tryAgain') : t('attempt', { count: attempts + 1 })}
            </p>
          )}
          <AnswerSlots
            slots={answerSlots}
            state={answerState}
            onSlotClick={handleSlotClick}
          />
          <ScrambleRow
            letters={scrambledLetters}
            placedIndices={placedIndices}
            onLetterClick={handleLetterClick}
            getLetterProps={getLetterProps}
          />
        </div>
      </div>
    </GameShell>
  );
}
