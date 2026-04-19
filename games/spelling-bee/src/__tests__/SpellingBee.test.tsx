import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SpellingBee } from '../SpellingBee';
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

describe('SpellingBee', () => {
  it('renders game shell with title', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows level indicator after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText(/levelOf/)).toBeTruthy();
  });

  it('shows on-screen keyboard for junior-tier after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'keyboard.groupLabel' })).toBeTruthy();
  });

  it('shows letter tiles for tiny-tier after dismissing instruction', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Letter tiles' })).toBeTruthy();
  });

  it('shows hear word button after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText(/hearWord/)).toBeTruthy();
  });

  it('plays word voice on entering play phase', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(props.audioManager.playVoice).toHaveBeenCalled();
  });

  it('shows lives display for junior-tier', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByLabelText(/lives remaining/)).toBeTruthy();
  });

  it('does not show lives display for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.queryByLabelText(/lives remaining/)).toBeNull();
  });

  it('shows progress bar', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('has no accessibility violations on instruction screen', async () => {
    const { container } = render(<SpellingBee {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('does not render the game-over dialog during normal play', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not render a dialog while still on the instruction screen', () => {
    render(<SpellingBee {...createTinyProps()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  describe('back-button confirmation', () => {
    it('does not call onExit when back is clicked (shows dialog instead)', () => {
      const props = createMockProps();
      render(<SpellingBee {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
      expect(props.onExit).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('exitConfirmTitle')).toBeInTheDocument();
    });

    it('calls onExit when the user confirms', () => {
      const props = createMockProps();
      render(<SpellingBee {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
      fireEvent.click(screen.getByRole('button', { name: 'exitConfirmConfirm' }));
      expect(props.onExit).toHaveBeenCalledOnce();
    });

    it('closes the dialog and does not call onExit on cancel', () => {
      const props = createMockProps();
      render(<SpellingBee {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
      fireEvent.click(screen.getByRole('button', { name: 'exitConfirmCancel' }));
      expect(props.onExit).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows the dialog in the playing phase too', () => {
      const props = createMockProps();
      render(<SpellingBee {...props} />);
      fireEvent.click(screen.getByText('letsGo')); // dismiss instruction
      fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('re-plays bgm on cancel for tiny when music was enabled', () => {
      const props = createTinyProps();
      render(<SpellingBee {...props} />);
      // Clear the initial playMusic call from mount.
      (props.audioManager.playMusic as unknown as ReturnType<typeof vi.fn>).mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
      // GameShell calls stopMusic on back-click.
      expect(props.audioManager.stopMusic).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'exitConfirmCancel' }));
      expect(props.audioManager.playMusic).toHaveBeenCalledWith(
        'music:spelling-bee-bgm',
        expect.objectContaining({ loop: true }),
      );
    });

    it('does not re-play bgm on cancel for non-tiny tiers', () => {
      const props = createMockProps(); // junior by default
      render(<SpellingBee {...props} />);
      (props.audioManager.playMusic as unknown as ReturnType<typeof vi.fn>).mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'gameShell.goBack' }));
      fireEvent.click(screen.getByRole('button', { name: 'exitConfirmCancel' }));

      expect(props.audioManager.playMusic).not.toHaveBeenCalled();
    });
  });
});
