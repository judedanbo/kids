import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { SpellingBee } from './SpellingBee';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'spelling-bee',
    name: 'Spelling Bee',
    description: 'Listen to words and spell them correctly!',
    thumbnail: '/images/games/spelling-bee.webp',
    ageRange: [3, 12],
    skills: ['literacy'],
    version: '1.0.0',
    entryPoint: '../../../games/spelling-bee/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 10,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['spelling', 'words', 'vocabulary', 'literacy', 'phonics'],
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
      gameId: 'spelling-bee',
      score: _score,
      maxScore: 100,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { wordsCorrect: 0, wordsTotal: 0, livesRemaining: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: SpellingBee,
};

export default plugin;
