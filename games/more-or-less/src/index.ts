import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { MoreOrLess } from './MoreOrLess';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'more-or-less',
    name: 'More or Less',
    description: 'Compare quantities and numbers — which is more, which is less?',
    thumbnail: '/images/games/more-or-less.webp',
    ageRange: [3, 10],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '../../../games/more-or-less/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 8,
    estimatedPlayTime: 4,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['numbers', 'comparison', 'counting', 'fractions', 'ordering'],
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
      gameId: 'more-or-less',
      score: _score,
      maxScore: 10,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { correctCount: 0, totalRounds: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: MoreOrLess,
};

export default plugin;
