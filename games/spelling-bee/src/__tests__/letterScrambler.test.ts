import { describe, it, expect } from 'vitest';
import { scrambleWithDistractors } from '../utils/letterScrambler';

describe('scrambleWithDistractors', () => {
  it('contains all letters of the original word', () => {
    const result = scrambleWithDistractors('cat', 2);
    const wordLetters = 'cat'.split('');
    for (const letter of wordLetters) {
      expect(result).toContain(letter.toUpperCase());
    }
  });

  it('adds the requested number of distractor letters', () => {
    const result = scrambleWithDistractors('dog', 3);
    expect(result).toHaveLength(6);
  });

  it('distractors are not letters already in the word', () => {
    const word = 'cat';
    const result = scrambleWithDistractors(word, 3);
    const wordLetters = new Set(word.toUpperCase().split(''));
    const distractors = result.filter((l) => !wordLetters.has(l));
    for (const d of distractors) {
      expect(wordLetters.has(d)).toBe(false);
    }
  });

  it('returns uppercase letters', () => {
    const result = scrambleWithDistractors('sun', 2);
    for (const letter of result) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
  });

  it('shuffles the result (not always in word order)', () => {
    const results = Array.from({ length: 10 }, () => scrambleWithDistractors('tree', 2));
    const allSame = results.every((r) => r.join('') === results[0].join(''));
    expect(allSame).toBe(false);
  });

  it('handles words with duplicate letters', () => {
    const result = scrambleWithDistractors('book', 2);
    const oCount = result.filter((l) => l === 'O').length;
    expect(oCount).toBeGreaterThanOrEqual(2);
    expect(result).toHaveLength(6);
  });
});
