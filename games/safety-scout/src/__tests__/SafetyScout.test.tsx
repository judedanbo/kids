import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SafetyScout } from '../SafetyScout';
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

describe('SafetyScout', () => {
  it('renders game shell with title', () => {
    render(<SafetyScout {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows category picker initially', () => {
    render(<SafetyScout {...createMockProps()} />);
    expect(screen.getByText('pickCategory')).toBeTruthy();
  });

  it('shows category buttons for all categories', () => {
    render(<SafetyScout {...createMockProps()} />);
    expect(screen.getByText('category.kitchen')).toBeTruthy();
    expect(screen.getByText('category.bathroom')).toBeTruthy();
    expect(screen.getByText('randomMix')).toBeTruthy();
  });

  it('shows instruction after selecting a category', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<SafetyScout {...createTinyProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows safe/harmful buttons after starting', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('button', { name: 'safe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'harmful' })).toBeTruthy();
  });

  it('shows progress bar during gameplay', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows explanation after answering', () => {
    render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    fireEvent.click(screen.getByRole('button', { name: 'safe' }));
    expect(screen.getByText('nextObject')).toBeTruthy();
  });

  it('plays correct/incorrect SFX on answer', () => {
    const props = createMockProps();
    render(<SafetyScout {...props} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    fireEvent.click(screen.getByRole('button', { name: 'safe' }));
    expect(props.audioManager.playSFX).toHaveBeenCalled();
  });

  it('has no accessibility violations on category screen', async () => {
    const { container } = render(<SafetyScout {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<SafetyScout {...createMockProps()} />);
    fireEvent.click(screen.getByText('randomMix'));
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
