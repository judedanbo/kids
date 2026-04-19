import { useEffect, useId, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { OptionButton } from '@kids-games-zone/shared';
import styles from './GameOverOverlay.module.css';

interface GameOverOverlayProps {
  levelReached: number;
  score: number;
  maxScore: number;
  onRetry: () => void;
  onExit: () => void;
}

export function GameOverOverlay({
  levelReached,
  score,
  maxScore,
  onRetry,
  onExit,
}: GameOverOverlayProps) {
  const { t } = useTranslation('spelling-bee');
  const titleId = useId();
  const subtitleId = useId();
  const retryRef = useRef<HTMLButtonElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onExitRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <FocusTrap focusTrapOptions={{ fallbackFocus: '[role="dialog"]' }}>
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
      >
        <div className={styles.content}>
          <div className={styles.emoji} aria-hidden="true">
            {'\u{1F41D}'}
          </div>
          <h2 id={titleId} className={styles.title}>
            {t('gameOverTitle')}
          </h2>
          <p id={subtitleId} className={styles.subtitle}>
            {t('gameOverSubtitle', { level: levelReached })}
          </p>
          <p className={styles.score}>
            {score} / {maxScore}
          </p>
          <div className={styles.actions}>
            <OptionButton ref={retryRef} label={t('tryAgain')} size="large" onSelect={onRetry} />
            <OptionButton label={t('backToHome')} size="normal" onSelect={onExit} />
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
