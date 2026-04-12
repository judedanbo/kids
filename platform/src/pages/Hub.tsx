import { useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgeTier, FeatureFlagContext, IconImage } from '@kids-games-zone/shared';
import { usePlatform } from '../context/PlatformContext';
import { GameCard } from '../components/GameCard/GameCard';
import { getDailyChallenge } from '../services/dailyChallenge';
import type { GameManifest, SkillCategory } from '@kids-games-zone/shared';
import styles from './Hub.module.css';

export default function Hub() {
  const { state } = usePlatform();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const ageTier = useAgeTier();
  const { flags } = useContext(FeatureFlagContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const profile = state.currentProfile;

  // Filter games by age and feature flag (empty when no profile)
  const ageFilteredGames = useMemo(() => {
    if (!profile) return [];
    return state.gameRegistry.filter((game) => {
      const inAgeRange = game.ageRange[0] <= profile.age && profile.age <= game.ageRange[1];
      const flag = flags[`game.${game.id}`];
      const flagEnabled = !flag || flag.enabled;
      return inAgeRange && flagEnabled;
    });
  }, [profile, state.gameRegistry, flags]);

  // Get available skill categories from filtered games
  const skillCategories = useMemo(() => {
    const categories = new Set<string>();
    ageFilteredGames.forEach((game) => {
      game.skills.forEach((skill) => categories.add(skill));
    });
    return Array.from(categories);
  }, [ageFilteredGames]);

  // Apply search + skill filter
  const filteredGames = useMemo(() => {
    let games = ageFilteredGames;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      games = games.filter((game) =>
        game.name.toLowerCase().includes(query),
      );
    }

    if (activeFilter !== 'all') {
      games = games.filter((game) =>
        game.skills.includes(activeFilter as SkillCategory),
      );
    }

    return games;
  }, [ageFilteredGames, searchQuery, activeFilter]);

  // Recent games (last 3 played)
  const recentGames = useMemo(() => {
    if (!profile) return [];
    const progressEntries = Object.entries(profile.progress);
    if (progressEntries.length === 0) return [];

    return progressEntries
      .sort(([, a], [, b]) =>
        new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime(),
      )
      .slice(0, 3)
      .map(([gameId]) => state.gameRegistry.find((g) => g.id === gameId))
      .filter((g): g is GameManifest => g !== undefined);
  }, [profile, state.gameRegistry]);

  const showSearch = ageTier === 'junior' || ageTier === 'explorer';

  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyChallenge = useMemo(
    () => getDailyChallenge(todayStr, state.gameRegistry),
    [todayStr, state.gameRegistry],
  );

  // Redirect to profile if none selected — after all hooks
  if (!profile) {
    navigate('/profile');
    return null;
  }

  return (
    <div className={styles.hub}>
      <main>
      {/* Welcome header */}
      <header className={styles.header}>
        <h1 className={styles.welcome}>
          {t('hub.welcome', { name: profile.name })}
        </h1>
        {profile.stats.currentStreak >= 1 && (
          <div className={styles.streakBadge} aria-label={t('hub.streak', { count: profile.stats.currentStreak })}>
            <span className={styles.streakIcon}>
              <IconImage src="/images/ui/reward-super-streak.webp" alt="" fallback="🔥" size={28} />
            </span>
            {t('hub.streak', { count: profile.stats.currentStreak })}
          </div>
        )}
      </header>

      {/* Daily Challenge */}
      <div className={styles.challengeCard} role="region" aria-label={t('hub.dailyChallenge')}>
        <div className={styles.challengeHeader}>
          <span className={styles.challengeTitle}>{t('hub.dailyChallenge')}</span>
        </div>
        <p className={styles.challengeDescription}>{dailyChallenge.description}</p>
      </div>

      {/* Continue Playing */}
      {recentGames.length > 0 && (
        <section className={styles.section} aria-label={t('hub.continuePlaying')}>
          <h2 className={styles.sectionTitle}>{t('hub.continuePlaying')}</h2>
          <div className={styles.recentRow}>
            {recentGames.map((game) => (
              <GameCard
                key={game.id}
                manifest={game}
                progress={profile.progress[game.id]}
                isRecent
              />
            ))}
          </div>
        </section>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder={t('hub.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('hub.searchPlaceholder')}
          />
        </div>
      )}

      {/* Filter pills */}
      {skillCategories.length > 0 && (
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter('all')}
            aria-pressed={activeFilter === 'all'}
          >
            {t('hub.filterAll')}
          </button>
          {skillCategories.map((category) => (
            <button
              key={category}
              className={`${styles.filterPill} ${activeFilter === category ? styles.filterActive : ''}`}
              onClick={() => setActiveFilter(category)}
              aria-pressed={activeFilter === category}
            >
              {category.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Game grid */}
      <section aria-label="All Games">
        {filteredGames.length > 0 ? (
          <div className={styles.gameGrid}>
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                manifest={game}
                progress={profile.progress[game.id]}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{t('hub.noGamesFound')}</p>
          </div>
        )}
      </section>
      </main>
    </div>
  );
}
