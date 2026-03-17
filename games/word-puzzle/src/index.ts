import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { WordPuzzle } from './WordPuzzle';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'word-puzzle',
    name: 'Word Puzzle',
    description: 'Unscramble the letters to spell the word!',
    thumbnail: '/images/games/word-puzzle.webp',
    ageRange: [6, 8],
    skills: ['literacy'],
    version: '1.0.0',
    entryPoint: '../../games/word-puzzle/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-03-16',
    tags: ['spelling', 'words', 'vocabulary', 'literacy'],
  },

  onLoad: async () => {},

  onStart: (config: GameConfig) => {
    _startTime = Date.now();
    _score = 0;
    _difficulty = config.difficulty;
  },

  onPause: () => {},
  onResume: () => {},

  onEnd: () => {
    const timeSpent = Math.round((Date.now() - _startTime) / 1000);
    return {
      gameId: 'word-puzzle',
      score: _score,
      maxScore: 80,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { wordsCorrect: 0, avgAttempts: 0, categoryIndex: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: WordPuzzle,
};

export default plugin;
