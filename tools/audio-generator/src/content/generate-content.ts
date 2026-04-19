import type { AgeTier, SpellingTierFile } from '@kids-games-zone/shared';
import { loadAllTierFiles, saveTierFile } from '../spelling/tier-files.js';
import { OpenAIContentProvider } from './openai-content.js';
import { containsWord, isSafe } from './safety.js';
import type { ContentProvider } from './content-provider.js';

export interface ContentRunOptions {
  repoRoot: string;
  lang: string; // e.g. "en-US"
  force: boolean;
  dryRun: boolean;
  tier?: AgeTier;
  getProvider?: () => ContentProvider; // for tests
}

export interface ContentRunSummary {
  generated: number;
  skipped: number;
  flagged: string[];
  estimatedUsd: number;
}

function needsFill(entry: { definition: string; sentence: string; origin: string }): boolean {
  return entry.definition.trim() === '' || entry.sentence.trim() === '';
}

export async function runContentGeneration(opts: ContentRunOptions): Promise<ContentRunSummary> {
  // Dry-run never calls the provider, so defer instantiation (and the env check).
  let lazyProvider: ContentProvider | null = null;
  const getProvider = (): ContentProvider => {
    if (lazyProvider) return lazyProvider;
    lazyProvider = opts.getProvider?.() ?? new OpenAIContentProvider(requireEnv('OPENAI_API_KEY'));
    return lazyProvider;
  };

  const allTiers = await loadAllTierFiles(opts.repoRoot);
  const tiers = opts.tier ? allTiers.filter((t) => t.tier === opts.tier) : allTiers;

  let generated = 0;
  let skipped = 0;
  const flagged: string[] = [];
  let estimatedUsd = 0;

  for (const tierFile of tiers) {
    const mutated = await enrichTier(tierFile, getProvider, opts, {
      onGenerated: () => generated++,
      onSkipped: () => skipped++,
      onFlagged: (w) => flagged.push(w),
      addCost: (c) => (estimatedUsd += c),
    });
    if (mutated && !opts.dryRun) await saveTierFile(tierFile);
  }

  return { generated, skipped, flagged, estimatedUsd };
}

interface Hooks {
  onGenerated: () => void;
  onSkipped: () => void;
  onFlagged: (word: string) => void;
  addCost: (usd: number) => void;
}

async function enrichTier(
  tierFile: SpellingTierFile,
  getProvider: () => ContentProvider,
  opts: ContentRunOptions,
  hooks: Hooks,
): Promise<boolean> {
  let mutated = false;

  for (const entry of tierFile.words) {
    if (!opts.force && !needsFill(entry)) {
      hooks.onSkipped();
      continue;
    }

    const req = { word: entry.word, ageTier: tierFile.tier, lang: opts.lang };

    if (opts.dryRun) {
      // Static estimate for dry-run so we never instantiate the provider.
      hooks.addCost(0.0003);
      hooks.onGenerated();
      continue;
    }

    const provider = getProvider();
    hooks.addCost(provider.estimateCostUsd(req));

    process.stdout.write(`  [${tierFile.tier}] ${entry.word} … `);
    const res = await provider.generate(req);

    const problems: string[] = [];
    if (!isSafe(res.definition)) problems.push('unsafe-definition');
    if (!isSafe(res.sentence)) problems.push('unsafe-sentence');
    if (res.origin && !isSafe(res.origin)) problems.push('unsafe-origin');
    if (containsWord(res.definition, entry.word)) problems.push('self-reference');

    if (problems.length > 0) {
      hooks.onFlagged(`${entry.word} (${problems.join(', ')})`);
      process.stdout.write(`FLAGGED: ${problems.join(', ')}\n`);
      // Still write the content — reviewer sees it and can edit the JSON.
    } else {
      process.stdout.write('ok\n');
    }

    if (entry.definition.trim() === '' || opts.force) entry.definition = res.definition;
    if (entry.sentence.trim() === '' || opts.force) entry.sentence = res.sentence;
    if (entry.origin.trim() === '' || opts.force) {
      entry.origin = res.origin ?? '';
    }
    mutated = true;
    hooks.onGenerated();
  }
  return mutated;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set. Copy tools/audio-generator/.env.example to .env.`);
  }
  return v;
}
