import { useState, useCallback, useEffect, useRef } from 'react';
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

  // typedRef tracks the latest value so the document keydown listener
  // below doesn't need to re-bind every keystroke.
  const typedRef = useRef(typed);
  typedRef.current = typed;

  const handleSubmit = useCallback(() => {
    if (typedRef.current.length === 0) return;
    onSubmit(typedRef.current);
    setTyped('');
  }, [onSubmit]);

  // Physical keyboard support for junior/explorer players. Ignores keypresses
  // while disabled (feedback phase), during IME composition, or when the
  // target is a form input elsewhere on the page.
  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
        return;
      }
      if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        handleKey(event.key.toUpperCase());
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleKey, handleBackspace, handleSubmit]);

  const typedStatus = `${t('keyboard.typedPrefix')}${typed || t('keyboard.typedEmpty')}`;

  return (
    <div className={styles.container}>
      <div className={styles.typedWord} aria-live="polite" aria-label={typedStatus}>
        {typed || <span className={styles.placeholder}>{t('keyboard.placeholder')}</span>}
      </div>

      <div className={styles.keyboard} role="group" aria-label={t('keyboard.groupLabel')}>
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
          <button
            className={`${styles.key} ${styles.actionKey}`}
            onClick={handleBackspace}
            disabled={disabled || typed.length === 0}
            aria-label={t('keyboard.backspace')}
          >
            ⌫
          </button>
          <button
            className={`${styles.key} ${styles.submitKey}`}
            onClick={handleSubmit}
            disabled={disabled || typed.length === 0}
            aria-label={t('keyboard.submit')}
          >
            {t('keyboard.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
