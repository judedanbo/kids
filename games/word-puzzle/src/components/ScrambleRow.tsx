import { LetterTile } from './LetterTile';
import styles from './ScrambleRow.module.css';

interface ScrambleRowProps {
  letters: string[];
  placedIndices: Set<number>;
  onLetterClick: (index: number) => void;
}

export function ScrambleRow({ letters, placedIndices, onLetterClick }: ScrambleRowProps) {
  return (
    <div className={styles.row} role="group" aria-label="Scrambled letters">
      {letters.map((letter, i) => (
        <LetterTile
          key={i}
          letter={letter}
          state={placedIndices.has(i) ? 'placed' : 'available'}
          onClick={() => onLetterClick(i)}
        />
      ))}
    </div>
  );
}
