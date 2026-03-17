import { GameShell } from '@kids-games-zone/shared';
import type { GameProps } from '@kids-games-zone/shared';
import styles from './MemoryMatch.module.css';

export function MemoryMatch({ onExit }: GameProps) {
  return (
    <GameShell title="Memory Match" onBack={onExit}>
      <div className={styles.gameArea}>
        <p>Memory Match coming soon!</p>
      </div>
    </GameShell>
  );
}
