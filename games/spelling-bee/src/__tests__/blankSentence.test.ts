import { describe, it, expect } from 'vitest';
import { blankSentence, SENTENCE_BLANK } from '../utils/blankSentence';

describe('blankSentence', () => {
  it('replaces a whole-word occurrence with the fixed-width blank', () => {
    expect(blankSentence('The cat sat on the mat.', 'cat')).toBe(
      `The ${SENTENCE_BLANK} sat on the mat.`,
    );
  });

  it('matches case-insensitively but preserves the rest of the sentence verbatim', () => {
    expect(blankSentence('Cat! A fine cat indeed.', 'cat')).toBe(
      `${SENTENCE_BLANK}! A fine ${SENTENCE_BLANK} indeed.`,
    );
  });

  it('uses the same blank width regardless of word length', () => {
    const short = blankSentence('A cat here.', 'cat');
    const long = blankSentence('A refrigerator here.', 'refrigerator');
    const shortBlank = short.replace('A ', '').replace(' here.', '');
    const longBlank = long.replace('A ', '').replace(' here.', '');
    expect(shortBlank).toBe(longBlank);
    expect(shortBlank).toBe(SENTENCE_BLANK);
  });

  it('does not blank substrings that are not whole-word matches', () => {
    // "cat" must not match inside "caterpillar"
    expect(blankSentence('The caterpillar crawled.', 'cat')).toBe(
      'The caterpillar crawled.',
    );
  });

  it('returns the sentence unchanged when the word is absent', () => {
    expect(blankSentence('Nothing to see here.', 'cat')).toBe(
      'Nothing to see here.',
    );
  });

  it('escapes regex metacharacters in the word', () => {
    // Contrived, but guards against crashes if a word contains a dot.
    expect(blankSentence('A c.t walked by.', 'c.t')).toBe(
      `A ${SENTENCE_BLANK} walked by.`,
    );
  });
});
