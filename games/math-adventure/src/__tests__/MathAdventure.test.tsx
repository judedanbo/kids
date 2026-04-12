import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MathAdventure } from '../MathAdventure';
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

describe('MathAdventure', () => {
  it('renders game shell with translated title', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows a question with "= ?" after dismissing instruction', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText(/= \?/)).toBeTruthy();
  });

  it('shows 4 numeric answer options after dismissing instruction', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    // OptionButtons render as buttons; check we have at least 4 with numeric labels
    const buttons = screen.getAllByRole('button');
    const numericButtons = buttons.filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? ''));
    expect(numericButtons.length).toBe(4);
  });

  it('shows visual aid (role="img") at difficulty 1', () => {
    const props = createMockProps({ config: { ...createMockProps().config, difficulty: 1 } });
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('img')).toBeTruthy();
  });

  it('hides visual aid at difficulty 3', () => {
    const props = createMockProps({ config: { ...createMockProps().config, difficulty: 3 } });
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('calls onScore when correct answer is clicked', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));

    // Iterate through option buttons until one triggers onScore (correct answer)
    const buttons = screen.getAllByRole('button');
    const numericButtons = buttons.filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? ''));
    for (const btn of numericButtons) {
      fireEvent.click(btn);
      if ((props.onScore as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }
    expect(props.onScore).toHaveBeenCalled();
  });

  it('plays SFX("correct") on correct answer', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));

    const buttons = screen.getAllByRole('button');
    const numericButtons = buttons.filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? ''));
    for (const btn of numericButtons) {
      fireEvent.click(btn);
      const calls = (props.audioManager.playSFX as ReturnType<typeof vi.fn>).mock.calls;
      if (calls.some((c: string[]) => c[0] === 'correct')) break;
    }
    expect(props.audioManager.playSFX).toHaveBeenCalledWith('correct');
  });

  it('shows progress bar (role="progressbar")', () => {
    const props = createMockProps();
    render(<MathAdventure {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    const props = createMockProps();
    const { container } = render(<MathAdventure {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
