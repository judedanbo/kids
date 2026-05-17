import type { FeatureFlags, GameManifest } from '@kids-games-zone/shared';

/**
 * Parent-controlled overrides for a single game. Sparse: any omitted field
 * falls back to the bundled gameRegistry / featureFlags default.
 *
 * `enabled` mirrors the `game.<id>` feature flag — it is the single source of
 * truth for game availability and is folded into the merged FeatureFlags.
 */
export interface GameOverride {
  enabled?: boolean;
  minDifficulty?: number;
  maxDifficulty?: number;
  ageRange?: [number, number];
}

/** Override for a non-game feature flag (e.g. "daily-challenge"). */
export interface FeatureOverride {
  enabled?: boolean;
}

/** Override for a single reward from the reward catalog. */
export interface RewardOverride {
  enabled?: boolean;
}

/**
 * A sparse set of overrides for one scope (global, or a single profile).
 * Only deltas are stored; everything else resolves to bundled defaults.
 */
export interface ConfigOverride {
  /** Keyed by non-game feature-flag key, e.g. "daily-challenge". */
  features?: Record<string, FeatureOverride>;
  /** Keyed by game id, e.g. "math-adventure". */
  games?: Record<string, GameOverride>;
  /** Keyed by reward id, e.g. "speed-demon". */
  rewards?: Record<string, RewardOverride>;
}

/**
 * Persisted override store. `global` applies to every profile; a matching
 * `perProfile[profileId]` entry is layered on top for that child.
 */
export interface ConfigOverrideStore {
  version: 1;
  global: ConfigOverride;
  perProfile: Record<string, ConfigOverride>;
}

/** Effective difficulty/age bounds for a game after overrides are applied. */
export interface EffectiveGameConstraint {
  minDifficulty: number;
  maxDifficulty: number;
  ageRange: [number, number];
}

/** Context the validator needs to reject unknown keys / out-of-range values. */
export interface ConfigValidationContext {
  /** Known non-game feature-flag keys (game.* keys excluded). */
  featureKeys: readonly string[];
  /** Bundled game manifests, used for id + difficulty-bound checks. */
  gameRegistry: readonly GameManifest[];
  /** Known reward ids. */
  rewardIds: readonly string[];
}

export type ValidationResult =
  | { ok: true; value: ConfigOverride }
  | { ok: false; errors: string[] };

export const CONFIG_OVERRIDE_VERSION = 1 as const;

export type { FeatureFlags };
