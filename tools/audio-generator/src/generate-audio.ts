import { existsSync } from 'node:fs';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { phraseHash } from './hash.js';
import { lockKey, loadLock, saveLock } from './lockfile.js';
import type { Manifest } from './manifest.js';
import { assertFfmpegInstalled, normalizeMp3 } from './postprocess.js';
import { makeTTSProvider } from './providers/index.js';
import type { TTSProvider } from './providers/tts-provider.js';

export interface AudioRunOptions {
  repoRoot: string;
  manifests: Manifest[];
  cacheDir: string;
  lockPath: string;
  force: boolean;
  dryRun: boolean;
  skipFfmpeg?: boolean; // tests
  getProvider?: (name: Manifest['provider']) => TTSProvider; // tests
}

export interface AudioRunSummary {
  generated: number;
  cached: number;
  totalChars: number;
  estimatedUsd: number;
}

export async function runAudioGeneration(opts: AudioRunOptions): Promise<AudioRunSummary> {
  if (!opts.dryRun && !opts.skipFfmpeg) {
    await assertFfmpegInstalled();
  }
  if (!opts.dryRun) {
    await mkdir(opts.cacheDir, { recursive: true });
  }

  const lock = opts.dryRun ? { version: 1 as const, entries: {} } : await loadLock(opts.lockPath);
  const providerCache = new Map<string, TTSProvider>();
  const getProvider = (name: Manifest['provider']): TTSProvider => {
    const cached = providerCache.get(name);
    if (cached) return cached;
    const created = opts.getProvider?.(name) ?? makeTTSProvider(name);
    providerCache.set(name, created);
    return created;
  };

  let generated = 0;
  let cached = 0;
  let totalChars = 0;
  let estimatedUsd = 0;

  for (const manifest of opts.manifests) {
    const outDir = resolve(opts.repoRoot, manifest.outputDir);
    if (!opts.dryRun) await mkdir(outDir, { recursive: true });

    for (const phrase of manifest.phrases) {
      const charCount = (phrase.text ?? phrase.ssml ?? '').length;
      totalChars += charCount;

      if (opts.dryRun) {
        // No provider, no cache check — just estimate cost statically.
        estimatedUsd += (charCount / 1_000_000) * 15; // tts-1 rate
        generated++;
        continue;
      }

      const provider = getProvider(manifest.provider);
      const hash = phraseHash(phrase, manifest.voice, manifest.lang, provider);
      const cachePath = join(opts.cacheDir, `${hash}.mp3`);
      const outPath = join(outDir, `${phrase.id}.mp3`);
      const key = lockKey(manifest.name, manifest.lang, phrase.id);

      if (!opts.force && existsSync(cachePath)) {
        await copyFile(cachePath, outPath);
        const size = (await stat(cachePath)).size;
        lock.entries[key] = {
          hash,
          path: outPath,
          bytes: size,
          generatedAt: lock.entries[key]?.generatedAt ?? new Date().toISOString(),
        };
        cached++;
        continue;
      }

      estimatedUsd += provider.estimateCostUsd(charCount);

      process.stdout.write(`  ${manifest.name}/${phrase.id} (${charCount}c) … `);
      const buf = await provider.generate({
        text: phrase.text,
        ssml: phrase.ssml,
        voice: phrase.voice ?? manifest.voice,
        lang: manifest.lang,
        rate: phrase.rate,
      });
      await writeFile(cachePath, buf);
      if (!opts.skipFfmpeg) await normalizeMp3(cachePath);
      await copyFile(cachePath, outPath);

      const size = (await stat(cachePath)).size;
      lock.entries[key] = {
        hash,
        path: outPath,
        bytes: size,
        generatedAt: new Date().toISOString(),
      };
      generated++;
      process.stdout.write('ok\n');
    }
  }

  if (!opts.dryRun) await saveLock(opts.lockPath, lock);

  return { generated, cached, totalChars, estimatedUsd };
}
