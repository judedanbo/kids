import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LetterTiles } from '../components/LetterTiles';

describe('LetterTiles', () => {
  it('does not auto-submit when all slots are filled', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not render the submit button until all slots are full', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('submits the composed answer when submit is clicked and resets state', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('CAT');

    // After submit, the submit button should be gone (state reset).
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();
    // All tiles should be re-enabled.
    expect(screen.getByRole('button', { name: 'Letter C' })).not.toBeDisabled();
  });

  it('allows undoing after slots are full so the user can correct before submitting', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter X' }));

    // Submit button is shown.
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();

    // Undo the last letter (X).
    fireEvent.click(screen.getByRole('button', { name: 'Undo last letter' }));

    // Submit should disappear again.
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();

    // The correct letter (T) is now available again.
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    expect(onSubmit).toHaveBeenCalledWith('CAT');
  });

  it('still pops the last letter on undo before slots are full', () => {
    const onSubmit = vi.fn();
    render(<LetterTiles letters={['C', 'A', 'T', 'X']} wordLength={3} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Letter C' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo last letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter T' }));
    fireEvent.click(screen.getByRole('button', { name: 'Letter C' })); // C is still selected, so should be disabled

    // Because C is still in `selected`, the second click is a no-op, and we haven't hit 3 letters yet.
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull();
  });
});
