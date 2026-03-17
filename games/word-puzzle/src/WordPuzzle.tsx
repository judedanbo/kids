import { GameShell } from '@kids-games-zone/shared';
import type { GameProps } from '@kids-games-zone/shared';
import styles from './WordPuzzle.module.css';

export function WordPuzzle({ onExit }: GameProps) {
  return (
    <GameShell title="Word Puzzle" onBack={onExit}>
      <div className={styles.gameArea}>
        <p>Word Puzzle coming soon!</p>
      </div>
    </GameShell>
  );
}
