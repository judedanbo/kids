import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { IconImage } from '@kids-games-zone/shared';
import styles from './RewardCard.module.css';
import type { Reward } from '@kids-games-zone/shared';

interface RewardCardProps {
  reward: Reward;
  unlocked: boolean;
  progress?: string;
}

export function RewardCard({ reward, unlocked, progress }: RewardCardProps) {
  const { t } = useTranslation('common');
  const formattedDate = reward.unlockedAt
    ? new Date(reward.unlockedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <motion.div
      className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300 }}
      role="article"
      aria-label={`${reward.name} — ${unlocked ? t('rewardCard.unlocked') : t('rewardCard.locked')}`}
    >
      <div className={styles.iconWrapper}>
        <span className={styles.icon}>
          {reward.iconSrc ? (
            <IconImage src={reward.iconSrc} alt="" fallback={reward.icon} size={72} />
          ) : (
            reward.icon
          )}
        </span>
        {!unlocked && (
          <span className={styles.lockOverlay} aria-hidden="true">
            <IconImage src="/images/ui/status-lock.webp" alt="" fallback="🔒" size={28} />
          </span>
        )}
      </div>
      <h3 className={styles.name}>{reward.name}</h3>
      <p className={styles.description}>{reward.description}</p>
      {unlocked && formattedDate && (
        <p className={styles.date}>{t('rewardCard.earned', { date: formattedDate })}</p>
      )}
      {!unlocked && progress && <p className={styles.progress}>{progress}</p>}
    </motion.div>
  );
}
