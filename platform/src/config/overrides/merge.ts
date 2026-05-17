import type { FeatureFlags, GameManifest } from '@kids-games-zone/shared';
import type {
  ConfigOverride,
  ConfigOverrideStore,
  EffectiveGameConstraint,
  GameOverride,
} from './types';

/** Shallow-merge two override maps where the second wins per leaf field. */
function mergeRecord<T extends object>(
  base: Record<string, T> | undefined,
  top: Record<string, T> | undefined,
): Record<string, T> {
  const out: Record<string, T> = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(top ?? {})) {
    out[key] = { ...(out[key] ?? {}), ...value };
  }
  return out;
}

/**
 * Collapse the global scope and an optional per-profile scope into a single
 * effective override. Per-profile fields win over global ones.
 */
export function resolveScopeOverride(
  store: ConfigOverrideStore,
  profileId: string | null,
): ConfigOverride {
  const profileOverride = profileId ? store.perProfile[profileId] : undefined;
  return {
    features: mergeRecord(store.global.features, profileOverride?.features),
    games: mergeRecord(store.global.games, profileOverride?.games),
    rewards: mergeRecord(store.global.rewards, profileOverride?.rewards),
  };
}

/**
 * Produce the FeatureFlags object handed to FeatureFlagProvider: bundled
 * defaults with non-game feature overrides and per-game enable/disable folded
 * in. Game on/off lives only here so there is one source of truth.
 */
export function resolveFeatureFlags(
  defaults: FeatureFlags,
  override: ConfigOverride,
): FeatureFlags {
  const flags: FeatureFlags = {};
  for (const [key, value] of Object.entries(defaults)) {
    flags[key] = { ...value };
  }

  for (const [key, feature] of Object.entries(override.features ?? {})) {
    if (typeof feature.enabled !== 'boolean') continue;
    const existing = flags[key];
    flags[key] = existing
      ? { ...existing, enabled: feature.enabled }
      : { enabled: feature.enabled, description: '' };
  }

  for (const [gameId, game] of Object.entries(override.games ?? {})) {
    if (typeof game.enabled !== 'boolean') continue;
    const flagKey = `game.${gameId}`;
    const existing = flags[flagKey];
    flags[flagKey] = existing
      ? { ...existing, enabled: game.enabled }
      : { enabled: game.enabled, description: '' };
  }

  return flags;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Effective difficulty and age bounds for a game. Difficulty overrides are
 * clamped to the game's own capability ([1, manifest.maxDifficulty]) so a
 * parent can narrow the range but never push it past what the game supports.
 */
export function resolveGameConstraint(
  manifest: GameManifest,
  override: ConfigOverride,
): EffectiveGameConstraint {
  const game: GameOverride = override.games?.[manifest.id] ?? {};

  let minDifficulty = manifest.minDifficulty;
  let maxDifficulty = manifest.maxDifficulty;

  if (typeof game.maxDifficulty === 'number') {
    maxDifficulty = clamp(Math.round(game.maxDifficulty), 1, manifest.maxDifficulty);
  }
  if (typeof game.minDifficulty === 'number') {
    minDifficulty = clamp(Math.round(game.minDifficulty), 1, manifest.maxDifficulty);
  }
  if (minDifficulty > maxDifficulty) {
    minDifficulty = maxDifficulty;
  }

  let ageRange: [number, number] = [manifest.ageRange[0], manifest.ageRange[1]];
  if (
    Array.isArray(game.ageRange) &&
    typeof game.ageRange[0] === 'number' &&
    typeof game.ageRange[1] === 'number'
  ) {
    const lo = Math.max(0, Math.round(game.ageRange[0]));
    const hi = Math.max(0, Math.round(game.ageRange[1]));
    ageRange = lo <= hi ? [lo, hi] : [hi, lo];
  }

  return { minDifficulty, maxDifficulty, ageRange };
}

/** A reward is shown/awarded unless explicitly disabled by an override. */
export function isRewardEnabled(rewardId: string, override: ConfigOverride): boolean {
  return override.rewards?.[rewardId]?.enabled !== false;
}

/** Clamp a difficulty value into a game's effective bounds. */
export function clampDifficulty(
  difficulty: number,
  constraint: EffectiveGameConstraint,
): number {
  return clamp(difficulty, constraint.minDifficulty, constraint.maxDifficulty);
}
