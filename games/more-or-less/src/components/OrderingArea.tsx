import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './OrderingArea.module.css';

interface OrderingAreaProps {
  values: number[];
  displayValues: string[];
  onSubmit: (orderedValues: number[]) => void;
  disabled?: boolean;
}

export function OrderingArea({ values, displayValues, onSubmit, disabled = false }: OrderingAreaProps) {
  const { t } = useTranslation('more-or-less');
  const announce = useAnnounce();
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);

  const handleTap = useCallback(
    (index: number) => {
      if (disabled || selectedOrder.includes(index)) return;

      const next = [...selectedOrder, index];
      setSelectedOrder(next);
      announce(`Placed ${displayValues[index]} at position ${next.length}`);

      if (next.length === values.length) {
        const orderedValues = next.map((i) => values[i]);
        onSubmit(orderedValues);
        setSelectedOrder([]);
      }
    },
    [disabled, selectedOrder, values, displayValues, onSubmit, announce],
  );

  const handleUndo = useCallback(() => {
    setSelectedOrder((prev) => prev.slice(0, -1));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedOrder([]);
  }, []);

  return (
    <div className={styles.container}>
      <p className={styles.hint}>{t('orderHint')}</p>

      <div className={styles.slots} aria-label="Your order so far">
        {Array.from({ length: values.length }, (_, i) => (
          <span key={i} className={styles.slot}>
            {selectedOrder[i] !== undefined ? displayValues[selectedOrder[i]] : '?'}
          </span>
        ))}
      </div>

      <div className={styles.cards} role="group" aria-label="Numbers to order">
        {displayValues.map((display, index) => (
          <button
            key={index}
            className={`${styles.card} ${selectedOrder.includes(index) ? styles.used : ''}`}
            onClick={() => handleTap(index)}
            disabled={disabled || selectedOrder.includes(index)}
            aria-label={`${display}${selectedOrder.includes(index) ? ' (already placed)' : ''}`}
          >
            {display}
          </button>
        ))}
      </div>

      {selectedOrder.length > 0 && (
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={handleUndo} disabled={disabled}>
            ← {t('undo')}
          </button>
          <button className={styles.actionButton} onClick={handleReset} disabled={disabled}>
            ↻ {t('reset')}
          </button>
        </div>
      )}
    </div>
  );
}
