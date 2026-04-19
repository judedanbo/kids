import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { GameShell } from './GameShell';
import type { AudioManager } from '../../types/services';

function createMockAudioManager(): AudioManager {
  return {
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
}

describe('GameShell', () => {
  it('renders the title', () => {
    render(<GameShell title="Word Puzzle">content</GameShell>);
    expect(screen.getByText('Word Puzzle')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<GameShell title="Test">Game content here</GameShell>);
    expect(screen.getByText('Game content here')).toBeInTheDocument();
  });

  it('opens the confirmation dialog when back is clicked (does not call onBack directly)', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fires onPause when pause button is clicked', () => {
    const onPause = vi.fn();
    render(
      <GameShell title="Test" onPause={onPause}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.pauseGame'));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('hides pause button when showPauseButton is false', () => {
    render(
      <GameShell title="Test" showPauseButton={false}>
        content
      </GameShell>,
    );
    expect(screen.queryByLabelText('gameShell.pauseGame')).not.toBeInTheDocument();
  });

  it('fires onPause on Escape key', () => {
    const onPause = vi.fn();
    render(
      <GameShell title="Test" onPause={onPause}>
        content
      </GameShell>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('does NOT stop music when back is clicked (music stops only on confirm)', () => {
    const audioManager = createMockAudioManager();
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack} audioManager={audioManager} musicEnabled>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    expect(audioManager.stopMusic).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('renders a music toggle when audioManager and musicEnabled are provided', () => {
    const audioManager = createMockAudioManager();
    render(
      <GameShell title="Test" audioManager={audioManager} musicEnabled>
        content
      </GameShell>,
    );
    expect(screen.getByLabelText('gameShell.pauseMusic')).toBeInTheDocument();
  });

  it('hides the music toggle when musicEnabled is false', () => {
    const audioManager = createMockAudioManager();
    render(
      <GameShell title="Test" audioManager={audioManager} musicEnabled={false}>
        content
      </GameShell>,
    );
    expect(screen.queryByLabelText('gameShell.pauseMusic')).not.toBeInTheDocument();
  });

  it('toggles music via pauseMusic / resumeMusic when the music button is clicked', () => {
    const audioManager = createMockAudioManager();
    render(
      <GameShell title="Test" audioManager={audioManager} musicEnabled>
        content
      </GameShell>,
    );
    const toggle = screen.getByLabelText('gameShell.pauseMusic');
    fireEvent.click(toggle);
    expect(audioManager.pauseMusic).toHaveBeenCalledOnce();

    const resumeToggle = screen.getByLabelText('gameShell.resumeMusic');
    fireEvent.click(resumeToggle);
    expect(audioManager.resumeMusic).toHaveBeenCalledOnce();
  });

  it('calls onBack when the user confirms', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    fireEvent.click(screen.getByRole('button', { name: 'backConfirm.confirm' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not call onBack when the user cancels', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    fireEvent.click(screen.getByRole('button', { name: 'backConfirm.cancel' }));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stops music on confirm (with fadeOut 300)', () => {
    const audioManager = createMockAudioManager();
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack} audioManager={audioManager} musicEnabled>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    fireEvent.click(screen.getByRole('button', { name: 'backConfirm.confirm' }));
    expect(audioManager.stopMusic).toHaveBeenCalledWith({ fadeOut: 300 });
    expect(audioManager.stopMusic).toHaveBeenCalledOnce();
  });

  it('does not stop music on cancel', () => {
    const audioManager = createMockAudioManager();
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack} audioManager={audioManager} musicEnabled>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    fireEvent.click(screen.getByRole('button', { name: 'backConfirm.cancel' }));
    expect(audioManager.stopMusic).not.toHaveBeenCalled();
  });

  it('disableBackConfirm bypasses the dialog and fires onBack directly', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack} disableBackConfirm>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the dialog on Escape and does not call onBack', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('gameShell.goBack'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <GameShell title="Test Game" onBack={() => {}} onPause={() => {}}>
        <div>Game content</div>
      </GameShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
