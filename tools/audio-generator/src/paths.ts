import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of this package (tools/audio-generator). */
export const PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);

/** Absolute path of the monorepo root. */
export const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');

/** Where cached TTS output lives (gitignored). */
export const CACHE_DIR = resolve(PACKAGE_ROOT, '.audio-cache');

/** Lockfile: maps phrase lock keys to content hashes. */
export const LOCK_PATH = resolve(PACKAGE_ROOT, 'audio-lock.json');
