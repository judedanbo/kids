import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { DummyGame } from './DummyGame';

let _startTime = 0;
let _score = 0;

const plugin: GamePlugin = {
  manifest: {
    id: 'dummy-game',
    name: 'Click Counter',
    description: 'Click the button 5 times!',
    thumbnail: '',
    ageRange: [3, 12],
    skills: ['motor_skills'],
    version: '1.0.0',
    entryPoint: '../../games/dummy-game/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 1,
    estimatedPlayTime: 1,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '2026-03-15',
    tags: ['demo'],
  },

  onLoad: async () => {
    // No assets to preload for the dummy game
  },

  onStart: (_config: GameConfig) => {
    _startTime = Date.now();
    _score = 0;
  },

  onPause: () => {
    console.log('[DummyGame] Paused');
  },

  onResume: () => {
    console.log('[DummyGame] Resumed');
  },

  onEnd: () => {
    const timeSpent = Math.round((Date.now() - _startTime) / 1000);
    return {
      gameId: 'dummy-game',
      score: _score,
      maxScore: 5,
      timeSpent,
      difficulty: 1,
      completedAt: new Date().toISOString(),
      metrics: { clicks: _score },
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
  },

  GameComponent: DummyGame,
};

export default plugin;
