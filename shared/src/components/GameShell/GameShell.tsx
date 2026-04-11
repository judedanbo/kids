import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipLink } from '../SkipLink/SkipLink';
import { Announcer } from '../Announcer/Announcer';
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
  const { t } = useTranslation('common');
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
    <Announcer>
      <div className={styles.shell}>
        <SkipLink targetId="game-content" label={t('gameShell.skipToGame')} />
        <header className={styles.header}>
          {onBack ? (
            <button
              className={styles.backButton}
              onClick={onBack}
              aria-label={t('gameShell.goBack')}
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
              aria-label={t('gameShell.pauseGame')}
            >
              ⏸
            </button>
          ) : (
            <div className={styles.placeholder} />
          )}
        </header>

        <main id="game-content" className={styles.content}>
          {children}
        </main>
      </div>
    </Announcer>
  );
}
