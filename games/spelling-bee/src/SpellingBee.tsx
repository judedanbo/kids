import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import type { GameProps, GameResult, AgeTier } from '@kids-games-zone/shared';
import { selectWords } from './utils/wordSelector';
import { scrambleWithDistractors } from './utils/letterScrambler';
import { useSpellingRound } from './hooks/useSpellingRound';
import { LetterTiles } from './components/LetterTiles';
import { Keyboard } from './components/Keyboard';
import { WordDisplay } from './components/WordDisplay';
import { LivesDisplay } from './components/LivesDisplay';
import wordsTiny from './data/words-tiny.json';
import wordsJunior from './data/words-junior.json';
import wordsExplorer from './data/words-explorer.json';
import styles from './SpellingBee.module.css';

const WORDS_PER_ROUND_TINY = 8;
const WORDS_PER_ROUND_OTHER = 15;

function getWordPool(ageTier: AgeTier) {
  switch (ageTier) {
    case 'tiny': return wordsTiny;
    case 'junior': return wordsJunior;
    case 'explorer': return wordsExplorer;
  }
}

export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const wordCount = isTiny ? WORDS_PER_ROUND_TINY : WORDS_PER_ROUND_OTHER;

  const words = useMemo(
    () => selectWords(getWordPool(ageTier), { difficulty: config.difficulty, count: wordCount }),
    [ageTier, config.difficulty, wordCount],
  );

  const round = useSpellingRound({ words, ageTier, onScorePoint: onScore });

  const tiles = useMemo(
    () => (isTiny ? scrambleWithDistractors(round.currentWord.word, 3) : []),
    [isTiny, round.currentWord.word],
  );

  useEffect(() => {
    if (round.phase === 'playing') {
      audioManager.playVoice(`voice:word-${round.currentWord.word}`);
      announce(t('wordOf', { current: round.currentWordIndex + 1, total: words.length }));
    }
  }, [round.phase, round.currentWordIndex, round.currentWord.word, audioManager, announce, t, words.length]);

  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-correct');
      }
    } else {
      audioManager.playSFX('incorrect');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-tryagain');
      }
    }
  }, [round.phase, round.isCorrect, audioManager, isTiny]);

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
      score: round.score,
      maxScore: round.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        wordsCorrect: round.wordsCorrect,
        wordsTotal: words.length,
        livesRemaining: round.lives,
      },
    };
    onComplete(result);
  }, [round, words.length, config.difficulty, onComplete]);

  if (round.phase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character="🐝" />
          <OptionButton label={t('letsGo')} state="default" onSelect={round.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  if (round.phase === 'complete') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
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
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
          {!isTiny && <LivesDisplay lives={round.lives} maxLives={round.maxLives} />}
        </div>

        <ProgressBar current={round.currentWordIndex} total={words.length} showLabel />

        <WordDisplay word={round.currentWord} ageTier={ageTier} audioManager={audioManager} />

        {!showFeedback && isTiny && (
          <LetterTiles letters={tiles} wordLength={round.currentWord.word.length} onSubmit={round.submitAnswer} />
        )}

        {!showFeedback && !isTiny && (
          <Keyboard onSubmit={round.submitAnswer} />
        )}

        {showFeedback && (
          <div className={styles.feedbackArea} aria-live="assertive">
            <p className={round.isCorrect ? styles.correctText : styles.incorrectText}>
              {round.isCorrect
                ? t('correct')
                : isTiny
                  ? t('incorrectTiny')
                  : t('incorrect', { word: round.currentWord.word })}
            </p>
            <OptionButton label={t('nextWord')} state="default" onSelect={round.nextWord} size="large" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
