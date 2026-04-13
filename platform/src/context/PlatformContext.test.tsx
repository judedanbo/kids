import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformProvider, usePlatform } from './PlatformContext';
import type { UserProfile } from '@kids-games-zone/shared';
import type { StorageManager, AudioManager } from '@kids-games-zone/shared';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-id',
    name: 'Test Kid',
    avatar: '🦊',
    age: 7,
    ageTier: 'junior',
    createdAt: new Date().toISOString(),
    parentPin: '',
    preferences: {
      musicVolume: 0.7,
      sfxVolume: 1,
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
    ...overrides,
  };
}

const mockStorage: StorageManager = {
  saveProfile: vi.fn().mockResolvedValue(undefined),
  loadProfile: vi.fn().mockResolvedValue(null),
  listProfiles: vi.fn().mockResolvedValue([]),
  listActiveProfiles: vi.fn().mockResolvedValue([]),
  softDeleteProfile: vi.fn().mockResolvedValue(undefined),
  restoreProfile: vi.fn().mockResolvedValue(undefined),
  purgeProfile: vi.fn().mockResolvedValue(undefined),
  resetProfileProgress: vi.fn().mockResolvedValue(undefined),
  saveProgress: vi.fn().mockResolvedValue(undefined),
  loadProgress: vi.fn().mockResolvedValue(null),
  saveCheckpoint: vi.fn().mockResolvedValue(undefined),
  loadCheckpoint: vi.fn().mockResolvedValue(null),
  unlockReward: vi.fn().mockResolvedValue(undefined),
  getRewards: vi.fn().mockResolvedValue([]),
  logEvent: vi.fn().mockResolvedValue(undefined),
  getEvents: vi.fn().mockResolvedValue([]),
};

const mockAudio: AudioManager = {
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
  pauseMusic: vi.fn(),
  resumeMusic: vi.fn(),
  playSFX: vi.fn(),
  playVoice: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  preload: vi.fn().mockResolvedValue(undefined),
  setLanguage: vi.fn(),
};

function TestConsumer() {
  const { state, dispatch } = usePlatform();
  return (
    <div>
      <div data-testid="profile-name">
        {state.currentProfile?.name ?? 'none'}
      </div>
      <div data-testid="profile-count">{state.profiles.length}</div>
      <button
        onClick={() =>
          dispatch({ type: 'ADD_PROFILE', payload: makeProfile({ name: 'Alice' }) })
        }
      >
        Add Profile
      </button>
      <button
        onClick={() =>
          dispatch({ type: 'SET_PROFILE', payload: makeProfile({ name: 'Bob' }) })
        }
      >
        Set Profile
      </button>
      <button onClick={() => dispatch({ type: 'START_SESSION', payload: { gameId: 'test' } })}>
        Start Session
      </button>
      <button onClick={() => dispatch({ type: 'END_SESSION' })}>End Session</button>
      <div data-testid="active-game">{state.session.activeGameId ?? 'none'}</div>
    </div>
  );
}

describe('PlatformContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial state with no profile', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    expect(screen.getByTestId('profile-name').textContent).toBe('none');
    expect(screen.getByTestId('profile-count').textContent).toBe('0');
  });

  it('handles ADD_PROFILE action', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    act(() => {
      screen.getByText('Add Profile').click();
    });

    expect(screen.getByTestId('profile-count').textContent).toBe('1');
  });

  it('handles SET_PROFILE action', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    act(() => {
      screen.getByText('Set Profile').click();
    });

    expect(screen.getByTestId('profile-name').textContent).toBe('Bob');
  });

  it('handles START_SESSION and END_SESSION', () => {
    render(
      <PlatformProvider
        storageManager={mockStorage}
        audioManager={mockAudio}
        gameRegistry={[]}
      >
        <TestConsumer />
      </PlatformProvider>,
    );

    act(() => {
      screen.getByText('Start Session').click();
    });
    expect(screen.getByTestId('active-game').textContent).toBe('test');

    act(() => {
      screen.getByText('End Session').click();
    });
    expect(screen.getByTestId('active-game').textContent).toBe('none');
  });
});
