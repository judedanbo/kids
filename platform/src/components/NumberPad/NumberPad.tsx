import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './NumberPad.module.css';

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function NumberPad({ onDigit, onDelete, disabled = false }: NumberPadProps) {
  const { t } = useTranslation('common');
  const handlePress = useCallback(
    (key: string) => {
      if (disabled) return;
      if (key === 'del') {
        onDelete();
      } else if (key !== '') {
        onDigit(key);
      }
    },
    [onDigit, onDelete, disabled],
  );

  return (
    <div className={styles.grid} role="group" aria-label={t('numberPad.label')}>
      {DIGITS.map((key, i) => {
        if (key === '') {
          return <div key={i} className={styles.spacer} />;
        }
        return (
          <button
            key={key}
            className={`${styles.key} ${key === 'del' ? styles.deleteKey : ''}`}
            onClick={() => handlePress(key)}
            disabled={disabled}
            aria-label={key === 'del' ? t('numberPad.delete') : key}
            type="button"
          >
            {key === 'del' ? '\u232B' : key}
          </button>
        );
      })}
    </div>
  );
}
