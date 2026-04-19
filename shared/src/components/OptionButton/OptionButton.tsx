import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './OptionButton.module.css';

interface OptionButtonProps {
  label: string;
  icon?: ReactNode;
  state?: 'default' | 'correct' | 'incorrect';
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  size?: 'normal' | 'large';
}

export const OptionButton = forwardRef<HTMLButtonElement, OptionButtonProps>(function OptionButton(
  {
    label,
    icon,
    state = 'default',
    disabled = false,
    selected,
    onSelect,
    size = 'normal',
  },
  ref,
) {
  const shouldReduceMotion = useReducedMotion();

  const classNames = [
    styles.button,
    state !== 'default' ? styles[state] : '',
    size === 'large' ? styles.large : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (!disabled && onSelect) {
      onSelect();
    }
  }

  return (
    <motion.button
      ref={ref}
      className={classNames}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={selected}
      whileTap={
        !disabled && !shouldReduceMotion ? { scale: 0.95 } : undefined
      }
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {state === 'correct' && <span className={styles.stateIcon}>✓</span>}
      {state === 'incorrect' && <span className={styles.stateIcon}>✗</span>}
      {icon}
      {label}
    </motion.button>
  );
});
