import famousData from '../data/countries-famous.json';
import worldData from '../data/countries-world.json';

export const CONTINENTS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
] as const;

export type Continent = (typeof CONTINENTS)[number];

export interface Country {
  /** ISO 3166-1 alpha-2 code (lowercased to build the flag asset path). */
  code: string;
  name: string;
  nameFr?: string;
  capital: string;
  capitalFr?: string;
  continent: Continent;
  /** 1 (very famous) … 5 (obscure). */
  difficulty: number;
  facts: string[];
  factsFr?: string[];
}

const ALL_COUNTRIES: Country[] = [...(famousData as Country[]), ...(worldData as Country[])];

export function getAllCountries(): Country[] {
  return ALL_COUNTRIES;
}

/**
 * Returns countries at or below the given difficulty. Difficulty 0 or less
 * yields an empty pool; this never throws so callers can pass raw config.
 */
export function getPool(maxDifficulty: number): Country[] {
  return ALL_COUNTRIES.filter((c) => c.difficulty <= maxDifficulty);
}

/**
 * Builds the regional-indicator flag emoji from a 2-letter code. Used as the
 * graceful fallback for `<IconImage>` when the SVG flag asset is absent
 * (CI, fresh checkout, before the image pipeline runs). Codes without a
 * Unicode flag (e.g. "XK") simply render as their letter pair, which is an
 * acceptable, never-empty fallback.
 */
export function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🏳️';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (upper.charCodeAt(0) - 65), base + (upper.charCodeAt(1) - 65));
}

export function flagSrc(code: string): string {
  return `/images/flags/${code.toLowerCase()}.svg`;
}

export function localizedName(country: Country, lang: string): string {
  return lang === 'fr' && country.nameFr ? country.nameFr : country.name;
}

export function localizedCapital(country: Country, lang: string): string {
  return lang === 'fr' && country.capitalFr ? country.capitalFr : country.capital;
}

export function localizedFact(country: Country, index: number, lang: string): string {
  const fr = country.factsFr;
  if (lang === 'fr' && fr && fr[index]) return fr[index];
  return country.facts[index] ?? country.facts[0] ?? '';
}

const CONTINENT_KEYS: Record<Continent, string> = {
  Africa: 'africa',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'northAmerica',
  'South America': 'southAmerica',
  Oceania: 'oceania',
};

/** Stable i18n key suffix for a continent (e.g. "North America" → "northAmerica"). */
export function continentKey(continent: Continent): string {
  return CONTINENT_KEYS[continent];
}

const CONTINENT_EMOJI: Record<Continent, string> = {
  Africa: '🌍',
  Asia: '🌏',
  Europe: '🌍',
  'North America': '🌎',
  'South America': '🌎',
  Oceania: '🌏',
};

export function continentEmoji(continent: Continent): string {
  return CONTINENT_EMOJI[continent];
}
