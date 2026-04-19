import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './Keyboard.module.css';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface KeyboardProps {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function Keyboard({ onSubmit, disabled = false }: KeyboardProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const [typed, setTyped] = useState('');

  const handleKey = useCallback(
    (letter: string) => {
      if (disabled) return;
      setTyped((prev) => prev + letter);
      announce(letter);
    },
    [disabled, announce],
  );

  const handleBackspace = useCallback(() => {
    setTyped((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (typed.length === 0) return;
    onSubmit(typed);
    setTyped('');
  }, [typed, onSubmit]);

  return (
    <div className={styles.container}>
      <div className={styles.typedWord} aria-live="polite" aria-label={`Typed: ${typed || 'nothing yet'}`}>
        {typed || <span className={styles.placeholder}>{t('typePlaceholder')}</span>}
      </div>

      <div className={styles.keyboard} role="group" aria-label="On-screen keyboard">
        {ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className={styles.row}>
            {row.map((letter) => (
              <button
                key={letter}
                className={styles.key}
                onClick={() => handleKey(letter)}
                disabled={disabled}
                aria-label={letter}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          <button className={`${styles.key} ${styles.actionKey}`} onClick={handleBackspace} disabled={disabled || typed.length === 0} aria-label="Backspace">
            ⌫
          </button>
          <button className={`${styles.key} ${styles.submitKey}`} onClick={handleSubmit} disabled={disabled || typed.length === 0} aria-label="Submit answer">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
