import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../i18n';
import { TypedConfirmModal } from './TypedConfirmModal';

describe('TypedConfirmModal', () => {
  it('disables confirm until the input matches (case-insensitive)', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <TypedConfirmModal
        title="Delete Alice?"
        description="Type Alice to confirm."
        expected="Alice"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    expect(confirmBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/type alice/i), 'alice');
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancel invokes onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <TypedConfirmModal
        title="T"
        description="D"
        expected="X"
        confirmLabel="Go"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not fire onConfirm when disabled and form submitted', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <TypedConfirmModal
        title="T"
        description="D"
        expected="Alice"
        confirmLabel="Go"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText(/type alice/i), 'bob');
    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
