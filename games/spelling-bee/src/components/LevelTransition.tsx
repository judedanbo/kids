import { useTranslation } from 'react-i18next';
import { OptionButton } from '@kids-games-zone/shared';
import type { AgeTier } from '@kids-games-zone/shared';
import styles from './LevelTransition.module.css';

interface LevelTransitionProps {
  levelCompleted: number;
  totalLevels: number;
  score: number;
  ageTier: AgeTier;
  onContinue: () => void;
}

export function LevelTransition({
  levelCompleted,
  totalLevels,
  score,
  ageTier,
  onContinue,
}: LevelTransitionProps) {
  const { t } = useTranslation('spelling-bee');

  const encourageKey =
    ageTier === 'tiny'
      ? 'levelEncourageTiny'
      : ageTier === 'junior'
        ? 'levelEncourageJunior'
        : 'levelEncourageExplorer';

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.star} aria-hidden="true">
        {'\u2B50'}
      </div>
      <h2 className={styles.title}>{t('levelComplete', { level: levelCompleted })}</h2>
      <p className={styles.score}>{t('scoreSoFar', { score })}</p>
      <p className={styles.encourage}>{t(encourageKey)}</p>
      <OptionButton label={t('nextLevel')} state="default" onSelect={onContinue} size="large" />
      <p className={styles.progress}>
        {t('levelOf', { current: levelCompleted + 1, total: totalLevels })}
      </p>
    </div>
  );
}
