# Spelling Bee Review Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear seven small review-backlog items from the prior Spelling Bee bug-fix PR in one focused PR.

**Architecture:** Purely additive/subtractive edits on existing files. No new files, no new components, no new interfaces. Largest change is replacing a broken sort comparator with bucketed shuffle logic in `wordSelector.ts` (#7); everything else is comment updates, dead-key deletions, or a single small ref-guard addition.

**Tech Stack:** React 19, TypeScript (strict), Vitest + @testing-library/react.

**Branch:** `fix/spelling-bee-review-followups` (already checked out).

**Spec:** `docs/superpowers/specs/2026-04-18-spelling-bee-review-followups-design.md`

---

## File Structure

**Modify:**

- `games/spelling-bee/src/locales/en/spelling-bee.json` — remove dead keys (#9)
- `games/spelling-bee/src/locales/fr/spelling-bee.json` — remove dead keys (#9)
- `games/spelling-bee/src/hooks/useSessionLevels.ts` — update victory-precedence comment (I-2)
- `games/spelling-bee/src/hooks/useSpellingRound.ts` — add dev-only double-fire note (M-3)
- `games/spelling-bee/src/SpellingBee.tsx` — add reduced-motion design note (#8)
- `games/spelling-bee/src/__tests__/wordSelector.test.ts` — rename misleading test (M-4)
- `games/spelling-bee/src/utils/wordSelector.ts` — replace `Math.random() - 0.5` tiebreaker with bucketed shuffle (#7)
- `games/spelling-bee/src/components/LevelPlay.tsx` — add key-ref guard to play-word effect (#10)
- `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` — add strict-mode single-fire test (#10)

**No files created. No files deleted.**

---

## Task ordering rationale

Ordered from smallest blast radius (doc-only) to largest (code + test), so earlier tasks provide a stable baseline for later ones.

- **Tasks 1–5** are comment and dead-key edits (#9, I-2, M-3, #8, M-4). Zero functional changes.
- **Task 6** is the one real code change (#7).
- **Task 7** is the strict-mode guard + new test (#10).
- **Task 8** is final verification.

---

## Task 1: Delete dead `encourageTiny` / `encourageJunior` locale keys

**Files:**

- Modify: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Modify: `games/spelling-bee/src/locales/fr/spelling-bee.json`

The keys `encourageTiny` and `encourageJunior` exist in both locale files but have zero references in source code (verified via grep). `encourageExplorer` doesn't exist. Live keys are `levelEncourageTiny` / `levelEncourageJunior` / `levelEncourageExplorer` (used by `LevelTransition.tsx`).

- [ ] **Step 1: Remove the keys from the English locale**

In `games/spelling-bee/src/locales/en/spelling-bee.json`, delete these two lines (currently at lines 23–24):

```json
  "encourageTiny": "Well done!",
  "encourageJunior": "Nice spelling!",
```

- [ ] **Step 2: Remove the keys from the French locale**

In `games/spelling-bee/src/locales/fr/spelling-bee.json`, delete these two lines (currently at lines 23–24):

```json
  "encourageTiny": "Bien joué !",
  "encourageJunior": "Belle orthographe !",
```

- [ ] **Step 3: Verify JSON parses and no code broke**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm typecheck`

Expected: same 3 pre-existing errors (`SpellingBee.test.tsx:35` `deletedAt`, `LivesDisplay.tsx:1` `IconImage`, `SpellingBee.tsx:82` `characterSrc`). No new errors.

Run: `pnpm test`

Expected: all 65 tests PASS.

Run from repo root `C:\code\kids`: `pnpm lint --max-warnings=0`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/locales/en/spelling-bee.json games/spelling-bee/src/locales/fr/spelling-bee.json
git -C C:/code/kids commit -m "i18n(spelling-bee): remove dead encourageTiny/encourageJunior keys"
```

---

## Task 2: Update victory-precedence comment (I-2)

**Files:**

- Modify: `games/spelling-bee/src/hooks/useSessionLevels.ts`

The comment above the victory branch reads "if the player reached the final level (even on their last life), reward the completion." Reviewer pointed out that the actual rule is weaker: _any_ completion at level 5 fires victory, including a 0-correct run after losing the last life. The behavior is intentional (kid-friendly). Make the comment match reality.

- [ ] **Step 1: Update the comment**

In `games/spelling-bee/src/hooks/useSessionLevels.ts`, locate the block (currently around lines 129–135):

```ts
// Victory takes precedence over out-of-lives: if the player reached
// the final level (even on their last life), reward the completion.
if (currentLevelRef.current >= TOTAL_LEVELS) {
  setOutcome('victory');
  setSessionPhase('complete');
  return;
}
```

Replace the comment only — the code is unchanged:

```ts
// Any completion at level 5 is treated as a victory, regardless of
// that level's accuracy — reaching level 5 is itself an achievement
// for kids, and tightening to require a passing score would punish
// players who got unlucky on their final-life attempt.
if (currentLevelRef.current >= TOTAL_LEVELS) {
  setOutcome('victory');
  setSessionPhase('complete');
  return;
}
```

- [ ] **Step 2: Verify nothing broke**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm test`

Expected: 65/65 PASS.

- [ ] **Step 3: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/hooks/useSessionLevels.ts
git -C C:/code/kids commit -m "docs(spelling-bee): accurately describe victory-precedence rule"
```

---

## Task 3: Add dev-only double-fire note to `useSpellingRound` empty-words effect (M-3)

**Files:**

- Modify: `games/spelling-bee/src/hooks/useSpellingRound.ts`

The reviewer pointed out that React strict-mode's double-mount in dev fires the empty-words `useEffect` twice (fresh refs per mount defeat the `hasNotifiedRef` guard). The path is unreachable in production because `selectWords`'s Layer 4 guarantees non-empty arrays. Document this rather than complicate the implementation.

- [ ] **Step 1: Add the comment**

In `games/spelling-bee/src/hooks/useSpellingRound.ts`, locate the existing comment block above the empty-words `useEffect` (currently around lines 55–60). The current comment explains the effect's one-shot behavior. Extend it with a dev-only-strict-mode note. Find:

```ts
// If constructed with an empty words array, notify the parent once
// (post-render, via effect) so the session hook can advance past the
// broken round instead of hanging on it. The hasNotifiedRef gate ensures
// this fires at most once per hook instance, so repeated empty→non-empty
// transitions (unusual) don't cascade into duplicate notifications.
```

Replace with:

```ts
// If constructed with an empty words array, notify the parent once
// (post-render, via effect) so the session hook can advance past the
// broken round instead of hanging on it. The hasNotifiedRef gate ensures
// this fires at most once per hook instance, so repeated empty→non-empty
// transitions (unusual) don't cascade into duplicate notifications.
//
// Dev-only note: React strict-mode mounts components twice, so this
// effect fires twice in dev when it fires at all. The ref is fresh per
// mount, so the guard doesn't help across strict-mode's throwaway mount.
// Not worth fixing because the empty-words path is unreachable in
// practice — Layer 4 of selectWords guarantees a non-empty array for
// any real word pool.
```

- [ ] **Step 2: Verify nothing broke**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm test`

Expected: 65/65 PASS.

- [ ] **Step 3: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/hooks/useSpellingRound.ts
git -C C:/code/kids commit -m "docs(spelling-bee): note strict-mode double-fire is acceptable"
```

---

## Task 4: Add reduced-motion design note to `SpellingBee.tsx` (#8)

**Files:**

- Modify: `games/spelling-bee/src/SpellingBee.tsx`

Today nothing in spelling-bee animates except the shared `CelebrationOverlay` and `PauseMenu` (which already gate on `useReducedMotion()` from framer-motion). Rather than adding infrastructure for animations that don't exist, leave a grep-able reminder at the top of the file.

- [ ] **Step 1: Add the comment**

In `games/spelling-bee/src/SpellingBee.tsx`, add a comment block immediately above the `export function SpellingBee` declaration (currently around line 27). If the existing structure is `function getWordPool(...)` followed directly by `export function SpellingBee(...)`, insert the comment between them.

```ts
// Design note: any animations added to spelling-bee components should gate
// on `useReducedMotion()` from framer-motion. The shared CelebrationOverlay
// and PauseMenu already follow this pattern; follow them.
export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
```

- [ ] **Step 2: Verify nothing broke**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm test`

Expected: 65/65 PASS.

- [ ] **Step 3: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/SpellingBee.tsx
git -C C:/code/kids commit -m "docs(spelling-bee): note reduced-motion expectation for future animations"
```

---

## Task 5: Rename misleading Layer 3 test (M-4)

**Files:**

- Modify: `games/spelling-bee/src/__tests__/wordSelector.test.ts`

The test `allows repeats when widening is still not enough` uses a 2-word pool with `count: 5`. In the `selectWords` flow, this actually falls through to Layer 4 (whole-pool fallback), not Layer 3 — the "allows repeats" name is misleading. Layer 3 proper is covered by a separate test.

- [ ] **Step 1: Rename the test and add a clarifying comment**

In `games/spelling-bee/src/__tests__/wordSelector.test.ts`, find the test (currently around lines 66–79):

```ts
it('allows repeats when widening is still not enough', () => {
  const narrowPool = [
    { word: 'a', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
    { word: 'b', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
  ];
  const result = selectWords(narrowPool, {
    difficulty: 1,
    count: 5,
    exclude: ['a', 'b'],
  });
  expect(result).toHaveLength(2);
  const words = result.map((w) => w.word).sort();
  expect(words).toEqual(['a', 'b']);
});
```

Replace with:

```ts
it('falls through to whole-pool fallback when the pool is smaller than count', () => {
  // Pool has 2 unique words and both are excluded — Layer 3 can't
  // satisfy count (2 < 5), so Layer 4 returns whatever the whole pool
  // offers. Layer 3 proper is covered by the 'uses repeats while
  // honoring the +2 difficulty ceiling (Layer 3)' test below.
  const narrowPool = [
    { word: 'a', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
    { word: 'b', difficulty: 1, image: '', definition: '', origin: '', sentence: '' },
  ];
  const result = selectWords(narrowPool, {
    difficulty: 1,
    count: 5,
    exclude: ['a', 'b'],
  });
  expect(result).toHaveLength(2);
  const words = result.map((w) => w.word).sort();
  expect(words).toEqual(['a', 'b']);
});
```

- [ ] **Step 2: Verify the test still passes under the new name**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm test src/__tests__/wordSelector.test.ts`

Expected: all tests PASS (12/12). Look for the renamed test in the output.

- [ ] **Step 3: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/__tests__/wordSelector.test.ts
git -C C:/code/kids commit -m "test(spelling-bee): rename misleading Layer 4 fallback test"
```

---

## Task 6: Bucketed Fisher-Yates shuffle in `pickFrom` (#7)

**Files:**

- Modify: `games/spelling-bee/src/utils/wordSelector.ts`

Current `pickFrom` uses `Math.random() - 0.5` as a sort tiebreaker, which is an unstable-sort anti-pattern. Naïvely removing it would eliminate per-session variety among same-distance candidates. Replace the approach with bucketed shuffling: group candidates by distance-to-target, shuffle within each bucket, concat closest-first, take the top `count`, then final-shuffle the output.

- [ ] **Step 1: Replace `pickFrom` and extract a `shuffleInPlace` helper**

In `games/spelling-bee/src/utils/wordSelector.ts`, replace the existing `pickFrom` (currently lines 56–72):

```ts
function pickFrom(candidates: WordEntry[], targetDifficulty: number, count: number): WordEntry[] {
  const sorted = [...candidates].sort((a, b) => {
    const distA = targetDifficulty - a.difficulty;
    const distB = targetDifficulty - b.difficulty;
    if (distA !== distB) return distA - distB;
    return Math.random() - 0.5;
  });

  const selected = sorted.slice(0, count);

  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}
```

with:

```ts
function pickFrom(candidates: WordEntry[], targetDifficulty: number, count: number): WordEntry[] {
  // Bucket candidates by distance-to-target so we can shuffle within each
  // distance band before slicing. This gives per-session variety among
  // same-distance candidates without relying on Math.random() in a sort
  // comparator (which is an unstable-sort anti-pattern).
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

- [ ] **Step 2: Run the existing test suite — all assertions should still hold**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm test src/__tests__/wordSelector.test.ts`

Expected: all 12 tests PASS. In particular:

- `'shuffles the result (non-deterministic, run multiple times)'` — continues to assert variety across runs; the bucketed implementation preserves variety.
- `'prioritizes words closest to the target difficulty'` — still holds because buckets are traversed closest-first.
- All Layer 1–4 tests — still hold.

If the shuffle test fails (`allSame === true`), investigate: the implementation may have accidentally made distance-0 selections deterministic.

- [ ] **Step 3: Run the full spelling-bee suite + lint**

Run: `pnpm test` from `games/spelling-bee`. Expected: 65/65 PASS.

Run: `pnpm lint --max-warnings=0` from `C:\code\kids`. Expected: clean.

Run: `pnpm typecheck` from `games/spelling-bee`. Expected: same 3 pre-existing errors, no new ones.

- [ ] **Step 4: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/utils/wordSelector.ts
git -C C:/code/kids commit -m "refactor(spelling-bee): replace unstable sort tiebreaker with bucketed shuffle"
```

---

## Task 7: Strict-mode audio guard in `LevelPlay` + test (#10)

**Files:**

- Modify: `games/spelling-bee/src/components/LevelPlay.tsx`
- Modify: `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`

Currently `LevelPlay`'s play-word `useEffect` calls `audioManager.playVoice` and `announce` every time it fires. In React strict-mode (dev), effects run twice on mount, so the word is announced and played twice. Add a ref guard keyed on `phase + word` so the side effects fire only on transitions.

- [ ] **Step 1: Write a failing test that asserts single-fire under StrictMode**

Open `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`. At the top of the file, the existing imports start with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SpellingBee } from '../SpellingBee';
import type { GameProps } from '@kids-games-zone/shared';
```

Add `StrictMode` to a React import (or add the React import if not present):

```tsx
import { StrictMode } from 'react';
```

Then append a new test inside the `describe('SpellingBee', ...)` block, after the existing tests:

```tsx
it('plays word audio exactly once after dismissing instruction, even in StrictMode', () => {
  const props = createMockProps();
  render(
    <StrictMode>
      <SpellingBee {...props} />
    </StrictMode>,
  );

  // Dismiss instruction → phase becomes 'playing', the play-word
  // effect fires. Without the guard, StrictMode fires it twice.
  fireEvent.click(screen.getByText('letsGo'));

  const wordPlays = (props.audioManager.playVoice as ReturnType<typeof vi.fn>).mock.calls.filter(
    (call: unknown[]) => typeof call[0] === 'string' && call[0].startsWith('voice:word-'),
  );
  expect(wordPlays).toHaveLength(1);
});
```

The filter on `'voice:word-'` is important because other voice calls (`voice:encouragement-*`) may also fire during the round, and we only care about the word-pronunciation fires here.

- [ ] **Step 2: Run the test to see it fail**

From `C:\code\kids\games\spelling-bee`:

Run: `pnpm test src/__tests__/SpellingBee.test.tsx`

Expected: the new test FAILS with something like `expected length 1, received 2`. Other tests continue to pass.

- [ ] **Step 3: Add the key-ref guard in `LevelPlay`**

In `games/spelling-bee/src/components/LevelPlay.tsx`, add `useRef` to the `react` imports on line 1:

```ts
import { useEffect, useMemo, useRef } from 'react';
```

Inside the component body, after the `useSpellingRound` call and before the `useMemo` for tiles (around line 52), add:

```ts
const lastPlayedKeyRef = useRef<string | null>(null);
```

Then replace the play-word effect (currently lines 58–63):

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

with:

```ts
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

The key `playing:${word}` changes when the phase re-enters playing with a new word, so the guard only suppresses same-phase same-word duplicate fires (which is exactly what StrictMode's double-mount and React's dev-mode re-render can produce).

- [ ] **Step 4: Run the test again to verify it passes**

Run: `pnpm test src/__tests__/SpellingBee.test.tsx`

Expected: the new test PASSES. All other SpellingBee tests also pass.

- [ ] **Step 5: Run the full spelling-bee suite**

Run: `pnpm test` from `games/spelling-bee`.

Expected: 66/66 PASS (65 pre-existing + 1 new).

- [ ] **Step 6: Lint and typecheck**

Run: `pnpm lint --max-warnings=0` from `C:\code\kids`. Expected: clean.

Run: `pnpm typecheck` from `games/spelling-bee`. Expected: 3 pre-existing errors, no new ones.

- [ ] **Step 7: Commit**

```bash
git -C C:/code/kids add games/spelling-bee/src/components/LevelPlay.tsx games/spelling-bee/src/__tests__/SpellingBee.test.tsx
git -C C:/code/kids commit -m "fix(spelling-bee): guard LevelPlay play-word effect against StrictMode double-fire"
```

---

## Task 8: Final verification

**Files:** none modified.

- [ ] **Step 1: Run the full spelling-bee test suite**

From `games/spelling-bee/`:

Run: `pnpm test`

Expected: 66/66 PASS across 8 files.

- [ ] **Step 2: Run the full workspace typecheck**

From `C:\code\kids`:

Run: `pnpm --filter @kids-games-zone/spelling-bee typecheck`

Expected: 3 pre-existing errors (`SpellingBee.test.tsx:35` `deletedAt`, `LivesDisplay.tsx:1` `IconImage`, `SpellingBee.tsx` `characterSrc`). Zero new errors.

- [ ] **Step 3: Lint**

From `C:\code\kids`:

Run: `pnpm lint --max-warnings=0`

Expected: clean.

- [ ] **Step 4: Confirm branch commits**

Run: `git -C C:/code/kids log --oneline main..HEAD`

Expected: 1 docs commit (spec) + 7 code commits (one per Task 1–7) = 8 commits.

- [ ] **Step 5: Manual smoke test**

Run the platform dev server from the repo root:

Run: `pnpm --filter platform dev`

In a browser at `http://localhost:3000`:

1. Create or select a junior-tier profile (age 7). Launch Spelling Bee.
2. Dismiss the instruction screen.
3. **Verify #10**: listen for the word pronunciation — it should play once, not twice. (Open devtools console, check `Audio` prepare/play logs.)
4. Play through two rounds. Confirm no regression in word selection variety (sanity: you shouldn't see the same word twice back-to-back on level 1).
5. Run out of lives. Confirm the `GameOverOverlay` renders as before. Click "Try again" and complete the session this time.

All observed behavior should match the pre-PR state except:

- No dev-console "double play" noise (was audible in strict-mode dev before; shouldn't be anymore).

---

## Out-of-scope reminders

The following items from the backlog are deliberately **not** addressed in this PR. They remain for separate specs:

- Tier-config refactor (#4) — scattered `isTiny` / `ageTier === 'tiny'` checks across multiple files.
- Difficulty recovery rework (#5) — `adjustDifficulty` only clamps downward; a rallying kid can't recover.
- Test-coverage catchup (#6) — `LetterTiles`, `Keyboard`, `WordDisplay` clue buttons, and other hook paths.
- Hook discriminated-union type (final-review M-2) — refactor `SpellingRoundState.currentWord` to remove the `WordEntry | undefined` leak.
