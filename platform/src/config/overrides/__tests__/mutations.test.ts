import { describe, it, expect } from 'vitest';
import {
  clearGameOverride,
  isOverrideEmpty,
  readScope,
  setFeatureOverride,
  setGameOverride,
  setRewardOverride,
  writeScope,
} from '../mutations';
import { emptyStore } from '../store';
import type { ConfigOverrideStore } from '../types';

describe('readScope', () => {
  it('reads global vs per-profile, defaulting to {}', () => {
    const store: ConfigOverrideStore = {
      version: 1,
      global: { games: { a: { enabled: false } } },
      perProfile: { kid1: { rewards: { r: { enabled: false } } } },
    };
    expect(readScope(store, null)).toEqual({ games: { a: { enabled: false } } });
    expect(readScope(store, 'kid1')).toEqual({ rewards: { r: { enabled: false } } });
    expect(readScope(store, 'unknown')).toEqual({});
  });
});

describe('isOverrideEmpty', () => {
  it('detects empty and non-empty overrides', () => {
    expect(isOverrideEmpty({})).toBe(true);
    expect(isOverrideEmpty({ games: {} })).toBe(true);
    expect(isOverrideEmpty({ games: { a: { enabled: false } } })).toBe(false);
  });
});

describe('writeScope', () => {
  it('writes the global scope even when empty', () => {
    const next = writeScope(emptyStore(), null, { games: { a: { enabled: false } } });
    expect(next.global).toEqual({ games: { a: { enabled: false } } });
  });

  it('prunes an empty per-profile scope', () => {
    const store: ConfigOverrideStore = {
      version: 1,
      global: {},
      perProfile: { kid1: { games: { a: { enabled: false } } } },
    };
    const next = writeScope(store, 'kid1', {});
    expect(next.perProfile).toEqual({});
  });

  it('stores a non-empty per-profile scope', () => {
    const next = writeScope(emptyStore(), 'kid1', { rewards: { r: { enabled: false } } });
    expect(next.perProfile.kid1).toEqual({ rewards: { r: { enabled: false } } });
  });
});

describe('setGameOverride', () => {
  it('sets and merges fields', () => {
    let o = setGameOverride({}, 'math', { enabled: false });
    o = setGameOverride(o, 'math', { maxDifficulty: 3 });
    expect(o.games?.math).toEqual({ enabled: false, maxDifficulty: 3 });
  });

  it('removes a field when patched with undefined and drops empty game', () => {
    let o = setGameOverride({}, 'math', { maxDifficulty: 3 });
    o = setGameOverride(o, 'math', { maxDifficulty: undefined });
    expect(o.games).toBeUndefined();
  });

  it('keeps other games intact', () => {
    let o = setGameOverride({}, 'a', { enabled: false });
    o = setGameOverride(o, 'b', { enabled: false });
    o = clearGameOverride(o, 'a');
    expect(o.games).toEqual({ b: { enabled: false } });
  });
});

describe('setFeatureOverride / setRewardOverride', () => {
  it('sets and clears a feature', () => {
    let o = setFeatureOverride({}, 'daily-challenge', false);
    expect(o.features).toEqual({ 'daily-challenge': { enabled: false } });
    o = setFeatureOverride(o, 'daily-challenge', undefined);
    expect(o.features).toBeUndefined();
  });

  it('sets and clears a reward', () => {
    let o = setRewardOverride({}, 'speed-demon', false);
    expect(o.rewards).toEqual({ 'speed-demon': { enabled: false } });
    o = setRewardOverride(o, 'speed-demon', undefined);
    expect(o.rewards).toBeUndefined();
  });
});
