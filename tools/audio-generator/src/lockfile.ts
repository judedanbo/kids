import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

export interface LockEntry {
  hash: string;
  path: string;
  bytes: number;
  generatedAt: string;
}

export interface Lockfile {
  version: 1;
  entries: Record<string, LockEntry>;
}

export async function loadLock(path: string): Promise<Lockfile> {
  if (!existsSync(path)) {
    return { version: 1, entries: {} };
  }
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Lockfile).version !== 1
  ) {
    throw new Error(`Unrecognised lockfile at ${path}`);
  }
  return parsed as Lockfile;
}

export async function saveLock(path: string, lock: Lockfile): Promise<void> {
  await writeFile(path, JSON.stringify(lock, null, 2) + '\n', 'utf8');
}

export function lockKey(
  manifestName: string,
  lang: string,
  phraseId: string,
): string {
  return `${manifestName}:${lang}:${phraseId}`;
}
