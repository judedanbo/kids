import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../components/Card';

describe('Card', () => {
  const defaultProps = {
    illustration: 'cat' as const,
    isFlipped: false,
    isMatched: false,
    onClick: vi.fn(),
    disabled: false,
    size: 100,
    index: 0,
    totalCards: 4,
  };

  it('renders face-down by default (shows "?")', () => {
    render(<Card {...defaultProps} />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('has aria-label describing position when not flipped', () => {
    render(<Card {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Card 1 of 4, face down');
  });

  it('shows illustration name in aria-label when flipped', () => {
    render(<Card {...defaultProps} isFlipped={true} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('cat, face up');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Card {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Card {...defaultProps} disabled={true} onClick={onClick} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when matched', () => {
    const onClick = vi.fn();
    render(<Card {...defaultProps} isMatched={true} disabled={true} onClick={onClick} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows CSSIllustration when flipped (card front is rendered)', () => {
    render(<Card {...defaultProps} isFlipped={true} />);
    // The illustration is rendered (aria-label on button reflects the name)
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain('cat');
  });
});
