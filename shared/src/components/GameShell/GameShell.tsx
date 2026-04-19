import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipLink } from '../SkipLink/SkipLink';
import { Announcer } from '../Announcer/Announcer';
import type { AudioManager } from '../../types/services';
import styles from './GameShell.module.css';

interface GameShellProps {
  title: string;
  onBack?: () => void;
  onPause?: () => void;
  showPauseButton?: boolean;
  /**
   * When provided alongside `musicEnabled`, GameShell renders a music pause/play
   * toggle in the header and stops music when the back button is clicked.
   */
  audioManager?: AudioManager;
  /** Master toggle from platform settings. When false, the music button is hidden. */
  musicEnabled?: boolean;
  children: ReactNode;
}

export function GameShell({
  title,
  onBack,
  onPause,
  showPauseButton = true,
  audioManager,
  musicEnabled = false,
  children,
}: GameShellProps) {
  const { t } = useTranslation('common');
  const [musicPaused, setMusicPaused] = useState(false);

  const showMusicToggle = Boolean(audioManager) && musicEnabled;

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

  const handleBack = () => {
    if (audioManager) {
      audioManager.stopMusic({ fadeOut: 300 });
    }
    onBack?.();
  };

  const handleToggleMusic = () => {
    if (!audioManager) return;
    if (musicPaused) {
      audioManager.resumeMusic();
      setMusicPaused(false);
    } else {
      audioManager.pauseMusic();
      setMusicPaused(true);
    }
  };

  return (
    <Announcer>
      <div className={styles.shell}>
        <SkipLink targetId="game-content" label={t('gameShell.skipToGame')} />
        <header className={styles.header}>
          {onBack ? (
            <button
              className={styles.backButton}
              onClick={handleBack}
              aria-label={t('gameShell.goBack')}
            >
              ← Back
            </button>
          ) : (
            <div className={styles.placeholder} />
          )}

          <h1 className={styles.title}>{title}</h1>

          <div className={styles.headerActions}>
            {showMusicToggle && (
              <button
                type="button"
                className={styles.musicButton}
                onClick={handleToggleMusic}
                aria-pressed={musicPaused}
                aria-label={musicPaused ? t('gameShell.resumeMusic') : t('gameShell.pauseMusic')}
              >
                {musicPaused ? '▶' : '⏸'}
              </button>
            )}
            {showPauseButton && onPause ? (
              <button
                className={styles.pauseButton}
                onClick={onPause}
                aria-label={t('gameShell.pauseGame')}
              >
                ⏸
              </button>
            ) : !showMusicToggle ? (
              <div className={styles.placeholder} />
            ) : null}
          </div>
        </header>

        <main id="game-content" className={styles.content}>
          {children}
        </main>
      </div>
    </Announcer>
  );
}
