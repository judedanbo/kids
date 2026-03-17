import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { MathAdventure } from './MathAdventure';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: 'math-adventure',
    name: 'Math Adventure',
    description: 'Solve math problems and sharpen your number skills!',
    thumbnail: '/images/games/math-adventure.webp',
    ageRange: [6, 8],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '../../games/math-adventure/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-03-16',
    tags: ['math', 'addition', 'subtraction', 'multiplication'],
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
      gameId: 'math-adventure',
      score: _score,
      maxScore: 100,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: { questionsCorrect: 0, avgAttempts: 0, additionCount: 0, subtractionCount: 0, multiplicationCount: 0 },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: MathAdventure,
};

export default plugin;
