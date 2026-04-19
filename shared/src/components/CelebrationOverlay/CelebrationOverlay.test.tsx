import { render, screen, act } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CelebrationOverlay } from './CelebrationOverlay';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => {
  const confettiFn = vi.fn() as ReturnType<typeof vi.fn> & { reset: ReturnType<typeof vi.fn> };
  confettiFn.reset = vi.fn();
  return { default: confettiFn };
});

// Mock framer-motion's useReducedMotion
const mockUseReducedMotion = vi.fn().mockReturnValue(false);
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

describe('CelebrationOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the title', () => {
    render(<CelebrationOverlay title="Amazing Job!" />);
    expect(screen.getByText('Amazing Job!')).toBeInTheDocument();
  });

  it('renders score when provided', () => {
    render(<CelebrationOverlay title="Great!" score={950} maxScore={1000} />);
    expect(screen.getByText(/950/)).toBeInTheDocument();
  });

  it('calls onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<CelebrationOverlay title="Done!" duration={2000} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('has aria-live region', () => {
    render(<CelebrationOverlay title="Yay!" />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
  });

  it('does not fire confetti when reduced motion is preferred', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const confetti = (await import('canvas-confetti')).default;
    (confetti as unknown as ReturnType<typeof vi.fn>).mockClear();

    render(<CelebrationOverlay title="Test" />);

    expect(confetti).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = render(<CelebrationOverlay title="Great job!" score={8} maxScore={10} />);
    const result = await axe(container);
    vi.useFakeTimers();
    expect(result).toHaveNoViolations();
  }, 15000);
});
