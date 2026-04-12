import { describe, it, expect } from 'vitest';
import { selectWords } from '../utils/wordSelector';
import wordsTiny from '../data/words-tiny.json';
import wordsJunior from '../data/words-junior.json';
import wordsExplorer from '../data/words-explorer.json';

describe('selectWords', () => {
  it('returns the requested number of words', () => {
    const result = selectWords(wordsTiny, { difficulty: 1, count: 4 });
    expect(result).toHaveLength(4);
  });

  it('returns words at or below the requested difficulty', () => {
    const result = selectWords(wordsTiny, { difficulty: 2, count: 6 });
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(2);
    }
  });

  it('prioritizes words closest to the target difficulty', () => {
    const result = selectWords(wordsJunior, { difficulty: 5, count: 3 });
    const difficulties = result.map((w) => w.difficulty);
    expect(Math.max(...difficulties)).toBe(5);
  });

  it('returns fewer words if pool is smaller than count', () => {
    const result = selectWords(wordsTiny, { difficulty: 1, count: 100 });
    expect(result.length).toBeLessThanOrEqual(wordsTiny.filter((w) => w.difficulty <= 1).length);
  });

  it('shuffles the result (non-deterministic, run multiple times)', () => {
    const results = Array.from({ length: 5 }, () =>
      selectWords(wordsJunior, { difficulty: 6, count: 8 }).map((w) => w.word),
    );
    const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
    expect(allSame).toBe(false);
  });

  it('works with explorer word pool and high difficulty', () => {
    const result = selectWords(wordsExplorer, { difficulty: 10, count: 5 });
    expect(result.length).toBeGreaterThan(0);
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(10);
    }
  });

  it('excludes specified words from selection', () => {
    const result = selectWords(wordsTiny, { difficulty: 4, count: 10, exclude: ['cat', 'dog', 'sun'] });
    const words = result.map((w) => w.word);
    expect(words).not.toContain('cat');
    expect(words).not.toContain('dog');
    expect(words).not.toContain('sun');
  });

  it('returns empty array when all eligible words are excluded', () => {
    const allDiff1 = wordsTiny.filter((w) => w.difficulty <= 1);
    const excludeAll = allDiff1.map((w) => w.word);
    const result = selectWords(wordsTiny, { difficulty: 1, count: 5, exclude: excludeAll });
    expect(result).toHaveLength(0);
  });

  it('works normally when exclude is omitted', () => {
    const result = selectWords(wordsTiny, { difficulty: 2, count: 4 });
    expect(result).toHaveLength(4);
  });
});
