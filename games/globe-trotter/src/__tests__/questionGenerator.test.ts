import { describe, it, expect } from 'vitest';
import { generateQuestions, type GameMode } from '../utils/questionGenerator';
import { getAllCountries, getPool, CONTINENTS } from '../utils/countryPool';

const ALL = getAllCountries();
const ALL_MODES: GameMode[] = ['capital', 'flag', 'fact', 'continent'];

describe('generateQuestions', () => {
  it('returns the requested number of questions', () => {
    const qs = generateQuestions({ pool: ALL, modes: ALL_MODES, count: 10, difficulty: 3 });
    expect(qs).toHaveLength(10);
  });

  it('returns an empty list for an empty pool or no modes', () => {
    expect(generateQuestions({ pool: [], modes: ALL_MODES, count: 5, difficulty: 1 })).toEqual([]);
    expect(generateQuestions({ pool: ALL, modes: [], count: 5, difficulty: 1 })).toEqual([]);
    expect(generateQuestions({ pool: ALL, modes: ALL_MODES, count: 0, difficulty: 1 })).toEqual([]);
  });

  it('never repeats a subject country within a session', () => {
    const qs = generateQuestions({ pool: ALL, modes: ALL_MODES, count: 30, difficulty: 5 });
    const codes = qs.map((q) => q.subject.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('always includes the correct answer at correctIndex', () => {
    const qs = generateQuestions({ pool: ALL, modes: ALL_MODES, count: 40, difficulty: 4 });
    for (const q of qs) {
      const correct = q.options[q.correctIndex];
      expect(correct).toBeDefined();
      if (q.mode === 'continent') {
        expect(correct.continent).toBe(q.subject.continent);
      } else {
        expect(correct.country?.code).toBe(q.subject.code);
      }
    }
  });

  it('produces 4 unique options for non-continent modes', () => {
    const qs = generateQuestions({
      pool: ALL,
      modes: ['capital', 'flag', 'fact'],
      count: 40,
      difficulty: 3,
    });
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      const codes = q.options.map((o) => o.country?.code);
      expect(new Set(codes).size).toBe(4);
      if (q.mode === 'capital') {
        const capitals = q.options.map((o) => o.country?.capital);
        expect(new Set(capitals).size).toBe(4);
      }
    }
  });

  it('produces all 6 continents as options for continent mode', () => {
    const qs = generateQuestions({ pool: ALL, modes: ['continent'], count: 20, difficulty: 2 });
    for (const q of qs) {
      expect(q.mode).toBe('continent');
      expect(q.options).toHaveLength(6);
      const continents = q.options.map((o) => o.continent).sort();
      expect(continents).toEqual([...CONTINENTS].sort());
    }
  });

  it('only uses the requested modes', () => {
    const qs = generateQuestions({
      pool: ALL,
      modes: ['flag', 'continent'],
      count: 20,
      difficulty: 1,
    });
    for (const q of qs) {
      expect(['flag', 'continent']).toContain(q.mode);
    }
  });

  it('fact-mode questions reference a valid fact index', () => {
    const qs = generateQuestions({ pool: ALL, modes: ['fact'], count: 30, difficulty: 5 });
    for (const q of qs) {
      expect(q.subject.facts.length).toBeGreaterThan(0);
      expect(q.factIndex).toBeGreaterThanOrEqual(0);
      expect(q.factIndex).toBeLessThan(q.subject.facts.length);
    }
  });

  it('respects the difficulty pool filter', () => {
    const easy = getPool(1);
    expect(easy.length).toBeGreaterThan(0);
    expect(easy.every((c) => c.difficulty <= 1)).toBe(true);
    const qs = generateQuestions({ pool: easy, modes: ALL_MODES, count: 5, difficulty: 1 });
    for (const q of qs) {
      expect(q.subject.difficulty).toBeLessThanOrEqual(1);
    }
  });
});
