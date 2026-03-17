export interface GridConfig {
  pairs: number;
  columns: number;
  rows: number;
  cardSize: number;
  previewDuration: number;
}

export const GRID_CONFIGS: Record<number, GridConfig> = {
  1: { pairs: 2, columns: 2, rows: 2, cardSize: 120, previewDuration: 2000 },
  2: { pairs: 3, columns: 3, rows: 2, cardSize: 110, previewDuration: 2000 },
  3: { pairs: 4, columns: 4, rows: 2, cardSize: 100, previewDuration: 1500 },
  4: { pairs: 6, columns: 4, rows: 3, cardSize: 96, previewDuration: 1500 },
  5: { pairs: 8, columns: 4, rows: 4, cardSize: 96, previewDuration: 1000 },
};

export type IllustrationName =
  | 'cat'
  | 'fish'
  | 'butterfly'
  | 'bird'
  | 'flower'
  | 'sun'
  | 'tree'
  | 'star'
  | 'heart'
  | 'house';

export const ALL_ILLUSTRATIONS: IllustrationName[] = [
  'cat',
  'fish',
  'butterfly',
  'bird',
  'flower',
  'sun',
  'tree',
  'star',
  'heart',
  'house',
];

export interface CardData {
  id: number;
  illustration: IllustrationName;
  pairId: number;
}

export function getGridConfig(difficulty: number): GridConfig {
  return GRID_CONFIGS[difficulty] ?? GRID_CONFIGS[1];
}

export function generateCards(difficulty: number): CardData[] {
  const config = getGridConfig(difficulty);
  const { pairs } = config;

  // Fisher-Yates shuffle of all illustrations, take first `pairs`
  const pool = [...ALL_ILLUSTRATIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, pairs);

  // Create 2 cards per illustration with unique IDs and shared pairId
  const cards: CardData[] = [];
  for (let pairId = 0; pairId < chosen.length; pairId++) {
    cards.push({ id: pairId * 2, illustration: chosen[pairId], pairId });
    cards.push({ id: pairId * 2 + 1, illustration: chosen[pairId], pairId });
  }

  // Shuffle the final array (Fisher-Yates)
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}
