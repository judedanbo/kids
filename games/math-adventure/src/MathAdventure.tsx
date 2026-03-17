import type { GameProps } from '@kids-games-zone/shared';
import { GameShell } from '@kids-games-zone/shared';
import styles from './MathAdventure.module.css';

export function MathAdventure({ onExit }: GameProps) {
  return (
    <GameShell title="Math Adventure" onBack={onExit}>
      <div className={styles.gameArea}>
        <p>Math Adventure — coming soon</p>
      </div>
    </GameShell>
  );
}
