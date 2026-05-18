import { describe, it, expect } from 'vitest';
import type { GameManifest } from '@kids-games-zone/shared';
import { validateConfigOverride, validateStore } from '../validate';
import type { ConfigValidationContext } from '../types';

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

const ctx: ConfigValidationContext = {
  featureKeys: ['daily-challenge', 'high-contrast-mode'],
  gameRegistry: [manifest],
  rewardIds: ['speed-demon'],
};

describe('validateConfigOverride', () => {
  it('accepts an empty object', () => {
    expect(validateConfigOverride({}, ctx)).toEqual({ ok: true, value: {} });
  });

  it('rejects non-object input', () => {
    const r = validateConfigOverride('nope', ctx);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown top-level sections', () => {
    const r = validateConfigOverride({ wat: {} }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/Unknown section "wat"/);
  });

  it('accepts a valid full override', () => {
    const r = validateConfigOverride(
      {
        features: { 'daily-challenge': { enabled: false } },
        games: { 'math-adventure': { enabled: true, maxDifficulty: 3, ageRange: [6, 9] } },
        rewards: { 'speed-demon': { enabled: false } },
      },
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects unknown feature, game and reward keys', () => {
    expect(validateConfigOverride({ features: { nope: { enabled: true } } }, ctx).ok).toBe(false);
    expect(validateConfigOverride({ games: { nope: { enabled: true } } }, ctx).ok).toBe(false);
    expect(validateConfigOverride({ rewards: { nope: { enabled: true } } }, ctx).ok).toBe(false);
  });

  it('rejects developer-only manifest fields on a game', () => {
    const r = validateConfigOverride(
      { games: { 'math-adventure': { entryPoint: '/evil' } } },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/unknown field "entryPoint"/);
  });

  it('rejects out-of-range difficulty', () => {
    const r = validateConfigOverride(
      { games: { 'math-adventure': { maxDifficulty: 99 } } },
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects minDifficulty greater than maxDifficulty', () => {
    const r = validateConfigOverride(
      { games: { 'math-adventure': { minDifficulty: 4, maxDifficulty: 2 } } },
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects a malformed age range', () => {
    expect(
      validateConfigOverride({ games: { 'math-adventure': { ageRange: [8, 6] } } }, ctx).ok,
    ).toBe(false);
    expect(
      validateConfigOverride({ games: { 'math-adventure': { ageRange: [1] } } }, ctx).ok,
    ).toBe(false);
  });

  it('rejects non-boolean enabled', () => {
    const r = validateConfigOverride(
      { rewards: { 'speed-demon': { enabled: 'yes' } } },
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it('strips empty leaf values but keeps known sections', () => {
    const r = validateConfigOverride({ games: { 'math-adventure': {} } }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.games).toEqual({ 'math-adventure': {} });
  });
});

describe('validateStore', () => {
  it('accepts a valid store and prefixes scope errors', () => {
    const ok = validateStore(
      {
        version: 1,
        global: { games: { 'math-adventure': { enabled: false } } },
        perProfile: { kid1: { rewards: { 'speed-demon': { enabled: false } } } },
      },
      ctx,
    );
    expect(ok.ok).toBe(true);

    const bad = validateStore(
      { version: 1, global: {}, perProfile: { kid1: { games: { nope: {} } } } },
      ctx,
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join()).toMatch(/kid1: Unknown game "nope"/);
  });

  it('rejects a bad version or non-object', () => {
    expect(validateStore({ version: 99, global: {}, perProfile: {} }, ctx).ok).toBe(false);
    expect(validateStore('nope', ctx).ok).toBe(false);
    expect(validateStore({ version: 1, perProfile: 'x' }, ctx).ok).toBe(false);
  });
});
