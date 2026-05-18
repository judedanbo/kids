import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '../context/PlatformContext';
import { AdultGate } from '../components/AdultGate';
import { PinEntry } from '../components/PinEntry';
import { TypedConfirmModal } from '../components/TypedConfirmModal';
import { ParentalConfig } from '../components/ParentalConfig/ParentalConfig';
import { useConfigOverrides } from '../context/ConfigOverrideContext';
import { removeProfileOverrides } from '../config/overrides/store';
import type { AnalyticsEvent, UserProfile, GameProgress } from '@kids-games-zone/shared';
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

  return (
    <Dashboard
      profile={profile}
      events={events}
      dispatch={dispatch}
      storageManager={storageManager}
      navigate={navigate}
    />
  );
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
  const { t } = useTranslation('common');
  const { state } = usePlatform();
  const { setStore: setConfigStore } = useConfigOverrides();
  const allProfiles = state.profiles;
  const [tab, setTab] = useState<'activity' | 'config' | 'profiles'>('activity');
  // Activity summary
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const gameEndEvents = useMemo(() => events.filter((e) => e.type === 'game_end'), [events]);

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
  const gameProgress = Object.values<GameProgress>(profile.progress);

  // --- Profile management ---
  // Reset and restore use window.confirm (non-destructive / reversible).
  // Delete and permanent delete use TypedConfirmModal (require typing name).
  type PendingAction =
    | { kind: 'delete'; profile: UserProfile }
    | { kind: 'purge'; profile: UserProfile }
    | null;

  const [pending, setPending] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function formatLastPlayed(iso: string): string {
    if (!iso) return t('parental.profiles.never');
    const d = new Date(iso);
    return d.toLocaleDateString();
  }

  async function handleReset(p: UserProfile) {
    const ok = window.confirm(
      t('parental.profiles.confirmResetTitle', { name: p.name }) +
        '\n\n' +
        t('parental.profiles.confirmResetBody'),
    );
    if (!ok) return;
    setActionError(null);
    try {
      await storageManager.resetProfileProgress(p.id);
      dispatch({ type: 'RESET_PROFILE_PROGRESS', payload: { profileId: p.id } });
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handleRestore(p: UserProfile) {
    const ok = window.confirm(
      t('parental.profiles.confirmRestoreTitle', { name: p.name }) +
        '\n\n' +
        t('parental.profiles.confirmRestoreBody', { name: p.name }),
    );
    if (!ok) return;
    setActionError(null);
    try {
      await storageManager.restoreProfile(p.id);
      dispatch({ type: 'RESTORE_PROFILE', payload: { profileId: p.id } });
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    setActionError(null);
    const { kind, profile: p } = pending;
    try {
      if (kind === 'delete') {
        await storageManager.softDeleteProfile(p.id);
        dispatch({ type: 'SOFT_DELETE_PROFILE', payload: { profileId: p.id } });
      } else {
        await storageManager.purgeProfile(p.id);
        dispatch({ type: 'PURGE_PROFILE', payload: { profileId: p.id } });
        setConfigStore((prev) => removeProfileOverrides(prev, p.id));
      }
      setPending(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

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
        <h1 className={styles.title}>{t('parental.title')}</h1>
        <p className={styles.subtitle}>{t('parental.activity', { name: profile.name })}</p>
        <button className={styles.backBtn} onClick={() => navigate('/settings')}>
          {t('parental.backToSettings')}
        </button>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={t('parental.title')}>
        {(['activity', 'config', 'profiles'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`parental-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`parental-panel-${id}`}
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
          >
            {t(`parental.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        <div role="tabpanel" id="parental-panel-activity" aria-labelledby="parental-tab-activity">
      {/* Activity Summary */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('parental.activitySummary')}</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{todayGames.length}</span>
            <span className={styles.statLabel}>{t('parental.gamesToday')}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{weekGames.length}</span>
            <span className={styles.statLabel}>{t('parental.gamesThisWeek')}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {Math.round(profile.stats.totalPlayTime / 60)}m
            </span>
            <span className={styles.statLabel}>{t('parental.totalPlayTime')}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{profile.stats.currentStreak}</span>
            <span className={styles.statLabel}>{t('parental.currentStreak')}</span>
          </div>
        </div>
      </section>

      {/* Play Time Chart */}
      <section className={styles.section} aria-label="Play time over the last 7 days">
        <h2 className={styles.sectionTitle}>{t('parental.playTimeLast7Days')}</h2>
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
        <h2 className={styles.sectionTitle}>{t('parental.gameProgress')}</h2>
        {gameProgress.length === 0 ? (
          <p className={styles.empty}>{t('parental.noGamesYet')}</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('parental.headerGame')}</th>
                  <th scope="col">{t('parental.headerHighScore')}</th>
                  <th scope="col">{t('parental.headerAttempts')}</th>
                  <th scope="col">{t('parental.headerDifficulty')}</th>
                  <th scope="col">{t('parental.headerActions')}</th>
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
                        {t('parental.reset')}
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
      )}

      {tab === 'config' && (
        <div role="tabpanel" id="parental-panel-config" aria-labelledby="parental-tab-config">
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('parental.config.title')}</h2>
            <ParentalConfig />
          </section>
        </div>
      )}

      {tab === 'profiles' && (
        <div
          role="tabpanel"
          id="parental-panel-profiles"
          aria-labelledby="parental-tab-profiles"
        >
      {/* Profiles */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('parental.profiles.title')}</h2>
        {actionError && <p className={styles.error}>{actionError}</p>}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('parental.profiles.headerProfile')}</th>
                <th scope="col">{t('parental.profiles.headerStatus')}</th>
                <th scope="col">{t('parental.profiles.headerLastPlayed')}</th>
                <th scope="col">{t('parental.profiles.headerActions')}</th>
              </tr>
            </thead>
            <tbody>
              {allProfiles.map((p) => {
                const isDeleted = p.deletedAt !== null;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.profileRow}>
                        <span className={styles.profileAvatar}>{p.avatar}</span>
                        <span className={styles.profileName}>{p.name}</span>
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          isDeleted ? styles.statusDeleted : styles.statusActive
                        }`}
                      >
                        {isDeleted
                          ? t('parental.profiles.statusDeleted')
                          : t('parental.profiles.statusActive')}
                      </span>
                    </td>
                    <td>{isDeleted ? '—' : formatLastPlayed(p.stats.lastPlayedAt)}</td>
                    <td>
                      <div className={styles.profileActions}>
                        {!isDeleted && (
                          <>
                            <button onClick={() => handleReset(p)}>
                              {t('parental.profiles.resetProgress')}
                            </button>
                            <button
                              className={styles.dangerBtn}
                              onClick={() => setPending({ kind: 'delete', profile: p })}
                            >
                              {t('parental.profiles.delete')}
                            </button>
                          </>
                        )}
                        {isDeleted && (
                          <>
                            <button onClick={() => handleRestore(p)}>
                              {t('parental.profiles.restore')}
                            </button>
                            <button
                              className={styles.dangerBtn}
                              onClick={() => setPending({ kind: 'purge', profile: p })}
                            >
                              {t('parental.profiles.deletePermanently')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
        </div>
      )}

      {/* Typed-confirmation modals for destructive actions */}
      {pending?.kind === 'delete' && (
        <TypedConfirmModal
          title={t('parental.profiles.confirmDeleteTitle', { name: pending.profile.name })}
          description={t('parental.profiles.confirmDeleteBody', { name: pending.profile.name })}
          expected={pending.profile.name}
          confirmLabel={t('parental.profiles.confirmDeleteAction')}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'purge' && (
        <TypedConfirmModal
          title={t('parental.profiles.confirmPurgeTitle', { name: pending.profile.name })}
          description={t('parental.profiles.confirmPurgeBody', { name: pending.profile.name })}
          warning={t('parental.profiles.confirmPurgeWarning')}
          expected={pending.profile.name}
          confirmLabel={t('parental.profiles.confirmPurgeAction')}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
