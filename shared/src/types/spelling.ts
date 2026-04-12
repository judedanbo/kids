import type { AgeTier } from './game';

/**
 * A single spelling-bee word, matching the on-disk shape in
 * `games/spelling-bee/src/data/words-*.json`. Metadata fields (`definition`,
 * `origin`, `sentence`) are optionally empty strings on fresh entries; the
 * content generator tool fills them in.
 */
export interface SpellingWordEntry {
  word: string;
  difficulty: number;
  image: string;
  definition: string;
  origin: string;
  sentence: string;
}

/** A tier's complete word list, as stored on disk (a bare JSON array). */
export type SpellingWordList = SpellingWordEntry[];

/** Language code used by the audio pipeline (e.g. `"en-US"`). */
export interface SpellingTierFile {
  tier: AgeTier;
  path: string;
  words: SpellingWordList;
}
