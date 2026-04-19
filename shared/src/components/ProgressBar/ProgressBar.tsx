import type React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ current, total, color, showLabel = false, label }: ProgressBarProps) {
  const percentage = Math.min(Math.max((current / total) * 100, 0), 100);
  const displayLabel = label ?? `${current} of ${total}`;

  const style = color ? ({ '--progress-bar-color': color } as React.CSSProperties) : undefined;

  return (
    <div className={styles.container}>
      {showLabel && <div className={styles.label}>{displayLabel}</div>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={displayLabel}
        style={style}
      >
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
