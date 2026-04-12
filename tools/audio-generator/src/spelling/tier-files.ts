import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  AgeTier,
  SpellingTierFile,
  SpellingWordList,
} from '@kids-games-zone/shared';

const TIER_FILES: Record<AgeTier, string> = {
  tiny: 'games/spelling-bee/src/data/words-tiny.json',
  junior: 'games/spelling-bee/src/data/words-junior.json',
  explorer: 'games/spelling-bee/src/data/words-explorer.json',
};

export async function loadTierFile(
  repoRoot: string,
  tier: AgeTier,
): Promise<SpellingTierFile> {
  const path = resolve(repoRoot, TIER_FILES[tier]);
  const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`Expected an array at ${path}`);
  }
  return { tier, path, words: raw as SpellingWordList };
}

export async function loadAllTierFiles(
  repoRoot: string,
): Promise<SpellingTierFile[]> {
  const tiers: AgeTier[] = ['tiny', 'junior', 'explorer'];
  return Promise.all(tiers.map((t) => loadTierFile(repoRoot, t)));
}

export async function saveTierFile(file: SpellingTierFile): Promise<void> {
  await writeFile(file.path, JSON.stringify(file.words, null, 2) + '\n', 'utf8');
}
