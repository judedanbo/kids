import { describe, it, expect } from 'vitest';
import { generateQuestion, generateRound, getDifficultyConfig } from '../utils/questionGenerator';

describe('getDifficultyConfig', () => {
  it('returns addition-only for difficulty 1', () => {
    const config = getDifficultyConfig(1);
    expect(config.operations).toEqual(['add']);
    expect(config.maxVal).toBe(9);
  });

  it('includes multiply for difficulty 5', () => {
    const config = getDifficultyConfig(5);
    expect(config.operations).toContain('multiply');
  });

  it('falls back to difficulty 1 for invalid input', () => {
    const config = getDifficultyConfig(99);
    expect(config).toEqual(getDifficultyConfig(1));
  });
});

describe('generateQuestion', () => {
  it('generates a valid question for difficulty 1', () => {
    const q = generateQuestion(1);
    expect(q.operandA).toBeGreaterThanOrEqual(1);
    expect(q.operandA).toBeLessThanOrEqual(9);
    expect(q.operandB).toBeGreaterThanOrEqual(1);
    expect(q.operandB).toBeLessThanOrEqual(9);
    expect(q.operation).toBe('add');
    expect(q.correctAnswer).toBe(q.operandA + q.operandB);
  });

  it('includes the correct answer in options', () => {
    const q = generateQuestion(1);
    expect(q.options).toContain(q.correctAnswer);
    expect(q.options).toHaveLength(4);
  });

  it('has no duplicate options', () => {
    const q = generateQuestion(1);
    const unique = new Set(q.options);
    expect(unique.size).toBe(4);
  });

  it('has no negative options', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(3);
      q.options.forEach((opt) => expect(opt).toBeGreaterThanOrEqual(0));
    }
  });

  it('subtraction never produces negative answers', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(3);
      if (q.operation === 'subtract') {
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(q.operandA).toBeGreaterThanOrEqual(q.operandB);
      }
    }
  });

  it('multiplication uses single-digit factors at difficulty 5', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(5);
      if (q.operation === 'multiply') {
        expect(q.operandA).toBeLessThanOrEqual(9);
        expect(q.operandB).toBeLessThanOrEqual(9);
      }
    }
  });

  it('generates displayText in the form "A op B = ?"', () => {
    const q = generateQuestion(1);
    expect(q.displayText).toMatch(/^\d+\s*\+\s*\d+\s*=\s*\?$/);
  });

  it('does not allow carrying at difficulty 1', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(1);
      const aOnes = q.operandA % 10;
      const bOnes = q.operandB % 10;
      expect(aOnes + bOnes).toBeLessThanOrEqual(9);
    }
  });

  it('does not allow carrying at difficulty 2', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(2);
      const aOnes = q.operandA % 10;
      const bOnes = q.operandB % 10;
      expect(aOnes + bOnes).toBeLessThanOrEqual(9);
    }
  });

  it('does not allow borrowing in subtraction at difficulty 3', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion(3);
      if (q.operation === 'subtract') {
        const aOnes = q.operandA % 10;
        const bOnes = q.operandB % 10;
        expect(aOnes).toBeGreaterThanOrEqual(bOnes);
      }
    }
  });
});

describe('generateRound', () => {
  it('generates the requested number of questions', () => {
    const round = generateRound(1, 10);
    expect(round).toHaveLength(10);
  });

  it('has no duplicate questions in a round', () => {
    const round = generateRound(1, 10);
    const keys = round.map((q) => q.displayText);
    const unique = new Set(keys);
    expect(unique.size).toBe(10);
  });
});
