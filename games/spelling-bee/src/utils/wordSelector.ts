export interface WordEntry {
  word: string;
  difficulty: number;
  image: string;
  definition: string;
  origin: string;
  sentence: string;
}

interface SelectOptions {
  difficulty: number;
  count: number;
  exclude?: string[];
}

/**
 * Selects words from pool at or below the target difficulty,
 * prioritizing words closest to the target. Shuffles result.
 * Optionally excludes specific words by their `word` string.
 */
export function selectWords(pool: WordEntry[], options: SelectOptions): WordEntry[] {
  const { difficulty, count, exclude = [] } = options;
  const excludeSet = new Set(exclude);

  // Layer 1 — primary: at-or-below difficulty, honor exclude.
  const primary = pool.filter((w) => w.difficulty <= difficulty && !excludeSet.has(w.word));
  if (primary.length >= count) {
    return pickFrom(primary, difficulty, count);
  }

  // Layer 2 — widen difficulty to target + 2, still honor exclude.
  const widened = pool.filter((w) => w.difficulty <= difficulty + 2 && !excludeSet.has(w.word));
  if (widened.length >= count) {
    if (import.meta.env.DEV) {
      console.warn('[spelling-bee] selectWords: widened difficulty band');
    }
    return pickFrom(widened, difficulty, count);
  }

  // Layer 3 — allow repeats (ignore exclude), still capped at target + 2.
  const withRepeats = pool.filter((w) => w.difficulty <= difficulty + 2);
  if (withRepeats.length >= count) {
    if (import.meta.env.DEV) {
      console.warn('[spelling-bee] selectWords: reusing previously-seen words');
    }
    return pickFrom(withRepeats, difficulty, count);
  }

  // Layer 4 — whole pool, no difficulty ceiling. Return whatever's available.
  if (import.meta.env.DEV && pool.length > 0) {
    console.warn('[spelling-bee] selectWords: dropped difficulty ceiling');
  }
  return pickFrom(pool, difficulty, Math.min(count, pool.length));
}

function pickFrom(candidates: WordEntry[], targetDifficulty: number, count: number): WordEntry[] {
  // Bucket candidates by distance-to-target so we can shuffle within each
  // distance band before slicing. This gives per-session variety among
  // same-distance candidates without relying on Math.random() in a sort
  // comparator (which is an unstable-sort anti-pattern).
  const byDistance = new Map<number, WordEntry[]>();
  for (const w of candidates) {
    const d = targetDifficulty - w.difficulty;
    const group = byDistance.get(d);
    if (group) group.push(w);
    else byDistance.set(d, [w]);
  }

  // Closest buckets first. Within each bucket: shuffle, then concat.
  const ordered: WordEntry[] = [];
  const keys = [...byDistance.keys()].sort((a, b) => a - b);
  for (const key of keys) {
    const group = byDistance.get(key)!;
    shuffleInPlace(group);
    ordered.push(...group);
    if (ordered.length >= count) break;
  }

  const selected = ordered.slice(0, count);
  shuffleInPlace(selected);
  return selected;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
