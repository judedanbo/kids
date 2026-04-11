import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PauseMenu } from './PauseMenu';

describe('PauseMenu', () => {
  const defaultProps = {
    onResume: vi.fn(),
    onRestart: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three buttons', () => {
    render(<PauseMenu {...defaultProps} />);
    expect(screen.getByText(/pause\.resume/)).toBeInTheDocument();
    expect(screen.getByText(/pause\.restart/)).toBeInTheDocument();
    expect(screen.getByText(/pause\.exitToHub/)).toBeInTheDocument();
  });

  it('fires onResume when Resume is clicked', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.click(screen.getByText(/pause\.resume/));
    expect(defaultProps.onResume).toHaveBeenCalledOnce();
  });

  it('fires onRestart when Restart is clicked', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.click(screen.getByText(/pause\.restart/));
    expect(defaultProps.onRestart).toHaveBeenCalledOnce();
  });

  it('fires onExit when Exit is clicked', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.click(screen.getByText(/pause\.exitToHub/));
    expect(defaultProps.onExit).toHaveBeenCalledOnce();
  });

  it('fires onResume on Escape key', () => {
    render(<PauseMenu {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onResume).toHaveBeenCalledOnce();
  });

  it('has dialog role and aria attributes', () => {
    render(<PauseMenu {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'pause.ariaLabel');
  });

  it('traps focus within the modal', () => {
    render(<PauseMenu {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const buttons = screen.getAllByRole('button');
    // Focus should be within the dialog
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
    // Verify focus is contained within the dialog
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PauseMenu onResume={() => {}} onRestart={() => {}} onExit={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
