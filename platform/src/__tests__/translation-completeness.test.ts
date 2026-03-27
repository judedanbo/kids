import { describe, it, expect } from 'vitest';
import enCommon from '../locales/en/common.json';
import frCommon from '../locales/fr/common.json';

function getKeys(obj: Record<string, string>): string[] {
  return Object.keys(obj).sort();
}

describe('translation completeness', () => {
  it('French common has all keys from English common', () => {
    const enKeys = getKeys(enCommon);
    const frKeys = getKeys(frCommon);
    const missing = enKeys.filter((key) => !frKeys.includes(key));
    expect(missing).toEqual([]);
  });

  it('French common has no extra keys beyond English common', () => {
    const enKeys = getKeys(enCommon);
    const frKeys = getKeys(frCommon);
    const extra = frKeys.filter((key) => !enKeys.includes(key));
    expect(extra).toEqual([]);
  });
});
