import { describe, it, expect } from 'vitest';
import { generateComparison } from '../utils/comparisonGenerator';
import type {
  ObjectComparison,
  NumberComparison,
  OrderingComparison,
} from '../utils/comparisonGenerator';

// ─── Tiny tier ────────────────────────────────────────────────────────────────

describe('generateComparison – tiny tier', () => {
  it('returns an ObjectComparison with exactly 2 groups', () => {
    const result = generateComparison('tiny', 1) as ObjectComparison;
    expect(result.type).toBe('objects');
    expect(result.groups).toHaveLength(2);
  });

  it('groups have different counts (values are unique)', () => {
    // run multiple times to guard against lucky collisions
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('tiny', 1) as ObjectComparison;
      expect(result.groups[0].count).not.toBe(result.groups[1].count);
    }
  });

  it('prompt is either "more" or "less"', () => {
    const result = generateComparison('tiny', 1) as ObjectComparison;
    expect(['more', 'less']).toContain(result.prompt);
  });

  it('correctIndex is 0 or 1', () => {
    const result = generateComparison('tiny', 1) as ObjectComparison;
    expect([0, 1]).toContain(result.correctIndex);
  });

  it('correctIndex points to the group with "more" when prompt is "more"', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('tiny', 1) as ObjectComparison;
      const correct = result.groups[result.correctIndex];
      const other = result.groups[result.correctIndex === 0 ? 1 : 0];
      if (result.prompt === 'more') {
        expect(correct.count).toBeGreaterThan(other.count);
      } else {
        expect(correct.count).toBeLessThan(other.count);
      }
    }
  });

  it('difficulty 1 produces a large gap (≥3) between group counts', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('tiny', 1) as ObjectComparison;
      const gap = Math.abs(result.groups[0].count - result.groups[1].count);
      expect(gap).toBeGreaterThanOrEqual(3);
    }
  });

  it('higher difficulty (5) can produce smaller gaps (<3)', () => {
    const gaps: number[] = [];
    for (let i = 0; i < 50; i++) {
      const result = generateComparison('tiny', 5) as ObjectComparison;
      gaps.push(Math.abs(result.groups[0].count - result.groups[1].count));
    }
    // At least some gaps should be less than 3 at higher difficulty
    expect(gaps.some((g) => g < 3)).toBe(true);
  });

  it('objectType is drawn from the valid pool', () => {
    const validTypes = ['apple', 'star', 'block', 'butterfly', 'fish', 'flower'];
    for (let i = 0; i < 10; i++) {
      const result = generateComparison('tiny', 1) as ObjectComparison;
      for (const group of result.groups) {
        expect(validTypes).toContain(group.objectType);
      }
    }
  });
});

// ─── Junior tier ──────────────────────────────────────────────────────────────

describe('generateComparison – junior tier', () => {
  it('returns a NumberComparison with exactly 3 values', () => {
    const result = generateComparison('junior', 1) as NumberComparison;
    expect(result.type).toBe('numbers');
    expect(result.values).toHaveLength(3);
    expect(result.displayValues).toHaveLength(3);
  });

  it('all values are unique', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('junior', 1) as NumberComparison;
      const unique = new Set(result.values);
      expect(unique.size).toBe(result.values.length);
    }
  });

  it('difficulty 1 produces single-digit numbers (1–9)', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('junior', 1) as NumberComparison;
      for (const v of result.values) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
  });

  it('difficulty 2 produces single-digit numbers (1–9)', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('junior', 2) as NumberComparison;
      for (const v of result.values) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
  });

  it('difficulty 3 produces two-digit numbers (10–99)', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('junior', 3) as NumberComparison;
      for (const v of result.values) {
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(99);
      }
    }
  });

  it('difficulty 5 produces three-digit numbers (100–999)', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('junior', 5) as NumberComparison;
      for (const v of result.values) {
        expect(v).toBeGreaterThanOrEqual(100);
        expect(v).toBeLessThanOrEqual(999);
      }
    }
  });

  it('prompt is either "more" or "less"', () => {
    const result = generateComparison('junior', 1) as NumberComparison;
    expect(['more', 'less']).toContain(result.prompt);
  });

  it('correctIndex points to the highest value when prompt is "more"', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('junior', 1) as NumberComparison;
      const correctValue = result.values[result.correctIndex];
      if (result.prompt === 'more') {
        expect(correctValue).toBe(Math.max(...result.values));
      } else {
        expect(correctValue).toBe(Math.min(...result.values));
      }
    }
  });

  it('displayValues for integers are formatted without decimals', () => {
    for (let i = 0; i < 10; i++) {
      const result = generateComparison('junior', 1) as NumberComparison;
      for (let j = 0; j < result.values.length; j++) {
        expect(result.displayValues[j]).toBe(String(result.values[j]));
      }
    }
  });
});

// ─── Explorer tier ────────────────────────────────────────────────────────────

describe('generateComparison – explorer tier', () => {
  it('returns a NumberComparison or OrderingComparison', () => {
    const result = generateComparison('explorer', 1);
    expect(['numbers', 'ordering']).toContain(result.type);
  });

  it('NumberComparison has 4 values at low difficulty', () => {
    for (let i = 0; i < 10; i++) {
      const result = generateComparison('explorer', 1);
      if (result.type === 'numbers') {
        expect(result.values).toHaveLength(4);
      }
    }
  });

  it('difficulty ≤3 returns whole numbers (no decimals)', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('explorer', 2);
      if (result.type === 'numbers' || result.type === 'ordering') {
        for (const v of result.values) {
          expect(Number.isInteger(v)).toBe(true);
        }
      }
    }
  });

  it('difficulty 4 can introduce decimal values', () => {
    const hasDecimal: boolean[] = [];
    for (let i = 0; i < 50; i++) {
      const result = generateComparison('explorer', 4);
      if (result.type === 'numbers' || result.type === 'ordering') {
        hasDecimal.push(result.values.some((v) => !Number.isInteger(v)));
      }
    }
    expect(hasDecimal.some(Boolean)).toBe(true);
  });

  it('difficulty 5 can introduce decimal values', () => {
    const hasDecimal: boolean[] = [];
    for (let i = 0; i < 50; i++) {
      const result = generateComparison('explorer', 5);
      if (result.type === 'numbers' || result.type === 'ordering') {
        hasDecimal.push(result.values.some((v) => !Number.isInteger(v)));
      }
    }
    expect(hasDecimal.some(Boolean)).toBe(true);
  });

  it('difficulty 6+ returns an OrderingComparison', () => {
    for (let i = 0; i < 10; i++) {
      const result = generateComparison('explorer', 6);
      expect(result.type).toBe('ordering');
    }
  });

  it('OrderingComparison has 4–5 values', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('explorer', 6) as OrderingComparison;
      expect(result.values.length).toBeGreaterThanOrEqual(4);
      expect(result.values.length).toBeLessThanOrEqual(5);
    }
  });

  it('OrderingComparison correctOrder is sorted ascending', () => {
    for (let i = 0; i < 20; i++) {
      const result = generateComparison('explorer', 6) as OrderingComparison;
      const sorted = [...result.values].sort((a, b) => a - b);
      const correctByIndex = result.correctOrder.map((i) => result.values[i]);
      expect(correctByIndex).toEqual(sorted);
    }
  });

  it('difficulty 8 can produce negative numbers', () => {
    const hasNegative: boolean[] = [];
    for (let i = 0; i < 50; i++) {
      const result = generateComparison('explorer', 8);
      if (result.type === 'numbers' || result.type === 'ordering') {
        hasNegative.push(result.values.some((v) => v < 0));
      }
    }
    expect(hasNegative.some(Boolean)).toBe(true);
  });

  it('all values are unique', () => {
    for (let i = 0; i < 30; i++) {
      const result = generateComparison('explorer', 3);
      if (result.type !== 'objects') {
        const unique = new Set(result.values);
        expect(unique.size).toBe(result.values.length);
      }
    }
  });

  it('displayValues format decimals with one decimal place', () => {
    let foundDecimal = false;
    for (let i = 0; i < 50; i++) {
      const result = generateComparison('explorer', 4);
      if (result.type === 'numbers') {
        for (let j = 0; j < result.values.length; j++) {
          const v = result.values[j];
          if (!Number.isInteger(v)) {
            foundDecimal = true;
            expect(result.displayValues[j]).toMatch(/^-?\d+\.\d$/);
          } else {
            expect(result.displayValues[j]).toBe(String(v));
          }
        }
      }
    }
    if (!foundDecimal) {
      // Not a failure — just means no decimal was generated this run; the other test covers presence
    }
  });
});
