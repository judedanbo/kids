import { describe, it, expect } from 'vitest';
import { categories, getWordsForRound } from '../data/words';

describe('categories', () => {
  it('has at least 3 categories', () => {
    expect(categories.length).toBeGreaterThanOrEqual(3);
  });

  it('every category has words for all 5 difficulty levels', () => {
    for (const category of categories) {
      for (let d = 1; d <= 5; d++) {
        expect(category.words[d], `${category.name} difficulty ${d}`).toBeDefined();
        expect(category.words[d].length, `${category.name} difficulty ${d} word count`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('word lengths match difficulty: d1=3, d2=4, d3=4-5, d4=5-6, d5=6+', () => {
    for (const category of categories) {
      for (const entry of category.words[1]) {
        expect(entry.word.length, `d1 word "${entry.word}"`).toBe(3);
      }
      for (const entry of category.words[2]) {
        expect(entry.word.length, `d2 word "${entry.word}"`).toBe(4);
      }
      for (const entry of category.words[3]) {
        expect(entry.word.length, `d3 word "${entry.word}"`).toBeGreaterThanOrEqual(4);
        expect(entry.word.length, `d3 word "${entry.word}"`).toBeLessThanOrEqual(5);
      }
      for (const entry of category.words[4]) {
        expect(entry.word.length, `d4 word "${entry.word}"`).toBeGreaterThanOrEqual(5);
        expect(entry.word.length, `d4 word "${entry.word}"`).toBeLessThanOrEqual(6);
      }
      for (const entry of category.words[5]) {
        expect(entry.word.length, `d5 word "${entry.word}"`).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('all words are lowercase alphabetic', () => {
    for (const category of categories) {
      for (let d = 1; d <= 5; d++) {
        for (const entry of category.words[d]) {
          expect(entry.word, `word "${entry.word}" should be lowercase alphabetic`).toMatch(/^[a-z]+$/);
        }
      }
    }
  });

  it('every word has a non-empty clue', () => {
    for (const category of categories) {
      for (let d = 1; d <= 5; d++) {
        for (const entry of category.words[d]) {
          expect(entry.clue.trim(), `clue for "${entry.word}"`).not.toBe('');
        }
      }
    }
  });
});

describe('getWordsForRound', () => {
  it('returns the requested count of words', () => {
    const result = getWordsForRound(0, 1, 5);
    expect(result).toHaveLength(5);
  });

  it('returns word entries with word and clue', () => {
    const result = getWordsForRound(0, 2, 3);
    for (const entry of result) {
      expect(entry.word).toBeTruthy();
      expect(entry.clue).toBeTruthy();
    }
  });

  it('returns different order on repeated calls (shuffled)', () => {
    // With 10+ words asking for 5, there should be variety across many calls
    const results = Array.from({ length: 20 }, () =>
      getWordsForRound(0, 1, 5).map((e) => e.word).join(','),
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(1);
  });
});
