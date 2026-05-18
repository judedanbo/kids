import { describe, it, expect } from 'vitest';
import type { FeatureFlags, GameManifest } from '@kids-games-zone/shared';
import {
  clampDifficulty,
  isRewardEnabled,
  resolveFeatureFlags,
  resolveGameConstraint,
  resolveScopeOverride,
} from '../merge';
import { emptyStore } from '../store';
import type { ConfigOverrideStore } from '../types';

const manifest: GameManifest = {
  id: 'math-adventure',
  name: 'Math Adventure',
  description: '',
  thumbnail: '',
  ageRange: [6, 8],
  skills: ['numeracy'],
  version: '1.0.0',
  entryPoint: '',
  minDifficulty: 1,
  maxDifficulty: 5,
  estimatedPlayTime: 5,
  offlineCapable: true,
  status: 'active',
  releaseDate: '2026-03-16',
  tags: [],
};

const defaultFlags: FeatureFlags = {
  'game.math-adventure': { enabled: true, description: 'Math' },
  'daily-challenge': { enabled: true, description: 'Daily' },
};

describe('resolveScopeOverride', () => {
  it('returns empty sections for an empty store', () => {
    const result = resolveScopeOverride(emptyStore(), null);
    expect(result).toEqual({ features: {}, games: {}, rewards: {} });
  });

  it('layers per-profile fields over global per leaf', () => {
    const store: ConfigOverrideStore = {
      version: 1,
      global: {
        games: { 'math-adventure': { enabled: true, maxDifficulty: 4 } },
      },
      perProfile: {
        kid1: { games: { 'math-adventure': { maxDifficulty: 2 } } },
      },
    };
    const result = resolveScopeOverride(store, 'kid1');
    expect(result.games?.['math-adventure']).toEqual({ enabled: true, maxDifficulty: 2 });
  });

  it('ignores per-profile when profileId is null', () => {
    const store: ConfigOverrideStore = {
      version: 1,
      global: { games: { 'math-adventure': { enabled: false } } },
      perProfile: { kid1: { games: { 'math-adventure': { enabled: true } } } },
    };
    const result = resolveScopeOverride(store, null);
    expect(result.games?.['math-adventure']).toEqual({ enabled: false });
  });
});

describe('resolveFeatureFlags', () => {
  it('returns a clone of defaults when no override', () => {
    const flags = resolveFeatureFlags(defaultFlags, {});
    expect(flags).toEqual(defaultFlags);
    expect(flags).not.toBe(defaultFlags);
    expect(flags['game.math-adventure']).not.toBe(defaultFlags['game.math-adventure']);
  });

  it('applies a non-game feature override', () => {
    const flags = resolveFeatureFlags(defaultFlags, {
      features: { 'daily-challenge': { enabled: false } },
    });
    expect(flags['daily-challenge'].enabled).toBe(false);
    expect(flags['daily-challenge'].description).toBe('Daily');
  });

  it('folds game enable/disable into the game.<id> flag', () => {
    const flags = resolveFeatureFlags(defaultFlags, {
      games: { 'math-adventure': { enabled: false } },
    });
    expect(flags['game.math-adventure'].enabled).toBe(false);
  });

  it('creates a flag entry for a game with no bundled default', () => {
    const flags = resolveFeatureFlags(defaultFlags, {
      games: { 'new-game': { enabled: false } },
    });
    expect(flags['game.new-game']).toEqual({ enabled: false, description: '' });
  });

  it('ignores game overrides without an explicit enabled value', () => {
    const flags = resolveFeatureFlags(defaultFlags, {
      games: { 'math-adventure': { maxDifficulty: 2 } },
    });
    expect(flags['game.math-adventure'].enabled).toBe(true);
  });
});

describe('resolveGameConstraint', () => {
  it('falls back to manifest values with no override', () => {
    expect(resolveGameConstraint(manifest, {})).toEqual({
      minDifficulty: 1,
      maxDifficulty: 5,
      ageRange: [6, 8],
    });
  });

  it('lowers max difficulty within the game ceiling', () => {
    const c = resolveGameConstraint(manifest, {
      games: { 'math-adventure': { maxDifficulty: 3 } },
    });
    expect(c.maxDifficulty).toBe(3);
  });

  it('clamps an over-ambitious max difficulty to the game ceiling', () => {
    const c = resolveGameConstraint(manifest, {
      games: { 'math-adventure': { maxDifficulty: 99 } },
    });
    expect(c.maxDifficulty).toBe(5);
  });

  it('keeps min <= max when both are overridden inconsistently', () => {
    const c = resolveGameConstraint(manifest, {
      games: { 'math-adventure': { minDifficulty: 4, maxDifficulty: 2 } },
    });
    expect(c.minDifficulty).toBeLessThanOrEqual(c.maxDifficulty);
  });

  it('applies an age-range override and normalises reversed bounds', () => {
    const c = resolveGameConstraint(manifest, {
      games: { 'math-adventure': { ageRange: [9, 5] } },
    });
    expect(c.ageRange).toEqual([5, 9]);
  });
});

describe('isRewardEnabled', () => {
  it('defaults to enabled', () => {
    expect(isRewardEnabled('speed-demon', {})).toBe(true);
  });

  it('is disabled only when explicitly set false', () => {
    expect(isRewardEnabled('speed-demon', { rewards: { 'speed-demon': { enabled: false } } })).toBe(
      false,
    );
    expect(isRewardEnabled('speed-demon', { rewards: { 'speed-demon': { enabled: true } } })).toBe(
      true,
    );
  });
});

describe('clampDifficulty', () => {
  it('clamps into the effective bounds', () => {
    const c = { minDifficulty: 2, maxDifficulty: 4, ageRange: [6, 8] as [number, number] };
    expect(clampDifficulty(1, c)).toBe(2);
    expect(clampDifficulty(3, c)).toBe(3);
    expect(clampDifficulty(9, c)).toBe(4);
  });
});
