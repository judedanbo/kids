import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeatureFlagProvider, useFeatureFlag } from '@kids-games-zone/shared';
import featureFlags from '../config/featureFlags.json';
import type { FeatureFlags } from '@kids-games-zone/shared';

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
