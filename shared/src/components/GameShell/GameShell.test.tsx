import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { GameShell } from './GameShell';

describe('GameShell', () => {
  it('renders the title', () => {
    render(<GameShell title="Word Puzzle">content</GameShell>);
    expect(screen.getByText('Word Puzzle')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<GameShell title="Test">Game content here</GameShell>);
    expect(screen.getByText('Game content here')).toBeInTheDocument();
  });

  it('fires onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <GameShell title="Test" onBack={onBack}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('fires onPause when pause button is clicked', () => {
    const onPause = vi.fn();
    render(
      <GameShell title="Test" onPause={onPause}>
        content
      </GameShell>,
    );
    fireEvent.click(screen.getByLabelText('Pause game'));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('hides pause button when showPauseButton is false', () => {
    render(
      <GameShell title="Test" showPauseButton={false}>
        content
      </GameShell>,
    );
    expect(screen.queryByLabelText('Pause game')).not.toBeInTheDocument();
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

  it('has no accessibility violations', async () => {
    const { container } = render(
      <GameShell title="Test Game" onBack={() => {}} onPause={() => {}}>
        <div>Game content</div>
      </GameShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
