# Spelling Bee — UX polish design

**Date:** 2026-04-19
**Branch:** `fix/spelling-bee-ux-polish` (off `main`)

## Problem

Playing the Spelling Bee game surfaces several UX problems:

1. **Buttons show raw translation keys** — the header reads `"title"`, the audio button reads `"hearWord"`, clue buttons read `"definition"` / `"origin"` / `"sentence"`, and the level badge reads `"levelOf"`. These are i18n keys, not English phrases.
2. **Sentence clue spoils the spelling** — clicking "Sentence" renders the full sentence on screen with the target word intact, defeating the learning goal.
3. **Clue visibility persists across words** — `showDefinition` / `showOrigin` / `showSentence` state in `WordDisplay` never resets when the word changes, so clues the player revealed on word 1 are already visible on word 2.
4. **Button styling is inconsistent** — `WordDisplay`'s clue buttons and `GameOverOverlay`'s action buttons are raw `<button>` elements with local CSS, while other game screens use the shared `OptionButton`.
5. **Level indicator is a small pill** — functional but visually minor; children's games benefit from a more prominent "you are on level X" indicator.
6. **`Keyboard` has hard-coded English strings** — `"Type your answer..."`, `"Submit"`, aria labels, etc. Not translated.

### Root cause of #1

The `spelling-bee` namespace is not registered in `platform/src/i18n.ts`. The platform loads `memory-match`, `math-adventure`, and `word-puzzle` namespaces but omits `spelling-bee`, so every `t('…')` call inside the game falls back to rendering the raw key. This is the root cause of the "title", "hearWord", and "levelOf" symptoms.

## Goals

- All in-game text resolves via the `spelling-bee` i18n namespace, in both `en` and `fr`.
- Action buttons are visually consistent across the game, with a clear primary/secondary hierarchy appropriate for children.
- The sentence clue preserves the spelling challenge — audio plays the real sentence, but the on-screen text blanks the target word with a fixed-width placeholder that doesn't reveal length.
- Clue visibility resets between words.
- Level indicator is prominent and child-friendly.

## Non-goals

- No new locales beyond the existing `en` / `fr`.
- No changes to the session/round hook architecture (`useSessionLevels`, `useSpellingRound`).
- No changes to the word-pool selection or difficulty ladder.
- No `tiny`-tier changes (the clue buttons remain hidden for `tiny`; the tile input remains unchanged).
- No animation rework outside the new `ClueButton`.

## Design

The work lands as one PR off `main` (`fix/spelling-bee-ux-polish`), structured as six sequential layers. Each layer is independently reviewable and testable.

### Layer 1 — i18n namespace registration

**Changes:**

- `platform/src/i18n.ts`: import `enSpellingBee` from `../../games/spelling-bee/src/locales/en/spelling-bee.json` and the matching `fr` file; add `'spelling-bee': enSpellingBee` to the `en` resources block and `'spelling-bee': frSpellingBee` to the `fr` block. Mirrors the existing `word-puzzle` pattern line-for-line.

**Test:**

- Extend `platform/src/__tests__/i18n.test.ts` with an assertion that `i18n.t('title', { ns: 'spelling-bee' })` resolves to `"Spelling Bee"` (in `en`) and `"Concours d'orthographe"` (in `fr`). Guards against a future refactor dropping the namespace again.

**Effect:** "title", "hearWord", "levelOf", "definition", "origin", "sentence" all start rendering their translated strings in the platform build. This fully resolves requirements #1b, #2, and #4 from the user's list on its own.

### Layer 2 — Word-data cleanup + integrity test

**Changes:**

- `games/spelling-bee/src/data/words-tiny.json`, `words-junior.json`, `words-explorer.json`: for every entry where the `sentence` does not contain the exact `word` as a case-insensitive whole-word match, rewrite the sentence so it does.
  - Example: `plant` — `"We planted a flower in the garden."` → `"We plant a flower in the garden."`
  - Example: `grape` — `"She ate a bunch of purple grapes."` → `"She picked a purple grape from the vine."`

**New test:** `games/spelling-bee/src/__tests__/wordData.test.ts`

- Iterates every entry from all three JSON files.
- Asserts each entry's `sentence` matches `new RegExp(`\\b${entry.word}\\b`, 'i')`.
- Fails loudly with a clear message identifying the offending word and sentence. Prevents a future data edit from sneaking an inflected form back in.

**Effect:** guarantees Layer 3's blanking logic can reliably hide the target word using exact-match regex. No inflection heuristics required.

### Layer 3 — `WordDisplay` redesign

**New component:** `games/spelling-bee/src/components/ClueButton.tsx` (+ `ClueButton.module.css`)

- Props: `{ label: string; icon: string; onClick: () => void; ariaLabel?: string; }`.
- Renders a `motion.button` with a rounded-pill shape, muted surface color, larger tap target than the current raw button (~44px min-height), `whileTap={ scale: 0.95 }` gated on `useReducedMotion()` (follows the same pattern as `OptionButton` and `CelebrationOverlay`).
- Focus-visible outline (matches design tokens already used by `WordDisplay.module.css`).
- Game-local — lives inside `games/spelling-bee/src/components/`. Not promoted to shared until another game needs it.

**New helper:** `games/spelling-bee/src/utils/blankSentence.ts`

- Exported constant `SENTENCE_BLANK = '_____'` (five underscores — fixed width regardless of actual word length, so the blank doesn't leak the spelling's length).
- Function `blankSentence(sentence: string, word: string): string` replaces every case-insensitive whole-word occurrence of `word` in `sentence` with `SENTENCE_BLANK`. Uses `new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi')`.
- Unit tests: whole-word replace, case-insensitive match, multiple occurrences replaced, no match leaves string untouched, special-character safety via `escapeRegExp`.

**Edits to `WordDisplay.tsx`:**

- Replace the raw `<button className={styles.playButton}>` with `<OptionButton label={t('hearWord')} icon={'🔊 '} size="large" onSelect={handlePlayWord} />`. Drop the `.playButton` CSS block from `WordDisplay.module.css`.
- Replace the three raw clue `<button>`s with `<ClueButton>`, passing icons `📖` (definition), `📜` (origin), `💬` (sentence) and the existing i18n keys (`definition`, `origin`, `sentence`). Drop `.clueButton` / `.clueButtons` CSS in favor of the new component's styles.
- Extend the existing `useEffect(() => { setImageError(false); }, [word.word])` to also call `setShowDefinition(false)`, `setShowOrigin(false)`, `setShowSentence(false)`. Clue visibility now resets every time the word changes.
- When rendering the sentence clue text, replace `{word.sentence}` with `{blankSentence(word.sentence, word.word)}`. The audio narration still plays the original sentence via `audioManager.playVoice(`voice:sentence-${word.word}`)` — only the visible text is blanked.

**Tests (extending `WordDisplay.test.tsx`):**

- When the `word` prop changes, previously-shown clue text disappears.
- The rendered text of the sentence clue never contains the target word (case-insensitive).
- The rendered sentence contains `SENTENCE_BLANK`.
- Clicking the Hear button still calls `audioManager.playVoice`.
- `toHaveNoViolations()` passes on the redesigned markup.

### Layer 4 — `LevelIndicator` polish

**Edits to `LevelIndicator.tsx` + `.module.css`:**

- Add a leading `⭐` (aria-hidden) before the level label.
- Bump font size to ~1.25rem, increase padding, use a rounded-badge shape (not a tight pill). Keep `--color-primary` background for continuity with the current look.
- Keep the `aria-label={t('levelOf', { current, total })}` (now resolves via Layer 1).

**Test:** lightweight render test asserting both the star and the translated level text are present, plus an a11y axe pass.

### Layer 5 — `Keyboard` i18n

**New keys** (both `en` and `fr` spelling-bee locale files, under a `keyboard` sub-object to avoid key collisions):

- `keyboard.placeholder` — "Type your answer..." / "Écris ta réponse…"
- `keyboard.typedPrefix` — "Typed: " / "Saisi : "
- `keyboard.typedEmpty` — "nothing yet" / "rien pour l'instant"
- `keyboard.groupLabel` — "On-screen keyboard" / "Clavier à l'écran"
- `keyboard.backspace` — "Backspace" / "Retour arrière"
- `keyboard.submit` — "Submit" / "Valider"

**Edits to `Keyboard.tsx`:**

- Add `const { t } = useTranslation('spelling-bee')`.
- Replace hard-coded strings with the new keys. The typed-status aria label becomes `${t('keyboard.typedPrefix')}${typed || t('keyboard.typedEmpty')}`.

**Tests:** extend `Keyboard.test.tsx` to assert the translated keys render (the mock `react-i18next` returns the key, so tests assert against keys like `"keyboard.submit"`).

### Layer 6 — `GameOverOverlay` button consistency

**Shared-package change:** `OptionButton` is a `motion.button` that currently doesn't forward refs. Add `forwardRef` so `GameOverOverlay` (and future consumers) can call `.focus()` on it programmatically. Trivial refactor, existing `OptionButton.test.tsx` already covers behavior.

**Edits to `GameOverOverlay.tsx`:**

- Replace the two raw `<button>` elements with `<OptionButton>` — Try again: `size="large"`, Back: `size="normal"`.
- Move `retryRef` to the `OptionButton` (now possible via `forwardRef`).
- Drop `.primary` and `.secondary` from `GameOverOverlay.module.css`.

**Tests:** existing `GameOverOverlay.test.tsx` already verifies initial focus lands on retry — must still pass. Add an axe pass.

**Fallback if `forwardRef` on `OptionButton` is rejected in review:** keep the retry button as a raw styled `<button>` (retains ref support), and convert only the Back button to `OptionButton`. Accepted as a minor inconsistency.

## Data flow

The changes are pure UI + static data; no new runtime data flow. The only cross-layer dependency is Layer 2 → Layer 3: `blankSentence` relies on sentences containing the exact word, which Layer 2's cleanup + integrity test guarantees.

## Testing strategy

- Unit tests for `blankSentence` (Layer 3) and `wordData` integrity (Layer 2).
- Extend the existing component tests for `WordDisplay`, `LevelIndicator`, `Keyboard`, `GameOverOverlay`.
- Platform `i18n.test.ts` gets a new assertion for the `spelling-bee` namespace (Layer 1).
- Manual browser verification via `pnpm --filter platform dev`: walk through the instruction screen, the first level's audio button and clue buttons, verify the sentence text renders with blanks, advance to a new word and confirm clues reset, then complete a level to see the transition and the polished level indicator.

## Build sequence

1. Layer 1 — i18n registration (unblocks all visible text fixes).
2. Layer 2 — word-data cleanup + integrity test (prep for Layer 3).
3. Layer 3 — `WordDisplay` redesign (biggest change).
4. Layer 4 — `LevelIndicator` polish.
5. Layer 5 — `Keyboard` i18n.
6. Layer 6 — `GameOverOverlay` button consistency.

Each layer is a separate commit on `fix/spelling-bee-ux-polish`.

## Risks

- **`forwardRef` on shared `OptionButton` (Layer 6)** — touches a shared component. Low risk because the existing API and behavior are preserved; existing tests cover it. Fallback noted above.
- **Word-data rewrites (Layer 2)** — risk of introducing awkward sentences while keeping the target word. Mitigation: keep sentences natural and simple — children's-book tone, not contrived. The integrity test catches only presence, not quality, so rewrites need human review.
- **Blank placeholder width** — `_____` (5 chars) is a design choice. Too short and it looks cramped for long words; too long and it feels heavy for short words. Five is a reasonable average for the current word pool (mostly 4-7 letter words). Revisit if playtesting shows issues.

## Out of scope (explicitly)

- Adding a third language.
- Visual rework of `LevelTransition`, `CelebrationOverlay`, `InstructionBubble`.
- Changes to `LetterTiles` (tiny-tier input).
- Changes to word-selection logic or difficulty ladder.
- Promoting `ClueButton` to the shared package.
