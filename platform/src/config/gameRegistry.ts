import type { GameManifest } from '@kids-games-zone/shared';

export const gameRegistry: GameManifest[] = [
  {
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
];
