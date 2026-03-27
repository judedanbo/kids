import type { KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { IllustrationName } from '../utils/gridUtils';
import { CSSIllustration } from './CSSIllustration';
import styles from './Card.module.css';

export interface CardProps {
  illustration: IllustrationName;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled: boolean;
  size: number;
  index: number;
  totalCards: number;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent) => void;
  refCallback?: (el: HTMLElement | null) => void;
}

export function Card({
  illustration,
  isFlipped,
  isMatched,
  onClick,
  disabled,
  size,
  index,
  totalCards,
  tabIndex,
  onKeyDown,
  refCallback,
}: CardProps) {
  const shouldReduceMotion = useReducedMotion();

  // showFront: flip to 180deg to reveal the illustration
  const targetRotateY = isFlipped ? 180 : 0;
  const transitionDuration = shouldReduceMotion ? 0 : 0.4;

  let ariaLabel: string;
  if (isMatched) {
    ariaLabel = `${illustration}, matched`;
  } else if (isFlipped) {
    ariaLabel = `${illustration}, face up`;
  } else {
    ariaLabel = `Card ${index + 1} of ${totalCards}, face down`;
  }

  return (
    <div
      className={styles.cardWrapper}
      style={{ width: size, height: size, perspective: 800 }}
      role="gridcell"
    >
      <motion.button
        className={`${styles.cardButton} ${isMatched ? styles.cardMatched : ''}`}
        style={{ width: size, height: size }}
        animate={{ rotateY: targetRotateY }}
        transition={{ duration: transitionDuration, ease: 'easeInOut' }}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        ref={refCallback}
      >
        <div className={styles.cardInner}>
          <div className={`${styles.cardBack} ${isMatched ? styles.cardMatched : ''}`}>
            ?
          </div>
          <div className={`${styles.cardFront} ${isMatched ? styles.cardMatched : ''}`}>
            <CSSIllustration name={illustration} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}
