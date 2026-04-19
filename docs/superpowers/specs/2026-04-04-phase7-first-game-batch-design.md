# Phase 7: First Game Batch — Spelling Bee, Safety Scout, More or Less

**Date:** 2026-04-04
**Status:** Approved
**Build order:** Spelling Bee → Safety Scout → More or Less

---

## Overview

Three new games for the Kids Games Zone platform, built sequentially using a game-by-game approach with pattern extraction. Each game implements the `GamePlugin` interface, uses the AudioManager for age-adaptive audio feedback, and follows the existing plugin conventions.

All games use the platform's existing difficulty engine (rolling average of last 5 scores: ≥85% → harder, ≤40% → easier).

---

## Game 1: Spelling Bee

**ID:** `spelling-bee`
**Age range:** 3–12 (all tiers: tiny, junior, explorer)
**Skills:** `literacy`
**Difficulty:** 1–10
**Estimated play time:** 5 minutes

### Core Loop

1. Platform speaks the word aloud (voice channel).
2. Tiny-tier (3-5) also sees an image of the word.
3. Junior/explorer can request: definition, origin, use in a sentence (via buttons).
4. Child spells the word:
   - **Tiny-tier:** Taps scrambled letter tiles (word letters + 2-3 distractors).
   - **Junior/explorer:** Taps keys on an on-screen A-Z keyboard.
5. On submit → correct/incorrect feedback.
6. Next word.

### Round Structure

- **Tiny-tier:** Fixed 8 words per session. No penalty. Score = words correct / 8.
- **Junior/explorer:** 3 lives (hearts). Each wrong answer costs a life. Game ends when lives run out or all words in the pool are exhausted. Score = words spelled correctly.

### Word Pools by Difficulty

| Difficulty | Tiny (3-5)                   | Junior (6-8)                        | Explorer (9-12)                             |
| ---------- | ---------------------------- | ----------------------------------- | ------------------------------------------- |
| 1-2        | 3-letter CVC (cat, dog, sun) | 4-letter common (book, fish)        | 5-letter common (house, table)              |
| 3-4        | 4-letter simple (tree, ball) | 5-letter with blends (plant, crane) | 6-7 letter (kitchen, blanket)               |
| 5-6        | —                            | 6-letter with patterns (bridge)     | 8-letter (dinosaur, elephant)               |
| 7-8        | —                            | —                                   | 9-10 letter (adventure, geography)          |
| 9-10       | —                            | —                                   | 10+ challenging (magnificent, encyclopedia) |

Word lists are static JSON files per tier, tagged by difficulty. Each word entry includes:

```json
{
  "word": "bridge",
  "difficulty": 5,
  "image": "bridge.webp",
  "definition": "A structure built over a river or road so people can cross",
  "origin": "Old English",
  "sentence": "We walked across the bridge to get to the park.",
  "audio": "voice:word-bridge"
}
```

Images are only used for tiny-tier. Definition, origin, and sentence are only surfaced for junior/explorer.

### Clarification Features (Junior/Explorer Only)

Three buttons appear after the word is spoken:

- **"Definition"** → shows text + voice reads it
- **"Origin"** → shows language of origin
- **"Sentence"** → shows word used in context

### Audio Plan

| Channel | Tiny (3-5)                                                     | Junior (6-8)              | Explorer (9-12)         |
| ------- | -------------------------------------------------------------- | ------------------------- | ----------------------- |
| Voice   | Word pronunciation, encouragement ("Well done!", "Try again!") | Word pronunciation only   | Word pronunciation only |
| SFX     | Correct, incorrect, celebration at round end                   | Correct, incorrect        | Correct, incorrect      |
| Music   | Gentle background music                                        | Optional background music | None                    |

---

## Game 2: Safety Scout

**ID:** `safety-scout`
**Age range:** 4–8 (tiny and junior tiers)
**Skills:** `logic`, `social_skills`
**Difficulty:** 1–5
**Estimated play time:** 4 minutes

### Core Loop

1. A category is selected (player chooses or random).
2. An object is presented — image with its name spoken aloud.
3. Child taps green checkmark (safe) or red X (harmful).
4. Immediate feedback — correct/incorrect SFX + brief explanation of why.

### Categories

- **Kitchen** — knife, spoon, stove, cup, blender, fork, microwave, oven mitt
- **Bathroom** — medicine bottle, toothbrush, razor, soap, hair dryer, shampoo
- **Living Room** — electrical outlet, remote control, candle, cushion, lamp, matches
- **Outdoor** — traffic, bicycle, swing, stray animal, puddle, helmet, ball
- **Garage/Workshop** — tools, paint cans, ladder, flashlight, nails, broom
- **Playground** — broken glass, slide, sandbox, rusty nail, water fountain

### Session Modes

- **Category mode** — Player picks a category. 8-10 objects from that category.
- **Random mix** — Objects pulled randomly across all categories. Good for review.

### Age-Tier Adaptations

| Aspect              | Tiny (4-5)                                                                | Junior (6-8)                                                                      |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Object presentation | Large image, name spoken aloud, simple label                              | Image with name text, no voice unless requested                                   |
| Tap targets         | Extra large (64px+) green/red buttons                                     | Standard (48px) buttons                                                           |
| Feedback            | Voice explains why ("Knives are sharp! Ask a grown-up") + celebration SFX | Text explanation shown on screen, correct/incorrect SFX only                      |
| Difficulty scaling  | Obvious items → nuanced (butter knife vs chef's knife)                    | Clear hazards → situational context ("A stove is safe when off, harmful when on") |
| Objects per round   | 6                                                                         | 10                                                                                |

### Difficulty Progression

| Difficulty | What changes                                                                            |
| ---------- | --------------------------------------------------------------------------------------- |
| 1          | Obvious pairs — clearly safe vs clearly dangerous                                       |
| 2          | Less obvious items (e.g. scissors — harmful for tiny, safe with supervision for junior) |
| 3          | Context-dependent objects ("hot water" — safe or harmful?)                              |
| 4          | Mixed categories, faster pacing                                                         |
| 5          | Nuanced scenarios, items that are safe _if used correctly_                              |

### Object Data Model

```json
{
  "id": "kitchen-knife",
  "name": "Kitchen Knife",
  "category": "kitchen",
  "image": "kitchen-knife.webp",
  "isSafe": false,
  "explanations": {
    "tiny": "Knives are sharp! Always ask a grown-up.",
    "junior": "Kitchen knives can cut you. Only adults should handle them."
  },
  "difficulty": 1,
  "contextNote": "Safe when stored properly in a block"
}
```

### Audio Plan

| Channel | Tiny (4-5)                                                                    | Junior (6-8)       |
| ------- | ----------------------------------------------------------------------------- | ------------------ |
| Voice   | Object name, explanation after answer, encouragement ("You're keeping safe!") | None               |
| SFX     | Correct, incorrect, celebration at round end                                  | Correct, incorrect |
| Music   | Gentle background music                                                       | None               |

---

## Game 3: More or Less

**ID:** `more-or-less`
**Age range:** 3–10 (tiny, junior, explorer)
**Skills:** `numeracy`
**Difficulty:** 1–8
**Estimated play time:** 4 minutes

### Core Loop

1. Two or more items are presented (quantities or numbers).
2. A prompt asks "Which is more?" or "Which is less?" (randomized).
3. Child taps their answer.
4. Immediate feedback.
5. Next comparison.

### Age-Tier Progression

| Aspect           | Tiny (3-5)                                        | Junior (6-8)                           | Explorer (9-10)                                    |
| ---------------- | ------------------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| What's compared  | Visual groups of objects (apples, stars, blocks)  | Abstract numbers                       | Decimals, fractions, mixed                         |
| How many choices | 2 groups                                          | 3 numbers — pick biggest/smallest      | 4+ items — order from least to greatest            |
| Prompt style     | "Which basket has MORE apples?" (voice + text)    | "Which number is the SMALLEST?" (text) | "Put these in order from least to greatest" (text) |
| Visual style     | Colorful illustrated objects, large and countable | Number cards, clean and bold           | Number cards with fraction/decimal notation        |

### Difficulty Progression

| Difficulty | Tiny (3-5)                         | Junior (6-8)                 | Explorer (9-10)                                     |
| ---------- | ---------------------------------- | ---------------------------- | --------------------------------------------------- |
| 1          | 1 vs 5 objects — obvious           | Single digits (3 vs 7)       | Two-digit numbers (24 vs 67)                        |
| 2          | 2 vs 5 objects                     | Single digits, pick from 3   | Three-digit numbers, pick from 3                    |
| 3          | 3 vs 5 — closer gaps               | Two-digit numbers (12 vs 28) | Decimals (3.5 vs 3.2)                               |
| 4          | 4 vs 6 — requires careful counting | Two-digit, pick from 3       | Simple fractions (1/2 vs 1/3)                       |
| 5          | 5 vs 7 — close and tricky          | Three-digit numbers          | Mixed: fractions and decimals                       |
| 6          | —                                  | Three-digit, order 3 numbers | Order 4 fractions least to greatest                 |
| 7          | —                                  | —                            | Mixed fractions, decimals, whole numbers — order 4+ |
| 8          | —                                  | —                            | Negative numbers and ordering                       |

### Round Structure

Fixed rounds across all tiers (no elimination — numeracy benefits from practice over pressure):

- **Tiny:** 6 comparisons per session
- **Junior:** 8 comparisons per session
- **Explorer:** 10 comparisons per session

### Visual Object Generation (Tiny-Tier)

Objects drawn from a pool of familiar items: apples, stars, blocks, butterflies, fish, flowers. Randomly selected per round. Quantities are procedurally generated based on difficulty band — no static data files needed.

### Number Generation (Junior/Explorer)

Procedurally generated based on difficulty constraints. For ordering challenges, numbers are generated to avoid trivially obvious answers (e.g. won't generate 1, 100, 1000 — will generate 34, 41, 38).

### Interaction by Tier

- **Tiny:** Tap the group that is more/less. Groups are side-by-side, large and clear.
- **Junior:** Tap the correct number from 3 presented as cards.
- **Explorer (comparison):** Tap the correct number from 4 cards.
- **Explorer (ordering):** Drag cards into position left-to-right, or tap in sequence. Both input methods supported.

### Audio Plan

| Channel | Tiny (3-5)                                                          | Junior (6-8)       | Explorer (9-10)    |
| ------- | ------------------------------------------------------------------- | ------------------ | ------------------ |
| Voice   | Reads prompt ("Which has MORE stars?"), encouragement after answers | None               | None               |
| SFX     | Correct, incorrect, celebration at round end                        | Correct, incorrect | Correct, incorrect |
| Music   | Gentle background music                                             | None               | None               |

---

## Cross-Cutting Patterns

### Plugin Directory Structure (Per Game)

```
games/<game-name>/
  src/
    index.ts          — GamePlugin default export
    components/       — Game UI components (CSS Modules)
    data/             — Word lists, object data (JSON)
    hooks/            — Game-specific hooks (useRound, useTimer, etc.)
    utils/            — Procedural generation, scoring logic
    locales/          — en.json, fr.json
  package.json
  tsconfig.json
```

### Audio Feedback Pattern

Each game calls `audioManager` directly. Common asset IDs reused across games:

- `correct`, `incorrect` — SFX feedback
- `celebrate` — Round/game completion
- `voice:encouragement-{n}` — Randomized praise (tiny-tier only)
- `voice:instruction-{gameId}-{key}` — Game-specific voice prompts
- `music:game-bgm` — Background music (tiny-tier, optional junior)

### Scoring Consistency

- All games call `onScore(points)` per correct answer (1 point each).
- `onComplete(result)` at session end with `score/maxScore` for the difficulty engine.
- `metrics` object captures game-specific data (e.g. `{ wordsSpelled: 8, livesRemaining: 2 }`).

### Registration Per Game

- Manifest entry in `platform/src/config/gameRegistry.ts`.
- Feature flag `game.<id>` in `platform/src/config/featureFlags.json` (enabled: false initially).

### i18n

All three games support English and French, following existing `locales/en.json` and `fr.json` patterns.

### Testing

Each game gets unit tests (Vitest) + accessibility checks (axe) following the existing game test patterns.

### Build Order

1. **Spelling Bee** — establishes audio feedback patterns, age-adaptive input, word data model.
2. **Safety Scout** — reuses audio patterns, introduces image-based content and category selection.
3. **More or Less** — reuses audio patterns, introduces procedural generation and drag-to-order interaction.

Shared utilities are extracted as they emerge from real needs, not pre-built speculatively.
