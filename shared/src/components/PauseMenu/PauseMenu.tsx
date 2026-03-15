import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import styles from './PauseMenu.module.css';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseMenu({ onResume, onRestart, onExit }: PauseMenuProps) {
  const onResumeRef = useRef(onResume);
  onResumeRef.current = onResume;

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
          aria-label="Game paused"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.title}>⏸ Paused</div>
          <div className={styles.buttons}>
            <button className={styles.resumeButton} onClick={onResume}>
              ▶ Resume
            </button>
            <button className={styles.secondaryButton} onClick={onRestart}>
              ↺ Restart
            </button>
            <button className={styles.secondaryButton} onClick={onExit}>
              🏠 Exit to Hub
            </button>
          </div>
        </motion.div>
      </div>
    </FocusTrap>
  );
}
