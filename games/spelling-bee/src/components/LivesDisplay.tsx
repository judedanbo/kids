import styles from './LivesDisplay.module.css';

interface LivesDisplayProps {
  lives: number;
  maxLives: number;
}

export function LivesDisplay({ lives, maxLives }: LivesDisplayProps) {
  return (
    <div className={styles.container} aria-label={`${lives} of ${maxLives} lives remaining`}>
      {Array.from({ length: maxLives }, (_, i) => (
        <span
          key={i}
          className={`${styles.heart} ${i < lives ? styles.alive : styles.lost}`}
          aria-hidden="true"
        >
          {i < lives ? '❤️' : '🖤'}
        </span>
      ))}
    </div>
  );
}
