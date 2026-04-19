import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  showStars?: boolean;
  starCount?: number;
  animate?: boolean;
}

function AnimatedNumber({ value, animate }: { value: number; animate: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (animate && !shouldReduceMotion) {
      spring.set(value);
      return display.on('change', (v) => setDisplayValue(v));
    } else {
      setDisplayValue(value);
    }
  }, [value, animate, shouldReduceMotion, spring, display]);

  return <>{displayValue}</>;
}

export function ScoreDisplay({
  score,
  maxScore,
  showStars = false,
  starCount = 5,
  animate = true,
}: ScoreDisplayProps) {
  const filledStars = showStars && maxScore ? Math.round((score / maxScore) * starCount) : 0;

  let ariaLabel = `Score: ${score}`;
  if (maxScore) ariaLabel += ` out of ${maxScore}`;
  if (showStars) ariaLabel += `, ${filledStars} of ${starCount} stars`;

  return (
    <div className={styles.container} aria-label={ariaLabel} aria-live="polite">
      <motion.span className={styles.score}>
        <AnimatedNumber value={score} animate={animate} />
      </motion.span>

      {showStars && (
        <div className={styles.stars}>
          {Array.from({ length: starCount }, (_, i) => (
            <span
              key={i}
              className={`${styles.star} ${i < filledStars ? styles.starFilled : styles.starEmpty}`}
              role="img"
              aria-hidden="true"
            >
              ★
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
