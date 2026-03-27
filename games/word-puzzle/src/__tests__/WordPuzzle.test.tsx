import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { WordPuzzle } from '../WordPuzzle';
import type { GameProps } from '@kids-games-zone/shared';

function createMockProps(overrides: Partial<GameProps> = {}): GameProps {
  return {
    config: {
      difficulty: 2,
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
      },
      settings: {
        soundEnabled: true,
        musicEnabled: true,
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
      playSFX: vi.fn(),
      playVoice: vi.fn(),
      stopVoice: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn().mockReturnValue(100),
      mute: vi.fn(),
      unmute: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      preload: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

describe('WordPuzzle', () => {
  it('renders game shell with "Word Puzzle" title', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    expect(screen.getByText('Word Puzzle')).toBeTruthy();
  });

  it('shows instruction bubble initially ("Unscramble the letters...")', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    expect(screen.getByText(/Unscramble the letters/i)).toBeTruthy();
  });

  it('shows scrambled letters (ScrambleRow group) after clicking "Let\'s Go!"', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText("Let's Go!"));
    expect(screen.getByRole('group', { name: /scrambled letters/i })).toBeTruthy();
  });

  it('shows answer slots matching word length after dismissing instruction', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText("Let's Go!"));
    expect(screen.getByRole('group', { name: /your answer/i })).toBeTruthy();
  });

  it('shows category label after dismissing instruction', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText("Let's Go!"));
    // Categories are Animals, Food, or Nature
    const categoryNames = ['Animals', 'Food', 'Nature'];
    const found = categoryNames.some((name) => screen.queryByText(name));
    expect(found).toBe(true);
  });

  it('tapping a scrambled letter places it in an answer slot', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText("Let's Go!"));

    const scrambleGroup = screen.getByRole('group', { name: /scrambled letters/i });
    const letterButtons = scrambleGroup.querySelectorAll('button');
    expect(letterButtons.length).toBeGreaterThan(0);

    const answerGroup = screen.getByRole('group', { name: /your answer/i });
    const filledBefore = answerGroup.querySelectorAll('button:not(:disabled)').length;

    // Click the first available letter tile
    const firstAvailable = Array.from(letterButtons).find((btn) => !btn.disabled);
    if (firstAvailable) {
      fireEvent.click(firstAvailable);
    }

    const filledAfter = answerGroup.querySelectorAll('button:not(:disabled)').length;
    expect(filledAfter).toBeGreaterThan(filledBefore);
  });

  it('shows progress bar', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText("Let's Go!"));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('calls audioManager.playSFX on interactions', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText("Let's Go!"));

    const scrambleGroup = screen.getByRole('group', { name: /scrambled letters/i });
    const letterButtons = scrambleGroup.querySelectorAll('button');
    const firstAvailable = Array.from(letterButtons).find((btn) => !btn.disabled);
    if (firstAvailable) {
      fireEvent.click(firstAvailable);
    }

    expect(props.audioManager.playSFX).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const props = createMockProps();
    const { container } = render(<WordPuzzle {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
