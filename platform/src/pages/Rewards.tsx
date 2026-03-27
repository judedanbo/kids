import { usePlatform } from '../context/PlatformContext';
import { REWARD_CATALOG } from '../config/rewardCatalog';
import { getRewardProgress } from '../services/rewards';
import { RewardCard } from '../components/RewardCard/RewardCard';
import styles from './Rewards.module.css';

export function Rewards() {
  const { state } = usePlatform();
  const profile = state.currentProfile;

  const unlockedIds = new Set(profile?.rewards.map((r) => r.id) ?? []);
  const unlockedCount = unlockedIds.size;
  const totalCount = REWARD_CATALOG.length;

  if (!profile) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏆</div>
          <h2 className={styles.emptyTitle}>No profile selected</h2>
          <p className={styles.emptyText}>Select a profile to see your rewards!</p>
        </div>
      </main>
    );
  }

  if (totalCount === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🌟</div>
          <h2 className={styles.emptyTitle}>Rewards coming soon!</h2>
          <p className={styles.emptyText}>Keep playing to earn awesome rewards.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Rewards</h1>
        <span className={styles.badge}>
          {unlockedCount} / {totalCount} unlocked
        </span>
      </div>

      {unlockedCount === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h2 className={styles.emptyTitle}>Start your collection!</h2>
          <p className={styles.emptyText}>
            Play games to earn stars, badges, and special rewards.
          </p>
        </div>
      )}

      <ul role="list" aria-label="Your rewards" className={styles.grid}>
        {REWARD_CATALOG.map((reward) => {
          const unlocked = unlockedIds.has(reward.id);
          const matchedReward = unlocked
            ? profile.rewards.find((r) => r.id === reward.id) ?? reward
            : reward;
          const progress = unlocked
            ? undefined
            : getRewardProgress(reward, profile, state.gameRegistry);

          return (
            <li key={reward.id}>
              <RewardCard
                reward={matchedReward}
                unlocked={unlocked}
                progress={progress}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
