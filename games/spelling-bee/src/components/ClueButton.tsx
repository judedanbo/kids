import { motion, useReducedMotion } from 'framer-motion';
import styles from './ClueButton.module.css';

interface ClueButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  ariaLabel?: string;
}

export function ClueButton({ label, icon, onClick, ariaLabel }: ClueButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      {label}
    </motion.button>
  );
}
