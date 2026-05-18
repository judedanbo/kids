import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { GlobeTrotter } from './GlobeTrotter';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'globe-trotter',
    name: 'Globe Trotter',
    description: 'Explore the world — capitals, flags, fun facts, and continents!',
    thumbnail: '/images/games/globe-trotter.webp',
    ageRange: [3, 12],
    skills: ['science', 'memory'],
    version: '1.0.0',
    entryPoint: '../../../games/globe-trotter/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '2026-05-16',
    tags: ['geography', 'countries', 'capitals', 'flags', 'continents', 'world'],
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
      gameId: 'globe-trotter',
      score: _score,
      maxScore: 10,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { questionsCorrect: 0, questionsTotal: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: GlobeTrotter,
};

export default plugin;
