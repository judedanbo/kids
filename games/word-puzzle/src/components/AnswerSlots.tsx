import { motion, useReducedMotion } from 'framer-motion';
import styles from './AnswerSlots.module.css';

interface AnswerSlotsProps {
  slots: (string | null)[];
  state: 'default' | 'correct' | 'incorrect';
  onSlotClick: (index: number) => void;
}

export function AnswerSlots({ slots, state, onSlotClick }: AnswerSlotsProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div
      className={`${styles.row} ${state !== 'default' ? styles[state] : ''}`}
      role="group"
      aria-label="Your answer"
    >
      {slots.map((letter, i) => (
        <motion.button
          key={i}
          className={`${styles.slot} ${letter ? styles.filled : styles.empty}`}
          onClick={() => letter && onSlotClick(i)}
          disabled={!letter}
          layout={!shouldReduceMotion}
          aria-label={`Slot ${i + 1} of ${slots.length}${letter ? `, filled with letter ${letter}` : ', empty'}`}
        >
          {letter?.toUpperCase() ?? ''}
        </motion.button>
      ))}
    </div>
  );
}
