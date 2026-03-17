export type Operation = 'add' | 'subtract' | 'multiply';

export interface Question {
  operandA: number;
  operandB: number;
  operation: Operation;
  correctAnswer: number;
  options: number[];
  displayText: string;
}

export interface DifficultyConfig {
  operations: Operation[];
  minVal: number;
  maxVal: number;
  allowCarrying: boolean;
}

const DIFFICULTY_MAP: Record<number, DifficultyConfig> = {
  1: { operations: ['add'], minVal: 1, maxVal: 9, allowCarrying: false },
  2: { operations: ['add'], minVal: 1, maxVal: 15, allowCarrying: false },
  3: { operations: ['add', 'subtract'], minVal: 1, maxVal: 20, allowCarrying: false },
  4: { operations: ['add', 'subtract'], minVal: 1, maxVal: 50, allowCarrying: true },
  5: { operations: ['add', 'subtract', 'multiply'], minVal: 1, maxVal: 50, allowCarrying: true },
};

export function getDifficultyConfig(difficulty: number): DifficultyConfig {
  return DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP[1];
}

export function generateQuestion(_difficulty: number): Question {
  throw new Error('Not implemented');
}

export function generateRound(_difficulty: number, _count: number): Question[] {
  throw new Error('Not implemented');
}
