# Phase 3 — First Three Games: Design Spec

> **Date:** 2026-03-16
> **Phase:** 3 of 6
> **Duration:** 4-5 weeks
> **Milestone:** Three fully functional games playable from the hub, covering different age tiers and skill categories.

---

## Overview

Phase 3 delivers the first three real games for Kids Games Zone:

1. **Math Adventure** — Numeracy, ages 6-8 (junior tier)
2. **Word Puzzle** — Literacy, ages 6-8 (junior tier)
3. **Memory Match** — Memory, ages 3-5 (tiny tier)

All three are built from scratch as monorepo workspace packages under `games/`. Each implements the `GamePlugin` interface, uses shared UI components, and integrates with platform services (audio, storage).

**Build order:** Math Adventure → Word Puzzle → Memory Match. This sequence progresses from the most template-like game (closest to the dummy-game pattern) to the most unique UI.

---

## Prerequisites

All of the following are complete and available:

- Platform shell with routing, Hub, GameWrapper, GameErrorBoundary
- Game plugin loader (`gameLoader.ts`) using `import.meta.glob`
- StorageManager (IndexedDB) with profiles, progress, checkpoints
- AudioManager (Howler.js) with SFX channel and placeholder audio files
- All 9 P0/P1 shared components (GameShell, OptionButton, ScoreDisplay, ProgressBar, CelebrationOverlay, GameTimer, DifficultySelector, InstructionBubble, PauseMenu)
- Game registry (`platform/src/config/gameRegistry.ts`)
- Dummy game as reference implementation

---

## Game 1: Math Adventure

### Concept

A multiple-choice math game with procedurally generated questions. Visual counting aids (colored dots) scaffold learning at lower difficulties and fade out as the player progresses.

### Game Flow

1. Game loads → `<InstructionBubble>` displays "Solve the math problems!"
2. Display question (e.g., "3 + 4 = ?") with 4 `<OptionButton>` choices
3. At difficulty 1-2: show a visual aid (grouped colored dots) above the options
4. Player taps an answer:
   - **Correct:** SFX + green flash + score increment → advance to next question
   - **Incorrect:** "Try again!" with attempt counter (2nd try, 3rd try…)
5. After 10 questions → `<CelebrationOverlay>` with final score → `onComplete(result)`

### Question Generation

Procedural generation in `questionGenerator.ts`. No static question banks.

| Difficulty | Operations | Number Range | Carrying/Borrowing |
|------------|-----------|-------------|-------------------|
| 1 | Addition only | 1–9 | No |
| 2 | Addition only | 1–15 | No |
| 3 | Addition + Subtraction | 1–20 | No |
| 4 | Addition + Subtraction | 1–50 | Yes |
| 5 | Add + Subtract + simple Multiply | 1–50 | Yes |

**Distractor generation:** 3 plausible wrong answers per question — nearby values, common mistakes (off-by-one, wrong operation). No duplicates. No negative distractors.

**Constraints:**
- No duplicate questions within a round
- Subtraction never produces negative results
- Multiplication limited to single-digit factors at difficulty 5

### Visual Aids (Difficulty 1-2 Only)

CSS-drawn colored dots grouped by operand:
- E.g., "3 + 4" shows 3 blue dots + 4 red dots
- Dots arranged in rows of 5 for easy counting
- Component: `VisualAid.tsx`
- Not rendered at difficulty 3+

### Scoring

| Attempt | Points |
|---------|--------|
| 1st try | 10 |
| 2nd try | 5 |
| 3rd try+ | 2 |

- 10 questions per round
- Max score: 100
- `GameResult.metrics`: `{ questionsCorrect, avgAttempts, operationBreakdown }`

### Components

**Shared:** `<GameShell>`, `<OptionButton>`, `<ScoreDisplay>`, `<ProgressBar>`, `<CelebrationOverlay>`, `<InstructionBubble>`, `<GameTimer>` (count-up mode)

**Custom:** `<VisualAid>` — dot/block display for low difficulty

### File Structure

```
games/math-adventure/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  (GamePlugin export)
│   ├── MathAdventure.tsx         (Main game component)
│   ├── MathAdventure.module.css
│   ├── components/
│   │   ├── VisualAid.tsx
│   │   └── VisualAid.module.css
│   ├── utils/
│   │   └── questionGenerator.ts
│   └── __tests__/
│       ├── questionGenerator.test.ts
│       └── MathAdventure.test.tsx
```

### Manifest

```typescript
{
  id: 'math-adventure',
  name: 'Math Adventure',
  description: 'Solve math problems and sharpen your number skills!',
  ageRange: [6, 8] as [number, number],
  skills: ['numeracy'] as SkillCategory[],
  minDifficulty: 1,
  maxDifficulty: 5,
  estimatedPlayTime: 5,
  offlineCapable: true,
  status: 'active',
  entryPoint: 'math-adventure',
  tags: ['math', 'addition', 'subtraction', 'multiplication'],
}
```

---

## Game 2: Word Puzzle

### Concept

A scrambled-letter spelling game. Players see jumbled letters and tap them in order to spell the correct word. Themed rounds with curated word lists organized by category.

### Game Flow

1. Game loads → category selected (random) → `<InstructionBubble>` says "Unscramble the letters to spell the word!"
2. Display: category label (e.g., "Animals") + optional clue (e.g., "It says meow")
3. Scrambled letters shown as tappable tiles in a row
4. Player taps letters to build their answer in the answer zone above
5. Tap a placed letter to return it to the scramble row
6. When all letters placed → auto-check:
   - **Correct:** SFX + celebration animation → next word
   - **Incorrect:** gentle shake + "Try again!" with attempt counter
7. After 8 words → `<CelebrationOverlay>` → `onComplete(result)`

### Letter Tile Interaction

- **Tap-to-place** (not drag). Tap a scrambled letter → it animates to the next empty answer slot.
- Tap an answer slot → letter returns to its original scramble position.
- Framer Motion `layoutId` for smooth letter movement between rows.
- Large tap targets: 56px minimum for the 6-8 age range.
- Keyboard: Tab between tiles, Enter to place/remove, Escape to clear all.

### Word Data

Curated static lists in `data/words.ts`, organized by category and difficulty.

| Difficulty | Word Length | Example Categories |
|------------|-----------|-------------------|
| 1 | 3 letters | Animals (cat, dog, hen), Colors (red, tan), Food (jam, pie) |
| 2 | 4 letters | Animals (frog, bear), Nature (tree, rain), Home (door, lamp) |
| 3 | 4-5 letters | Animals (tiger, horse), Food (bread, grape), Body (elbow, thumb) |
| 4 | 5-6 letters | Nature (flower, jungle), School (pencil, eraser) |
| 5 | 6+ letters | Animals (giraffe, dolphin), Science (planet, rocket) |

- ~15-20 words per category per difficulty level
- Each round picks 8 words from a selected category at the current difficulty
- All words hand-curated for age-appropriateness

### Scramble Algorithm

In `utils/scramble.ts`:
- Fisher-Yates shuffle on the letter array
- Validation: scrambled form must differ from the original word
- If shuffle produces the original, re-shuffle (with max attempts, then force-swap first two letters)

### Scoring

| Attempt | Points |
|---------|--------|
| 1st try | 10 |
| 2nd try | 5 |
| 3rd try+ | 2 |

- 8 words per round
- Max score: 80
- `GameResult.metrics`: `{ wordsCorrect, avgAttempts, category }`

### Components

**Shared:** `<GameShell>`, `<ScoreDisplay>`, `<ProgressBar>`, `<CelebrationOverlay>`, `<InstructionBubble>`

**Custom:**
- `<LetterTile>` — individual tappable letter with available/placed/correct/incorrect states
- `<ScrambleRow>` — source row of jumbled letters
- `<AnswerSlots>` — target slots where letters are placed

### File Structure

```
games/word-puzzle/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  (GamePlugin export)
│   ├── WordPuzzle.tsx            (Main game component)
│   ├── WordPuzzle.module.css
│   ├── components/
│   │   ├── LetterTile.tsx
│   │   ├── LetterTile.module.css
│   │   ├── ScrambleRow.tsx
│   │   ├── ScrambleRow.module.css
│   │   ├── AnswerSlots.tsx
│   │   └── AnswerSlots.module.css
│   ├── data/
│   │   └── words.ts              (Curated word lists by category + difficulty)
│   ├── utils/
│   │   └── scramble.ts           (Scramble algorithm + validation)
│   └── __tests__/
│       ├── scramble.test.ts
│       ├── words.test.ts         (Validate data integrity)
│       └── WordPuzzle.test.tsx
```

### Manifest

```typescript
{
  id: 'word-puzzle',
  name: 'Word Puzzle',
  description: 'Unscramble the letters to spell the word!',
  ageRange: [6, 8] as [number, number],
  skills: ['literacy'] as SkillCategory[],
  minDifficulty: 1,
  maxDifficulty: 5,
  estimatedPlayTime: 5,
  offlineCapable: true,
  status: 'active',
  entryPoint: 'word-puzzle',
  tags: ['spelling', 'words', 'vocabulary', 'literacy'],
}
```

---

## Game 3: Memory Match

### Concept

A card-matching game for the youngest players (ages 3-5, tiny tier). Tap cards to reveal CSS-drawn illustrations, find all matching pairs. Pure encouragement — no penalties for wrong guesses.

### Game Flow

1. Game loads → `<InstructionBubble>` says "Find the matching pictures!"
2. Grid of face-down cards displayed. All cards briefly flip face-up for 1-2 seconds (preview), then flip back.
3. Player taps a card → it flips face-up (`rotateY` animation)
4. Player taps a second card → it flips face-up
5. **Match:** both cards stay face-up, glow/bounce animation, happy SFX, encouraging message ("Great match!")
6. **No match:** cards stay visible for 1 second (so the child can remember), then flip back. Gentle SFX, "Keep trying!"
7. When all pairs found → `<CelebrationOverlay>` → `onComplete(result)`

### Grid Configuration

| Difficulty | Pairs | Grid Layout | Card Size |
|------------|-------|-------------|-----------|
| 1 | 2 pairs (4 cards) | 2×2 | 120px |
| 2 | 3 pairs (6 cards) | 2×3 | 110px |
| 3 | 4 pairs (8 cards) | 2×4 | 100px |
| 4 | 6 pairs (12 cards) | 3×4 | 96px |
| 5 | 8 pairs (16 cards) | 4×4 | 96px |

- All cards meet the 96px minimum for tiny tier
- Grid is centered and responsive
- Cards shuffled randomly each round

### CSS Illustrations

Simple, recognizable shapes built entirely with CSS — no image assets:

| Name | Description |
|------|-------------|
| Cat | Round face, pointed ears, whiskers |
| Fish | Oval body, tail fin, eye |
| Butterfly | Symmetrical wings, antennae |
| Bird | Simple body, beak, wing |
| Flower | Petals around a center circle |
| Sun | Circle with radiating rays |
| Tree | Brown trunk, green rounded canopy |
| Star | Five-pointed star shape |
| Heart | Classic heart shape |
| House | Square body, triangle roof, door |

- Each illustration is a small React component using `div` elements + CSS
- Bright, high-contrast colors on a white card background
- Component: `CSSIllustration.tsx` with a `name` prop to select the design

### Card Flip Animation

- Framer Motion `rotateY` 0° → 180°
- Card back: solid color with a "?" character or simple pattern
- Card front: the CSS illustration
- `backfaceVisibility: hidden` on both faces (3D flip effect)
- `prefers-reduced-motion`: instant show/hide instead of rotation

### Interaction Lock

- While two cards are being compared (match check), further taps are ignored
- After a mismatch, cards auto-flip back after 1 second delay
- Already-matched cards are non-interactive

### Scoring

- Each match found: 10 points
- No deductions for mismatches (encouragement-first)
- Max score: pairs × 10
- `GameResult.metrics`: `{ turns, matchesFound, totalPairs }`

### Components

**Shared:** `<GameShell>`, `<ScoreDisplay>`, `<ProgressBar>`, `<CelebrationOverlay>`, `<InstructionBubble>`

**Custom:**
- `<Card>` — single card with flip animation, front/back faces
- `<CardGrid>` — responsive grid layout, card selection logic, match checking
- `<CSSIllustration>` — renders one of the 10 CSS illustrations by name

### File Structure

```
games/memory-match/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  (GamePlugin export)
│   ├── MemoryMatch.tsx           (Main game component)
│   ├── MemoryMatch.module.css
│   ├── components/
│   │   ├── Card.tsx
│   │   ├── Card.module.css
│   │   ├── CardGrid.tsx
│   │   ├── CardGrid.module.css
│   │   ├── CSSIllustration.tsx
│   │   └── CSSIllustration.module.css
│   ├── utils/
│   │   └── gridUtils.ts          (Shuffle, grid config by difficulty)
│   └── __tests__/
│       ├── gridUtils.test.ts
│       ├── Card.test.tsx
│       └── MemoryMatch.test.tsx
```

### Manifest

```typescript
{
  id: 'memory-match',
  name: 'Memory Match',
  description: 'Find the matching pictures and train your memory!',
  ageRange: [3, 5] as [number, number],
  skills: ['memory'] as SkillCategory[],
  minDifficulty: 1,
  maxDifficulty: 5,
  estimatedPlayTime: 3,
  offlineCapable: true,
  status: 'active',
  entryPoint: 'memory-match',
  tags: ['memory', 'matching', 'pairs', 'animals'],
}
```

---

## Cross-Cutting Concerns

### Plugin Registration

Each game's manifest is added to `platform/src/config/gameRegistry.ts` so the Hub can discover and display it.

### Workspace Package Structure

Each game gets a `package.json`:

```json
{
  "name": "@kids-games-zone/<game-name>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^19.0.0",
    "framer-motion": "^11.0.0",
    "@kids-games-zone/shared": "workspace:*"
  }
}
```

Each game gets a `tsconfig.json` extending `../../tsconfig.base.json` with the `@shared/*` path alias.

No individual build step — Vite handles game modules via the game loader's `import.meta.glob`.

### Audio Integration

All games use `props.audioManager` with existing platform SFX:

- `playSFX('correct')` — right answer / match found
- `playSFX('incorrect')` — wrong answer / mismatch
- `playSFX('click')` — tile/card tap
- `playSFX('celebrate')` — round completion

No game-specific audio assets required.

### Keyboard Navigation

All games are fully keyboard-accessible:

| Game | Tab | Enter | Escape | Arrow Keys |
|------|-----|-------|--------|------------|
| Math Adventure | Cycle option buttons | Select answer | — | — |
| Word Puzzle | Cycle letter tiles | Place/remove letter | Clear all placed | — |
| Memory Match | Cycle cards | Flip card | — | Navigate grid |

### Wrong Answer Handling

Age-tiered approach:

- **Memory Match (ages 3-5):** Pure encouragement. No attempt tracking. "Keep trying!" on mismatch.
- **Word Puzzle & Math Adventure (ages 6-8):** Gentle attempt tracking. "2nd try!" shown but no score penalty beyond reduced points.

### Testing Strategy

- **Unit tests** for pure logic: question generator, scramble algorithm, grid utilities, word data integrity
- **Component tests** for game components: render, user interactions, score callbacks
- **Target:** 70%+ coverage per game
- **Framework:** Vitest + React Testing Library

### Bundle Budget

Each game must stay under 100KB gzipped. Expected to be well within budget:
- No image assets (CSS illustrations, JSON data, procedural generation)
- Shared components are not bundled per-game
- CSS Modules have minimal overhead

---

## Acceptance Criteria

- [ ] All three games load from the Hub and play to completion
- [ ] Each game correctly reports `GameResult` to the platform via `onComplete()`
- [ ] Progress (high score, level reached) persists between sessions via StorageManager
- [ ] Difficulty adjusts game content based on `config.difficulty` from GameProps
- [ ] Each game bundle is under 100KB gzipped
- [ ] Each game has at least 70% unit test coverage
- [ ] All games work with keyboard navigation (Tab, Enter, Escape)
- [ ] Audio SFX plays on correct/incorrect actions
- [ ] All games respect `prefers-reduced-motion`
- [ ] Hub displays all three games filtered correctly by age tier

---

## Build Order

1. **Math Adventure** — validates the full plugin pipeline with a real game; closest to the dummy-game pattern
2. **Word Puzzle** — introduces custom UI components (letter tiles) and static curated data
3. **Memory Match** — most unique UI (CSS illustrations, card flip animation), different age tier (tiny)
