import { useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import styles from './ConfirmDialog.module.css';

const CANCEL_BUTTON_SELECTOR = '[data-confirm-dialog-cancel="true"]';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 'danger' styles the confirm button for destructive actions. */
  tone?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'default',
}: ConfirmDialogProps) {
  const titleId = useId();
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancelRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const confirmClass =
    tone === 'danger'
      ? `${styles.confirmButton} ${styles.danger}`
      : styles.confirmButton;

  return (
    <FocusTrap
      focusTrapOptions={{
        fallbackFocus: '[role="dialog"]',
        initialFocus: CANCEL_BUTTON_SELECTOR,
      }}
    >
      <div className={styles.backdrop} onClick={onCancel}>
        <motion.div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.message}>{message}</p>
          <div className={styles.buttons}>
            <button type="button" className={confirmClass} onClick={onConfirm}>
              {confirmLabel}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              data-confirm-dialog-cancel="true"
            >
              {cancelLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </FocusTrap>
  );
}
