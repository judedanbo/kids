import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { GameOverOverlay } from '../components/GameOverOverlay';

function renderOverlay(overrides = {}) {
  const props = {
    levelReached: 3,
    score: 7,
    maxScore: 12,
    onRetry: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<GameOverOverlay {...props} />) };
}

describe('GameOverOverlay', () => {
  it('renders title, subtitle, and score', () => {
    renderOverlay();
    expect(screen.getByText('gameOverTitle')).toBeTruthy();
    expect(screen.getByText(/gameOverSubtitle/)).toBeTruthy();
    expect(screen.getByText(/7/)).toBeTruthy();
    expect(screen.getByText(/12/)).toBeTruthy();
  });

  it('renders both action buttons', () => {
    renderOverlay();
    expect(screen.getByRole('button', { name: 'tryAgain' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'backToHome' })).toBeTruthy();
  });

  it('fires onRetry when Try again is clicked', () => {
    const onRetry = vi.fn();
    renderOverlay({ onRetry });
    fireEvent.click(screen.getByRole('button', { name: 'tryAgain' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('fires onExit when Back is clicked', () => {
    const onExit = vi.fn();
    renderOverlay({ onExit });
    fireEvent.click(screen.getByRole('button', { name: 'backToHome' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('uses role="dialog" with aria-modal and aria-labelledby', () => {
    renderOverlay();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toBeTruthy();
  });

  it('moves focus to the Try again button on mount', () => {
    renderOverlay();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'tryAgain' }));
  });

  it('has no accessibility violations', async () => {
    const { container } = renderOverlay();
    expect(await axe(container)).toHaveNoViolations();
  });
});
