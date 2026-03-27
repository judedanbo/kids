import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import styles from './PauseMenu.module.css';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseMenu({ onResume, onRestart, onExit }: PauseMenuProps) {
  const { t } = useTranslation('common');
  const onResumeRef = useRef(onResume);
  onResumeRef.current = onResume;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onResumeRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <FocusTrap focusTrapOptions={{ fallbackFocus: '[role="dialog"]' }}>
      <div className={styles.backdrop}>
        <motion.div
          className={styles.menu}
          role="dialog"
          aria-modal="true"
          aria-label={t('pause.ariaLabel')}
          tabIndex={-1}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <div className={styles.title}>⏸ {t('pause.title')}</div>
          <div className={styles.buttons}>
            <button className={styles.resumeButton} onClick={onResume}>
              ▶ {t('pause.resume')}
            </button>
            <button className={styles.secondaryButton} onClick={onRestart}>
              ↺ {t('pause.restart')}
            </button>
            <button className={styles.secondaryButton} onClick={onExit}>
              🏠 {t('pause.exitToHub')}
            </button>
          </div>
        </motion.div>
      </div>
    </FocusTrap>
  );
}
