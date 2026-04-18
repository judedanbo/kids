import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';
import styles from './WordDisplay.module.css';

interface WordDisplayProps {
  word: WordEntry;
  ageTier: AgeTier;
  audioManager: AudioManager;
}

export function WordDisplay({ word, ageTier, audioManager }: WordDisplayProps) {
  const { t } = useTranslation('spelling-bee');
  const isTiny = ageTier === 'tiny';
  const [showDefinition, setShowDefinition] = useState(false);
  const [showOrigin, setShowOrigin] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [word.word]);

  const handlePlayWord = useCallback(() => {
    audioManager.playVoice(`voice:word-${word.word}`);
  }, [audioManager, word.word]);

  const handleDefinition = useCallback(() => {
    setShowDefinition(true);
    if (word.definition) {
      audioManager.playVoice(`voice:def-${word.word}`);
    }
  }, [audioManager, word]);

  const handleOrigin = useCallback(() => {
    setShowOrigin(true);
  }, []);

  const handleSentence = useCallback(() => {
    setShowSentence(true);
    if (word.sentence) {
      audioManager.playVoice(`voice:sentence-${word.word}`);
    }
  }, [audioManager, word]);

  return (
    <div className={styles.container}>
      {isTiny && word.image && !imageError && (
        <img
          src={`/images/spelling-bee/${word.image}`}
          alt={word.word}
          className={styles.wordImage}
          onError={() => setImageError(true)}
        />
      )}

      {isTiny && (!word.image || imageError) && (
        <div
          className={styles.imageFallback}
          role="img"
          aria-label={t('imageFallbackLabel')}
        >
          <span aria-hidden="true">🐝</span>
        </div>
      )}

      <button className={styles.playButton} onClick={handlePlayWord} aria-label={t('playWord')}>
        🔊 {t('hearWord')}
      </button>

      {!isTiny && (
        <div className={styles.clueButtons}>
          <button className={styles.clueButton} onClick={handleDefinition} aria-label={t('getDefinition')}>
            {t('definition')}
          </button>
          <button className={styles.clueButton} onClick={handleOrigin} aria-label={t('getOrigin')}>
            {t('origin')}
          </button>
          <button className={styles.clueButton} onClick={handleSentence} aria-label={t('getSentence')}>
            {t('sentence')}
          </button>
        </div>
      )}

      {showDefinition && word.definition && (
        <p className={styles.clueText} aria-live="polite">{word.definition}</p>
      )}
      {showOrigin && word.origin && (
        <p className={styles.clueText} aria-live="polite">{t('originLabel', { origin: word.origin })}</p>
      )}
      {showSentence && word.sentence && (
        <p className={styles.clueText} aria-live="polite">{word.sentence}</p>
      )}
    </div>
  );
}
