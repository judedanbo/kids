import type { GamePlugin, GameManifest } from '@kids-games-zone/shared';

// Vite glob import — discovers all game entry points at build time.
// Each key is a relative path; each value is a dynamic import function.
const gameModules = import.meta.glob<{ default: GamePlugin }>(
  '../../../games/*/src/index.ts',
);

export async function loadGame(manifest: GameManifest): Promise<GamePlugin> {
  const importFn = gameModules[manifest.entryPoint];

  if (!importFn) {
    throw new Error(
      `Game "${manifest.id}" not found at entry point "${manifest.entryPoint}". ` +
        `Available entries: ${Object.keys(gameModules).join(', ')}`,
    );
  }

  const module = await importFn();
  return module.default;
}
