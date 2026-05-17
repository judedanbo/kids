import { describe, it, expect, beforeEach } from 'vitest';
import {
  CONFIG_OVERRIDE_STORAGE_KEY,
  emptyStore,
  loadConfigOverrides,
  removeProfileOverrides,
  saveConfigOverrides,
} from '../store';
import type { ConfigOverrideStore } from '../types';

describe('config override store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty store when nothing is persisted', () => {
    expect(loadConfigOverrides()).toEqual(emptyStore());
  });

  it('round-trips a saved store', () => {
    const store: ConfigOverrideStore = {
      version: 1,
      global: { games: { 'math-adventure': { enabled: false } } },
      perProfile: { kid1: { rewards: { 'speed-demon': { enabled: false } } } },
    };
    saveConfigOverrides(store);
    expect(loadConfigOverrides()).toEqual(store);
  });

  it('falls back to empty on malformed JSON', () => {
    window.localStorage.setItem(CONFIG_OVERRIDE_STORAGE_KEY, '{not json');
    expect(loadConfigOverrides()).toEqual(emptyStore());
  });

  it('falls back to empty on a version mismatch', () => {
    window.localStorage.setItem(
      CONFIG_OVERRIDE_STORAGE_KEY,
      JSON.stringify({ version: 99, global: {}, perProfile: {} }),
    );
    expect(loadConfigOverrides()).toEqual(emptyStore());
  });

  it('structurally sanitises a malformed but versioned payload', () => {
    window.localStorage.setItem(
      CONFIG_OVERRIDE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        global: { games: 'oops', features: { 'daily-challenge': { enabled: false } } },
        perProfile: 'nope',
      }),
    );
    const loaded = loadConfigOverrides();
    expect(loaded.perProfile).toEqual({});
    expect(loaded.global.games).toBeUndefined();
    expect(loaded.global.features).toEqual({ 'daily-challenge': { enabled: false } });
  });

  it('removes a profile\'s overrides', () => {
    const store: ConfigOverrideStore = {
      version: 1,
      global: {},
      perProfile: { kid1: { games: {} }, kid2: { games: {} } },
    };
    const next = removeProfileOverrides(store, 'kid1');
    expect(next.perProfile).toEqual({ kid2: { games: {} } });
    expect(removeProfileOverrides(store, 'unknown')).toBe(store);
  });
});
