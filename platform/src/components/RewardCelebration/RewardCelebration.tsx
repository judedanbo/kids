import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CelebrationOverlay } from '@kids-games-zone/shared';
import type { Reward } from '@kids-games-zone/shared';
import styles from './RewardCelebration.module.css';

interface RewardCelebrationProps {
  rewards: Reward[];
  onComplete: () => void;
}

export function RewardCelebration({ rewards, onComplete }: RewardCelebrationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (rewards.length === 0) {
      onComplete();
    }
  }, [rewards.length, onComplete]);

  const handleOverlayComplete = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= rewards.length) {
      onComplete();
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, rewards.length, onComplete]);

  if (rewards.length === 0) return null;

  const reward = rewards[currentIndex];

  return (
    <div className={styles.container} role="alert" aria-label="Reward unlocked">
      <CelebrationOverlay type="stars" duration={3000} onComplete={handleOverlayComplete} />
      <AnimatePresence mode="wait">
        <motion.div
          key={reward.id}
          className={styles.rewardDisplay}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.icon}>{reward.icon}</div>
          <h2 className={styles.name}>{reward.name}</h2>
          <p className={styles.description}>{reward.description}</p>
          <p className={styles.counter}>
            {currentIndex + 1} / {rewards.length}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
