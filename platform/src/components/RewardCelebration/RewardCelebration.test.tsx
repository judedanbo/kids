import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RewardCelebration } from './RewardCelebration';
import type { Reward } from '@kids-games-zone/shared';

vi.mock('@kids-games-zone/shared', async () => {
  const actual = await vi.importActual<typeof import('@kids-games-zone/shared')>(
    '@kids-games-zone/shared',
  );
  return {
    ...actual,
    CelebrationOverlay: ({ onComplete }: { onComplete?: () => void }) => (
      <div data-testid="celebration-overlay">
        <button data-testid="complete-celebration" onClick={onComplete}>
          Complete
        </button>
      </div>
    ),
  };
});

const mockRewards: Reward[] = [
  {
    id: 'first-star',
    type: 'star',
    name: 'First Star',
    description: 'Complete your very first game!',
    icon: '⭐',
    unlockedAt: '2026-03-23T00:00:00.000Z',
    criteria: { type: 'completion', threshold: 1 },
  },
  {
    id: 'speed-demon',
    type: 'badge',
    name: 'Speed Demon',
    description: 'Finish a game in under 60 seconds!',
    icon: '⚡',
    unlockedAt: '2026-03-23T00:00:00.000Z',
    criteria: { type: 'time', threshold: 60 },
  },
];

describe('RewardCelebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onComplete immediately for empty rewards', () => {
    const onComplete = vi.fn();
    render(<RewardCelebration rewards={[]} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows first reward', () => {
    const onComplete = vi.fn();
    render(<RewardCelebration rewards={mockRewards} onComplete={onComplete} />);
    expect(screen.getByText('First Star')).toBeInTheDocument();
    expect(screen.getByText('Complete your very first game!')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('advances to next reward on celebration complete', () => {
    const onComplete = vi.fn();
    render(<RewardCelebration rewards={mockRewards} onComplete={onComplete} />);

    act(() => {
      screen.getByTestId('complete-celebration').click();
    });

    expect(screen.getByText('Speed Demon')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete after last reward', () => {
    const onComplete = vi.fn();
    render(<RewardCelebration rewards={mockRewards} onComplete={onComplete} />);

    act(() => {
      screen.getByTestId('complete-celebration').click();
    });
    act(() => {
      screen.getByTestId('complete-celebration').click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders single reward correctly', () => {
    const onComplete = vi.fn();
    render(<RewardCelebration rewards={[mockRewards[0]]} onComplete={onComplete} />);

    expect(screen.getByText('First Star')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('complete-celebration').click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
