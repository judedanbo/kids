import { useEffect, useRef, useState } from 'react';
import styles from './GameTimer.module.css';

interface GameTimerProps {
  mode: 'countdown' | 'countup';
  duration?: number;
  paused?: boolean;
  onExpire?: () => void;
  onTick?: (seconds: number) => void;
  size?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function GameTimer({
  mode,
  duration = 0,
  paused = false,
  onExpire,
  onTick,
  size = 80,
}: GameTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  onExpireRef.current = onExpire;
  onTickRef.current = onTick;

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;

        if (mode === 'countdown' && next >= duration) {
          clearInterval(intervalRef.current);
          onExpireRef.current?.();
          return duration;
        }

        onTickRef.current?.(mode === 'countdown' ? duration - next : next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, mode, duration]);

  const displaySeconds =
    mode === 'countdown' ? Math.max(duration - elapsed, 0) : elapsed;
  const remaining = mode === 'countdown' ? duration - elapsed : 0;
  const isWarning = mode === 'countdown' && remaining <= 10 && remaining > 0;

  // SVG ring calculations
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress =
    mode === 'countdown'
      ? elapsed / duration
      : duration > 0
        ? Math.min(elapsed / duration, 1)
        : 0;
  const dashOffset = circumference * (1 - progress);

  const ariaLabel =
    mode === 'countdown'
      ? `${formatTime(displaySeconds)} remaining`
      : `${formatTime(displaySeconds)} elapsed`;

  return (
    <div className={styles.container} aria-label={ariaLabel} role="timer">
      <svg width={size} height={size} className={styles.ring}>
        <circle
          className={styles.trackCircle}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`${styles.progressCircle} ${isWarning ? styles.warning : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <text
          className={styles.time}
          x={size / 2}
          y={size / 2}
          fontSize={size * 0.25}
        >
          {formatTime(displaySeconds)}
        </text>
      </svg>
    </div>
  );
}
