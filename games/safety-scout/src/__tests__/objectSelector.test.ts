import { describe, it, expect } from 'vitest';
import { selectObjects, getCategories } from '../utils/objectSelector';
import objects from '../data/objects.json';
import type { SafetyObject } from '../utils/objectSelector';

const pool = objects as SafetyObject[];

describe('selectObjects', () => {
  it('returns objects from a specific category', () => {
    const result = selectObjects(pool, { category: 'kitchen', difficulty: 5, count: 4 });
    for (const obj of result) {
      expect(obj.category).toBe('kitchen');
    }
  });

  it('filters by difficulty (at or below)', () => {
    const result = selectObjects(pool, { category: null, difficulty: 2, count: 6 });
    for (const obj of result) {
      expect(obj.difficulty).toBeLessThanOrEqual(2);
    }
  });

  it('random mix (category: null) spans multiple categories', () => {
    const result = selectObjects(pool, { category: null, difficulty: 5, count: 10 });
    const categories = new Set(result.map((o) => o.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it('returns the requested count when enough objects exist', () => {
    const result = selectObjects(pool, { category: null, difficulty: 5, count: 6 });
    expect(result).toHaveLength(6);
  });

  it('returns fewer than count if pool is too small', () => {
    const result = selectObjects(pool, { category: 'kitchen', difficulty: 1, count: 100 });
    const eligible = pool.filter((o) => o.category === 'kitchen' && o.difficulty <= 1);
    expect(result.length).toBeLessThanOrEqual(eligible.length);
  });

  it('includes a mix of safe and harmful objects', () => {
    const result = selectObjects(pool, { category: null, difficulty: 5, count: 8 });
    const hasSafe = result.some((o) => o.isSafe === true);
    const hasHarmful = result.some((o) => o.isSafe === false);
    expect(hasSafe).toBe(true);
    expect(hasHarmful).toBe(true);
  });

  it('shuffles result (non-deterministic)', () => {
    const results = Array.from({ length: 6 }, () =>
      selectObjects(pool, { category: null, difficulty: 5, count: 8 }).map((o) => o.id),
    );
    const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
    expect(allSame).toBe(false);
  });

  it('includes mix of safe and harmful within a single category', () => {
    const result = selectObjects(pool, { category: 'kitchen', difficulty: 5, count: 6 });
    const hasSafe = result.some((o) => o.isSafe === true);
    const hasHarmful = result.some((o) => o.isSafe === false);
    expect(hasSafe).toBe(true);
    expect(hasHarmful).toBe(true);
  });
});

describe('getCategories', () => {
  it('returns all 6 categories', () => {
    const categories = getCategories(pool);
    expect(categories).toHaveLength(6);
    expect(categories).toContain('kitchen');
    expect(categories).toContain('bathroom');
    expect(categories).toContain('living-room');
    expect(categories).toContain('outdoor');
    expect(categories).toContain('garage');
    expect(categories).toContain('playground');
  });

  it('returns unique category names (no duplicates)', () => {
    const categories = getCategories(pool);
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);
  });
});
