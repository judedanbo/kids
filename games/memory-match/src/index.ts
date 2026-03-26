import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { MemoryMatch } from './MemoryMatch';
import { getGridConfig } from './utils/gridUtils';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Find the matching pictures and train your memory!',
    thumbnail: '/images/games/memory-match.webp',
    ageRange: [3, 5],
    skills: ['memory'],
    version: '1.0.0',
    entryPoint: '../../../games/memory-match/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 3,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-03-16',
    tags: ['memory', 'matching', 'pairs', 'animals'],
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
    const maxScore = getGridConfig(_difficulty).pairs * 10;
    return {
      gameId: 'memory-match',
      score: _score,
      maxScore,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { turns: 0, matchesFound: 0, totalPairs: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: MemoryMatch,
};

export default plugin;
