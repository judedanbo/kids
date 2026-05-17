import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { FeatureFlagProvider, type FeatureFlags, type GameManifest } from '@kids-games-zone/shared';
import { usePlatform } from './PlatformContext';
import {
  isRewardEnabled as isRewardEnabledFor,
  resolveFeatureFlags,
  resolveGameConstraint,
  resolveScopeOverride,
} from '../config/overrides/merge';
import { loadConfigOverrides, saveConfigOverrides } from '../config/overrides/store';
import type { ConfigOverrideStore, EffectiveGameConstraint } from '../config/overrides/types';

interface ConfigOverrideContextValue {
  /** The persisted override store (global + per-profile scopes). */
  store: ConfigOverrideStore;
  setStore: Dispatch<SetStateAction<ConfigOverrideStore>>;
  /** Profile whose scope is currently resolved for the running app. */
  activeProfileId: string | null;
  /** Bundled, unmodified feature-flag defaults. */
  defaultFlags: FeatureFlags;
  /** Effective difficulty/age bounds for a game after overrides. */
  getGameConstraint: (manifest: GameManifest) => EffectiveGameConstraint;
  /** Whether a reward is awarded/shown for the active scope. */
  isRewardEnabled: (rewardId: string) => boolean;
}

const ConfigOverrideContext = createContext<ConfigOverrideContextValue | null>(null);

interface ConfigOverrideProviderProps {
  defaultFlags: FeatureFlags;
  children: ReactNode;
}

/**
 * Owns the parent-controlled override store, resolves it against the active
 * profile, and feeds the merged FeatureFlags down through FeatureFlagProvider
 * so existing flag consumers need no changes. Difficulty/age constraints and
 * reward gating are exposed via useConfigOverrides().
 *
 * Must be rendered inside PlatformProvider (it reads the current profile).
 */
export function ConfigOverrideProvider({ defaultFlags, children }: ConfigOverrideProviderProps) {
  const { state } = usePlatform();
  const activeProfileId = state.currentProfile?.id ?? null;

  const [store, setStore] = useState<ConfigOverrideStore>(loadConfigOverrides);

  useEffect(() => {
    saveConfigOverrides(store);
  }, [store]);

  const scopeOverride = useMemo(
    () => resolveScopeOverride(store, activeProfileId),
    [store, activeProfileId],
  );

  const mergedFlags = useMemo(
    () => resolveFeatureFlags(defaultFlags, scopeOverride),
    [defaultFlags, scopeOverride],
  );

  const getGameConstraint = useCallback(
    (manifest: GameManifest) => resolveGameConstraint(manifest, scopeOverride),
    [scopeOverride],
  );

  const isRewardEnabled = useCallback(
    (rewardId: string) => isRewardEnabledFor(rewardId, scopeOverride),
    [scopeOverride],
  );

  const value = useMemo<ConfigOverrideContextValue>(
    () => ({
      store,
      setStore,
      activeProfileId,
      defaultFlags,
      getGameConstraint,
      isRewardEnabled,
    }),
    [store, activeProfileId, defaultFlags, getGameConstraint, isRewardEnabled],
  );

  return (
    <ConfigOverrideContext.Provider value={value}>
      <FeatureFlagProvider flags={mergedFlags} profileId={activeProfileId}>
        {children}
      </FeatureFlagProvider>
    </ConfigOverrideContext.Provider>
  );
}

export function useConfigOverrides(): ConfigOverrideContextValue {
  const ctx = useContext(ConfigOverrideContext);
  if (!ctx) {
    throw new Error('useConfigOverrides must be used within a ConfigOverrideProvider');
  }
  return ctx;
}
