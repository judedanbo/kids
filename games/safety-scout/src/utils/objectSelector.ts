export interface SafetyObject {
  id: string;
  name: string;
  category: string;
  image: string;
  isSafe: boolean;
  explanations: { tiny: string; junior: string };
  difficulty: number;
}

interface SelectOptions {
  category: string | null;
  difficulty: number;
  count: number;
}

/**
 * Shuffles an array in-place using Fisher-Yates algorithm.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Selects safety objects from the pool based on category and difficulty,
 * ensuring a mix of safe and harmful objects. Shuffles the result.
 */
export function selectObjects(pool: SafetyObject[], options: SelectOptions): SafetyObject[] {
  const { category, difficulty, count } = options;

  // Filter by category and difficulty
  const eligible = pool.filter(
    (o) => (category === null || o.category === category) && o.difficulty <= difficulty,
  );

  if (eligible.length === 0) return [];

  // Split into safe and harmful buckets
  const safeObjects = shuffle(eligible.filter((o) => o.isSafe));
  const harmfulObjects = shuffle(eligible.filter((o) => !o.isSafe));

  const selected: SafetyObject[] = [];

  // Guarantee at least one of each type when possible
  if (safeObjects.length > 0) selected.push(safeObjects.shift()!);
  if (harmfulObjects.length > 0) selected.push(harmfulObjects.shift()!);

  // Fill the rest from a combined shuffled pool of remaining objects
  const remaining = shuffle([...safeObjects, ...harmfulObjects]);
  for (const obj of remaining) {
    if (selected.length >= count) break;
    selected.push(obj);
  }

  // Cap to requested count (in case we guaranteed types beyond count)
  const result = selected.slice(0, count);

  return shuffle(result);
}

/**
 * Returns unique category names from the pool.
 */
export function getCategories(pool: SafetyObject[]): string[] {
  return [...new Set(pool.map((o) => o.category))];
}
