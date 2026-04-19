# Spelling Bee Level Progression Design

## Problem

The Spelling Bee game currently plays as a single flat round of words. When finished, "Play Again" reloads the page. Kids see the same words repeatedly because word pools are small (16-18 words per age tier) and difficulty only adjusts after 3+ sessions at 85%+ average. There is no sense of in-session progression.

## Goals

- Give kids a feeling of advancing through levels within a single game session
- Provide a natural difficulty arc: warm up, practice, then stretch
- Adjust difficulty dynamically based on per-level performance (gentle fallback)
- Expand word pools so kids don't see the same words every session

## Design Decisions

| Decision                     | Choice                                             | Alternatives Considered                           |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Number of levels per session | 5                                                  | Fixed at 5 for all age tiers                      |
| Words per level              | Scaling: 3, 4, 5, 6, 7                             | Fixed count per level; scale by age tier          |
| Difficulty mapping           | Challenge Ladder (warm up → at level → stretch)    | Sequential cursor; mixed difficulty per level     |
| Poor performance handling    | Gentle fallback (always advance, clamp difficulty) | Retry same level; end session; move on regardless |
| Lives                        | 3 for whole session (non-tiny); no lives for tiny  | Per-level lives; growing lives; no lives for all  |

## Level Structure

A session has 5 levels. Words per level scale up:

| Level | Words | Role     |
| ----- | ----- | -------- |
| 1     | 3     | Warm up  |
| 2     | 4     | At level |
| 3     | 5     | At level |
| 4     | 6     | Stretch  |
| 5     | 7     | Stretch  |

Total: 25 words per session.

Session flow:

```
Instruction → Level 1 → Level-Up screen → Level 2 → Level-Up screen → ... → Level 5 → Celebration → GameResult
```

Between each level, a "Level Up!" transition shows the level number, current score, and encouragement. The kid taps "Next Level" to proceed.

If lives run out (non-tiny only), the session ends early with a gentler game-over screen showing the level reached.

## Challenge Ladder Difficulty Mapping

Given the player's stored difficulty **N** from platform progress:

| Level | Planned Difficulty | Role                          |
| ----- | ------------------ | ----------------------------- |
| 1     | max(N-1, 1)        | Warm up — review easier words |
| 2     | N                  | At level                      |
| 3     | N                  | At level                      |
| 4     | N+1                | Stretch                       |
| 5     | N+1                | Stretch                       |

### Gentle Fallback

After each level, check the kid's accuracy on that level:

- **70%+ correct:** next level follows the ladder plan as-is
- **Below 70%:** next level's planned difficulty is clamped to the current level's difficulty (doesn't step up)

The difficulty never drops below the warm-up level (max(N-1, 1)). It only clamps upward movement — kids never go backwards from where they started.

### Example (N=3)

- Level 1 (diff 2): 2/3 correct (67%) — struggling → level 2 stays at diff 2 instead of 3
- Level 2 (diff 2): 4/4 correct (100%) — doing well → level 3 follows plan at diff 3
- Level 3 (diff 3): 4/5 correct (80%) — doing well → level 4 goes to diff 4
- Level 4 (diff 4): 3/6 correct (50%) — struggling → level 5 stays at diff 4
- Level 5 (diff 4): plays out, session ends

## Word Pool Expansion

Current pools are too small for 25-word sessions with replayability:

| Tier     | Current  | Difficulty Range | Target                         |
| -------- | -------- | ---------------- | ------------------------------ |
| Tiny     | 18 words | 1-4              | ~80 words (20 per difficulty)  |
| Junior   | 16 words | 1-6              | ~90 words (15 per difficulty)  |
| Explorer | 16 words | 1-10             | ~100 words (10 per difficulty) |

### Word selection per level

The existing `selectWords` function is called once per level (not once per session), passing the level's target difficulty and word count. An exclusion list of words already used in earlier levels is passed so there are no repeats within a session. This requires adding an optional `exclude` parameter to `selectWords`.

### Word data format

Unchanged. Each entry: `word`, `difficulty`, `image`, `definition`, `origin`, `sentence`.

- Tiny tier words need `image` references (used by LetterTiles UI)
- Junior and explorer words need `definition`, `origin`, and `sentence` (used by WordDisplay)

## Lives & Scoring

### Lives

- **Non-tiny:** 3 lives for the entire session, shared across all levels. Each incorrect answer costs 1 life. When lives hit 0, the current level ends immediately and the session goes to the celebration screen.
- **Tiny:** No lives, no penalty. Always plays through all 5 levels. Gentle fallback still adjusts difficulty based on accuracy.

### Scoring

- Each correct word = 1 point (unchanged)
- Max score = total words encountered (25 if all 5 levels completed, fewer if lives ran out early)
- During gameplay: show current level score and total session score
- At celebration: show total score, levels completed, and words correct

### GameResult reported to platform

- `score`: total correct across all levels
- `maxScore`: total words encountered
- `difficulty`: the highest difficulty of any level the kid started (even if they didn't finish it due to lives running out)
- `metrics.wordsCorrect`, `metrics.wordsTotal`: same as score/maxScore
- `metrics.levelsCompleted`: how many of the 5 levels they finished
- `metrics.livesRemaining`: lives left at end (or null for tiny)

## UI Components

### New: LevelTransition

Shown between levels. Displays:

- Level number just completed, star/checkmark, score so far, encouragement message
- "Next Level" button to proceed
- Tiny tier: bigger text, more animated, character voice encouragement

### New: LevelIndicator

Small persistent UI during gameplay showing "Level 2 / 5". Briefly animates when a new level starts.

### Existing components unchanged

- `ProgressBar` — still shows word progress within the current level
- `ScoreDisplay` — shows session score
- `LivesDisplay` — shows remaining session lives
- `CelebrationOverlay` — shown at session end
- `GameShell`, `OptionButton`, `WordDisplay`, `LetterTiles`, `Keyboard` — no changes

## Platform Integration

All changes are contained within `games/spelling-bee/`. No changes to:

- `GameWrapper.tsx` — still passes `GameConfig`, receives `GameResult`
- `difficulty.ts` — cross-session difficulty adjustment unchanged
- `GamePlugin` interface — unchanged
- `GameProgress` / `GameResult` types — uses existing `metrics` bag for new fields

The Spelling Bee uses `config.difficulty` as starting N for the challenge ladder, runs all levels internally, and reports a single `GameResult` at the end.

"Play Again" (`window.location.reload()`) stays the same — picks up potentially updated stored difficulty and starts a fresh 5-level session.
