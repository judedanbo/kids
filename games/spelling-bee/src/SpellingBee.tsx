import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  CelebrationOverlay,
  InstructionBubble,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult, AgeTier } from '@kids-games-zone/shared';
import { useSessionLevels } from './hooks/useSessionLevels';
import { LevelPlay } from './components/LevelPlay';
import { LevelIndicator } from './components/LevelIndicator';
import { LevelTransition } from './components/LevelTransition';
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

export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('spelling-bee');
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const wordPool = useMemo(() => getWordPool(ageTier), [ageTier]);

  const session = useSessionLevels({
    startingDifficulty: config.difficulty,
    ageTier,
    wordPool,
  });

  const handleScorePoint = useCallback(
    (points: number) => {
      onScore(points);
      session.addScore(points);
    },
    [onScore, session.addScore],
  );

  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:game-bgm', { loop: true, fadeIn: 1000 });
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

  if (session.sessionPhase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character={'\u{1F41D}'} />
          <OptionButton label={t('letsGo')} state="default" onSelect={session.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  if (session.sessionPhase === 'level-transition') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <LevelTransition
          levelCompleted={session.currentLevel}
          totalLevels={session.totalLevels}
          score={session.sessionScore}
          ageTier={ageTier}
          onContinue={session.startNextLevel}
        />
      </GameShell>
    );
  }

  if (session.sessionPhase === 'complete') {
    const completionMessage =
      session.levelsCompleted >= session.totalLevels
        ? t('sessionComplete', { levels: session.levelsCompleted })
        : t('reachedLevel', { level: session.levelsCompleted });

    return (
      <GameShell title={t('title')} onBack={onExit}>
        <CelebrationOverlay
          title={completionMessage}
          score={session.sessionScore}
          maxScore={session.sessionMaxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <LevelIndicator current={session.currentLevel} total={session.totalLevels} />
        <LevelPlay
          key={session.currentLevel}
          words={session.levelWords}
          ageTier={ageTier}
          lives={session.lives}
          maxLives={session.maxLives}
          onScorePoint={handleScorePoint}
          onLifeLost={session.loseLife}
          onRoundComplete={session.completeLevel}
          audioManager={audioManager}
        />
      </div>
    </GameShell>
  );
}
