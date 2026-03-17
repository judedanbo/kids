import { motion, useReducedMotion } from 'framer-motion';
import styles from './LetterTile.module.css';

interface LetterTileProps {
  letter: string;
  state: 'available' | 'placed' | 'correct' | 'incorrect';
  onClick: () => void;
  disabled?: boolean;
}

export function LetterTile({ letter, state, onClick, disabled = false }: LetterTileProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      className={`${styles.tile} ${styles[state]}`}
      onClick={onClick}
      disabled={disabled || state === 'placed'}
      layout={!shouldReduceMotion}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      aria-label={`Letter ${letter}`}
    >
      {letter.toUpperCase()}
    </motion.button>
  );
}
