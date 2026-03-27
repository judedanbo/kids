import { describe, it, expect } from 'vitest';
import enCommon from '../locales/en/common.json';
import frCommon from '../locales/fr/common.json';
import enMemoryMatch from '../../../games/memory-match/src/locales/en/memory-match.json';
import frMemoryMatch from '../../../games/memory-match/src/locales/fr/memory-match.json';
import enMathAdventure from '../../../games/math-adventure/src/locales/en/math-adventure.json';
import frMathAdventure from '../../../games/math-adventure/src/locales/fr/math-adventure.json';
import enWordPuzzle from '../../../games/word-puzzle/src/locales/en/word-puzzle.json';
import frWordPuzzle from '../../../games/word-puzzle/src/locales/fr/word-puzzle.json';

function getKeys(obj: Record<string, string>): string[] {
  return Object.keys(obj).sort();
}

describe('translation completeness', () => {
  it('French common has all keys from English common', () => {
    const enKeys = getKeys(enCommon);
    const frKeys = getKeys(frCommon);
    const missing = enKeys.filter((key) => !frKeys.includes(key));
    expect(missing).toEqual([]);
  });

  it('French common has no extra keys beyond English common', () => {
    const enKeys = getKeys(enCommon);
    const frKeys = getKeys(frCommon);
    const extra = frKeys.filter((key) => !enKeys.includes(key));
    expect(extra).toEqual([]);
  });
});

describe('game translation completeness', () => {
  it('French memory-match has all keys from English', () => {
    const missing = getKeys(enMemoryMatch).filter((k) => !getKeys(frMemoryMatch).includes(k));
    expect(missing).toEqual([]);
  });

  it('French math-adventure has all keys from English', () => {
    const missing = getKeys(enMathAdventure).filter((k) => !getKeys(frMathAdventure).includes(k));
    expect(missing).toEqual([]);
  });

  it('French word-puzzle has all keys from English', () => {
    const missing = getKeys(enWordPuzzle).filter((k) => !getKeys(frWordPuzzle).includes(k));
    expect(missing).toEqual([]);
  });
});
