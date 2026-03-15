import { useEffect, type ReactNode } from 'react';
import styles from './GameShell.module.css';

interface GameShellProps {
  title: string;
  onBack?: () => void;
  onPause?: () => void;
  showPauseButton?: boolean;
  children: ReactNode;
}

export function GameShell({
  title,
  onBack,
  onPause,
  showPauseButton = true,
  children,
}: GameShellProps) {
  useEffect(() => {
    if (!onPause) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onPause!();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPause]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {onBack ? (
          <button
            className={styles.backButton}
            onClick={onBack}
            aria-label="Go back"
          >
            ← Back
          </button>
        ) : (
          <div className={styles.placeholder} />
        )}

        <h1 className={styles.title}>{title}</h1>

        {showPauseButton && onPause ? (
          <button
            className={styles.pauseButton}
            onClick={onPause}
            aria-label="Pause game"
          >
            ⏸
          </button>
        ) : (
          <div className={styles.placeholder} />
        )}
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
