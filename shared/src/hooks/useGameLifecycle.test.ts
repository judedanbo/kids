import { renderHook, act } from '@testing-library/react';
import { useGameLifecycle } from './useGameLifecycle';
import type { GamePlugin, GameConfig, GameResult } from '../types';

function createMockPlugin(overrides?: Partial<GamePlugin>): GamePlugin {
  return {
    manifest: {
      id: 'test-game',
      name: 'Test',
      description: 'A test game',
      thumbnail: '/test.png',
      ageRange: [3, 12],
      skills: ['memory'],
      version: '1.0.0',
      entryPoint: '/games/test',
      minDifficulty: 1,
      maxDifficulty: 5,
      estimatedPlayTime: 5,
      offlineCapable: true,
      status: 'active',
      releaseDate: '2026-01-01',
      tags: [],
    },
    onLoad: vi.fn().mockResolvedValue(undefined),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onEnd: vi.fn().mockReturnValue({
      gameId: 'test-game',
      score: 100,
      maxScore: 100,
      timeSpent: 60,
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: {},
    } satisfies GameResult),
    onUnload: vi.fn(),
    GameComponent: () => null,
    ...overrides,
  };
}

const mockConfig: GameConfig = {
  difficulty: 1,
  profile: {
    id: 'p1',
    name: 'Test Kid',
    avatar: 'owl',
    age: 6,
    ageTier: 'junior',
    createdAt: '2026-01-01',
    parentPin: 'hashed',
    preferences: {
      musicVolume: 0.5,
      sfxVolume: 0.7,
      voiceVolume: 1,
      language: 'en',
      theme: 'default',
    },
    progress: {},
    rewards: [],
    stats: {
      totalPlayTime: 0,
      totalGamesPlayed: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedAt: '',
    },
    deletedAt: null,
  },
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    backgroundMusicEnabled: true,
    language: 'en',
    highContrastMode: false,
  },
};

describe('useGameLifecycle', () => {
  it('starts in IDLE state', () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    expect(result.current.state).toBe('IDLE');
  });

  it('transitions IDLE → LOADED on load()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    expect(plugin.onLoad).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('LOADED');
  });

  it('transitions LOADED → PLAYING on start()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    expect(plugin.onStart).toHaveBeenCalledWith(mockConfig);
    expect(result.current.state).toBe('PLAYING');
  });

  it('transitions PLAYING → PAUSED on pause()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.pause();
    });
    expect(plugin.onPause).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('PAUSED');
  });

  it('transitions PAUSED → PLAYING on resume()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.pause();
    });
    act(() => {
      result.current.resume();
    });
    expect(plugin.onResume).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('PLAYING');
  });

  it('transitions PLAYING → COMPLETED on end() and returns GameResult', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    let gameResult: GameResult | undefined;
    act(() => {
      gameResult = result.current.end();
    });
    expect(plugin.onEnd).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('COMPLETED');
    expect(gameResult?.score).toBe(100);
  });

  it('allows end() from PAUSED state', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.pause();
    });
    let gameResult: GameResult | undefined;
    act(() => {
      gameResult = result.current.end();
    });
    expect(result.current.state).toBe('COMPLETED');
    expect(gameResult?.score).toBe(100);
  });

  it('transitions COMPLETED → IDLE on reset()', async () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    await act(async () => {
      await result.current.load();
    });
    act(() => {
      result.current.start(mockConfig);
    });
    act(() => {
      result.current.end();
    });
    act(() => {
      result.current.reset();
    });
    expect(plugin.onUnload).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('IDLE');
  });

  it('ignores invalid transitions (pause when IDLE)', () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    act(() => {
      result.current.pause();
    });
    expect(plugin.onPause).not.toHaveBeenCalled();
    expect(result.current.state).toBe('IDLE');
  });

  it('ignores start when not LOADED', () => {
    const plugin = createMockPlugin();
    const { result } = renderHook(() => useGameLifecycle(plugin));
    act(() => {
      result.current.start(mockConfig);
    });
    expect(plugin.onStart).not.toHaveBeenCalled();
    expect(result.current.state).toBe('IDLE');
  });
});
