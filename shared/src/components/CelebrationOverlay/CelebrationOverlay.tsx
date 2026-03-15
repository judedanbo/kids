import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import styles from './CelebrationOverlay.module.css';

interface CelebrationOverlayProps {
  type?: 'confetti' | 'stars';
  duration?: number;
  onComplete?: () => void;
  title?: string;
  score?: number;
  maxScore?: number;
  intensity?: 'low' | 'medium' | 'high';
}

const PARTICLE_COUNTS = { low: 50, medium: 100, high: 200 } as const;

export function CelebrationOverlay({
  type = 'confetti',
  duration = 3000,
  onComplete,
  title,
  score,
  maxScore,
  intensity = 'medium',
}: CelebrationOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  // Fire confetti on mount
  useEffect(() => {
    if (shouldReduceMotion) return;

    const particleCount = PARTICLE_COUNTS[intensity];

    if (type === 'stars') {
      confetti({
        particleCount,
        spread: 100,
        shapes: ['star'],
        colors: ['#FFD700', '#FF8C42', '#4A90D9'],
      });
    } else {
      confetti({
        particleCount,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    return () => {
      confetti.reset();
    };
  }, [shouldReduceMotion, type, intensity]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      className={styles.overlay}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      role="status"
      aria-live="polite"
    >
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        {score !== undefined && maxScore !== undefined && (
          <div className={styles.score}>
            Score: {score} / {maxScore}
          </div>
        )}
      </div>
    </motion.div>
  );
}
