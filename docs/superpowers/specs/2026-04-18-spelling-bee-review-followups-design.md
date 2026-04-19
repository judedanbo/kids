# Spelling Bee Review Follow-ups Design

## Problem

Two rounds of review on the prior bug-fix PR (`docs/superpowers/specs/2026-04-18-spelling-bee-bugfixes-design.md`) surfaced a backlog of small items. Seven of them are small, low-risk, and mechanical enough to bundle into one focused PR. The remaining larger items (tier-config refactor, difficulty-recovery rework, test-coverage catchup, hook discriminated-union) stay as separate future specs.

## Goals

- Eliminate anti-patterns and dev-only noise surfaced in review, without touching user-visible behavior except where explicitly called out.
- Ship all seven items in a single PR so review overhead stays proportional to the work.
- Leave the code in a state where future PRs can reference cleaner patterns.

## Non-Goals

- Tier-config refactor (#4) — stays for a standalone PR.
- Difficulty-recovery rework (#5) — design decision, needs its own brainstorm.
- Test-coverage catchup (#6) — moderate; standalone PR.
- Hook discriminated-union for `SpellingRoundState.currentWord` (M-2) — small but touches consumers; standalone.
- User-visible copy changes beyond the one noted under I-2.
- Any cross-cutting shared-library changes.

## Items in scope

| ID  | Source                  | Summary                                                                                                                                                                                                                                                                                               |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #7  | Original review         | Replace the `Math.random() - 0.5` tiebreaker in `pickFrom`'s sort with a deterministic sort + within-group Fisher-Yates shuffle.                                                                                                                                                                      |
| #8  | Original review         | Audit `prefers-reduced-motion` coverage; today no spelling-bee component animates outside the shared `CelebrationOverlay` (which already respects it). Scope-limited fix: leave code alone, add a one-line comment in `SpellingBee.tsx` noting the expectation so future animations remember to gate. |
| #9  | Original review         | Delete dead `encourageTiny` / `encourageJunior` keys from EN + FR locale files — they're unreferenced. Live `levelEncourageTiny` / `levelEncourageJunior` / `levelEncourageExplorer` stay (used by `LevelTransition.tsx:25-28`).                                                                      |
| #10 | Original review         | Add a key-ref guard to `LevelPlay`'s play-word `useEffect` so React strict-mode double-mount doesn't double-fire the `playVoice` / `announce` pair.                                                                                                                                                   |
| I-2 | Final cross-task review | Accept that reaching level 5 always fires `outcome === 'victory'` regardless of the player's final-level score. Update the comment in `useSessionLevels.completeLevel` to describe the rule accurately.                                                                                               |
| M-3 | Final cross-task review | Accept dev-only strict-mode double-fire of the empty-words notification in `useSpellingRound`. Add a comment explaining why fixing it isn't worthwhile (the path is unreachable in practice).                                                                                                         |
| M-4 | Final cross-task review | Rename the misleading test `allows repeats when widening is still not enough` in `wordSelector.test.ts` — it actually exercises Layer 4, not Layer 3. Layer 3 is separately covered.                                                                                                                  |

## Design

### #7: Replace the `Math.random() - 0.5` sort

Current `pickFrom` in `games/spelling-bee/src/utils/wordSelector.ts:56-72`:

```ts
function pickFrom(candidates, targetDifficulty, count) {
  const sorted = [...candidates].sort((a, b) => {
    const distA = targetDifficulty - a.difficulty;
    const distB = targetDifficulty - b.difficulty;
    if (distA !== distB) return distA - distB;
    return Math.random() - 0.5; // ← anti-pattern: sort comparator isn't stable
  });
  const selected = sorted.slice(0, count);
  // ... then Fisher-Yates shuffle on selected
}
```

The tiebreaker matters: when multiple candidates share the same distance-to-target, it decides which ones get sliced into `count` before the final shuffle. Replacing it with a deterministic comparator would eliminate variety across sessions — the same N candidates would always win the tiebreak.

**Fix:** group candidates by distance-to-target, Fisher-Yates-shuffle within each group, concatenate the shuffled groups in ascending-distance order, then take the top `count`. A final Fisher-Yates on the result preserves the existing output-order shuffle.

```ts
function pickFrom(candidates, targetDifficulty, count) {
  // Bucket by distance-to-target.
  const byDistance = new Map<number, WordEntry[]>();
  for (const w of candidates) {
    const d = targetDifficulty - w.difficulty;
    const group = byDistance.get(d);
    if (group) group.push(w);
    else byDistance.set(d, [w]);
  }

  // Closest buckets first. Within each bucket: shuffle, then concat.
  const ordered: WordEntry[] = [];
  const keys = [...byDistance.keys()].sort((a, b) => a - b);
  for (const key of keys) {
    const group = byDistance.get(key)!;
    shuffleInPlace(group);
    ordered.push(...group);
    if (ordered.length >= count) break;
  }

  const selected = ordered.slice(0, count);
  shuffleInPlace(selected);
  return selected;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
```

Extracting the shuffle into `shuffleInPlace` also DRYs the existing trailing shuffle.

### #8: `prefers-reduced-motion` documentation

Today, only `CelebrationOverlay` (shared) animates; it already uses `useReducedMotion()` from `framer-motion`. `GameOverOverlay` added in the prior PR has no animations. `LevelPlay`, `LevelTransition`, etc. are static.

**Fix:** no code change. Add a single comment at the top of `SpellingBee.tsx` (just above or below imports):

```ts
// Design note: any animations added to spelling-bee components should gate
// on `useReducedMotion()` from framer-motion. The shared CelebrationOverlay
// and PauseMenu already follow this pattern; follow them.
```

This turns a vague "we should respect reduced-motion" expectation into a grep-able reminder without adding unused infrastructure.

### #9: Delete dead `encourageTiny` / `encourageJunior` keys

Verified via grep: `encourageTiny` and `encourageJunior` are only present in locale JSON — no code references. `encourageExplorer` doesn't even exist. Meanwhile `levelEncourageTiny` / `levelEncourageJunior` / `levelEncourageExplorer` are used at `games/spelling-bee/src/components/LevelTransition.tsx:25-28`.

**Fix:** remove the two dead keys from both `games/spelling-bee/src/locales/en/spelling-bee.json` and `games/spelling-bee/src/locales/fr/spelling-bee.json`.

No JSDoc comment is needed after removal — the remaining `levelEncourage*` keys are self-evident from their names plus the one usage site.

### #10: Strict-mode double-audio guard in `LevelPlay`

Current effect at `games/spelling-bee/src/components/LevelPlay.tsx:58-63`:

```ts
useEffect(() => {
  if (round.phase === 'playing' && round.currentWord) {
    audioManager.playVoice(`voice:word-${round.currentWord.word}`);
    announce(t('wordOf', { current: round.currentWordIndex + 1, total: words.length }));
  }
}, [
  round.phase,
  round.currentWordIndex,
  round.currentWord,
  audioManager,
  announce,
  t,
  words.length,
]);
```

In React strict-mode dev, the effect fires twice on mount. Each fire calls `audioManager.playVoice` and `announce`. Users in prod aren't affected, but developers hear the word twice in dev, and any shared-library regression that changes strict-mode behavior in prod would leak.

**Fix:** add a ref keyed on `phase + word` so the effect body only runs once per transition.

```ts
const lastPlayedKeyRef = useRef<string | null>(null);

useEffect(() => {
  if (round.phase !== 'playing' || !round.currentWord) return;
  const key = `playing:${round.currentWord.word}`;
  if (lastPlayedKeyRef.current === key) return;
  lastPlayedKeyRef.current = key;
  audioManager.playVoice(`voice:word-${round.currentWord.word}`);
  announce(t('wordOf', { current: round.currentWordIndex + 1, total: words.length }));
}, [
  round.phase,
  round.currentWordIndex,
  round.currentWord,
  audioManager,
  announce,
  t,
  words.length,
]);
```

The feedback effect (lines 65-74) isn't included here — it doesn't double-fire in strict-mode because each `feedback` phase entry is preceded by a `playing` phase, so the key naturally changes. If it turns out to be problematic, fix separately.

### I-2: Victory-precedence comment update

Current comment at `games/spelling-bee/src/hooks/useSessionLevels.ts:131-134`:

```ts
// Victory takes precedence over out-of-lives: if the player reached
// the final level (even on their last life), reward the completion.
if (currentLevelRef.current >= TOTAL_LEVELS) { ... }
```

The reviewer flagged that "reached the final level" is stronger-worded than "entered the final level". As implemented, `currentLevel >= 5` fires victory even if the player got 0/7 on level 5 (because `completeLevel` is called once the round hook's `nextWord` flushes on `outOfLives`). This is the intended kid-friendly behavior.

**Fix:** replace the comment to describe the rule accurately.

```ts
// Any completion at level 5 is treated as a victory, regardless of the
// final level's accuracy — reaching level 5 is itself an achievement for
// kids, and tightening to require a passing score would punish players
// who got unlucky on their final-life attempt.
if (currentLevelRef.current >= TOTAL_LEVELS) { ... }
```

No code change. Spec prose in the prior bug-fix design doc (`2026-04-18-spelling-bee-bugfixes-design.md`) wasn't updated because specs are historical artifacts; the source comment is where a future maintainer will look.

### M-3: Strict-mode empty-words double-fire (accept)

`useSpellingRound`'s empty-words notification `useEffect` uses `hasNotifiedRef.current` to fire at most once per mount. In dev strict-mode, the component mounts, unmounts, then mounts again with fresh refs — so the effect fires twice. The path is unreachable in practice because Task 1's Layer 4 in `selectWords` guarantees a non-empty pool for any real word list.

**Fix:** leave code unchanged. Add a comment:

```ts
// Dev-only note: React strict-mode mounts components twice, so this
// notification fires twice in dev when it fires at all. The ref guard
// only prevents duplicate fires within a single mount. Not worth fixing
// because the empty-words path is unreachable in practice — Layer 4 of
// selectWords guarantees a non-empty array for any real word pool.
```

Place the comment above the existing `useEffect`.

### M-4: Rename misleading Layer 3 test

Current test at `games/spelling-bee/src/__tests__/wordSelector.test.ts:66-79`:

```ts
it('allows repeats when widening is still not enough', () => {
  const narrowPool = [...]; // 2 words
  const result = selectWords(narrowPool, { difficulty: 1, count: 5, exclude: ['a', 'b'] });
  expect(result).toHaveLength(2);
  // ...
});
```

Walking through Layer 1→2→3→4 with a 2-word fully-excluded pool and `count: 5`, Layer 3's `if (withRepeats.length >= count)` check fails (2 < 5), so execution falls through to Layer 4. A separate test at lines 82-108 (`'uses repeats while honoring the +2 difficulty ceiling (Layer 3)'`) actually exercises Layer 3.

**Fix:** rename to describe the actual behavior and add a comment pointing to the Layer 3 test.

```ts
it('falls through to whole-pool fallback when repeats are insufficient', () => {
  // Pool is smaller than count AND fully excluded — Layer 3 can't satisfy
  // count, so Layer 4 returns whatever the whole pool offers.
  // Layer 3 proper is covered by the 'uses repeats...' test below.
  const narrowPool = [...];
  // rest unchanged
});
```

No assertion changes.

## Testing

### New tests

- **`#10 strict-mode double-audio guard`**: add one test to `SpellingBee.test.tsx` that mounts `<SpellingBee>` wrapped in `<StrictMode>` and, after the instruction dismiss, asserts `audioManager.playVoice` was called exactly once (not twice) for the first word. This is the smallest direct test of the new ref guard.

### Existing tests that already cover the fixes

- **`#7 bucketed shuffle`**: the existing non-deterministic shuffle test at `wordSelector.test.ts:31-37` (`'shuffles the result (non-deterministic, run multiple times)'`) continues to assert variety across runs. The new bucket-shuffle implementation preserves that invariant; no new test needed.
- **`#9 dead key removal`**: the two removed keys have zero references. `pnpm lint` and `pnpm typecheck` staying green is sufficient coverage.
- **`M-4 rename`**: the assertion block is unchanged; only the test name and comment change. The test continues to pass.

### Regression expectations

- All existing spelling-bee tests (65/65 pre-PR) remain green.
- The existing Layer 3 test (`'uses repeats while honoring the +2 difficulty ceiling (Layer 3)'`) continues to fire the `"reusing previously-seen words"` warning in stderr.
- Typecheck: same 3 pre-existing errors; no new errors.

### Out of testing scope

- `console.warn` / `console.error` emissions (implementation detail; spec-level tests would be brittle).
- I-2 / M-3 comment wording (reviewed, not unit-tested).
- #8's single-line comment in `SpellingBee.tsx` (documentation only).

## Rollout

Single PR on branch `fix/spelling-bee-review-followups`. All checks must pass (lint, typecheck unchanged from baseline, 65+ tests). No feature flag, no migration. Changes are additive except for the two dead locale keys (#9), which have zero references.

## Open Questions

None. All items resolved during triage.
