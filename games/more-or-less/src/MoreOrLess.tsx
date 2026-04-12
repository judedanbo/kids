import { useCallback, useRef, useEffect } from 'react';
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
import { useComparisonRound } from './hooks/useComparisonRound';
import { ObjectGroups } from './components/ObjectGroups';
import { NumberCards } from './components/NumberCards';
import { OrderingArea } from './components/OrderingArea';
import styles from './MoreOrLess.module.css';

export function MoreOrLess({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('more-or-less');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';

  const round = useComparisonRound({
    ageTier,
    difficulty: config.difficulty,
    onScorePoint: onScore,
  });

  const comp = round.currentComparison;

  // Announce current round
  useEffect(() => {
    if (round.phase === 'playing') {
      announce(t('roundOf', { current: round.currentIndex + 1, total: round.totalRounds }));
      if (isTiny && comp.type === 'objects') {
        audioManager.playVoice(`voice:prompt-${comp.prompt}`);
      }
    }
  }, [round.phase, round.currentIndex, round.totalRounds, isTiny, comp, audioManager, announce, t]);

  // Audio feedback
  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-correct');
      }
    } else {
      audioManager.playSFX('incorrect');
    }
  }, [round.phase, round.isCorrect, audioManager, isTiny]);

  // Background music for tiny-tier
  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:more-or-less-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'more-or-less',
      score: round.score,
      maxScore: round.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        correctCount: round.correctCount,
        totalRounds: round.totalRounds,
      },
    };
    onComplete(result);
  }, [round, config.difficulty, onComplete]);

  // Get prompt text
  const getPromptText = (): string => {
    if (comp.type === 'ordering') return t('orderPrompt');
    if (comp.type === 'objects') {
      return comp.prompt === 'more'
        ? t('whichMoreObjects', { object: comp.groups[0].objectType })
        : t('whichLessObjects', { object: comp.groups[0].objectType });
    }
    return comp.prompt === 'more' ? t('whichMore') : t('whichLess');
  };

  if (round.phase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character="🔢" />
          <OptionButton label={t('letsGo')} state="default" onSelect={round.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  if (round.phase === 'complete') {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={round.score}
          maxScore={round.maxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  const showFeedback = round.phase === 'feedback';

  return (
    <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
        </div>

        <ProgressBar current={round.currentIndex} total={round.totalRounds} showLabel />

        <p className={styles.prompt} aria-live="assertive">{getPromptText()}</p>

        {!showFeedback && comp.type === 'objects' && (
          <ObjectGroups groups={comp.groups} onSelect={round.submitChoice} />
        )}

        {!showFeedback && comp.type === 'numbers' && (
          <NumberCards values={comp.displayValues} onSelect={round.submitChoice} />
        )}

        {!showFeedback && comp.type === 'ordering' && (
          <OrderingArea
            values={comp.values}
            displayValues={comp.displayValues}
            onSubmit={round.submitOrder}
          />
        )}

        {showFeedback && (
          <div className={styles.feedbackArea} aria-live="assertive">
            <p className={round.isCorrect ? styles.correctText : styles.incorrectText}>
              {round.isCorrect ? t('correct') : t('incorrect')}
            </p>
            <OptionButton label={t('next')} state="default" onSelect={round.nextRound} size="large" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
