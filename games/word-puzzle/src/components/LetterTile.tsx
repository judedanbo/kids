import { type KeyboardEvent, type RefCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './LetterTile.module.css';

interface LetterTileProps {
  letter: string;
  state: 'available' | 'placed' | 'correct' | 'incorrect';
  onClick: () => void;
  disabled?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent) => void;
  refCallback?: RefCallback<HTMLElement>;
}

export function LetterTile({
  letter,
  state,
  onClick,
  disabled = false,
  tabIndex,
  onKeyDown,
  refCallback,
}: LetterTileProps) {
  const shouldReduceMotion = useReducedMotion();
  const isUsed = state === 'placed';
  return (
    <motion.button
      className={`${styles.tile} ${styles[state]}`}
      onClick={onClick}
      disabled={disabled || isUsed}
      layout={!shouldReduceMotion}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      aria-label={`Letter ${letter}${isUsed ? ', used' : ''}`}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      ref={refCallback}
    >
      {letter.toUpperCase()}
    </motion.button>
  );
}
