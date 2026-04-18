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

  it('clamps result to the pool size when count exceeds the entire pool', () => {
    const result = selectWords(wordsTiny, { difficulty: 1, count: 1000 });
    expect(result).toHaveLength(wordsTiny.length);
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

  it('widens difficulty when the at-or-below pool is fully excluded', () => {
    const allDiff1 = wordsTiny.filter((w) => w.difficulty <= 1);
    const excludeAll = allDiff1.map((w) => w.word);
    const result = selectWords(wordsTiny, { difficulty: 1, count: 5, exclude: excludeAll });
    expect(result).toHaveLength(5);
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(3);
      expect(excludeAll).not.toContain(word.word);
    }
  });

  it('falls through to whole-pool fallback when the pool is smaller than count', () => {
    // Pool has 2 unique words and both are excluded — Layer 3 can't
    // satisfy count (2 < 5), so Layer 4 returns whatever the whole pool
    // offers. Layer 3 proper is covered by the 'uses repeats while
    // honoring the +2 difficulty ceiling (Layer 3)' test below.
    const narrowPool = [
      { word: 'a', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
      { word: 'b', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
    ];
    const result = selectWords(narrowPool, {
      difficulty: 1,
      count: 5,
      exclude: ['a', 'b'],
    });
    expect(result).toHaveLength(2);
    const words = result.map((w) => w.word).sort();
    expect(words).toEqual(['a', 'b']);
  });

  it('uses repeats while honoring the +2 difficulty ceiling (Layer 3)', () => {
    // Pool has 5 words at difficulty 1-3, and 2 words at difficulty 10.
    // Target difficulty 1, all difficulty 1-3 words excluded, count = 5.
    // Layer 1 & 2 skip (eligible after exclude is empty), Layer 3 fires
    // (pool has 5 words within diff+2=3 when exclude is ignored).
    // Layer 4 should NOT fire — the ceiling should hold.
    const pool = [
      { word: 'a', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
      { word: 'b', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
      { word: 'c', difficulty: 2, image: '', definition: '', origin: '', sentence: '' },
      { word: 'd', difficulty: 2, image: '', definition: '', origin: '', sentence: '' },
      { word: 'e', difficulty: 3, image: '', definition: '', origin: '', sentence: '' },
      { word: 'hard1', difficulty: 10, image: '', definition: '', origin: '', sentence: '' },
      { word: 'hard2', difficulty: 10, image: '', definition: '', origin: '', sentence: '' },
    ];
    const result = selectWords(pool, {
      difficulty: 1,
      count: 5,
      exclude: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(result).toHaveLength(5);
    // Every returned word must be within the +2 ceiling — no hard1/hard2.
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(3);
      expect(['hard1', 'hard2']).not.toContain(word.word);
    }
  });

  it('primary path prefers words at-or-below target and keeps exclude honored', () => {
    const result = selectWords(wordsJunior, { difficulty: 4, count: 3, exclude: ['book'] });
    expect(result).toHaveLength(3);
    for (const word of result) {
      expect(word.difficulty).toBeLessThanOrEqual(4);
      expect(word.word).not.toBe('book');
    }
  });

  it('works normally when exclude is omitted', () => {
    const result = selectWords(wordsTiny, { difficulty: 2, count: 4 });
    expect(result).toHaveLength(4);
  });
});
