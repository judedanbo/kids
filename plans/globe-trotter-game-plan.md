# Game Plan: Globe Trotter — Countries, Capitals, Flags & Facts

> **Status:** Proposed
> **Branch:** `claude/countries-capitals-game-xJo7V`
> **Skill categories:** `science`, `memory`
> **Age range:** 3–12 (all three tiers)
> **Game id:** `globe-trotter`

A geography quiz game that teaches children about the world's countries through
four learning modes: capitals, flags, fun facts, and continents. Built as a
self-contained plugin package following the patterns established by
`spelling-bee` and `safety-scout`.

---

## 1. Concept

**Globe Trotter** is a multiple-choice geography game. Each session presents a
round of questions drawn from the four modes below, scaled to the player's age
tier and difficulty level. It reuses the platform's shared components
(`GameShell`, `OptionButton`, `ScoreDisplay`, `ProgressBar`,
`CelebrationOverlay`, `GameTimer`, `PauseMenu`, `InstructionBubble`) and the
existing SFX (`correct`, `incorrect`, `celebrate`, `click`).

### Learning modes (all four, per the requested scope)

| Mode               | Prompt                                 | Answer options                         |
| ------------------ | -------------------------------------- | -------------------------------------- |
| Guess the Capital  | Country name + flag                    | 4 capital cities                       |
| Identify the Flag  | A flag (or a country name)             | 4 countries (or 4 flags)               |
| Fun Fact Challenge | A kid-friendly fact ("This country …") | 4 countries, or a true/false statement |
| Find the Continent | Country name + flag                    | 6 continents (icon + name)             |

---

## 2. Age-tier design

The platform sets `data-age-tier` and passes `config.profile.ageTier`. Because
capitals and facts require reading, the tiny tier is intentionally constrained
to visual matching (this matches the known weak fit for ages 3–5 with
text-heavy geography content).

| Tier              | Modes enabled                         | Country pool                   | Rounds | Fail state            | Extras                                  |
| ----------------- | ------------------------------------- | ------------------------------ | ------ | --------------------- | --------------------------------------- |
| `tiny` (3–5)      | Identify the Flag, Find the Continent | ~20 most famous (difficulty 1) | 6      | None (encourage-only) | Background music, larger tap targets    |
| `junior` (6–8)    | Capital, Flag, Continent              | ~80 (difficulty ≤ 3)           | 8      | None                  | Optional speed bonus                    |
| `explorer` (9–12) | All four modes incl. Fun Facts        | Full ~195 (difficulty ≤ 5)     | 10–12  | None (count-up timer) | `GameTimer` count-up, progressive diff. |

`config.difficulty` (1–5) further filters the pool depth within a tier and makes
distractors harder (e.g. same-continent capitals, look-alike flags). No
hard fail/lives — geography is exploratory; wrong answers reveal the correct
one and move on (consistent with `safety-scout`'s encouragement-first model).

---

## 3. Data model & content

Country data is **tiered into separate JSON files**, mirroring
`spelling-bee/src/data/words-{tiny,junior,explorer}.json`, so the platform only
loads the slice a session needs and the game bundle stays under budget.

```
games/globe-trotter/src/data/
  countries-famous.json     # difficulty 1–2  (~80, drives tiny + junior)
  countries-world.json      # difficulty 3–5  (remaining ~115 → explorer)
```

Each entry:

```jsonc
{
  "code": "FR", // ISO 3166-1 alpha-2 — drives the flag asset path
  "name": "France",
  "capital": "Paris",
  "continent": "Europe", // Africa | Asia | Europe | North America | South America | Oceania
  "difficulty": 1, // 1 (very famous) … 5 (obscure)
  "facts": ["The Eiffel Tower is in France.", "People in France speak French."],
}
```

- **Continents:** six (Antarctica excluded — no countries).
- **Capitals & continents** are objective and authored from a canonical list.
- **Facts** are the largest content task (~2 kid-safe facts × ~195 ≈ 400 facts)
  and the main quality risk — see §9. Facts are only required for the explorer
  pool (Fun Fact mode is explorer-only).

### Localization of data (decision point — see §10)

The platform requires English **and** French. UI chrome is fully localized.
For country/capital **names**, the data model carries optional `nameFr` /
`capitalFr` / `factsFr` fields. Recommended pragmatic v1: fully translate the
**famous pool** (tiny/junior) to French; the long-tail explorer pool falls back
to English names when `*Fr` is absent. This keeps the most-played content fully
bilingual without authoring ~800 French strings up front.

---

## 4. Flag assets strategy

Unicode regional-indicator flag emoji do **not** render on Windows/Chrome, so a
flag-centric game cannot rely on them. Flags are therefore **self-hosted SVGs**,
served from `/public` (zero game-bundle cost — same approach as spelling-bee
narration audio):

```
platform/public/images/flags/<code>.svg     # e.g. fr.svg, gh.svg, jp.svg
```

- Source: the `flag-icons` SVG set (CC0/MIT, ~1–5 KB each), copied in at build
  setup time — **not** added as a runtime dependency.
- Rendered via the existing shared `<IconImage>` component (image with emoji/
  text fallback), so a missing flag degrades gracefully.
- **Offline/PWA:** ~195 SVGs ≈ 400 KB would roughly double the SW precache.
  Strategy: precache only the ~80 famous-pool flags (covers tiny/junior, the
  most-played path → fully offline immediately); serve the rest via a runtime
  `CacheFirst` flag cache (explorer flags become offline after first view).
  This requires a small addition to the `vite-plugin-pwa` config.

---

## 5. Package architecture

Mirrors the `spelling-bee` layout (two-layer hooks, procedural generator,
tiered data, local i18n mock for tests):

```
games/globe-trotter/
  package.json
  tsconfig.json
  vitest.config.ts
  CLAUDE.md                         # package-scoped guidance
  src/
    index.ts                        # GamePlugin default export
    GlobeTrotter.tsx                # root GameComponent
    GlobeTrotter.module.css
    components/
      QuestionCard.tsx / .module.css      # prompt: flag / country / fact
      ContinentPicker.tsx / .module.css   # 6 continent OptionButtons w/ icons
      RoundSummary.tsx / .module.css      # end-of-round recap
    hooks/
      useGlobeSession.ts            # round list, score, phase machine
      useQuestionRound.ts           # current question, feedback sub-phase
    utils/
      questionGenerator.ts          # builds questions + distractors per mode
      countryPool.ts                # tier/difficulty filtering + selection
    data/
      countries-famous.json
      countries-world.json
    locales/en/globe-trotter.json
    locales/fr/globe-trotter.json
    __mocks__/react-i18next.ts
    __tests__/
      questionGenerator.test.ts
      countryData.test.ts           # data-integrity (every entry valid, flag exists)
      countryPool.test.ts
      GlobeTrotter.test.tsx
    vite-env.d.ts
    vitest-axe.d.ts
    test-setup.ts
```

### Plugin lifecycle (`src/index.ts`)

Same envelope pattern as spelling-bee: the plugin closure only tracks
`startTime`/`score`/`difficulty` for the `GameResult`; **all real game state
lives in the React component/hooks**. `onComplete(result)` is called from the
component; `onEnd()` returns a stub the platform overrides.

### Question generation (`utils/questionGenerator.ts`)

Pure, unit-tested function: given `(pool, mode, difficulty)` →
`{ prompt, options[4 or 6], correctIndex }`.

- **Capital:** correct capital + 3 distractor capitals (prefer same continent at
  higher difficulty, random at low difficulty).
- **Flag:** correct country + 3 distractors (prefer visually similar / same
  region at higher difficulty).
- **Fact:** pick one of the country's `facts`; distractors are other countries.
- **Continent:** correct continent + the other 5 (fixed 6-option set).

Invariants enforced by tests: correct answer always present, no duplicate
options, no repeated question within a session, mode set respects tier.

---

## 6. Shared components reused

`GameShell` (Back/Pause, Escape, terminal-phase `disableBackConfirm`),
`OptionButton` (`correct`/`incorrect` states, `large` size for tiny),
`ScoreDisplay` (stars), `ProgressBar` (question N of total),
`CelebrationOverlay` (confetti on completion), `GameTimer` (count-up, explorer
only), `PauseMenu`, `InstructionBubble` (mode instructions), `IconImage`
(flags + continent icons). No new shared components required.

---

## 7. Platform integration / registration

1. Add manifest to `platform/src/config/gameRegistry.ts` (id `globe-trotter`,
   `ageRange: [3, 12]`, `skills: ['science','memory']`, `maxDifficulty: 5`).
2. Add `"game.globe-trotter"` to `platform/src/config/featureFlags.json` with
   **`enabled: false`** (flip to `true` after QA).
3. Register `en` + `fr` locale files in `platform/src/i18n.ts`.
4. Add thumbnail `platform/public/images/games/globe-trotter.webp`.
5. Copy flag SVGs into `platform/public/images/flags/`.
6. Extend `vite-plugin-pwa` config: precache famous-pool flags, runtime
   `CacheFirst` for the rest.
7. `pnpm-workspace.yaml` already globs `games/*` — no change needed.

---

## 8. Testing

- `questionGenerator.test.ts` — invariants per mode (correct present, no dupes,
  distractor difficulty rules, 4 vs 6 options).
- `countryData.test.ts` — every entry has valid `code/name/capital/continent`,
  continent ∈ enum, explorer-pool entries have ≥1 fact, flag SVG file exists,
  no duplicate codes.
- `countryPool.test.ts` — tier/difficulty filtering and mode gating.
- `GlobeTrotter.test.tsx` — renders title, correct answer fires `onScore` +
  `correct` SFX, wrong answer fires `incorrect` SFX, `onComplete` called once
  with `gameId: 'globe-trotter'` after the final round, `axe(container)` clean.
- Target ≥70% game coverage (guide requirement). Vitest config aliases
  react-i18next to the local mock and `@kids-games-zone/shared` to source, as
  in every other game.

---

## 9. Build order (milestones)

1. **Scaffold** package (`pnpm create-game` → rename to GlobeTrotter), wire
   `package.json`/`tsconfig`/`vitest.config`.
2. **Data**: author `countries-famous.json` first (~80, fully verified incl.
   French) → playable tiny/junior path end-to-end.
3. **Generator + pool utils** with unit tests (pure logic, no UI).
4. **Component + hooks**: session/round machine, QuestionCard, ContinentPicker,
   wire shared components, SFX, `onScore`/`onComplete`.
5. **Flags**: copy famous-pool SVGs, IconImage integration, PWA precache config.
6. **Explorer content**: `countries-world.json` (~115 + facts), Fun Fact mode.
7. **i18n** en/fr, registration (registry, flag, i18n.ts, thumbnail).
8. **Tests + a11y + bundle check** (`pnpm --filter platform size:check`),
   pre-submit checklist, flip feature flag on.
9. Update `plans/development-plan.md` Post-Launch (Phase 7) to mark this game.

---

## 10. Risks & open decisions

| Item                        | Risk / Decision                                                 | Mitigation / Recommendation                                                                                       |
| --------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Fact authoring (~400 facts) | Largest effort; accuracy & age-appropriateness must be verified | Restrict facts to explorer pool; concise, verifiable, no politics/conflict; data-integrity test enforces presence |
| French translation depth    | Translating ~195 country/capital names + facts doubles content  | **Recommend:** fully translate famous pool; English fallback for explorer long-tail (data model supports `*Fr`)   |
| Flag assets & offline       | ~400 KB of SVGs could blow the SW precache budget               | Precache famous-pool flags only; runtime CacheFirst for the rest                                                  |
| Tiny tier fit (3–5)         | Capitals/facts need reading; weak fit confirmed at scoping      | Tiny limited to visual Flag + Continent matching, infinite lives, music                                           |
| Bundle budget (100 KB gz)   | Inlining ~195 countries + facts could exceed game chunk         | Tiered JSON, lazy-load explorer data; flags are `/public` (no bundle cost); verify with `size:check`              |
| Continent mode UX           | An interactive SVG world map is out of scope for v1             | v1 = 6 labelled continent `OptionButton`s with icons; interactive map noted as a future enhancement               |

---

## 11. Out of scope (future enhancements)

- Interactive tappable SVG world map for continent placement.
- Audio narration of country names (would add ~195×2 voice files).
- Region sub-modes (US states, EU members), landmarks photo mode.
- Full French translation of the explorer long-tail.
