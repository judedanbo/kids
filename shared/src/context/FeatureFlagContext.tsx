import { createContext, type ReactNode } from 'react';
import type { FeatureFlags } from '../types';

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  profileId: string | null;
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  profileId: null,
});

interface FeatureFlagProviderProps {
  flags: FeatureFlags;
  profileId?: string | null;
  children: ReactNode;
}

export function FeatureFlagProvider({
  flags,
  profileId = null,
  children,
}: FeatureFlagProviderProps) {
  return (
    <FeatureFlagContext.Provider value={{ flags, profileId }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
