import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Leave game?',
    message: 'Your progress will be lost.',
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, message, and both buttons when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Leave game?')).toBeInTheDocument();
    expect(screen.getByText('Your progress will be lost.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
  });

  it('fires onConfirm when confirm button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('fires onCancel when cancel button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('returns focus to the trigger element when closed', async () => {
    const TestHarness = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button data-testid="trigger" onClick={() => setOpen(true)}>
            Open
          </button>
          <ConfirmDialog
            {...defaultProps}
            open={open}
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </>
      );
    };
    render(<TestHarness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    // Dialog now open; focus moved into the dialog.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    // focus-trap-react restores focus asynchronously; wait a microtask cycle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  });

  it('fires onCancel on Escape key', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('does not fire onCancel on Escape when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('fires onCancel on backdrop click', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const backdrop = container.querySelector('.backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('does not fire onCancel when clicking inside the dialog', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Your progress will be lost.'));
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('has dialog role and aria attributes', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('applies danger tone class when tone is danger', () => {
    render(<ConfirmDialog {...defaultProps} tone="danger" />);
    const confirmButton = screen.getByRole('button', { name: 'Leave' });
    expect(confirmButton.className).toMatch(/danger/);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
