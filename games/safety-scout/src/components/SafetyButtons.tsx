import { useTranslation } from 'react-i18next';
import styles from './SafetyButtons.module.css';

interface SafetyButtonsProps {
  onSafe: () => void;
  onHarmful: () => void;
  disabled?: boolean;
  large?: boolean;
}

export function SafetyButtons({ onSafe, onHarmful, disabled = false, large = false }: SafetyButtonsProps) {
  const { t } = useTranslation('safety-scout');

  return (
    <div className={styles.container} role="group" aria-label={t('safeOrHarmful')}>
      <button
        className={`${styles.button} ${styles.safe} ${large ? styles.large : ''}`}
        onClick={onSafe}
        disabled={disabled}
        aria-label={t('safe')}
      >
        ✅ {t('safe')}
      </button>
      <button
        className={`${styles.button} ${styles.harmful} ${large ? styles.large : ''}`}
        onClick={onHarmful}
        disabled={disabled}
        aria-label={t('harmful')}
      >
        ❌ {t('harmful')}
      </button>
    </div>
  );
}
