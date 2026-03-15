import type React from 'react';
import styles from './DifficultySelector.module.css';

interface DifficultySelectorProps {
  levels?: number;
  current: number;
  onChange: (level: number) => void;
  labels?: string[];
}

export function DifficultySelector({
  levels = 5,
  current,
  onChange,
  labels,
}: DifficultySelectorProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = current >= levels ? 1 : current + 1;
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = current <= 1 ? levels : current - 1;
      onChange(prev);
    }
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.stars}
        role="radiogroup"
        aria-label="Difficulty level"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: levels }, (_, i) => {
          const level = i + 1;
          const filled = level <= current;
          return (
            <span
              key={level}
              className={`${styles.star} ${filled ? styles.starFilled : styles.starEmpty}`}
              role="radio"
              tabIndex={level === current ? 0 : -1}
              aria-checked={level === current}
              aria-label={`Level ${level}${labels ? `: ${labels[i]}` : ''}`}
              onClick={() => onChange(level)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(level);
                }
              }}
            >
              ★
            </span>
          );
        })}
      </div>
      {labels && labels[current - 1] && (
        <span className={styles.label}>{labels[current - 1]}</span>
      )}
    </div>
  );
}
