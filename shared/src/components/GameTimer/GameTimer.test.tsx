import { render, screen, act } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { GameTimer } from './GameTimer';

describe('GameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays initial time for countdown', () => {
    render(<GameTimer mode="countdown" duration={90} />);
    expect(screen.getByLabelText(/1:30 remaining/)).toBeInTheDocument();
  });

  it('counts down each second', () => {
    render(<GameTimer mode="countdown" duration={5} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText(/0:04 remaining/)).toBeInTheDocument();
  });

  it('fires onExpire when countdown reaches zero', () => {
    const onExpire = vi.fn();
    render(<GameTimer mode="countdown" duration={2} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('pauses when paused prop is true', () => {
    const { rerender } = render(<GameTimer mode="countdown" duration={10} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(<GameTimer mode="countdown" duration={10} paused />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should still show 8 seconds (only 2 seconds elapsed before pause)
    expect(screen.getByLabelText(/0:08 remaining/)).toBeInTheDocument();
  });

  it('counts up in countup mode', () => {
    render(<GameTimer mode="countup" />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByLabelText(/0:03 elapsed/)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = render(<GameTimer mode="countup" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
