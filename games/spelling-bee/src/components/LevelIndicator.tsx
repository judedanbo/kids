import { useTranslation } from 'react-i18next';
import styles from './LevelIndicator.module.css';

interface LevelIndicatorProps {
  current: number;
  total: number;
}

export function LevelIndicator({ current, total }: LevelIndicatorProps) {
  const { t } = useTranslation('spelling-bee');

  return (
    <div className={styles.indicator} aria-label={t('levelOf', { current, total })}>
      <span className={styles.label}>{t('levelOf', { current, total })}</span>
    </div>
  );
}
