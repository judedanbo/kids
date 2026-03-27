import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../context/PlatformContext';
import { AdultGate } from '../components/AdultGate';
import { PinEntry } from '../components/PinEntry';
import type { AnalyticsEvent } from '@kids-games-zone/shared';
import styles from './ParentalDashboard.module.css';

type GateState = 'adult_gate' | 'pin_entry' | 'dashboard';

export default function ParentalDashboard() {
  const navigate = useNavigate();
  const { state, dispatch, storageManager } = usePlatform();
  const profile = state.currentProfile;

  const [gateState, setGateState] = useState<GateState>('adult_gate');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  // Load events once authenticated
  useEffect(() => {
    if (gateState !== 'dashboard' || !profile) return;

    storageManager
      .getEvents({ profileId: profile.id })
      .then(setEvents)
      .catch((err) => console.warn('[ParentalDashboard] Failed to load events:', err));
  }, [gateState, profile, storageManager]);

  const handleCancel = () => navigate('/settings');

  if (!profile) {
    navigate('/profile');
    return null;
  }

  if (gateState === 'adult_gate') {
    return <AdultGate onVerified={() => setGateState('pin_entry')} onCancel={handleCancel} />;
  }

  if (gateState === 'pin_entry') {
    if (!profile.parentPin) {
      // No PIN set — skip directly to dashboard
      setGateState('dashboard');
      return null;
    }
    return (
      <PinEntry
        storedHash={profile.parentPin}
        onSuccess={() => setGateState('dashboard')}
        onCancel={handleCancel}
      />
    );
  }

  return <Dashboard profile={profile} events={events} dispatch={dispatch} storageManager={storageManager} navigate={navigate} />;
}

// --- Dashboard sub-component ---

function Dashboard({
  profile,
  events,
  dispatch,
  storageManager,
  navigate,
}: {
  profile: NonNullable<ReturnType<typeof usePlatform>['state']['currentProfile']>;
  events: AnalyticsEvent[];
  dispatch: ReturnType<typeof usePlatform>['dispatch'];
  storageManager: ReturnType<typeof usePlatform>['storageManager'];
  navigate: ReturnType<typeof useNavigate>;
}) {
  // Activity summary
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const gameEndEvents = useMemo(
    () => events.filter((e) => e.type === 'game_end'),
    [events],
  );

  const todayGames = useMemo(
    () => gameEndEvents.filter((e) => e.timestamp.startsWith(today)),
    [gameEndEvents, today],
  );

  const weekGames = useMemo(
    () => gameEndEvents.filter((e) => e.timestamp >= weekAgo),
    [gameEndEvents, weekAgo],
  );

  // Play time by day (last 7 days)
  const dailyPlayTime = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    for (const event of gameEndEvents) {
      const day = event.timestamp.slice(0, 10);
      if (day in days) {
        days[day] += (event.data.timeSpent as number) || 0;
      }
    }
    return Object.entries(days);
  }, [gameEndEvents]);

  const maxTime = Math.max(...dailyPlayTime.map(([, t]) => t), 1);

  // Game progress table
  const gameProgress = Object.values(profile.progress);

  const handleResetProgress = (gameId: string) => {
    const resetProgress = {
      gameId,
      highScore: 0,
      currentLevel: 1,
      maxLevelReached: 1,
      totalAttempts: 0,
      totalTimePlayed: 0,
      lastPlayedAt: '',
      difficulty: 1,
    };
    dispatch({
      type: 'UPDATE_PROGRESS',
      payload: { profileId: profile.id, gameId, progress: resetProgress },
    });
    storageManager.saveProgress(profile.id, gameId, resetProgress);
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Parental Dashboard</h1>
        <p className={styles.subtitle}>{profile.name}&apos;s Activity</p>
        <button className={styles.backBtn} onClick={() => navigate('/settings')}>
          Back to Settings
        </button>
      </header>

      {/* Activity Summary */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Activity Summary</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{todayGames.length}</span>
            <span className={styles.statLabel}>Games Today</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{weekGames.length}</span>
            <span className={styles.statLabel}>Games This Week</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {Math.round(profile.stats.totalPlayTime / 60)}m
            </span>
            <span className={styles.statLabel}>Total Play Time</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{profile.stats.currentStreak}</span>
            <span className={styles.statLabel}>Current Streak</span>
          </div>
        </div>
      </section>

      {/* Play Time Chart */}
      <section className={styles.section} aria-label="Play time over the last 7 days">
        <h2 className={styles.sectionTitle}>Play Time (Last 7 Days)</h2>
        <div className={styles.chart}>
          {dailyPlayTime.map(([day, time]) => (
            <div key={day} className={styles.chartBar}>
              <div
                className={styles.bar}
                style={{ height: `${(time / maxTime) * 100}%` }}
                aria-label={`${Math.round(time / 60)} minutes on ${day}`}
              />
              <span className={styles.chartLabel}>
                {new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Game Progress Table */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Game Progress</h2>
        {gameProgress.length === 0 ? (
          <p className={styles.empty}>No games played yet.</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Game</th>
                  <th scope="col">High Score</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Difficulty</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gameProgress.map((gp) => (
                  <tr key={gp.gameId}>
                    <td>{gp.gameId}</td>
                    <td>{gp.highScore}</td>
                    <td>{gp.totalAttempts}</td>
                    <td>{gp.difficulty} / 5</td>
                    <td>
                      <button
                        className={styles.resetBtn}
                        onClick={() => handleResetProgress(gp.gameId)}
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
