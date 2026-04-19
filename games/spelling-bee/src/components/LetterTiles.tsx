import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './LetterTiles.module.css';

interface LetterTilesProps {
  letters: string[];
  wordLength: number;
  onSubmit: (answer: string) => void;
}

export function LetterTiles({ letters, wordLength, onSubmit }: LetterTilesProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const [selected, setSelected] = useState<number[]>([]);

  const currentAnswer = selected.map((i) => letters[i]).join('');
  const isFull = selected.length === wordLength;

  const handleTileTap = useCallback(
    (index: number) => {
      if (selected.includes(index)) return;
      if (selected.length >= wordLength) return;
      setSelected([...selected, index]);
      announce(letters[index]);
    },
    [selected, letters, wordLength, announce],
  );

  const handleUndo = useCallback(() => {
    setSelected((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (selected.length !== wordLength) return;
    const answer = selected.map((i) => letters[i]).join('');
    onSubmit(answer);
    setSelected([]);
  }, [selected, letters, wordLength, onSubmit]);

  useEffect(() => {
    if (isFull) {
      announce(t('readyToSubmit'));
    }
  }, [isFull, announce, t]);

  return (
    <div className={styles.container}>
      <div className={styles.answerSlots} aria-label="Your answer so far">
        {Array.from({ length: wordLength }, (_, i) => (
          <span key={i} className={styles.slot} aria-label={currentAnswer[i] ?? 'empty'}>
            {currentAnswer[i] ?? ''}
          </span>
        ))}
      </div>

      <div className={styles.tiles} role="group" aria-label="Letter tiles">
        {letters.map((letter, index) => (
          <button
            key={index}
            className={`${styles.tile} ${selected.includes(index) ? styles.used : ''}`}
            onClick={() => handleTileTap(index)}
            disabled={selected.includes(index)}
            aria-label={`Letter ${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        {selected.length > 0 && (
          <button className={styles.undoButton} onClick={handleUndo} aria-label="Undo last letter">
            {t('undoLetter')}
          </button>
        )}
        {isFull && (
          <button className={styles.submitButton} onClick={handleSubmit}>
            {t('submit')}
          </button>
        )}
      </div>
    </div>
  );
}
