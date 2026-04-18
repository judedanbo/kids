import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MoreOrLess } from '../MoreOrLess';
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

describe('MoreOrLess', () => {
  it('renders game shell with title', () => {
    render(<MoreOrLess {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially', () => {
    render(<MoreOrLess {...createMockProps()} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<MoreOrLess {...createTinyProps()} />);
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows object groups for tiny-tier after starting', () => {
    render(<MoreOrLess {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Choose a group' })).toBeTruthy();
  });

  it('shows number cards for junior-tier after starting', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Choose a number' })).toBeTruthy();
  });

  it('shows progress bar during gameplay', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows feedback after selecting an answer (junior)', () => {
    render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    const buttons = screen.getAllByRole('button');
    const numberButtons = buttons.filter((btn) => /^-?\d/.test(btn.textContent?.trim() ?? ''));
    if (numberButtons.length > 0) {
      fireEvent.click(numberButtons[0]);
      expect(screen.getByText('next')).toBeTruthy();
    }
  });

  it('plays SFX on answer', () => {
    const props = createMockProps();
    render(<MoreOrLess {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    const buttons = screen.getAllByRole('button');
    const numberButtons = buttons.filter((btn) => /^-?\d/.test(btn.textContent?.trim() ?? ''));
    if (numberButtons.length > 0) {
      fireEvent.click(numberButtons[0]);
      expect(props.audioManager.playSFX).toHaveBeenCalled();
    }
  });

  it('has no accessibility violations on instruction screen', async () => {
    const { container } = render(<MoreOrLess {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<MoreOrLess {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
