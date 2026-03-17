import { describe, it, expect } from 'vitest';
import { scrambleWord } from '../utils/scramble';

describe('scrambleWord', () => {
  it('returns a string of the same length as the original', () => {
    expect(scrambleWord('cat')).toHaveLength(3);
    expect(scrambleWord('elephant')).toHaveLength(8);
  });

  it('contains exactly the same letters as the original', () => {
    const word = 'puzzle';
    const scrambled = scrambleWord(word);
    expect(scrambled.split('').sort().join('')).toBe(word.split('').sort().join(''));
  });

  it('returns a different arrangement than the original (with retries)', () => {
    const word = 'scramble';
    let gotDifferent = false;
    for (let i = 0; i < 20; i++) {
      if (scrambleWord(word) !== word) {
        gotDifferent = true;
        break;
      }
    }
    expect(gotDifferent).toBe(true);
  });

  it('handles 2-letter words by swapping', () => {
    const result = scrambleWord('at');
    expect(result).toBe('ta');
  });

  it('handles single-letter words by returning the same letter', () => {
    expect(scrambleWord('a')).toBe('a');
  });

  it('handles longer words and always returns same letters', () => {
    for (let i = 0; i < 10; i++) {
      const word = 'butterfly';
      const result = scrambleWord(word);
      expect(result.length).toBe(word.length);
      expect(result.split('').sort().join('')).toBe(word.split('').sort().join(''));
    }
  });
});
