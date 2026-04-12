import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { loadLock, saveLock } from './lockfile.js';
import type { Lockfile } from './lockfile.js';
import { MusicManifestSchema, type MusicManifest } from './music-manifest.js';
import {
  ElevenLabsMusicProvider,
  type MusicProvider,
} from './providers/elevenlabs-music.js';

export interface MusicRunOptions {
  repoRoot: string;
  manifestPath: string;
  cacheDir: string;
  lockPath: string;
  force: boolean;
  dryRun: boolean;
  getProvider?: () => MusicProvider;
}

export interface MusicRunSummary {
  generated: number;
  cached: number;
  totalSeconds: number;
}

export async function runMusicGeneration(
  opts: MusicRunOptions,
): Promise<MusicRunSummary> {
  const manifest = await loadMusicManifest(opts.manifestPath);
  if (!opts.dryRun) {
    await mkdir(opts.cacheDir, { recursive: true });
  }

  const lock: Lockfile = opts.dryRun
    ? { version: 1, entries: {} }
    : await loadLock(opts.lockPath);

  const provider: MusicProvider | null = opts.dryRun
    ? null
    : (opts.getProvider?.() ?? makeMusicProvider());

  let generated = 0;
  let cached = 0;
  let totalSeconds = 0;

  const outDir = resolve(opts.repoRoot, manifest.outputDir);
  if (!opts.dryRun) await mkdir(outDir, { recursive: true });

  for (const track of manifest.tracks) {
    totalSeconds += track.durationMs / 1000;

    if (opts.dryRun) {
      generated++;
      continue;
    }

    const hash = trackHash(track, manifest.modelId);
    const cachePath = join(opts.cacheDir, `music-${hash}.mp3`);
    const outPath = join(outDir, `${track.id}.mp3`);
    const lockKey = `music:${track.id}`;

    if (!opts.force && existsSync(cachePath)) {
      await copyFile(cachePath, outPath);
      const size = (await stat(cachePath)).size;
      lock.entries[lockKey] = {
        hash,
        path: outPath,
        bytes: size,
        generatedAt:
          lock.entries[lockKey]?.generatedAt ?? new Date().toISOString(),
      };
      cached++;
      continue;
    }

    process.stdout.write(
      `  music/${track.id} (${(track.durationMs / 1000).toFixed(1)}s) … `,
    );
    const buf = await provider!.generate({
      prompt: track.prompt,
      durationMs: track.durationMs,
      modelId: manifest.modelId,
    });
    await writeFile(cachePath, buf);
    await copyFile(cachePath, outPath);

    const size = (await stat(cachePath)).size;
    lock.entries[lockKey] = {
      hash,
      path: outPath,
      bytes: size,
      generatedAt: new Date().toISOString(),
    };
    generated++;
    process.stdout.write('ok\n');
  }

  if (!opts.dryRun) await saveLock(opts.lockPath, lock);

  return { generated, cached, totalSeconds };
}

async function loadMusicManifest(path: string): Promise<MusicManifest> {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  return MusicManifestSchema.parse(raw);
}

function trackHash(
  track: { id: string; prompt: string; durationMs: number },
  modelId: string,
): string {
  const h = createHash('sha256');
  h.update(`elevenlabs-music|${modelId}|${track.id}|`);
  h.update(track.prompt);
  h.update(`|${track.durationMs}`);
  return h.digest('hex').slice(0, 16);
}

function makeMusicProvider(): MusicProvider {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error(
      'ELEVENLABS_API_KEY is not set. Add it to tools/audio-generator/.env.',
    );
  }
  return new ElevenLabsMusicProvider(key);
}
