import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin } from '../pin';

describe('PIN hashing', () => {
  it('hashes a PIN and returns salt:hash format', async () => {
    const hashed = await hashPin('1234');
    expect(hashed).toContain(':');
    const [salt, hash] = hashed.split(':');
    expect(salt!.length).toBeGreaterThan(0);
    expect(hash!.length).toBeGreaterThan(0);
  });

  it('produces different hashes for the same PIN (random salt)', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).not.toBe(b);
  });

  it('verifies correct PIN', async () => {
    const hashed = await hashPin('5678');
    expect(await verifyPin('5678', hashed)).toBe(true);
  });

  it('rejects incorrect PIN', async () => {
    const hashed = await hashPin('1234');
    expect(await verifyPin('5678', hashed)).toBe(false);
  });

  it('rejects empty stored hash', async () => {
    expect(await verifyPin('1234', '')).toBe(false);
  });

  it('rejects malformed stored hash', async () => {
    expect(await verifyPin('1234', 'notavalidhash')).toBe(false);
  });
});
