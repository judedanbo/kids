import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { loadLock, saveLock } from './lockfile.js';
import type { Lockfile } from './lockfile.js';
import { SFXManifestSchema, type SFXManifest } from './sfx-manifest.js';
import { ElevenLabsSFXProvider, type SFXProvider } from './providers/elevenlabs-sfx.js';

export interface SFXRunOptions {
  repoRoot: string;
  manifestPath: string;
  cacheDir: string;
  lockPath: string;
  force: boolean;
  dryRun: boolean;
  getProvider?: () => SFXProvider;
}

export interface SFXRunSummary {
  generated: number;
  cached: number;
}

export async function runSFXGeneration(opts: SFXRunOptions): Promise<SFXRunSummary> {
  const manifest = await loadSFXManifest(opts.manifestPath);
  if (!opts.dryRun) {
    await mkdir(opts.cacheDir, { recursive: true });
  }

  const lock: Lockfile = opts.dryRun ? { version: 1, entries: {} } : await loadLock(opts.lockPath);

  const provider: SFXProvider | null = opts.dryRun
    ? null
    : (opts.getProvider?.() ?? makeSFXProvider());

  let generated = 0;
  let cached = 0;

  const outDir = resolve(opts.repoRoot, manifest.outputDir);
  if (!opts.dryRun) await mkdir(outDir, { recursive: true });

  for (const entry of manifest.entries) {
    if (opts.dryRun) {
      generated++;
      continue;
    }

    const hash = sfxHash(entry);
    const cachePath = join(opts.cacheDir, `sfx-${hash}.mp3`);
    const outPath = join(outDir, `${entry.id}.mp3`);
    const lockKey = `sfx:${entry.id}`;

    if (!opts.force && existsSync(cachePath)) {
      await copyFile(cachePath, outPath);
      const size = (await stat(cachePath)).size;
      lock.entries[lockKey] = {
        hash,
        path: outPath,
        bytes: size,
        generatedAt: lock.entries[lockKey]?.generatedAt ?? new Date().toISOString(),
      };
      cached++;
      continue;
    }

    process.stdout.write(`  sfx/${entry.id} … `);
    const buf = await provider!.generate({
      prompt: entry.prompt,
      durationSeconds: entry.durationSeconds,
      promptInfluence: entry.promptInfluence,
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

  return { generated, cached };
}

async function loadSFXManifest(path: string): Promise<SFXManifest> {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  return SFXManifestSchema.parse(raw);
}

function sfxHash(entry: {
  id: string;
  prompt: string;
  durationSeconds?: number;
  promptInfluence?: number;
}): string {
  const h = createHash('sha256');
  h.update(`elevenlabs-sfx|${entry.id}|`);
  h.update(entry.prompt);
  h.update(`|${entry.durationSeconds ?? ''}|${entry.promptInfluence ?? ''}`);
  return h.digest('hex').slice(0, 16);
}

function makeSFXProvider(): SFXProvider {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ELEVENLABS_API_KEY is not set. Add it to tools/audio-generator/.env.');
  }
  return new ElevenLabsSFXProvider(key);
}
