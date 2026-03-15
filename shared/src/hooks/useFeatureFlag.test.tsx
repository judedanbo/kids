import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { FeatureFlagProvider } from '../context/FeatureFlagContext';
import { AgeTierProvider } from '../context/AgeTierContext';
import { useFeatureFlag } from './useFeatureFlag';
import type { FeatureFlags } from '../types';

const testFlags: FeatureFlags = {
  'new-game': { enabled: true, description: 'A new game' },
  'disabled-feature': { enabled: false, description: 'Not yet' },
  'tier-restricted': { enabled: true, ageTiers: ['junior', 'explorer'], description: 'Not for tiny' },
  'rollout-feature': { enabled: true, rolloutPercentage: 50, description: 'Gradual rollout' },
};

function wrapper(flags: FeatureFlags, profileId: string | null = null, tier: 'tiny' | 'junior' | 'explorer' = 'junior') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AgeTierProvider tier={tier}>
        <FeatureFlagProvider flags={flags} profileId={profileId}>{children}</FeatureFlagProvider>
      </AgeTierProvider>
    );
  };
}

describe('useFeatureFlag', () => {
  it('returns enabled for a known enabled flag', () => {
    const { result } = renderHook(() => useFeatureFlag('new-game'), { wrapper: wrapper(testFlags) });
    expect(result.current.enabled).toBe(true);
    expect(result.current.config).toBeDefined();
  });

  it('returns disabled for a known disabled flag', () => {
    const { result } = renderHook(() => useFeatureFlag('disabled-feature'), { wrapper: wrapper(testFlags) });
    expect(result.current.enabled).toBe(false);
  });

  it('returns disabled for an unknown flag', () => {
    const { result } = renderHook(() => useFeatureFlag('nonexistent'), { wrapper: wrapper(testFlags) });
    expect(result.current.enabled).toBe(false);
    expect(result.current.config).toBeUndefined();
  });

  it('respects ageTier filtering — blocks tiny for tier-restricted flag', () => {
    const { result } = renderHook(() => useFeatureFlag('tier-restricted'), { wrapper: wrapper(testFlags, null, 'tiny') });
    expect(result.current.enabled).toBe(false);
  });

  it('respects ageTier filtering — allows junior for tier-restricted flag', () => {
    const { result } = renderHook(() => useFeatureFlag('tier-restricted'), { wrapper: wrapper(testFlags, null, 'junior') });
    expect(result.current.enabled).toBe(true);
  });

  it('rollout percentage is stable for same profile ID', () => {
    const result1 = renderHook(() => useFeatureFlag('rollout-feature'), { wrapper: wrapper(testFlags, 'profile-abc') });
    const result2 = renderHook(() => useFeatureFlag('rollout-feature'), { wrapper: wrapper(testFlags, 'profile-abc') });
    expect(result1.result.current.enabled).toBe(result2.result.current.enabled);
  });

  it('rollout returns enabled:true when no profileId and rolloutPercentage set', () => {
    const { result } = renderHook(() => useFeatureFlag('rollout-feature'), { wrapper: wrapper(testFlags, null) });
    expect(result.current.enabled).toBe(true);
  });
});
