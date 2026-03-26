import { motion } from 'framer-motion';
import styles from './RewardCard.module.css';
import type { Reward } from '@kids-games-zone/shared';

interface RewardCardProps {
  reward: Reward;
  unlocked: boolean;
  progress?: string;
}

export function RewardCard({ reward, unlocked, progress }: RewardCardProps) {
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
      aria-label={`${reward.name} — ${unlocked ? 'Unlocked' : 'Locked'}`}
    >
      <div className={styles.iconWrapper}>
        <span className={styles.icon}>{reward.icon}</span>
        {!unlocked && <span className={styles.lockOverlay} aria-hidden="true">🔒</span>}
      </div>
      <h3 className={styles.name}>{reward.name}</h3>
      <p className={styles.description}>{reward.description}</p>
      {unlocked && formattedDate && (
        <p className={styles.date}>Earned {formattedDate}</p>
      )}
      {!unlocked && progress && (
        <p className={styles.progress}>{progress}</p>
      )}
    </motion.div>
  );
}
