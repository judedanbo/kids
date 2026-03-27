import { useTranslation } from 'react-i18next';
import { usePlatform } from '../context/PlatformContext';
import { REWARD_CATALOG } from '../config/rewardCatalog';
import { getRewardProgress } from '../services/rewards';
import { RewardCard } from '../components/RewardCard/RewardCard';
import styles from './Rewards.module.css';

export function Rewards() {
  const { state } = usePlatform();
  const { t } = useTranslation('common');
  const profile = state.currentProfile;

  const unlockedIds = new Set(profile?.rewards.map((r) => r.id) ?? []);
  const unlockedCount = unlockedIds.size;
  const totalCount = REWARD_CATALOG.length;

  if (!profile) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏆</div>
          <h2 className={styles.emptyTitle}>{t('rewards.noProfile')}</h2>
          <p className={styles.emptyText}>{t('rewards.selectProfile')}</p>
        </div>
      </main>
    );
  }

  if (totalCount === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🌟</div>
          <h2 className={styles.emptyTitle}>{t('rewards.comingSoon')}</h2>
          <p className={styles.emptyText}>{t('rewards.keepPlaying')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('rewards.title')}</h1>
        <span className={styles.badge}>
          {t('rewards.unlocked', { count: unlockedCount, total: totalCount })}
        </span>
      </div>

      {unlockedCount === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h2 className={styles.emptyTitle}>{t('rewards.startCollection')}</h2>
          <p className={styles.emptyText}>
            {t('rewards.playToEarn')}
          </p>
        </div>
      )}

      <ul aria-label="Your rewards" className={styles.grid}>
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
