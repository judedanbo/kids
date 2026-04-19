import type { AgeTier } from '@kids-games-zone/shared';
import styles from './ExplanationCard.module.css';

interface ExplanationCardProps {
  explanation: string;
  isCorrect: boolean;
  ageTier: AgeTier;
}

export function ExplanationCard({ explanation, isCorrect, ageTier }: ExplanationCardProps) {
  const isTiny = ageTier === 'tiny';

  return (
    <div
      className={`${styles.container} ${isCorrect ? styles.correct : styles.incorrect}`}
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">
        {isCorrect ? '🎉' : '💡'}
      </span>
      <p className={`${styles.text} ${isTiny ? styles.textLarge : ''}`}>{explanation}</p>
    </div>
  );
}
