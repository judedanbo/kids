import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { OptionButton } from './OptionButton';

describe('OptionButton', () => {
  it('renders the label', () => {
    render(<OptionButton label="Cat" />);
    expect(screen.getByText('Cat')).toBeInTheDocument();
  });

  it('fires onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<OptionButton label="Cat" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('does not fire onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<OptionButton label="Cat" onSelect={onSelect} disabled />);
    fireEvent.click(screen.getByRole('button', { hidden: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows checkmark icon in correct state', () => {
    render(<OptionButton label="Dog" state="correct" />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows X icon in incorrect state', () => {
    render(<OptionButton label="Fish" state="incorrect" />);
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<OptionButton label="Cat" disabled />);
    expect(screen.getByRole('button', { hidden: true })).toBeDisabled();
  });

  it('has role="button"', () => {
    render(<OptionButton label="Cat" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OptionButton label="Answer A" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
