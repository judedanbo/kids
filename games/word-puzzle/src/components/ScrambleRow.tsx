import { type KeyboardEvent, type RefCallback } from 'react';
import { LetterTile } from './LetterTile';
import styles from './ScrambleRow.module.css';

interface LetterItemProps {
  tabIndex: number;
  onKeyDown: (e: KeyboardEvent) => void;
  ref: RefCallback<HTMLElement>;
}

interface ScrambleRowProps {
  letters: string[];
  placedIndices: Set<number>;
  onLetterClick: (index: number) => void;
  getLetterProps: (index: number) => LetterItemProps;
}

export function ScrambleRow({
  letters,
  placedIndices,
  onLetterClick,
  getLetterProps,
}: ScrambleRowProps) {
  return (
    <div className={styles.row} role="group" aria-label="Scrambled letters">
      {letters.map((letter, i) => {
        const { ref, tabIndex, onKeyDown } = getLetterProps(i);
        return (
          <LetterTile
            key={i}
            letter={letter}
            state={placedIndices.has(i) ? 'placed' : 'available'}
            onClick={() => onLetterClick(i)}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
            refCallback={ref}
          />
        );
      })}
    </div>
  );
}
