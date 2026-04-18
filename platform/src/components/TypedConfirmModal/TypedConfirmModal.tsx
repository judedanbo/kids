import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TypedConfirmModal.module.css';

interface TypedConfirmModalProps {
  title: string;
  description: ReactNode;
  /** The exact string (case-insensitive match) the user must type. */
  expected: string;
  /** Label for the destructive confirm button. */
  confirmLabel: string;
  /** Optional extra warning line shown below the description. */
  warning?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TypedConfirmModal({
  title,
  description,
  expected,
  confirmLabel,
  warning,
  onConfirm,
  onCancel,
}: TypedConfirmModalProps) {
  const { t } = useTranslation('common');
  const [value, setValue] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = value.trim().toLowerCase() === expected.trim().toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (matches) onConfirm();
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${inputId}-title`}
    >
      <div className={styles.card}>
        <h2 id={`${inputId}-title`} className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{description}</p>
        {warning && <p className={styles.warning}>{warning}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor={inputId}>
            {t('typedConfirm.typeToConfirm', { expected })}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className={styles.input}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              {t('typedConfirm.cancel')}
            </button>
            <button type="submit" className={styles.confirmBtn} disabled={!matches}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
