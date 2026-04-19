# Image generator — rate-limit pacing

## Problem

`tools/image-generator/src/cli.mjs` drives the OpenAI `images.generate` API through a
concurrency pool (default 3) with no pacing between calls. In practice the run fails
around the 15th generation with OpenAI rate-limit errors, leaving the batch partially
completed.

## Goal

Add a small, configurable delay after each API call so a single `--full` or
`--category` run can complete without tripping OpenAI's rate limit, without adding
complexity we don't yet need.

## Non-goals

- Adaptive rate-limiting or token-bucket schedulers.
- Automatic 429 retry / exponential backoff. (If the fixed delay turns out to be
  insufficient in practice, we'll revisit in a follow-up.)
- Changes to the manifest, prompts, or output pipeline.

## Design

### New flag

Add `--delay <ms>` to the CLI:

- Default: `1000` (milliseconds).
- `--delay 0` disables pacing entirely (escape hatch for small/dry runs).
- Parsed as a number; invalid values fall back to the default with a warning is out of
  scope — trust the operator.

### Where the delay fires

Inside the worker passed to `runPool`, the delay runs **after** `generateOne` settles
(success or failure) and **before** the worker loop picks up the next entry. That
means:

- Each worker waits `delay` ms between its own calls.
- With concurrency = N and delay = D, the steady-state rate is roughly `N / (D +
latency)` requests per second.
- Defaults (concurrency=3, delay=1000ms) yield ~3 req/sec, comfortably under typical
  `gpt-image-1` limits.

Failures still mark the result as failed — the delay is purely about pacing, not error
handling.

### Logging

At startup, include the delay in the existing config banner:

```
Generating with model=gpt-image-1 quality=medium concurrency=3 delay=1000ms...
```

### Implementation points

1. `parseArgs`: add `delay: 1000` to defaults, add `case '--delay':` handler.
2. `printHelp`: document the new flag.
3. `runPool` call in `main`: wrap the worker body so the post-call sleep runs inside
   the `try`/`catch`-equivalent structure (so it applies on both success and failure
   paths) before returning into the recursive `next()` pickup. Simpler: move the sleep
   into the per-entry worker function passed to `runPool`.
4. Update `tools/image-generator/README.md` flag reference.

### Testing

Manual verification only — this tool is operator-run and not in CI:

1. `pnpm --filter @kids-games-zone/image-generator start --dry-run --full` —
   confirms argument parsing is unbroken.
2. `pnpm --filter @kids-games-zone/image-generator start --category ui --delay 1000`
   on a live key — confirms the run completes past the ~15-image threshold without
   429s.
3. `--delay 0` on a small `--only a,b` run — confirms the escape hatch works.

## Risks

- **Still too fast.** If 1000ms turns out not to be enough, the operator can pass a
  higher value. We accept this over building retry logic up front.
- **Slower runs.** Default pacing makes a full run noticeably slower. Operators who
  need speed can lower `--delay` or lower `--concurrency` as needed.
