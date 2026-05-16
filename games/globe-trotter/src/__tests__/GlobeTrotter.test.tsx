import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { GlobeTrotter } from '../GlobeTrotter';
import type { GameProps } from '@kids-games-zone/shared';

function createMockProps(overrides: Partial<GameProps> = {}): GameProps {
  return {
    config: {
      difficulty: 1,
      profile: {
        id: 'test',
        name: 'Test',
        avatar: '',
        age: 7,
        ageTier: 'junior',
        createdAt: new Date().toISOString(),
        parentPin: '',
        preferences: {
          musicVolume: 50,
          sfxVolume: 100,
          voiceVolume: 100,
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
    },
    onScore: vi.fn(),
    onComplete: vi.fn(),
    onExit: vi.fn(),
    audioManager: {
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
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

function createTinyProps(): GameProps {
  const props = createMockProps();
  return {
    ...props,
    config: {
      ...props.config,
      profile: { ...props.config.profile, age: 4, ageTier: 'tiny' },
    },
  };
}

describe('GlobeTrotter', () => {
  it('renders the game shell with title', () => {
    render(<GlobeTrotter {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows the instruction bubble initially', () => {
    render(<GlobeTrotter {...createMockProps()} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows the tiny instruction for the tiny tier', () => {
    render(<GlobeTrotter {...createTinyProps()} />);
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows answer options and a progress bar after starting', () => {
    render(<GlobeTrotter {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'answers' })).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows feedback and plays SFX after answering', () => {
    const props = createMockProps();
    render(<GlobeTrotter {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    const group = screen.getByRole('group', { name: 'answers' });
    fireEvent.click(within(group).getAllByRole('button')[0]);
    expect(screen.getByText('next')).toBeTruthy();
    expect(props.audioManager.playSFX).toHaveBeenCalled();
  });

  it('advances through multiple questions without completing early', () => {
    const props = createMockProps();
    render(<GlobeTrotter {...props} />);
    fireEvent.click(screen.getByText('letsGo'));

    for (let i = 0; i < 3; i++) {
      const group = screen.getByRole('group', { name: 'answers' });
      fireEvent.click(within(group).getAllByRole('button')[0]);
      expect(screen.getByText('next')).toBeTruthy();
      fireEvent.click(screen.getByText('next'));
    }

    expect(props.audioManager.playSFX).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('has no accessibility violations on the instruction screen', async () => {
    const { container } = render(<GlobeTrotter {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<GlobeTrotter {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
