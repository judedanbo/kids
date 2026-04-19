import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Keyboard } from '../components/Keyboard';

describe('Keyboard physical-key support', () => {
  it('types letters via document keydown and submits on Enter', () => {
    const onSubmit = vi.fn();
    render(<Keyboard onSubmit={onSubmit} />);

    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'a' });
    fireEvent.keyDown(document, { key: 't' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('CAT');
  });

  it('removes the last letter on Backspace', () => {
    const onSubmit = vi.fn();
    render(<Keyboard onSubmit={onSubmit} />);

    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'a' });
    fireEvent.keyDown(document, { key: 'Backspace' });
    fireEvent.keyDown(document, { key: 't' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('CT');
  });

  it('ignores keydown when disabled', () => {
    const onSubmit = vi.fn();
    render(<Keyboard onSubmit={onSubmit} disabled />);

    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
    // The typed display announces the running buffer via aria-label.
    expect(screen.getByLabelText('Typed: nothing yet')).toBeInTheDocument();
  });

  it('ignores modifier combos so Ctrl+C / Cmd+R etc. pass through', () => {
    const onSubmit = vi.fn();
    render(<Keyboard onSubmit={onSubmit} />);

    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'r', metaKey: true });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit on Enter when nothing is typed', () => {
    const onSubmit = vi.fn();
    render(<Keyboard onSubmit={onSubmit} />);

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
