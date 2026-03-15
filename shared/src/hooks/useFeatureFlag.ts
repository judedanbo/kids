import { useContext } from 'react';
import { FeatureFlagContext } from '../context/FeatureFlagContext';
import { AgeTierContext } from '../context/AgeTierContext';
import type { FeatureFlags } from '../types';

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

interface UseFeatureFlagResult {
  enabled: boolean;
  config: FeatureFlags[string] | undefined;
}

export function useFeatureFlag(name: string): UseFeatureFlagResult {
  const { flags, profileId } = useContext(FeatureFlagContext);
  const ageTier = useContext(AgeTierContext);
  const config = flags[name];

  if (!config || !config.enabled) {
    return { enabled: false, config };
  }

  if (config.ageTiers && !config.ageTiers.includes(ageTier)) {
    return { enabled: false, config };
  }

  if (config.rolloutPercentage !== undefined && profileId) {
    const hash = hashStringToNumber(`${profileId}:${name}`);
    const bucket = hash % 100;
    if (bucket >= config.rolloutPercentage) {
      return { enabled: false, config };
    }
  }

  return { enabled: true, config };
}
