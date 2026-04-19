import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipLink } from '../SkipLink/SkipLink';
import { Announcer } from '../Announcer/Announcer';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import type { AudioManager } from '../../types/services';
import styles from './GameShell.module.css';

interface GameShellProps {
  title: string;
  onBack?: () => void;
  onPause?: () => void;
  showPauseButton?: boolean;
  /**
   * When provided alongside `musicEnabled`, GameShell renders a music pause/play
   * toggle in the header and stops music when the user confirms exiting.
   */
  audioManager?: AudioManager;
  /** Master toggle from platform settings. When false, the music button is hidden. */
  musicEnabled?: boolean;
  /** Skip the back-button confirmation dialog and fire onBack directly. Default: false. */
  disableBackConfirm?: boolean;
  children: ReactNode;
}

export function GameShell({
  title,
  onBack,
  onPause,
  showPauseButton = true,
  audioManager,
  musicEnabled = false,
  disableBackConfirm = false,
  children,
}: GameShellProps) {
  const { t } = useTranslation('common');
  const [musicPaused, setMusicPaused] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const handleBackClick = () => {
    if (disableBackConfirm) {
      onBack?.();
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    audioManager?.stopMusic({ fadeOut: 300 });
    onBack?.();
  };

  const handleCancelExit = () => {
    setConfirmOpen(false);
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
              onClick={handleBackClick}
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

        <ConfirmDialog
          open={confirmOpen}
          title={t('backConfirm.title')}
          message={t('backConfirm.message')}
          confirmLabel={t('backConfirm.confirm')}
          cancelLabel={t('backConfirm.cancel')}
          tone="danger"
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
        />
      </div>
    </Announcer>
  );
}
