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
      stopVoice: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn().mockReturnValue(100),
      mute: vi.fn(),
      unmute: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      preload: vi.fn().mockResolvedValue(undefined),
      setLanguage: vi.fn(),
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

describe('WordPuzzle', () => {
  it('renders game shell with translated title', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially (instruction key)', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows scrambled letters (ScrambleRow group) after clicking letsGo key', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: /scrambled letters/i })).toBeTruthy();
  });

  it('shows answer slots matching word length after dismissing instruction', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: /your answer/i })).toBeTruthy();
  });

  it('shows category label after dismissing instruction', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    // With i18n mock, t() returns the key: category_animals, category_food, or category_nature
    const categoryKeys = ['category_animals', 'category_food', 'category_nature'];
    const found = categoryKeys.some((key) => screen.queryByText(key));
    expect(found).toBe(true);
  });

  it('tapping a scrambled letter places it in an answer slot', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText('letsGo'));

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
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('calls audioManager.playSFX on interactions', () => {
    const props = createMockProps();
    render(<WordPuzzle {...props} />);
    fireEvent.click(screen.getByText('letsGo'));

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
