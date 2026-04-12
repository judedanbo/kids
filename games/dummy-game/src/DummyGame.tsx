import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import styles from './DummyGame.module.css';

const TOTAL_ROUNDS = 5;

export function DummyGame({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [buttonState, setButtonState] = useState<'default' | 'correct'>('default');
  const startTimeRef = useRef(Date.now());

  const handleClick = useCallback(() => {
    if (round >= TOTAL_ROUNDS) return;

    const newRound = round + 1;
    const newScore = score + 1;

    setRound(newRound);
    setScore(newScore);
    setButtonState('correct');
    onScore(1);
    audioManager.playSFX('correct');

    // Reset button state after brief delay
    setTimeout(() => setButtonState('default'), 300);

    if (newRound >= TOTAL_ROUNDS) {
      setShowCelebration(true);
    }
  }, [round, score, onScore, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'dummy-game',
      score,
      maxScore: TOTAL_ROUNDS,
      timeSpent,
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: { clicks: score },
    };
    onComplete(result);
  }, [score, onComplete]);

  // Prevent stale ref
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  if (showCelebration) {
    return (
      <GameShell title="Click Counter" onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <CelebrationOverlay
          title="Amazing!"
          score={score}
          maxScore={TOTAL_ROUNDS}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  return (
    <GameShell title="Click Counter" onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
      <div className={styles.gameArea}>
        <ScoreDisplay score={score} maxScore={TOTAL_ROUNDS} showStars />
        <ProgressBar current={round} total={TOTAL_ROUNDS} showLabel />
        <div className={styles.buttonArea}>
          <OptionButton
            label={`Click me! (${round}/${TOTAL_ROUNDS})`}
            state={buttonState}
            onSelect={handleClick}
            size="large"
          />
        </div>
      </div>
    </GameShell>
  );
}
