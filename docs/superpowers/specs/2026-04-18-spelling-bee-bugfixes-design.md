# Spelling Bee Player-Visible Bug Fixes Design

## Problem

A review of the Spelling Bee game surfaced three player-visible bugs worth fixing in a single focused PR. The rest of the review (tier-config refactor, difficulty recovery rework, test-coverage catchup, polish) is deliberately out of scope and will be planned separately.

1. **Game-over reads as victory.** When `junior`/`explorer` players run out of lives, `useSessionLevels` sets `phase = 'complete'` and `SpellingBee` renders the same `CelebrationOverlay` shown after clearing all 5 levels. The kid has no signal they lost. The earlier progression spec (`2026-04-11-spelling-bee-level-progression-design.md`) called for a "gentler game-over screen" but that distinction was never implemented.
2. **Missing image breaks the tiny-tier round.** `WordDisplay` renders `<img src={word.image}>` for tiny with no `onError` handler. A missing file shows a broken-image icon. For tiny tier this is the primary clue, so the round becomes harder to complete even though audio + letter tiles remain available.
3. **Empty word pool crashes `useSpellingRound`.** `currentWord = words[currentWordIndex] ?? words[0]` on line 48 assumes `words` is non-empty. If `selectWords` returns `[]` (e.g., session exclusion drains a narrow difficulty band), the hook indexes into an empty array and the round renders broken.

## Goals

- Distinguish game-over from victory without bouncing the kid back to the platform shell.
- Make a missing tiny-tier image render a neutral placeholder without visual breakage; the round continues.
- Ensure a drained word pool never throws and never shows a blank round; the session always has playable words.
- Add regression tests for all three paths.

## Non-Goals

- Tier-config refactor (issue #4 in the review) — scattered `ageTier === 'tiny'` checks stay as-is for now.
- Difficulty recovery rework (issue #5) — the existing downward-clamp behavior is intentional per the prior progression spec and is left alone.
- Test-coverage catchup for `useSpellingRound`, `LetterTiles`, `Keyboard`, `WordDisplay` beyond the three fix paths (issue #6).
- All low/nit polish items (issues #7–#10).
- Game-over audio cue — intentional silence for now; revisit during playtesting.
- Persistent dedup across sessions.

## Design Decisions

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| Game-over UX | Distinct overlay variant with "Try again" button | Same overlay with different copy; full separate `GameOverOverlay` component |
| Retry semantics | Full restart from level 1 at original `startDifficulty` | Retry current level only; user-choose |
| Overlay implementation | New game-local `GameOverOverlay` component in `games/spelling-bee/src/components/` | Extend shared `CelebrationOverlay` with a variant prop |
| Image fallback | Neutral placeholder (🐝 glyph) sized to match the image slot | Hide image area; show word text; cascading fallback URLs |
| Image fallback location | Local state in `WordDisplay` | Lift into hook; preload check |
| Empty-pool fallback | Layered relaxation inside `selectWords` (widen difficulty → allow repeats → whole pool) | Session-start guard; end-game-as-win; hook-level guard only |
| Dev warnings | `console.warn` gated on `import.meta.env.DEV` | Silent; logging service; user-facing message |
| Belt-and-braces guard | `useSpellingRound` sets sub-phase `'complete'` if `words.length === 0` | Throw; render error state |

## Fix 1: Game-Over UX

### Session hook changes

`useSessionLevels` gains an `outcome` state:

```ts
type SessionOutcome = 'victory' | 'out-of-lives' | null;
```

- Default `null` while the session is in progress.
- Set to `'out-of-lives'` when the completion path is triggered by `livesRef.current <= 0`.
- Set to `'victory'` when completion is reached after the final level with lives remaining.

The hook also exposes `restart(): void`:

- Re-runs the hook's init logic: `ladderRef.current = buildLadder(startDifficulty)`.
- Resets lives (`Infinity` for tiny, `3` otherwise), score, `excludeRef.current`, `currentLevel`, `outcome`.
- Sets `phase` to `'playing'` for all tiers on restart. Non-tiny sessions normally start in `'instruction'`, but on retry the player has already played once; skipping instructions is deliberate.

### New `GameOverOverlay` component

A new game-local component at `games/spelling-bee/src/components/GameOverOverlay.tsx`. It is **not** a variant of the shared `CelebrationOverlay` — that component auto-dismisses and fires confetti, which are wrong behaviors for game-over. Keeping them separate preserves `CelebrationOverlay`'s single purpose and avoids ripples to other games.

Props:

```ts
interface GameOverOverlayProps {
  levelReached: number;
  score: number;
  maxScore: number;
  onRetry: () => void;
  onExit: () => void;
}
```

Behavior:

- No confetti, no auto-dismiss. The kid controls when to leave.
- Renders title (`gameOverTitle` i18n key → "Good try!"), subtitle (`gameOverSubtitle` → "You reached Level {{level}}"), score, 🐝 emoji.
- Two buttons: "Try again" (new `tryAgain` key) wired to `onRetry`; "Back" (reuse existing `back` key if present, otherwise new `exit` key) wired to `onExit`.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title element.
- On mount, move focus to the "Try again" button (default primary action).
- CSS: match the visual language of `CelebrationOverlay` (same overlay backdrop, centered content card) using its own CSS module; respect `prefers-reduced-motion` for any entrance animation.

### Wiring in `SpellingBee.tsx`

Inside the `sessionPhase === 'complete'` branch (currently around line 102-118), switch on `session.outcome`:

- `'victory'` → render existing `CelebrationOverlay` (unchanged).
- `'out-of-lives'` → render the new `GameOverOverlay` with `onRetry={session.restart}` and `onExit={onExit}`.

The victory path stays as-is end-to-end.

## Fix 2: Image Fallback

### `WordDisplay` changes

Add local `imageError: boolean` state. Render the fallback (instead of `<img>`) when:

- `word.image === ''` (empty-string defense), or
- `imageError === true` (set by `onError` on the `<img>` tag).

Fallback element:

- A `<div>` sized to match `.wordImage` (same width/height so layout doesn't shift).
- Contains a 🐝 glyph at image size.
- `role="img"` and `aria-label={t('imageFallbackLabel')}`.
- New CSS class `.imageFallback` in the existing CSS module.

### Reset on word change

`useEffect` with `[word.word]` dependency resets `imageError` to `false`. Without this, a single failed image would cascade to every subsequent word.

### i18n

New key `imageFallbackLabel` → "Picture unavailable" (neutral; for screen readers).

## Fix 3: Empty-Pool Guard

### `selectWords` layered relaxation

The fallback lives in `utils/wordSelector.ts`, not in the hook. `selectWords(pool, targetDifficulty, count, exclude)` runs these layers in order; it returns as soon as a layer can produce `count` words:

1. **Primary (unchanged).** Filter pool for `difficulty <= target && !exclude.has(word)`. Prefer closeness to target, shuffle, take `count`. The existing shuffle implementation (`Math.random() - 0.5` sort) stays as-is — replacing it is tracked as review issue #7 and is out of scope here.
2. **Widen difficulty.** Re-filter with `difficulty <= target + 2 && !exclude.has(word)`. Dev-warn `"[spelling-bee] widened difficulty band"`.
3. **Allow repeats.** Fill from the full pool within `difficulty <= target + 2`, ignoring `exclude`. Dev-warn `"[spelling-bee] reusing previously-seen words"`.
4. **Whole-pool fallback.** Drop the difficulty ceiling, pull from the entire pool. Returns whatever's available (expected to always be ≥ `count` for any real tier given pool sizes).

### Dev warnings

Guarded with `if (import.meta.env.DEV) console.warn(...)`. Prod stays quiet.

### Belt-and-braces guard in `useSpellingRound`

Even with the fallback, defensive check: if `words.length === 0` reaches the hook's init, set sub-phase to `'complete'` immediately (no throw). Dev-error `"[spelling-bee] useSpellingRound received empty words array"`. This should never fire once `selectWords` has the relaxation logic, but it closes the path if a word-list JSON ever ships empty.

## Testing

### Hook unit tests — `useSessionLevels`

- `outcome` is `'out-of-lives'` after completion triggered by lives reaching 0.
- `outcome` is `'victory'` after clearing level 5 with lives remaining.
- `restart()` resets lives, score, exclude-list, `currentLevel`, `outcome`, and phase; re-plans the ladder with original `startDifficulty`.

### Component tests — `SpellingBee`

- When `outcome === 'out-of-lives'`, `GameOverOverlay` is rendered and `CelebrationOverlay` is not (assert by role/aria).
- When `outcome === 'victory'`, `CelebrationOverlay` is rendered and `GameOverOverlay` is not.
- Clicking "Try again" in the `GameOverOverlay` invokes `session.restart()` and the game returns to the playing state (overlay gone).
- Axe check on the game-over state, matching the existing axe test at `SpellingBee.test.tsx:142-151`.

### Component tests — `GameOverOverlay`

- Renders title, subtitle, score, and both buttons; `role="dialog"` and `aria-modal` are set; "Try again" has initial focus.
- `onRetry` fires when "Try again" is clicked; `onExit` fires when "Back" is clicked.

### Component tests — `WordDisplay`

- `word.image === ''` → `<img>` is not rendered; fallback with `role="img"` is present.
- Firing `onError` on a valid-image word swaps to the fallback.
- Switching between two words with `imageError` set on the first → second renders the image (reset works).

### Unit tests — `selectWords`

- Primary path: enough words at target difficulty → returns `count` words, all within `<= target`.
- Widen: pool has enough within `target + 2` but not `target` → returns `count`, at least one beyond `target`.
- Repeats: pool exhausted by exclude list → returns `count` including previously-excluded words.
- Whole-pool fallback: pathological pool where every word is above `target + 2` → returns whatever's available.

### Defensive test — `useSpellingRound`

- Constructed with `words: []`, sub-phase is `'complete'`; no throw.

### Out of testing scope

- `console.warn` emissions (brittle; implementation detail).
- Exact English copy of i18n keys (test mock returns keys; assert key presence, not strings).

## Rollout

Single PR on branch `fix/spelling-bee-bugfixes`. All existing tests must pass; new tests listed above added. No migrations, no feature flag — the three fixes are strictly additive to the current behavior.

## Open Questions

None. All design decisions resolved during brainstorming.
