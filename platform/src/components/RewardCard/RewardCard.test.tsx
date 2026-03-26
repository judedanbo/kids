import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RewardCard } from './RewardCard';
import type { Reward } from '@kids-games-zone/shared';

const reward: Reward = {
  id: 'first-star',
  type: 'star',
  name: 'First Star',
  description: 'Complete your very first game!',
  icon: '⭐',
  unlockedAt: '2026-03-20T10:00:00.000Z',
  criteria: { type: 'completion', threshold: 1 },
};

describe('RewardCard', () => {
  it('renders unlocked reward with date', () => {
    render(<RewardCard reward={reward} unlocked={true} />);
    expect(screen.getByText('First Star')).toBeInTheDocument();
    expect(screen.getByText('Complete your very first game!')).toBeInTheDocument();
    expect(screen.getByText(/Earned/)).toBeInTheDocument();
  });

  it('renders locked reward with progress', () => {
    const lockedReward = { ...reward, unlockedAt: undefined };
    render(<RewardCard reward={lockedReward} unlocked={false} progress="0 / 1 games completed" />);
    expect(screen.getByText('First Star')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 games completed')).toBeInTheDocument();
    expect(screen.queryByText(/Earned/)).not.toBeInTheDocument();
  });

  it('shows lock overlay when locked', () => {
    render(<RewardCard reward={reward} unlocked={false} />);
    expect(screen.getByLabelText(/Locked/)).toBeInTheDocument();
  });

  it('has correct aria-label for unlocked state', () => {
    render(<RewardCard reward={reward} unlocked={true} />);
    expect(screen.getByLabelText('First Star — Unlocked')).toBeInTheDocument();
  });

  it('does not show progress when unlocked', () => {
    render(<RewardCard reward={reward} unlocked={true} progress="some progress" />);
    expect(screen.queryByText('some progress')).not.toBeInTheDocument();
  });
});
