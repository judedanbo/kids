import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgeTier } from '@kids-games-zone/shared';
import { usePlatform } from '../context/PlatformContext';
import { GameCard } from '../components/GameCard/GameCard';
import type { GameManifest, SkillCategory } from '@kids-games-zone/shared';
import styles from './Hub.module.css';

export default function Hub() {
  const { state } = usePlatform();
  const navigate = useNavigate();
  const ageTier = useAgeTier();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const profile = state.currentProfile;

  // Filter games by age (empty when no profile)
  const ageFilteredGames = useMemo(() => {
    if (!profile) return [];
    return state.gameRegistry.filter(
      (game) => game.ageRange[0] <= profile.age && profile.age <= game.ageRange[1],
    );
  }, [profile, state.gameRegistry]);

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

  // Redirect to profile if none selected — after all hooks
  if (!profile) {
    navigate('/profile');
    return null;
  }

  return (
    <div className={styles.hub}>
      {/* Welcome header */}
      <header className={styles.header}>
        <h1 className={styles.welcome}>
          Welcome back, {profile.name}!
        </h1>
      </header>

      {/* Continue Playing */}
      {recentGames.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Continue Playing</h2>
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
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search games"
          />
        </div>
      )}

      {/* Filter pills */}
      {skillCategories.length > 0 && (
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          {skillCategories.map((category) => (
            <button
              key={category}
              className={`${styles.filterPill} ${activeFilter === category ? styles.filterActive : ''}`}
              onClick={() => setActiveFilter(category)}
            >
              {category.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Game grid */}
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
          <p>No games found! Try a different search or filter.</p>
        </div>
      )}
    </div>
  );
}
