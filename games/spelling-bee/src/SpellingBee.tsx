import { useCallback, useRef, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  CelebrationOverlay,
  InstructionBubble,
  ConfirmDialog,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult, AgeTier } from '@kids-games-zone/shared';
import { useSessionLevels } from './hooks/useSessionLevels';
import { LevelPlay } from './components/LevelPlay';
import { LevelIndicator } from './components/LevelIndicator';
import { LevelTransition } from './components/LevelTransition';
import { GameOverOverlay } from './components/GameOverOverlay';
import wordsTiny from './data/words-tiny.json';
import wordsJunior from './data/words-junior.json';
import wordsExplorer from './data/words-explorer.json';
import styles from './SpellingBee.module.css';

function getWordPool(ageTier: AgeTier) {
  switch (ageTier) {
    case 'tiny': return wordsTiny;
    case 'junior': return wordsJunior;
    case 'explorer': return wordsExplorer;
  }
}

// Design note: any animations added to spelling-bee components should gate
// on `useReducedMotion()` from framer-motion. The shared CelebrationOverlay
// and PauseMenu already follow this pattern; follow them.
export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('spelling-bee');
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const wordPool = useMemo(() => getWordPool(ageTier), [ageTier]);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const session = useSessionLevels({
    startingDifficulty: config.difficulty,
    ageTier,
    wordPool,
  });

  const { addScore } = session;
  const handleScorePoint = useCallback(
    (points: number) => {
      onScore(points);
      addScore(points);
    },
    [onScore, addScore],
  );

  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:spelling-bee-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'spelling-bee',
      score: session.sessionScore,
      maxScore: session.sessionMaxScore,
      timeSpent,
      difficulty: session.highestDifficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        wordsCorrect: session.sessionScore,
        wordsTotal: session.sessionMaxScore,
        levelsCompleted: session.levelsCompleted,
        ...(isTiny ? {} : { livesRemaining: session.lives }),
      },
    };
    onComplete(result);
  }, [session, isTiny, onComplete]);

  const handleBackIntercept = useCallback(() => {
    setConfirmExitOpen(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    setConfirmExitOpen(false);
    onExit();
  }, [onExit]);

  const handleCancelExit = useCallback(() => {
    setConfirmExitOpen(false);
    // GameShell's handleBack stopped music when we opened the dialog.
    // For tiny users with music enabled, restart it if the game is still active.
    if (isTiny && config.settings.musicEnabled && session.sessionPhase !== 'complete') {
      audioManager.playMusic('music:spelling-bee-bgm', { loop: true, fadeIn: 300 });
    }
  }, [isTiny, config.settings.musicEnabled, session.sessionPhase, audioManager]);

  const renderShell = (children: ReactNode) => (
    <GameShell
      title={t('title')}
      onBack={handleBackIntercept}
      audioManager={audioManager}
      musicEnabled={config.settings.backgroundMusicEnabled}
    >
      {children}
      <ConfirmDialog
        open={confirmExitOpen}
        title={t('exitConfirmTitle')}
        message={t('exitConfirmMessage')}
        confirmLabel={t('exitConfirmConfirm')}
        cancelLabel={t('exitConfirmCancel')}
        tone="danger"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </GameShell>
  );

  if (session.sessionPhase === 'instruction') {
    return renderShell(
      <div className={styles.gameArea}>
        <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character={'\u{1F41D}'} characterSrc="/images/games/mascots/bee.webp" />
        <OptionButton label={t('letsGo')} state="default" onSelect={session.dismissInstruction} size="large" />
      </div>,
    );
  }

  if (session.sessionPhase === 'level-transition') {
    return renderShell(
      <LevelTransition
        levelCompleted={session.currentLevel}
        totalLevels={session.totalLevels}
        score={session.sessionScore}
        ageTier={ageTier}
        onContinue={session.startNextLevel}
      />,
    );
  }

  if (session.sessionPhase === 'complete') {
    if (session.outcome === 'out-of-lives') {
      return renderShell(
        <GameOverOverlay
          levelReached={session.levelsCompleted}
          score={session.sessionScore}
          maxScore={session.sessionMaxScore}
          onRetry={session.restart}
          onExit={onExit}
        />,
      );
    }

    const completionMessage = t('sessionComplete', { levels: session.levelsCompleted });

    return renderShell(
      <CelebrationOverlay
        title={completionMessage}
        score={session.sessionScore}
        maxScore={session.sessionMaxScore}
        onComplete={handleCelebrationComplete}
      />,
    );
  }

  return renderShell(
    <div className={styles.gameArea}>
      <LevelIndicator current={session.currentLevel} total={session.totalLevels} />
      <LevelPlay
        key={session.currentLevel}
        words={session.levelWords}
        ageTier={ageTier}
        lives={session.lives}
        maxLives={session.maxLives}
        onScorePoint={handleScorePoint}
        onRoundComplete={session.completeLevel}
        onLifeLost={session.loseLife}
        audioManager={audioManager}
      />
    </div>,
  );
}
