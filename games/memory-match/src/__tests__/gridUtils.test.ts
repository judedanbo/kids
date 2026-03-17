import { describe, it, expect } from 'vitest';
import {
  getGridConfig,
  generateCards,
  ALL_ILLUSTRATIONS,
  GRID_CONFIGS,
} from '../utils/gridUtils';
import type { IllustrationName } from '../utils/gridUtils';

describe('getGridConfig', () => {
  it('returns pairs: 2 for difficulty 1', () => {
    expect(getGridConfig(1).pairs).toBe(2);
  });

  it('returns pairs: 4 for difficulty 3', () => {
    expect(getGridConfig(3).pairs).toBe(4);
  });

  it('returns pairs: 8 for difficulty 5', () => {
    expect(getGridConfig(5).pairs).toBe(8);
  });

  it('returns correct columns and rows for each difficulty', () => {
    expect(getGridConfig(1)).toMatchObject({ columns: 2, rows: 2 });
    expect(getGridConfig(2)).toMatchObject({ columns: 3, rows: 2 });
    expect(getGridConfig(3)).toMatchObject({ columns: 4, rows: 2 });
    expect(getGridConfig(4)).toMatchObject({ columns: 4, rows: 3 });
    expect(getGridConfig(5)).toMatchObject({ columns: 4, rows: 4 });
  });

  it('falls back to difficulty 1 for invalid input (0)', () => {
    expect(getGridConfig(0)).toEqual(GRID_CONFIGS[1]);
  });

  it('falls back to difficulty 1 for invalid input (99)', () => {
    expect(getGridConfig(99)).toEqual(GRID_CONFIGS[1]);
  });

  it('falls back to difficulty 1 for negative input', () => {
    expect(getGridConfig(-1)).toEqual(GRID_CONFIGS[1]);
  });
});

describe('generateCards', () => {
  it('returns pairs × 2 cards for difficulty 1 (2 pairs = 4 cards)', () => {
    const cards = generateCards(1);
    expect(cards).toHaveLength(4);
  });

  it('returns pairs × 2 cards for difficulty 3 (4 pairs = 8 cards)', () => {
    const cards = generateCards(3);
    expect(cards).toHaveLength(8);
  });

  it('returns pairs × 2 cards for difficulty 5 (8 pairs = 16 cards)', () => {
    const cards = generateCards(5);
    expect(cards).toHaveLength(16);
  });

  it('each illustration appears exactly twice', () => {
    for (let diff = 1; diff <= 5; diff++) {
      const cards = generateCards(diff);
      const counts: Record<string, number> = {};
      for (const card of cards) {
        counts[card.illustration] = (counts[card.illustration] ?? 0) + 1;
      }
      for (const count of Object.values(counts)) {
        expect(count).toBe(2);
      }
    }
  });

  it('card IDs are unique', () => {
    for (let diff = 1; diff <= 5; diff++) {
      const cards = generateCards(diff);
      const ids = cards.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(cards.length);
    }
  });

  it('cards sharing pairId have the same illustration', () => {
    for (let diff = 1; diff <= 5; diff++) {
      const cards = generateCards(diff);
      const pairGroups: Record<number, string[]> = {};
      for (const card of cards) {
        if (!pairGroups[card.pairId]) pairGroups[card.pairId] = [];
        pairGroups[card.pairId].push(card.illustration);
      }
      for (const illustrations of Object.values(pairGroups)) {
        expect(illustrations).toHaveLength(2);
        expect(illustrations[0]).toBe(illustrations[1]);
      }
    }
  });

  it('all card illustrations are valid IllustrationName values', () => {
    const validIllustrations = new Set<IllustrationName>(ALL_ILLUSTRATIONS);
    for (let diff = 1; diff <= 5; diff++) {
      const cards = generateCards(diff);
      for (const card of cards) {
        expect(validIllustrations.has(card.illustration)).toBe(true);
      }
    }
  });

  it('cards are shuffled (not always in the same order)', () => {
    // Run multiple times and check that we get different orderings
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const cards = generateCards(5);
      orders.add(cards.map((c) => c.illustration).join(','));
    }
    // With 16 cards the probability of getting the same order twice is astronomically low
    expect(orders.size).toBeGreaterThan(1);
  });

  it('picks illustrations randomly (different illustrations across runs)', () => {
    // Run multiple times for difficulty 1 (2 pairs) and verify not always same pair
    const illustrationSets = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const cards = generateCards(1);
      const illustrations = [...new Set(cards.map((c) => c.illustration))].sort().join(',');
      illustrationSets.add(illustrations);
    }
    // With 10 illustrations choosing 2, we should see variety
    expect(illustrationSets.size).toBeGreaterThan(1);
  });
});
