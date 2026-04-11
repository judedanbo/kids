import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Announcer, useAnnounce } from './Announcer';

function TestConsumer() {
  const announce = useAnnounce();
  return (
    <button onClick={() => announce('Score updated to 5')}>Announce</button>
  );
}

describe('Announcer', () => {
  it('renders a visually hidden aria-live region', () => {
    render(<Announcer />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces messages via useAnnounce', async () => {
    vi.useFakeTimers();
    render(
      <Announcer>
        <TestConsumer />
      </Announcer>,
    );

    const button = screen.getByText('Announce');
    act(() => {
      button.click();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Score updated to 5');
    vi.useRealTimers();
  });
});
