#!/usr/bin/env node
/**
 * Image-generator CLI.
 *
 * Run locally, NEVER in CI (we don't want to burn budget on every push):
 *
 *   pnpm install                                     # once
 *   export OPENAI_API_KEY=sk-...                     # (or put in .env)
 *   pnpm --filter @kids-games-zone/image-generator start --pilot
 *
 * Flags:
 *   --pilot        Generate only the small pilot batch (~8 images) for style approval.
 *   --full         Generate every entry in the manifest.
 *   --category X   Generate only entries with category starting with X
 *                    (e.g. "ui", "spelling-bee", "safety-scout", "games/mascots").
 *   --only id,id   Comma-separated list of specific manifest IDs.
 *   --dry-run      Print what WOULD be generated (with cost estimate), no API calls.
 *   --list         Print the whole manifest and exit.
 *   --force        Regenerate even if the output file already exists (default: skip).
 *   --concurrency N  Max parallel API calls (default: 3).
 *   --model NAME   Override model (default: gpt-image-1).
 *   --quality Q    'low' | 'medium' | 'high' (default: medium).
 *
 * The script is safe to re-run: existing files are skipped unless --force.
 */
import 'dotenv/config';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { buildManifest, REPO_ROOT } from './manifest.mjs';

// --- Arg parsing -----------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    pilot: false,
    full: false,
    category: null,
    only: null,
    dryRun: false,
    list: false,
    force: false,
    concurrency: 3,
    delay: 1000,
    model: 'gpt-image-1',
    quality: 'medium',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--pilot': opts.pilot = true; break;
      case '--full': opts.full = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--list': opts.list = true; break;
      case '--force': opts.force = true; break;
      case '--category': opts.category = argv[++i]; break;
      case '--only':     opts.only = argv[++i].split(',').map((s) => s.trim()); break;
      case '--concurrency': opts.concurrency = Number(argv[++i]); break;
      case '--delay': opts.delay = Number(argv[++i]); break;
      case '--model': opts.model = argv[++i]; break;
      case '--quality': opts.quality = argv[++i]; break;
      case '-h': case '--help': printHelp(); process.exit(0);
      default: console.error(`Unknown arg: ${a}`); process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: pnpm --filter @kids-games-zone/image-generator start [flags]

Flags: --pilot | --full | --category <x> | --only a,b,c
       --dry-run | --list | --force
       --concurrency <n> | --delay <ms> | --model <name> | --quality <low|medium|high>`);
}

// --- Cost estimate (rough; real prices vary — treat as a guardrail) ---------
// gpt-image-1 approx USD per image, by quality, at 1024x1024:
const PRICE = { low: 0.011, medium: 0.042, high: 0.167 };
function estimate(entries, quality) {
  const unit = PRICE[quality] ?? PRICE.medium;
  // Landscape 1536x1024 costs roughly 1.5x.
  let total = 0;
  for (const e of entries) total += (e.size === '1024x1024' ? unit : unit * 1.5);
  return total;
}

// --- File helpers ----------------------------------------------------------

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function filterEntries(all, opts) {
  let out = all;
  if (opts.only)     out = out.filter((e) => opts.only.includes(e.id));
  if (opts.category) out = out.filter((e) => e.category.startsWith(opts.category));
  if (opts.pilot)    out = out.filter((e) => e.pilot);
  if (!opts.force) {
    const existing = await Promise.all(out.map((e) => exists(e.file)));
    out = out.filter((_, i) => !existing[i]);
  }
  return out;
}

// --- OpenAI call -----------------------------------------------------------

async function generateOne(openai, entry, opts) {
  const res = await openai.images.generate({
    model: opts.model,
    prompt: entry.prompt,
    size: entry.size,
    quality: opts.quality,
    n: 1,
    // WebP output keeps bundle size small and matches existing references.
    output_format: 'webp',
    background: 'transparent',
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image data returned for ${entry.id}`);
  await mkdir(dirname(entry.file), { recursive: true });
  await writeFile(entry.file, Buffer.from(b64, 'base64'));
}

// Simple pool — limit concurrent API calls.
async function runPool(entries, limit, worker) {
  let idx = 0;
  const results = new Array(entries.length);
  async function next() {
    const i = idx++;
    if (i >= entries.length) return;
    try {
      results[i] = { ok: true, entry: entries[i], value: await worker(entries[i]) };
    } catch (err) {
      results[i] = { ok: false, entry: entries[i], error: err };
    }
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, entries.length) }, next));
  return results;
}

// --- Main ------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const all = await buildManifest();

  if (opts.list) {
    for (const e of all) {
      console.log(`${e.pilot ? '★' : ' '} ${e.id}  →  ${relative(REPO_ROOT, e.file)}`);
    }
    console.log(`\nTotal: ${all.length}  Pilot: ${all.filter((e) => e.pilot).length}`);
    return;
  }

  if (!opts.pilot && !opts.full && !opts.category && !opts.only) {
    console.error('Nothing to do. Pass --pilot, --full, --category, or --only.');
    console.error('Use --list to inspect the manifest.');
    process.exit(2);
  }

  const todo = await filterEntries(all, opts);
  console.log(`Selected ${todo.length} / ${all.length} entries.`);
  console.log(`Cost estimate (${opts.quality}): ~$${estimate(todo, opts.quality).toFixed(2)}`);

  if (opts.dryRun) {
    for (const e of todo) console.log(`  ${e.id}  →  ${relative(REPO_ROOT, e.file)}`);
    return;
  }
  if (todo.length === 0) {
    console.log('Nothing to generate (all outputs exist — pass --force to regenerate).');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Put it in your shell env or a .env file in this directory.');
    process.exit(1);
  }

  // Lazy import so --dry-run / --list work without openai installed.
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log(`Generating with model=${opts.model} quality=${opts.quality} concurrency=${opts.concurrency}...\n`);
  const start = Date.now();
  const results = await runPool(todo, opts.concurrency, async (entry) => {
    process.stdout.write(`  → ${entry.id}... `);
    await generateOne(openai, entry, opts);
    process.stdout.write('ok\n');
  });

  const failures = results.filter((r) => !r.ok);
  console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s — ` +
    `ok=${results.length - failures.length} failed=${failures.length}`);
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ ${f.entry.id}: ${f.error?.message ?? f.error}`);
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
