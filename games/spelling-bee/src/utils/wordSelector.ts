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
}

/**
 * Selects words from pool at or below the target difficulty,
 * prioritizing words closest to the target. Shuffles result.
 */
export function selectWords(pool: WordEntry[], options: SelectOptions): WordEntry[] {
  const { difficulty, count } = options;

  const eligible = pool.filter((w) => w.difficulty <= difficulty);

  if (eligible.length === 0) return [];

  const sorted = [...eligible].sort((a, b) => {
    const distA = difficulty - a.difficulty;
    const distB = difficulty - b.difficulty;
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
