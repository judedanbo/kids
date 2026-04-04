import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { SafetyScout } from './SafetyScout';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'safety-scout',
    name: 'Safety Scout',
    description: 'Learn which objects are safe and which are harmful!',
    thumbnail: '/images/games/safety-scout.webp',
    ageRange: [4, 8],
    skills: ['logic', 'social_skills'],
    version: '1.0.0',
    entryPoint: '../../../games/safety-scout/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 4,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-04-04',
    tags: ['safety', 'awareness', 'household', 'critical-thinking'],
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
      gameId: 'safety-scout',
      score: _score,
      maxScore: 10,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { objectsCorrect: 0, objectsTotal: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: SafetyScout,
};

export default plugin;
