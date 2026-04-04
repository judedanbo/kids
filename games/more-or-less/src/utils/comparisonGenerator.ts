import type { AgeTier } from '@kids-games-zone/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ObjectComparison = {
  type: 'objects';
  groups: { objectType: string; count: number }[];
  prompt: 'more' | 'less';
  correctIndex: number;
};

export type NumberComparison = {
  type: 'numbers';
  values: number[];
  displayValues: string[];
  prompt: 'more' | 'less';
  correctIndex: number;
};

export type OrderingComparison = {
  type: 'ordering';
  values: number[];
  displayValues: string[];
  correctOrder: number[];
};

export type Comparison = ObjectComparison | NumberComparison | OrderingComparison;

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECT_POOL = ['apple', 'star', 'block', 'butterfly', 'fish', 'flower'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random integer in [min, max] inclusive */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Format a number for display: integers as "5", decimals as "3.5" */
function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Generate `count` unique integers from [min, max] */
function uniqueInts(count: number, min: number, max: number): number[] {
  if (max - min + 1 < count) {
    throw new Error(`Range [${min}, ${max}] too small for ${count} unique values`);
  }
  const set = new Set<number>();
  while (set.size < count) {
    set.add(randInt(min, max));
  }
  return [...set];
}

/** Generate `count` unique decimal values (one decimal place) from [min, max] */
function uniqueDecimals(count: number, min: number, max: number): number[] {
  // Work in tenths to keep precision exact
  const minTenths = Math.round(min * 10);
  const maxTenths = Math.round(max * 10);
  if (maxTenths - minTenths + 1 < count) {
    throw new Error(`Range too small for ${count} unique decimal values`);
  }
  const set = new Set<number>();
  while (set.size < count) {
    const tenths = randInt(minTenths, maxTenths);
    set.add(tenths / 10);
  }
  return [...set];
}

// ─── Tier generators ──────────────────────────────────────────────────────────

function generateTiny(difficulty: number): ObjectComparison {
  // Difficulty 1 => large gap (≥3); higher difficulty => smaller gap (down to 1)
  const maxGap = Math.max(1, 5 - difficulty);
  const minGap = difficulty === 1 ? 3 : 1;
  const gap = randInt(minGap, Math.max(minGap, maxGap));

  // Counts: two groups between 1 and 10
  const maxCount = 10;
  const a = randInt(1, maxCount - gap);
  const b = a + gap;

  const objectType = pick(OBJECT_POOL);
  const groups = [
    { objectType, count: a },
    { objectType, count: b },
  ];

  // Shuffle so the bigger group isn't always second
  if (Math.random() < 0.5) groups.reverse();

  const prompt: 'more' | 'less' = Math.random() < 0.5 ? 'more' : 'less';
  const correctIndex =
    prompt === 'more'
      ? groups[0].count > groups[1].count
        ? 0
        : 1
      : groups[0].count < groups[1].count
        ? 0
        : 1;

  return { type: 'objects', groups, prompt, correctIndex };
}

function generateJunior(difficulty: number): NumberComparison {
  let min: number;
  let max: number;

  if (difficulty <= 2) {
    min = 1;
    max = 9;
  } else if (difficulty <= 4) {
    min = 10;
    max = 99;
  } else {
    min = 100;
    max = 999;
  }

  const values = uniqueInts(3, min, max);
  const displayValues = values.map(formatValue);

  const prompt: 'more' | 'less' = Math.random() < 0.5 ? 'more' : 'less';
  const target = prompt === 'more' ? Math.max(...values) : Math.min(...values);
  const correctIndex = values.indexOf(target);

  return { type: 'numbers', values, displayValues, prompt, correctIndex };
}

function generateExplorer(difficulty: number): NumberComparison | OrderingComparison {
  const useOrdering = difficulty >= 6;
  const useDecimals = difficulty === 4 || difficulty === 5;
  const useNegatives = difficulty >= 8;

  if (useOrdering) {
    const count = difficulty >= 7 ? 5 : 4;
    let values: number[];

    if (useNegatives) {
      // Mix of negatives and positives
      values = uniqueInts(count, -20, 20);
    } else if (useDecimals || difficulty === 6) {
      // Whole numbers for difficulty 6, decimals for 7+
      values = uniqueInts(count, 1, 50);
    } else {
      values = uniqueInts(count, 1, 50);
    }

    const displayValues = values.map(formatValue);
    const sorted = [...values].sort((a, b) => a - b);
    const correctOrder = sorted.map((v) => values.indexOf(v));

    return { type: 'ordering', values, displayValues, correctOrder };
  }

  // NumberComparison with 4 values
  let values: number[];

  if (useNegatives) {
    values = uniqueInts(4, -50, 50);
  } else if (useDecimals) {
    // Mix: roughly half decimals, half integers — generate all as decimals then
    // occasionally round some. Simplest: generate 4 unique decimals.
    values = uniqueDecimals(4, 1.0, 30.0);
    // Ensure at least one is a non-integer
    const hasDecimal = values.some((v) => !Number.isInteger(v));
    if (!hasDecimal) {
      // Force one decimal
      values[0] = values[0] + 0.5;
    }
  } else {
    // Whole numbers, difficulty ≤3
    values = uniqueInts(4, 1, 99);
  }

  const displayValues = values.map(formatValue);
  const prompt: 'more' | 'less' = Math.random() < 0.5 ? 'more' : 'less';
  const target = prompt === 'more' ? Math.max(...values) : Math.min(...values);
  const correctIndex = values.indexOf(target);

  return { type: 'numbers', values, displayValues, prompt, correctIndex };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateComparison(ageTier: AgeTier, difficulty: number): Comparison {
  switch (ageTier) {
    case 'tiny':
      return generateTiny(difficulty);
    case 'junior':
      return generateJunior(difficulty);
    case 'explorer':
      return generateExplorer(difficulty);
  }
}
