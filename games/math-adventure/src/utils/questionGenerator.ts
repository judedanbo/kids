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

const OP_SYMBOLS: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
};

export function getDifficultyConfig(difficulty: number): DifficultyConfig {
  return DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP[1];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOperation(operations: Operation[]): Operation {
  return operations[Math.floor(Math.random() * operations.length)];
}

function computeAnswer(a: number, b: number, op: Operation): number {
  switch (op) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
  }
}

function generateDistractors(correct: number, count: number): number[] {
  const candidates = new Set<number>();

  // Plausible wrong answers: off-by-one, off-by-two, double, half, nearby
  const offsets = [-2, -1, 1, 2, -3, 3, -5, 5];
  for (const offset of offsets) {
    const v = correct + offset;
    if (v >= 0 && v !== correct) {
      candidates.add(v);
    }
  }

  const doubled = correct * 2;
  if (doubled !== correct && doubled >= 0) candidates.add(doubled);

  const halved = Math.floor(correct / 2);
  if (halved !== correct && halved >= 0) candidates.add(halved);

  // Fill remaining with random nearby values
  let attempts = 0;
  while (candidates.size < count && attempts < 200) {
    attempts++;
    const v = Math.max(0, correct + randomInt(-10, 10));
    if (v !== correct) candidates.add(v);
  }

  // Trim to requested count
  const result: number[] = [];
  for (const v of candidates) {
    result.push(v);
    if (result.length === count) break;
  }
  return result;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateQuestion(difficulty: number): Question {
  const config = getDifficultyConfig(difficulty);
  const operation = pickOperation(config.operations);

  let operandA: number;
  let operandB: number;

  if (operation === 'multiply') {
    // Always use single-digit factors for multiplication
    operandA = randomInt(1, 9);
    operandB = randomInt(1, 9);
  } else if (operation === 'subtract') {
    // Pick a and b so that a >= b (non-negative result)
    // If no carrying allowed, also ensure no borrowing: ones(a) >= ones(b)
    let attempts = 0;
    do {
      operandA = randomInt(config.minVal, config.maxVal);
      operandB = randomInt(config.minVal, operandA);
      attempts++;
      if (attempts > 500) break;
    } while (
      !config.allowCarrying &&
      operandA % 10 < operandB % 10
    );
    // Guarantee a >= b even after the loop
    if (operandA < operandB) {
      [operandA, operandB] = [operandB, operandA];
    }
  } else {
    // add
    if (!config.allowCarrying) {
      // Ensure ones digits sum <= 9
      let attempts = 0;
      do {
        operandA = randomInt(config.minVal, config.maxVal);
        operandB = randomInt(config.minVal, config.maxVal);
        attempts++;
        if (attempts > 500) break;
      } while ((operandA % 10) + (operandB % 10) > 9);
    } else {
      operandA = randomInt(config.minVal, config.maxVal);
      operandB = randomInt(config.minVal, config.maxVal);
    }
  }

  const correctAnswer = computeAnswer(operandA, operandB, operation);
  const distractors = generateDistractors(correctAnswer, 3);
  const options = shuffleArray([correctAnswer, ...distractors]);
  const symbol = OP_SYMBOLS[operation];
  const displayText = `${operandA} ${symbol} ${operandB} = ?`;

  return { operandA, operandB, operation, correctAnswer, options, displayText };
}

export function generateRound(difficulty: number, count: number): Question[] {
  const questions: Question[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 20;
  let attempts = 0;

  while (questions.length < count && attempts < maxAttempts) {
    attempts++;
    const q = generateQuestion(difficulty);
    if (!seen.has(q.displayText)) {
      seen.add(q.displayText);
      questions.push(q);
    }
  }

  return questions;
}
