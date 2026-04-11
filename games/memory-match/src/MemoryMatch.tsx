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
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { generateCards, getGridConfig } from './utils/gridUtils';
import type { CardData, GridConfig } from './utils/gridUtils';
import { CardGrid } from './components/CardGrid';
import styles from './MemoryMatch.module.css';

export function MemoryMatch({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('memory-match');
  const announce = useAnnounce();
  const [showInstruction, setShowInstruction] = useState(true);
  const [cards, setCards] = useState<CardData[]>([]);
  const [gridConfig, setGridConfig] = useState<GridConfig>(() => getGridConfig(config.difficulty));
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [matchedPairIds, setMatchedPairIds] = useState<Set<number>>(new Set());
  const [turns, setTurns] = useState(0);
  const [score, setScore] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [encourageMessage, setEncourageMessage] = useState<string | null>(null);

  const startTimeRef = useRef(Date.now());

  const handleDismissInstruction = useCallback(() => {
    const cfg = getGridConfig(config.difficulty);
    const initialCards = generateCards(config.difficulty);
    setGridConfig(cfg);
    setCards(initialCards);
    setFlippedIds(new Set());
    setMatchedPairIds(new Set());
    setTurns(0);
    setScore(0);
    setIsLocked(true);
    setIsPreview(true);
    setShowInstruction(false);
    startTimeRef.current = Date.now();
  }, [config.difficulty]);

  // Preview phase: show all cards, then flip them back
  useEffect(() => {
    if (!isPreview) return;
    announce(t('preview'));
    const timer = setTimeout(() => {
      setIsPreview(false);
      setIsLocked(false);
    }, gridConfig.previewDuration);
    return () => clearTimeout(timer);
  }, [isPreview, gridConfig.previewDuration, announce, t]);

  // Clear encourage message after a delay
  useEffect(() => {
    if (!encourageMessage) return;
    const timer = setTimeout(() => setEncourageMessage(null), 1500);
    return () => clearTimeout(timer);
  }, [encourageMessage]);

  const handleCardClick = useCallback(
    (cardId: number) => {
      if (isLocked) return;
      if (flippedIds.has(cardId)) return;
      if (flippedIds.size >= 2) return;

      const newFlipped = new Set(flippedIds);
      newFlipped.add(cardId);
      setFlippedIds(newFlipped);

      if (newFlipped.size !== 2) return;

      // Two cards flipped — evaluate
      setIsLocked(true);
      const [firstId, secondId] = Array.from(newFlipped);
      const firstCard = cards.find((c) => c.id === firstId)!;
      const secondCard = cards.find((c) => c.id === secondId)!;

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH
        const newMatched = new Set(matchedPairIds);
        newMatched.add(firstCard.pairId);
        setMatchedPairIds(newMatched);
        setFlippedIds(new Set());
        const newTurns = turns + 1;
        setTurns(newTurns);
        const newScore = score + 10;
        setScore(newScore);
        onScore(10);
        audioManager.playSFX('correct');
        setEncourageMessage(t('greatMatch'));

        // Check for all matched
        if (newMatched.size === gridConfig.pairs) {
          announce(t('complete'));
          audioManager.playSFX('celebrate');
          setShowCelebration(true);
        } else {
          announce(t('matchFound'));
          setIsLocked(false);
        }
      } else {
        // MISMATCH
        announce(t('notAMatch'));
        audioManager.playSFX('incorrect');
        setEncourageMessage(t('keepTrying'));
        const newTurns = turns + 1;
        setTurns(newTurns);
        setTimeout(() => {
          setFlippedIds(new Set());
          setIsLocked(false);
        }, 1000);
      }
    },
    [isLocked, flippedIds, cards, matchedPairIds, turns, score, gridConfig.pairs, onScore, audioManager, announce, t],
  );

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'memory-match',
      score,
      maxScore: gridConfig.pairs * 10,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        turns,
        matchesFound: matchedPairIds.size,
        totalPairs: gridConfig.pairs,
      },
    };
    onComplete(result);
  }, [score, gridConfig.pairs, config.difficulty, turns, matchedPairIds.size, onComplete]);

  if (showCelebration) {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={score}
          maxScore={gridConfig.pairs * 10}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  if (showInstruction) {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={t('instruction')} character="🃏" />
          <OptionButton label={t('letsGo')} state="default" onSelect={handleDismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  // Build the effective set of flipped card IDs (preview flips all)
  const effectiveFlippedIds: Set<number> = isPreview
    ? new Set(cards.map((c) => c.id))
    : flippedIds;

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={score} maxScore={gridConfig.pairs * 10} showStars />
        </div>
        <ProgressBar current={matchedPairIds.size} total={gridConfig.pairs} showLabel />
        {encourageMessage && (
          <p className={styles.encourageMessage}>{encourageMessage}</p>
        )}
        <CardGrid
          cards={cards}
          gridConfig={gridConfig}
          flippedIds={effectiveFlippedIds}
          matchedPairIds={matchedPairIds}
          onCardClick={handleCardClick}
          disabled={isLocked}
        />
      </div>
    </GameShell>
  );
}
