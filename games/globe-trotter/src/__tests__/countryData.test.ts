import { describe, it, expect } from 'vitest';
import { getAllCountries, CONTINENTS, flagEmoji, flagSrc } from '../utils/countryPool';
import enLocale from '../locales/en/globe-trotter.json';
import frLocale from '../locales/fr/globe-trotter.json';

const ALL = getAllCountries();

describe('country data integrity', () => {
  it('has a reasonably comprehensive set of countries', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(180);
  });

  it('every country has the required fields', () => {
    for (const c of ALL) {
      expect(typeof c.code).toBe('string');
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.capital.length).toBeGreaterThan(0);
      expect(CONTINENTS).toContain(c.continent);
      expect(c.difficulty).toBeGreaterThanOrEqual(1);
      expect(c.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('every country has at least one kid-friendly fact', () => {
    for (const c of ALL) {
      expect(c.facts.length).toBeGreaterThanOrEqual(1);
      for (const f of c.facts) {
        expect(f.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('has no duplicate country codes', () => {
    const codes = ALL.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('builds a flag emoji and asset path for every country', () => {
    for (const c of ALL) {
      expect(flagEmoji(c.code).length).toBeGreaterThan(0);
      expect(flagSrc(c.code)).toBe(`/images/flags/${c.code.toLowerCase()}.svg`);
    }
  });

  it('keeps French facts aligned with English when provided', () => {
    for (const c of ALL) {
      if (c.factsFr) {
        expect(c.factsFr.length).toBe(c.facts.length);
      }
    }
  });
});

describe('locale completeness', () => {
  const keys = (o: Record<string, string>) => Object.keys(o).sort();

  it('French locale has every key from the English locale', () => {
    const missing = keys(enLocale).filter((k) => !keys(frLocale).includes(k));
    expect(missing).toEqual([]);
  });

  it('French locale has no extra keys', () => {
    const extra = keys(frLocale).filter((k) => !keys(enLocale).includes(k));
    expect(extra).toEqual([]);
  });
});
