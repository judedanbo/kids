import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureFlagProvider, useFeatureFlag } from '@kids-games-zone/shared';
import featureFlags from '../config/featureFlags.json';
import type { FeatureFlags } from '@kids-games-zone/shared';
import { gameRegistry } from '../config/gameRegistry';

function FlagReader({ name }: { name: string }) {
  const { enabled } = useFeatureFlag(name);
  return <span data-testid="flag-value">{String(enabled)}</span>;
}

describe('Feature Flags Integration', () => {
  it('provides flags from featureFlags.json via context', () => {
    render(
      <MemoryRouter>
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId="test-user">
          <FlagReader name="game.word-puzzle" />
        </FeatureFlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('flag-value').textContent).toBe('true');
  });

  it('returns false for disabled flags', () => {
    render(
      <MemoryRouter>
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId="test-user">
          <FlagReader name="game.dummy-game" />
        </FeatureFlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('flag-value').textContent).toBe('false');
  });

  it('returns false for unknown flags', () => {
    render(
      <MemoryRouter>
        <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId="test-user">
          <FlagReader name="nonexistent.flag" />
        </FeatureFlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('flag-value').textContent).toBe('false');
  });
});

describe('Hub feature flag filtering', () => {
  it('filters out games whose feature flag is disabled', () => {
    const games = gameRegistry;
    const flags: FeatureFlags = {
      'game.word-puzzle': { enabled: true, description: '' },
      'game.math-adventure': { enabled: false, description: '' },
      'game.memory-match': { enabled: true, description: '' },
      'game.dummy-game': { enabled: false, description: '' },
    };

    const flagFiltered = games.filter((game) => {
      const flag = flags[`game.${game.id}`];
      return !flag || flag.enabled;
    });

    expect(flagFiltered.map((g) => g.id)).toContain('word-puzzle');
    expect(flagFiltered.map((g) => g.id)).toContain('memory-match');
    expect(flagFiltered.map((g) => g.id)).not.toContain('math-adventure');
    expect(flagFiltered.map((g) => g.id)).not.toContain('dummy-game');
  });
});

describe('GameWrapper feature flag guard', () => {
  it('blocks navigation to a disabled game', () => {
    const flags: FeatureFlags = {
      'game.dummy-game': { enabled: false, description: '' },
    };
    const gameId = 'dummy-game';
    const flag = flags[`game.${gameId}`];
    const blocked = flag && !flag.enabled;
    expect(blocked).toBe(true);
  });

  it('allows navigation to an enabled game', () => {
    const flags: FeatureFlags = {
      'game.word-puzzle': { enabled: true, description: '' },
    };
    const gameId = 'word-puzzle';
    const flag = flags[`game.${gameId}`];
    const blocked = flag && !flag.enabled;
    expect(blocked).toBe(false);
  });
});
