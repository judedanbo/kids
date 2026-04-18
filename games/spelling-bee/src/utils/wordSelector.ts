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
  const sorted = [...candidates].sort((a, b) => {
    const distA = targetDifficulty - a.difficulty;
    const distB = targetDifficulty - b.difficulty;
    if (distA !== distB) return distA - distB;
    return Math.random() - 0.5;
  });

  const selected = sorted.slice(0, count);

  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}
