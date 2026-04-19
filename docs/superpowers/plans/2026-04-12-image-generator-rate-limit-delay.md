# Image generator rate-limit pacing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `--delay <ms>` flag (default 1000) to the image-generator CLI so batch runs don't trip OpenAI's rate limit around the 15-image mark.

**Architecture:** Single-file change to the existing CLI (`tools/image-generator/src/cli.mjs`). The per-entry worker passed to `runPool` wraps `generateOne` and sleeps `delay` ms after each call (success or failure) before the pool pulls the next entry. Concurrency stays unchanged; pacing is purely additive.

**Tech Stack:** Node.js ESM, `node:timers/promises` (`setTimeout` as promise), existing OpenAI SDK.

**Testing approach:** This tool has no automated tests today — it's an operator-run CLI that calls a paid API. The spec calls for manual verification only. Each task includes exact commands and expected output. Do not add a test harness.

**Branch:** Already on `fix/image-generator-rate-limit`.

---

## File Structure

**Modify:**

- `tools/image-generator/src/cli.mjs` — add flag parsing, update worker, update log line, update help text.
- `tools/image-generator/README.md` — document the new flag alongside existing `Quick start` examples.

No new files, no new dependencies.

---

## Task 1: Add `--delay` to arg parsing and defaults

**Files:**

- Modify: `tools/image-generator/src/cli.mjs` (functions `parseArgs` around lines 33-64, `printHelp` around lines 66-72)

- [ ] **Step 1: Add `delay` to `opts` defaults**

In `parseArgs`, add `delay: 1000` to the `opts` object (placed after `concurrency: 3,` for grouping similar tuning knobs). The full block becomes:

```js
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
```

- [ ] **Step 2: Add the `--delay` case to the arg switch**

Add a case immediately after the `--concurrency` case:

```js
case '--concurrency': opts.concurrency = Number(argv[++i]); break;
case '--delay': opts.delay = Number(argv[++i]); break;
```

- [ ] **Step 3: Update `printHelp` to document the flag**

Replace the existing help body with:

```js
console.log(`Usage: pnpm --filter @kids-games-zone/image-generator start [flags]

Flags: --pilot | --full | --category <x> | --only a,b,c
       --dry-run | --list | --force
       --concurrency <n> | --delay <ms> | --model <name> | --quality <low|medium|high>`);
```

- [ ] **Step 4: Verify arg parsing by running help and dry-run**

Run from repo root:

```bash
pnpm --filter @kids-games-zone/image-generator start --help
```

Expected: help output includes `--delay <ms>`.

Then:

```bash
pnpm --filter @kids-games-zone/image-generator start --dry-run --pilot --delay 500
```

Expected: exits cleanly with the same "Selected N / M entries" and cost-estimate output as before, no "Unknown arg" error.

- [ ] **Step 5: Commit**

```bash
git add tools/image-generator/src/cli.mjs
git commit -m "feat(image-generator): add --delay flag with 1s default"
```

---

## Task 2: Apply delay inside the pool worker

**Files:**

- Modify: `tools/image-generator/src/cli.mjs` (top of file for import; `main` function around lines 183-189)

- [ ] **Step 1: Add the `setTimeout` promise import**

Near the top of the file, alongside the other `node:` imports (currently `node:fs/promises` and `node:path`), add:

```js
import { setTimeout as sleep } from 'node:timers/promises';
```

Place it after the existing `node:path` import line.

- [ ] **Step 2: Wrap the worker so it sleeps after each call (success or failure)**

Locate the `runPool` call in `main` (currently lines 185-189):

```js
const results = await runPool(todo, opts.concurrency, async (entry) => {
  process.stdout.write(`  → ${entry.id}... `);
  await generateOne(openai, entry, opts);
  process.stdout.write('ok\n');
});
```

Replace it with:

```js
const results = await runPool(todo, opts.concurrency, async (entry) => {
  process.stdout.write(`  → ${entry.id}... `);
  try {
    await generateOne(openai, entry, opts);
    process.stdout.write('ok\n');
  } finally {
    if (opts.delay > 0) await sleep(opts.delay);
  }
});
```

The `finally` ensures the delay runs even when `generateOne` throws, so a single failure doesn't cause the next worker iteration to fire instantly. `runPool` already catches thrown errors in its `try/catch`, so re-throwing from `finally` is not needed — the `try/finally` here just guards the sleep.

- [ ] **Step 3: Include delay in the startup log line**

Locate the log line in `main` (currently around line 183):

```js
console.log(
  `Generating with model=${opts.model} quality=${opts.quality} concurrency=${opts.concurrency}...\n`,
);
```

Replace with:

```js
console.log(
  `Generating with model=${opts.model} quality=${opts.quality} concurrency=${opts.concurrency} delay=${opts.delay}ms...\n`,
);
```

- [ ] **Step 4: Sanity-check the file still parses**

Run:

```bash
node --check tools/image-generator/src/cli.mjs
```

Expected: no output, exit code 0.

Then verify lint passes for the changed file:

```bash
pnpm lint
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add tools/image-generator/src/cli.mjs
git commit -m "feat(image-generator): sleep between API calls to avoid 429s"
```

---

## Task 3: Document the flag in the README

**Files:**

- Modify: `tools/image-generator/README.md`

- [ ] **Step 1: Add a short note about `--delay` to the Quick start section**

At the end of the `## Quick start` fenced block (after the last existing example `pnpm --filter @kids-games-zone/image-generator start --only ui/nav-home --force`), add:

```bash
# lower the per-call pacing (default is 1000ms between requests per worker)
pnpm --filter @kids-games-zone/image-generator start --full --delay 500
```

- [ ] **Step 2: Add a sentence after the Quick start fenced block**

Immediately after the `## Quick start` fenced block closes and before the `Outputs land under ...` paragraph, add this paragraph:

```markdown
The CLI paces itself with a per-worker delay between API calls (default
1000 ms via `--delay <ms>`) to stay under OpenAI's rate limits on long
runs. Lower it if you're confident you have headroom; raise it if a batch
still hits 429s.
```

- [ ] **Step 3: Verify Prettier formatting**

```bash
pnpm format:check
```

Expected: exits 0 (or, if it reports the README, run `pnpm format` and re-check).

- [ ] **Step 4: Commit**

```bash
git add tools/image-generator/README.md
git commit -m "docs(image-generator): document --delay flag"
```

---

## Task 4: Manual verification against the live API

This task requires a valid `OPENAI_API_KEY` and spends a small amount of money (well under $1 at the pilot size). Skip if you're reviewing only — note the skip in the PR body.

**Files:** none modified.

- [ ] **Step 1: Verify the escape hatch — `--delay 0`**

Pick two cheap entries from `--list` output (e.g. two `ui/*` ids) and run:

```bash
pnpm --filter @kids-games-zone/image-generator start --only <id1>,<id2> --delay 0 --force
```

Expected: startup line shows `delay=0ms`; both images regenerate; total time ≈ typical single-call latency (no added sleep).

- [ ] **Step 2: Verify default pacing clears the previous failure threshold**

Delete enough existing files (or pass `--force`) to queue at least ~20 entries, then run:

```bash
pnpm --filter @kids-games-zone/image-generator start --category ui --force
```

Expected: startup line shows `delay=1000ms`; the run completes past the ~15-image mark without OpenAI 429 errors; final summary reports `failed=0`.

- [ ] **Step 3: Record results in the PR body**

When opening the PR, paste the final summary line from Step 2 (`Done in Xs — ok=N failed=0`) as evidence the pacing works.

---

## Self-review notes

- **Spec coverage:** Flag name + default (Task 1), placement inside pool worker with success/failure handling (Task 2), startup log (Task 2), README (Task 3), manual verification incl. `--delay 0` escape hatch and the ~15-image threshold (Task 4). All spec sections covered.
- **Placeholders:** none — every step shows the actual code or command.
- **Consistency:** flag is `--delay`, option key is `opts.delay`, unit is ms, default is 1000 — used identically everywhere.
