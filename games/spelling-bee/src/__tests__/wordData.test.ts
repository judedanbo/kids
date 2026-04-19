import { describe, it, expect } from 'vitest';
import wordsTiny from '../data/words-tiny.json';
import wordsJunior from '../data/words-junior.json';
import wordsExplorer from '../data/words-explorer.json';

interface WordEntry {
  word: string;
  sentence: string;
}

const datasets: { name: string; entries: WordEntry[] }[] = [
  { name: 'words-tiny', entries: wordsTiny as WordEntry[] },
  { name: 'words-junior', entries: wordsJunior as WordEntry[] },
  { name: 'words-explorer', entries: wordsExplorer as WordEntry[] },
];

describe('word data integrity', () => {
  for (const { name, entries } of datasets) {
    describe(name, () => {
      it.each(entries)(
        'sentence for "$word" contains the exact word as a whole-word match',
        ({ word, sentence }) => {
          const re = new RegExp(`\\b${word}\\b`, 'i');
          expect(
            re.test(sentence),
            `Expected sentence for "${word}" to contain the exact word (whole-word, case-insensitive). Sentence: "${sentence}"`,
          ).toBe(true);
        },
      );
    });
  }
});
