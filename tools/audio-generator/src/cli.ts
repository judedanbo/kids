import 'dotenv/config';
import { join } from 'node:path';
import { Command } from 'commander';
import type { AgeTier } from '@kids-games-zone/shared';
import { runContentGeneration } from './content/generate-content.js';
import { runAudioGeneration } from './generate-audio.js';
import { runMusicGeneration } from './generate-music.js';
import { runSFXGeneration } from './generate-sfx.js';
import { runEncouragementGeneration } from './generate-encouragement.js';
import { buildSpellingManifest } from './spelling/manifest-builder.js';
import { loadAllTierFiles } from './spelling/tier-files.js';
import {
  CACHE_DIR,
  LOCK_PATH,
  MUSIC_LOCK_PATH,
  PLANS_DIR,
  REPO_ROOT,
  SFX_LOCK_PATH,
} from './paths.js';

const program = new Command();
program.name('gen-audio').description('AI content + TTS pipeline for kids-games-zone');

program
  .command('content')
  .description('Fill missing definition/sentence/origin fields on game word lists')
  .option('--game <name>', 'game to process', 'spelling-bee')
  .option('--tier <tier>', 'limit to one age tier (tiny|junior|explorer)')
  .option('--lang <code>', 'BCP-47 language code', 'en-US')
  .option('--force', 'overwrite existing fields', false)
  .option('--dry-run', 'estimate cost without calling the API', false)
  .action(async (raw: ContentArgs) => {
    if (raw.game !== 'spelling-bee') {
      throw new Error(`Unknown game: ${raw.game}. Only spelling-bee supported.`);
    }
    const tier = raw.tier ? parseTier(raw.tier) : undefined;
    const summary = await runContentGeneration({
      repoRoot: REPO_ROOT,
      lang: raw.lang,
      force: raw.force,
      dryRun: raw.dryRun,
      tier,
    });
    console.log(
      `\nContent: generated=${summary.generated} skipped=${summary.skipped} ` +
        `flagged=${summary.flagged.length} ~$${summary.estimatedUsd.toFixed(4)}`,
    );
    if (summary.flagged.length > 0) {
      console.log('Flagged for review:');
      for (const w of summary.flagged) console.log(`  - ${w}`);
    }
  });

program
  .command('audio')
  .description('Generate TTS audio for enriched word lists')
  .option('--game <name>', 'game to process', 'spelling-bee')
  .option('--lang <code>', 'BCP-47 language code', 'en-US')
  .option('--voice <name>', 'TTS voice (OpenAI)', 'nova')
  .option('--force', 'ignore cache and regenerate', false)
  .option('--dry-run', 'estimate cost without calling the API', false)
  .action(async (raw: AudioArgs) => {
    if (raw.game !== 'spelling-bee') {
      throw new Error(`Unknown game: ${raw.game}. Only spelling-bee supported.`);
    }
    const tierFiles = await loadAllTierFiles(REPO_ROOT);
    const langShort = raw.lang.split('-')[0]!;
    const manifest = buildSpellingManifest(tierFiles, {
      lang: raw.lang,
      voice: raw.voice,
      outputDir: `platform/public/audio/narration/${langShort}`,
    });

    console.log(`Manifest: ${manifest.phrases.length} phrases across ${tierFiles.length} tiers`);

    const summary = await runAudioGeneration({
      repoRoot: REPO_ROOT,
      manifests: [manifest],
      cacheDir: CACHE_DIR,
      lockPath: LOCK_PATH,
      force: raw.force,
      dryRun: raw.dryRun,
    });
    console.log(
      `\nAudio: generated=${summary.generated} cached=${summary.cached} ` +
        `chars=${summary.totalChars} ~$${summary.estimatedUsd.toFixed(4)}`,
    );
  });

program
  .command('music')
  .description('Generate background music via ElevenLabs Music API')
  .option('--plan <path>', 'path to music plan JSON', join(PLANS_DIR, 'music.json'))
  .option('--force', 'ignore cache and regenerate', false)
  .option('--dry-run', 'list tracks without calling the API', false)
  .action(async (raw: MusicArgs) => {
    const summary = await runMusicGeneration({
      repoRoot: REPO_ROOT,
      manifestPath: raw.plan,
      cacheDir: CACHE_DIR,
      lockPath: MUSIC_LOCK_PATH,
      force: raw.force,
      dryRun: raw.dryRun,
    });
    console.log(
      `\nMusic: generated=${summary.generated} cached=${summary.cached} ` +
        `total=${summary.totalSeconds.toFixed(1)}s`,
    );
  });

interface MusicArgs {
  plan: string;
  force: boolean;
  dryRun: boolean;
}

program
  .command('sfx')
  .description('Generate sound effects via ElevenLabs Sound Generation API')
  .option('--plan <path>', 'path to SFX plan JSON', join(PLANS_DIR, 'sfx.json'))
  .option('--force', 'ignore cache and regenerate', false)
  .option('--dry-run', 'list entries without calling the API', false)
  .action(async (raw: SFXArgs) => {
    const summary = await runSFXGeneration({
      repoRoot: REPO_ROOT,
      manifestPath: raw.plan,
      cacheDir: CACHE_DIR,
      lockPath: SFX_LOCK_PATH,
      force: raw.force,
      dryRun: raw.dryRun,
    });
    console.log(`\nSFX: generated=${summary.generated} cached=${summary.cached}`);
  });

interface SFXArgs {
  plan: string;
  force: boolean;
  dryRun: boolean;
}

program
  .command('encouragement')
  .description(
    'Generate multi-variant encouragement voice lines (OpenAI TTS) and emit the variant registry',
  )
  .option('--plan <path>', 'path to encouragement plan JSON', join(PLANS_DIR, 'encouragement.json'))
  .option(
    '--registry <path>',
    'path where the variant registry TS file is written',
    join(REPO_ROOT, 'platform/src/generated/voice-variants.ts'),
  )
  .option('--force', 'ignore cache and regenerate', false)
  .option('--dry-run', 'estimate cost without calling the API', false)
  .action(async (raw: EncouragementArgs) => {
    const summary = await runEncouragementGeneration({
      repoRoot: REPO_ROOT,
      planPath: raw.plan,
      cacheDir: CACHE_DIR,
      lockPath: LOCK_PATH,
      registryPath: raw.registry,
      force: raw.force,
      dryRun: raw.dryRun,
    });
    console.log(
      `\nEncouragement: variants=${summary.variants} generated=${summary.generated} ` +
        `cached=${summary.cached} chars=${summary.totalChars} ` +
        `~$${summary.estimatedUsd.toFixed(4)}`,
    );
    if (!raw.dryRun) {
      console.log(`Registry written: ${summary.registryPath}`);
    }
  });

interface EncouragementArgs {
  plan: string;
  registry: string;
  force: boolean;
  dryRun: boolean;
}

interface ContentArgs {
  game: string;
  tier?: string;
  lang: string;
  force: boolean;
  dryRun: boolean;
}

interface AudioArgs {
  game: string;
  lang: string;
  voice: string;
  force: boolean;
  dryRun: boolean;
}

function parseTier(s: string): AgeTier {
  if (s === 'tiny' || s === 'junior' || s === 'explorer') return s;
  throw new Error(`Invalid --tier "${s}". Use tiny|junior|explorer.`);
}

program.parseAsync().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
});
