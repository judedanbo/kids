import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameLifecycle } from '@kids-games-zone/shared';
import { usePlatform } from '../context/PlatformContext';
import { loadGame } from '../services/gameLoader';
import { evaluateRewards } from '../services/rewards';
import { calculateNextDifficulty } from '../services/difficulty';
import { updateStreak } from '../services/streaks';
import { checkTimeLimit } from '../services/timeLimit';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { LoadingSpinner } from '../components/LoadingSpinner/LoadingSpinner';
import { RewardCelebration } from '../components/RewardCelebration/RewardCelebration';
import type { GamePlugin, GameResult, GameConfig, Reward } from '@kids-games-zone/shared';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds
const TIME_CHECK_INTERVAL = 30_000; // 30 seconds

/**
 * Inner component that renders once the plugin is loaded.
 * This allows useGameLifecycle to be called unconditionally.
 */
function GameSession({
  plugin,
  gameId,
}: {
  plugin: GamePlugin;
  gameId: string;
}) {
  const navigate = useNavigate();
  const { state, dispatch, storageManager, audioManager } = usePlatform();
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [newlyUnlockedRewards, setNewlyUnlockedRewards] = useState<Reward[]>([]);
  const [celebrationDone, setCelebrationDone] = useState(false);
  const [timeLimitMessage, setTimeLimitMessage] = useState<string | null>(null);
  const checkpointRef = useRef<unknown>(null);
  const sessionStartRef = useRef(Date.now());

  const manifest = state.gameRegistry.find((g) => g.id === gameId);
  const profile = state.currentProfile;

  const lifecycle = useGameLifecycle(plugin);

  // Start session and game lifecycle
  useEffect(() => {
    if (!manifest || !profile) return;
    if (lifecycle.state !== 'IDLE') return;

    dispatch({ type: 'START_SESSION', payload: { gameId: manifest.id } });

    async function startGame() {
      await lifecycle.load();

      const config: GameConfig = {
        difficulty: profile!.progress[manifest!.id]?.difficulty ?? 1,
        profile: profile!,
        settings: {
          soundEnabled: profile!.preferences.sfxVolume > 0,
          musicEnabled: profile!.preferences.musicVolume > 0,
          language: profile!.preferences.language,
          highContrastMode: false,
        },
      };

      lifecycle.start(config);
    }

    startGame();
  }, [lifecycle, manifest, profile, dispatch]);

  // Visibility change: pause/resume
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        lifecycle.pause();
      } else {
        lifecycle.resume();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [lifecycle]);

  // Auto-save checkpoint every 30 seconds
  useEffect(() => {
    if (lifecycle.state !== 'PLAYING' || !profile || !gameId) return;

    const interval = setInterval(() => {
      if (checkpointRef.current) {
        storageManager
          .saveCheckpoint(profile.id, gameId, checkpointRef.current)
          .catch((err: unknown) => console.warn('[GameWrapper] Checkpoint save failed:', err));
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [lifecycle.state, profile, gameId, storageManager]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      dispatch({ type: 'END_SESSION' });
    };
  }, [dispatch]);

  // Time limit enforcement
  useEffect(() => {
    if (lifecycle.state !== 'PLAYING' || completed) return;

    const timeLimits = state.settings.timeLimits;
    if (!timeLimits.enabled) return;

    const dailyAccumulated = (profile?.stats.totalPlayTime ?? 0) / 60; // convert seconds to minutes

    const check = () => {
      const status = checkTimeLimit(timeLimits, sessionStartRef.current, dailyAccumulated);
      if (status === 'limit_reached') {
        lifecycle.pause();
        setTimeLimitMessage('Great playing today! Time for a break.');
      } else if (status === 'reminder') {
        setTimeLimitMessage('Almost time to take a break!');
      }
    };

    check();
    const interval = setInterval(check, TIME_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [lifecycle, completed, state.settings.timeLimits, profile?.stats.totalPlayTime]);

  const handleScore = useCallback((points: number) => {
    setScore((prev) => prev + points);
  }, []);

  const handleComplete = useCallback(
    (result: GameResult) => {
      if (!profile || !gameId) return;

      setCompleted(true);

      const existingProgress = profile.progress[gameId];

      // Update recent scores (ring buffer, max 5)
      const prevScores = existingProgress?.recentScores ?? [];
      const recentScores = [
        ...prevScores.slice(-4),
        { score: result.score, maxScore: result.maxScore },
      ];

      // Calculate next difficulty based on recent performance
      const nextDifficulty = calculateNextDifficulty(recentScores, result.difficulty);

      const updatedGameProgress = {
        gameId,
        highScore: Math.max(result.score, existingProgress?.highScore ?? 0),
        currentLevel: result.difficulty,
        maxLevelReached: Math.max(
          result.difficulty,
          existingProgress?.maxLevelReached ?? 0,
        ),
        totalAttempts: (existingProgress?.totalAttempts ?? 0) + 1,
        totalTimePlayed:
          (existingProgress?.totalTimePlayed ?? 0) + result.timeSpent,
        lastPlayedAt: new Date().toISOString(),
        difficulty: nextDifficulty,
        recentScores,
      };

      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          profileId: profile.id,
          gameId,
          progress: updatedGameProgress,
        },
      });

      storageManager.saveProgress(profile.id, gameId, updatedGameProgress);

      // Update streak
      const streakResult = updateStreak(
        profile.stats.currentStreak,
        profile.stats.longestStreak,
        profile.stats.lastPlayedAt,
      );
      dispatch({
        type: 'UPDATE_STATS',
        payload: {
          profileId: profile.id,
          stats: {
            currentStreak: streakResult.currentStreak,
            longestStreak: streakResult.longestStreak,
            totalGamesPlayed: profile.stats.totalGamesPlayed + 1,
            totalPlayTime: profile.stats.totalPlayTime + result.timeSpent,
            lastPlayedAt: new Date().toISOString(),
          },
        },
      });

      storageManager.logEvent({
        id: globalThis.crypto.randomUUID(),
        type: 'game_end',
        profileId: profile.id,
        gameId,
        timestamp: new Date().toISOString(),
        data: {
          score: result.score,
          maxScore: result.maxScore,
          timeSpent: result.timeSpent,
        },
      });

      // Evaluate rewards with updated progress snapshot
      const updatedProfile: typeof profile = {
        ...profile,
        progress: { ...profile.progress, [gameId]: updatedGameProgress },
        stats: {
          ...profile.stats,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          totalGamesPlayed: profile.stats.totalGamesPlayed + 1,
          totalPlayTime: profile.stats.totalPlayTime + result.timeSpent,
          lastPlayedAt: new Date().toISOString(),
        },
      };

      const rewards = evaluateRewards(updatedProfile, result, state.gameRegistry);
      if (rewards.length > 0) {
        setNewlyUnlockedRewards(rewards);
        for (const reward of rewards) {
          dispatch({ type: 'UNLOCK_REWARD', payload: { profileId: profile.id, reward } });
          storageManager.unlockReward(profile.id, reward);
          storageManager.logEvent({
            id: globalThis.crypto.randomUUID(),
            type: 'reward_unlocked',
            profileId: profile.id,
            gameId,
            timestamp: new Date().toISOString(),
            data: { rewardId: reward.id, rewardName: reward.name },
          });
        }
      }
    },
    [profile, gameId, dispatch, storageManager, state.gameRegistry],
  );

  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (!profile) {
    return <LoadingSpinner />;
  }

  // Time limit reached — show friendly pause message
  if (timeLimitMessage && checkTimeLimit(state.settings.timeLimits, sessionStartRef.current, (profile.stats.totalPlayTime ?? 0) / 60) === 'limit_reached') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: '1rem',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <span style={{ fontSize: '4rem' }}>🌟</span>
        <h2 style={{ fontFamily: 'var(--font-family-display)', color: 'var(--color-primary)' }}>
          {timeLimitMessage}
        </h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            borderRadius: 'var(--radius-medium)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  // Reward celebration before completion screen
  if (completed && newlyUnlockedRewards.length > 0 && !celebrationDone) {
    return (
      <RewardCelebration
        rewards={newlyUnlockedRewards}
        onComplete={() => setCelebrationDone(true)}
      />
    );
  }

  // Completed state
  if (completed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: '1rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-family-display)', color: 'var(--color-primary)' }}>
          Great job!
        </h2>
        <p style={{ fontSize: '1.25rem' }}>Score: {score}</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              setCompleted(false);
              setScore(0);
              // Re-trigger by reloading the page for simplicity
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-medium)',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-medium)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Game is active
  const GameComponent = plugin.GameComponent;

  return (
    <GameErrorBoundary onGoHome={() => navigate('/')} onRetry={() => window.location.reload()}>
      {timeLimitMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px 16px',
            backgroundColor: 'var(--color-warning, #ff9800)',
            color: 'white',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.9rem',
            zIndex: 999,
          }}
          role="alert"
        >
          {timeLimitMessage}
        </div>
      )}
      <GameComponent
        config={{
          difficulty: profile.progress[gameId]?.difficulty ?? 1,
          profile,
          settings: {
            soundEnabled: profile.preferences.sfxVolume > 0,
            musicEnabled: profile.preferences.musicVolume > 0,
            language: profile.preferences.language,
            highContrastMode: false,
          },
        }}
        onScore={handleScore}
        onComplete={handleComplete}
        onExit={handleExit}
        audioManager={audioManager}
        storageManager={storageManager}
      />
    </GameErrorBoundary>
  );
}

export default function GameWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state } = usePlatform();
  const [plugin, setPlugin] = useState<GamePlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find manifest in registry
  const manifest = state.gameRegistry.find((g) => g.id === gameId);

  // Load game plugin
  useEffect(() => {
    if (!manifest) {
      setLoading(false);
      setError('Game not found');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const loadedPlugin = await loadGame(manifest!);
        if (!cancelled) {
          setPlugin(loadedPlugin);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[GameWrapper] Failed to load game:', err);
          setError('Failed to load game');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: '1rem',
          textAlign: 'center',
        }}
      >
        <h2>{error}</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            borderRadius: 'var(--radius-medium)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  // Loading state
  if (loading || !plugin) {
    return <LoadingSpinner />;
  }

  return <GameSession plugin={plugin} gameId={gameId!} />;
}
