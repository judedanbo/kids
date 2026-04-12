import { IconImage } from '@kids-games-zone/shared';
import styles from './LivesDisplay.module.css';

interface LivesDisplayProps {
  lives: number;
  maxLives: number;
}

export function LivesDisplay({ lives, maxLives }: LivesDisplayProps) {
  return (
    <div className={styles.container} role="img" aria-label={`${lives} of ${maxLives} lives remaining`}>
      {Array.from({ length: maxLives }, (_, i) => {
        const alive = i < lives;
        return (
          <span
            key={i}
            className={`${styles.heart} ${alive ? styles.alive : styles.lost}`}
            aria-hidden="true"
          >
            <IconImage
              src={alive
                ? '/images/games/spelling-bee/heart-full.webp'
                : '/images/games/spelling-bee/heart-empty.webp'}
              alt=""
              fallback={alive ? '❤️' : '🖤'}
              size={28}
            />
          </span>
        );
      })}
    </div>
  );
}
