import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  useAnnounce,
} from '@kids-games-zone/shared';
import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import { scrambleWithDistractors } from '../utils/letterScrambler';
import { useSpellingRound } from '../hooks/useSpellingRound';
import { LetterTiles } from './LetterTiles';
import { Keyboard } from './Keyboard';
import { WordDisplay } from './WordDisplay';
import { LivesDisplay } from './LivesDisplay';
import type { WordEntry } from '../utils/wordSelector';
import styles from './LevelPlay.module.css';

interface LevelPlayProps {
  words: WordEntry[];
  ageTier: AgeTier;
  lives: number;
  maxLives: number;
  onScorePoint: (points: number) => void;
  onLifeLost: () => void;
  onRoundComplete: (wordsCorrect: number, wordsAttempted: number) => void;
  audioManager: AudioManager;
}

export function LevelPlay({
  words,
  ageTier,
  lives,
  maxLives,
  onScorePoint,
  onLifeLost,
  onRoundComplete,
  audioManager,
}: LevelPlayProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const isTiny = ageTier === 'tiny';

  const round = useSpellingRound({
    words,
    ageTier,
    onScorePoint,
    lives,
    onLifeLost,
    onRoundComplete,
  });

  const tiles = useMemo(
    () => (isTiny && round.currentWord ? scrambleWithDistractors(round.currentWord.word, 3) : []),
    [isTiny, round.currentWord],
  );

  // Guard against React StrictMode's double-invoked effects firing
  // audioManager.playVoice twice. Keyed on phase+word so real transitions
  // (new word, re-entering 'playing' for another word) still fire audio.
  // Test coverage for this is deliberately deferred — a direct StrictMode
  // test triggers a latent setTimeout leak in the shared Announcer
  // component that crashes jsdom teardown. Fixing Announcer is tracked
  // separately.
  const lastPlayedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (round.phase !== 'playing' || !round.currentWord) return;
    const key = `playing:${round.currentWord.word}`;
    if (lastPlayedKeyRef.current === key) return;
    lastPlayedKeyRef.current = key;
    audioManager.playVoice(`voice:word-${round.currentWord.word}`);
    announce(t('wordOf', { current: round.currentWordIndex + 1, total: words.length }));
  }, [round.phase, round.currentWordIndex, round.currentWord, audioManager, announce, t, words.length]);

  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) audioManager.playVoice('voice:encouragement-correct');
    } else {
      audioManager.playSFX('incorrect');
      if (isTiny) audioManager.playVoice('voice:encouragement-tryagain');
    }
  }, [round.phase, round.isCorrect, audioManager, isTiny]);

  if (round.phase === 'complete' || !round.currentWord) {
    return null;
  }

  const showFeedback = round.phase === 'feedback';

  return (
    <div className={styles.playArea}>
      <div className={styles.topBar}>
        <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
        {!isTiny && <LivesDisplay lives={lives} maxLives={maxLives} />}
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
  );
}
