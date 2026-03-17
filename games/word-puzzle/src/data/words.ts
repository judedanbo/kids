export interface WordEntry {
  word: string;
  clue: string;
}

export interface WordCategory {
  name: string;
  words: Record<number, WordEntry[]>;
}

export const categories: WordCategory[] = [];

export function getWordsForRound(categoryIndex: number, difficulty: number, count: number): WordEntry[] {
  throw new Error('Not implemented');
}

export function getRandomCategoryIndex(): number {
  return Math.floor(Math.random() * categories.length);
}
