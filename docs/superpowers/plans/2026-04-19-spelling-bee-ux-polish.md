# Spelling Bee UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Spelling Bee UX regressions: register the missing i18n namespace, redesign WordDisplay buttons with a primary/secondary hierarchy, hide the target word from the on-screen sentence, reset clue visibility between words, polish the level indicator, i18n the keyboard, and make the Game Over buttons consistent with the rest of the game.

**Architecture:** Six sequential layers, each a separate commit on `fix/spelling-bee-ux-polish` (branched off `main`). Layer 1 (i18n registration) alone resolves the raw-key symptoms. Layer 2 cleans word data so Layer 3 can reliably blank the target word with an exact-match regex. Layers 4–6 are small polish passes.

**Tech Stack:** React 19, TypeScript (strict), Vitest + Testing Library + vitest-axe, CSS Modules, react-i18next, framer-motion, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-04-19-spelling-bee-ux-polish-design.md`

---

## Task 0: Branch setup

**Files:**

- No code edits. Git operations only.

**Context:** A spec commit (`96c190c`) currently sits on `fix/spelling-bee-review-followups-2`. We want the feature branch off `main` with only that spec commit (and then the implementation commits).

- [ ] **Step 0.1: Confirm working tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` (or shows only the spec file — nothing else).

- [ ] **Step 0.2: Capture the spec commit hash**

Run: `git log --oneline -1 -- docs/superpowers/specs/2026-04-19-spelling-bee-ux-polish-design.md`
Expected: a single line like `96c190c docs(spelling-bee): design for UX polish ...`

Save the hash. It'll be cherry-picked onto the new branch.

- [ ] **Step 0.3: Check out main and pull**

Run: `git checkout main && git pull --ff-only`
Expected: main updated.

- [ ] **Step 0.4: Create and switch to the feature branch**

Run: `git checkout -b fix/spelling-bee-ux-polish`
Expected: `Switched to a new branch 'fix/spelling-bee-ux-polish'`

- [ ] **Step 0.5: Cherry-pick the spec commit**

Run: `git cherry-pick <hash-from-step-0.2>`
Expected: clean cherry-pick; `git log --oneline -1` shows the spec commit.

- [ ] **Step 0.6: (Optional cleanup) Remove the misplaced spec commit from the review-followups branch**

Only if the review-followups branch still has the spec commit and you want it gone. Destructive — skip if the branch might get merged or re-used with the spec on it.

```bash
git checkout fix/spelling-bee-review-followups-2
git reset --hard HEAD~1       # drops the spec commit from this branch only
git checkout fix/spelling-bee-ux-polish
```

Confirm with the operator before running. No commit here.

---

## Task 1: Register spelling-bee i18n namespace (Layer 1)

**Files:**

- Modify: `platform/src/i18n.ts`
- Modify: `platform/src/__tests__/i18n.test.ts`

**Context:** `platform/src/i18n.ts` loads `memory-match`, `math-adventure`, and `word-puzzle` namespaces but not `spelling-bee`. Every `t('…')` call inside the Spelling Bee game falls back to rendering the raw key (`"title"`, `"hearWord"`, `"levelOf"`, etc.). Registering the namespace fixes the root cause.

- [ ] **Step 1.1: Add a failing test for the spelling-bee namespace**

Open `platform/src/__tests__/i18n.test.ts` and add this test inside the existing `describe('i18n setup', …)` block, after the last `it(…)`:

```ts
it('loads the spelling-bee namespace in English', () => {
  expect(i18n.t('title', { ns: 'spelling-bee' })).toBe('Spelling Bee');
});

it('loads the spelling-bee namespace in French', async () => {
  await i18n.changeLanguage('fr');
  expect(i18n.t('title', { ns: 'spelling-bee' })).toBe("Concours d'orthographe");
});
```

- [ ] **Step 1.2: Run the test and confirm it fails**

Run: `pnpm --filter platform test -- src/__tests__/i18n.test.ts`
Expected: the two new tests FAIL because the namespace isn't loaded — `t('title', { ns: 'spelling-bee' })` returns `"title"` (the key).

- [ ] **Step 1.3: Register the namespace in `platform/src/i18n.ts`**

Open `platform/src/i18n.ts`. Add two imports alongside the existing game imports:

```ts
import enSpellingBee from '../../games/spelling-bee/src/locales/en/spelling-bee.json';
import frSpellingBee from '../../games/spelling-bee/src/locales/fr/spelling-bee.json';
```

Add the namespace to both resource blocks. The final `resources` object should read:

```ts
resources: {
  en: {
    common: enCommon,
    'memory-match': enMemoryMatch,
    'math-adventure': enMathAdventure,
    'word-puzzle': enWordPuzzle,
    'spelling-bee': enSpellingBee,
  },
  fr: {
    common: frCommon,
    'memory-match': frMemoryMatch,
    'math-adventure': frMathAdventure,
    'word-puzzle': frWordPuzzle,
    'spelling-bee': frSpellingBee,
  },
},
```

- [ ] **Step 1.4: Run the test and confirm it passes**

Run: `pnpm --filter platform test -- src/__tests__/i18n.test.ts`
Expected: all tests PASS including both new spelling-bee assertions.

- [ ] **Step 1.5: Typecheck the platform package**

Run: `pnpm --filter platform typecheck`
Expected: no errors.

- [ ] **Step 1.6: Commit**

```bash
git add platform/src/i18n.ts platform/src/__tests__/i18n.test.ts
git commit -m "$(cat <<'EOF'
feat(platform): register spelling-bee i18n namespace

Adds en/fr spelling-bee.json to the platform's i18n resources. Without
this, every t('...') call inside the Spelling Bee game rendered the raw
key ("title", "hearWord", "levelOf", etc.) because the namespace wasn't
loaded.
EOF
)"
```

---

## Task 2: Word-data integrity test (Layer 2 — first half)

**Files:**

- Create: `games/spelling-bee/src/__tests__/wordData.test.ts`

**Context:** Layer 3 will blank the target word in the sentence using an exact-match word-boundary regex. For that to be reliable, every entry in the three word-data JSON files needs a `sentence` that contains its `word` verbatim. Write the test first (it will fail on the current data), then clean the data in Task 3 to make it pass.

- [ ] **Step 2.1: Create the test file**

Create `games/spelling-bee/src/__tests__/wordData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import wordsTiny from '../data/words-tiny.json';
import wordsJunior from '../data/words-junior.json';
import wordsExplorer from '../data/words-explorer.json';

interface WordEntry {
  word: string;
  sentence: string;
}

const datasets: { name: string; entries: WordEntry[] }[] = [
  { name: 'words-tiny', entries: wordsTiny as WordEntry[] },
  { name: 'words-junior', entries: wordsJunior as WordEntry[] },
  { name: 'words-explorer', entries: wordsExplorer as WordEntry[] },
];

describe('word data integrity', () => {
  for (const { name, entries } of datasets) {
    describe(name, () => {
      it.each(entries)(
        'sentence for "$word" contains the exact word as a whole-word match',
        ({ word, sentence }) => {
          const re = new RegExp(`\\b${word}\\b`, 'i');
          expect(
            re.test(sentence),
            `Expected sentence for "${word}" to contain the exact word (whole-word, case-insensitive). Sentence: "${sentence}"`,
          ).toBe(true);
        },
      );
    });
  }
});
```

- [ ] **Step 2.2: Run the test and catalog the failures**

Run: `pnpm --filter spelling-bee test -- src/__tests__/wordData.test.ts`
Expected: FAIL for every entry whose sentence uses an inflected form. Examples to expect:

- `plant` — "We **planted** a flower…"
- `grape` — "She ate a bunch of purple **grapes**."

Save the full list of failures; you'll use it in Task 3.

- [ ] **Step 2.3: Commit the failing test**

```bash
git add games/spelling-bee/src/__tests__/wordData.test.ts
git commit -m "$(cat <<'EOF'
test(spelling-bee): add word-data integrity test

Every word entry's sentence must contain the exact word as a whole-word
match. Currently failing for words whose sentences use inflected forms
(plant/planted, grape/grapes, etc.) — to be fixed in the next commit.

This guard prevents future data edits from reintroducing inflections,
which would break the sentence-blanking logic in WordDisplay.
EOF
)"
```

Committing a known-failing test here is intentional — the very next commit makes it green, and the two-commit split makes the "what the test guards against" reviewable on its own.

---

## Task 3: Clean word-data sentences (Layer 2 — second half)

**Files:**

- Modify: `games/spelling-bee/src/data/words-tiny.json`
- Modify: `games/spelling-bee/src/data/words-junior.json`
- Modify: `games/spelling-bee/src/data/words-explorer.json`

**Context:** Rewrite every sentence flagged by the Task 2 test so it contains the exact word as a whole-word match. Keep the tone children's-book-simple; don't add complexity. If the word is a noun, use it in its bare form (singular, no article inflection); if a verb, use the bare infinitive / base form.

- [ ] **Step 3.1: Fix each failing entry**

For every failing entry surfaced in Task 2, open the relevant JSON file and rewrite `sentence`. Examples:

- `plant` → `"We plant a flower in the garden."`
- `grape` → `"She picked a purple grape from the vine."`
- `stung` (already contains the exact word — verify and leave alone).

General rules:

- Only change `sentence`. Leave `word`, `definition`, `origin`, `image`, and `difficulty` untouched.
- Keep the sentence to ~6–10 words. Children's reading level.
- Preserve JSON shape and trailing commas — use your editor's JSON linter if available.

- [ ] **Step 3.2: Run the integrity test**

Run: `pnpm --filter spelling-bee test -- src/__tests__/wordData.test.ts`
Expected: all assertions PASS.

- [ ] **Step 3.3: Run the full spelling-bee test suite to confirm nothing else broke**

Run: `pnpm --filter spelling-bee test`
Expected: all existing tests still pass.

- [ ] **Step 3.4: Typecheck**

Run: `pnpm --filter spelling-bee typecheck`
Expected: no errors.

- [ ] **Step 3.5: Commit**

```bash
git add games/spelling-bee/src/data/words-tiny.json games/spelling-bee/src/data/words-junior.json games/spelling-bee/src/data/words-explorer.json
git commit -m "$(cat <<'EOF'
fix(spelling-bee): rewrite sentences to contain the exact target word

Some word entries used inflected forms in their sentence field
(plant/planted, grape/grapes, etc.). Rewrites those sentences so each
contains its target word verbatim. This is a prerequisite for the
upcoming WordDisplay sentence-blanking feature, which relies on an
exact-match regex to hide the word on screen.
EOF
)"
```

---

## Task 4: `blankSentence` utility + unit tests (Layer 3 — first slice)

**Files:**

- Create: `games/spelling-bee/src/utils/blankSentence.ts`
- Create: `games/spelling-bee/src/__tests__/blankSentence.test.ts`

**Context:** Helper used by `WordDisplay` to hide the target word from the on-screen sentence. Uses a fixed-width placeholder so the blank doesn't leak the word's length.

- [ ] **Step 4.1: Write the failing test**

Create `games/spelling-bee/src/__tests__/blankSentence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { blankSentence, SENTENCE_BLANK } from '../utils/blankSentence';

describe('blankSentence', () => {
  it('replaces a whole-word occurrence with the fixed-width blank', () => {
    expect(blankSentence('The cat sat on the mat.', 'cat')).toBe(
      `The ${SENTENCE_BLANK} sat on the mat.`,
    );
  });

  it('matches case-insensitively but preserves the rest of the sentence verbatim', () => {
    expect(blankSentence('Cat! A fine cat indeed.', 'cat')).toBe(
      `${SENTENCE_BLANK}! A fine ${SENTENCE_BLANK} indeed.`,
    );
  });

  it('uses the same blank width regardless of word length', () => {
    const short = blankSentence('A cat here.', 'cat');
    const long = blankSentence('A refrigerator here.', 'refrigerator');
    const shortBlank = short.replace('A ', '').replace(' here.', '');
    const longBlank = long.replace('A ', '').replace(' here.', '');
    expect(shortBlank).toBe(longBlank);
    expect(shortBlank).toBe(SENTENCE_BLANK);
  });

  it('does not blank substrings that are not whole-word matches', () => {
    // "cat" must not match inside "caterpillar"
    expect(blankSentence('The caterpillar crawled.', 'cat')).toBe('The caterpillar crawled.');
  });

  it('returns the sentence unchanged when the word is absent', () => {
    expect(blankSentence('Nothing to see here.', 'cat')).toBe('Nothing to see here.');
  });

  it('escapes regex metacharacters in the word', () => {
    // Contrived, but guards against crashes if a word contains a dot.
    expect(blankSentence('A c.t walked by.', 'c.t')).toBe(`A ${SENTENCE_BLANK} walked by.`);
  });
});
```

- [ ] **Step 4.2: Run the test and confirm it fails**

Run: `pnpm --filter spelling-bee test -- src/__tests__/blankSentence.test.ts`
Expected: FAIL with module-not-found (the utility doesn't exist yet).

- [ ] **Step 4.3: Implement the utility**

Create `games/spelling-bee/src/utils/blankSentence.ts`:

```ts
export const SENTENCE_BLANK = '_____';

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function blankSentence(sentence: string, word: string): string {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
  return sentence.replace(pattern, SENTENCE_BLANK);
}
```

- [ ] **Step 4.4: Run the test and confirm it passes**

Run: `pnpm --filter spelling-bee test -- src/__tests__/blankSentence.test.ts`
Expected: all 6 assertions PASS.

- [ ] **Step 4.5: Typecheck**

Run: `pnpm --filter spelling-bee typecheck`
Expected: no errors.

- [ ] **Step 4.6: Commit**

```bash
git add games/spelling-bee/src/utils/blankSentence.ts games/spelling-bee/src/__tests__/blankSentence.test.ts
git commit -m "$(cat <<'EOF'
feat(spelling-bee): add blankSentence utility for hiding the target word

Replaces whole-word occurrences of the target word in a sentence with
a fixed-width placeholder (five underscores). Used by WordDisplay to
show sentence context without revealing the spelling or the word's
length.
EOF
)"
```

---

## Task 5: `ClueButton` component (Layer 3 — second slice)

**Files:**

- Create: `games/spelling-bee/src/components/ClueButton.tsx`
- Create: `games/spelling-bee/src/components/ClueButton.module.css`

**Context:** Game-local secondary button for the Definition / Origin / Sentence clue actions. Rounded pill, friendly color, leading emoji icon, tap-scale animation gated on reduced-motion.

- [ ] **Step 5.1: Create the CSS module**

Create `games/spelling-bee/src/components/ClueButton.module.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-height: 44px;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 2px solid var(--color-border, #ccc);
  border-radius: 9999px;
  background: var(--color-surface, #fff);
  color: var(--color-text-primary, #1a1a1a);
  font-family: var(--font-family-body);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.button:hover {
  background: var(--color-surface-alt, #f5f5f5);
  border-color: var(--color-primary, #4a90d9);
}

.button:focus-visible {
  outline: 3px solid var(--color-focus, #1a73e8);
  outline-offset: 2px;
}

.icon {
  font-size: 1.1em;
  line-height: 1;
}
```

- [ ] **Step 5.2: Create the component**

Create `games/spelling-bee/src/components/ClueButton.tsx`:

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from './ClueButton.module.css';

interface ClueButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  ariaLabel?: string;
}

export function ClueButton({ label, icon, onClick, ariaLabel }: ClueButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      {label}
    </motion.button>
  );
}
```

- [ ] **Step 5.3: Typecheck**

Run: `pnpm --filter spelling-bee typecheck`
Expected: no errors.

**Note:** No dedicated test file for ClueButton; its behavior is exercised through the WordDisplay tests in Task 6.

- [ ] **Step 5.4: Commit**

```bash
git add games/spelling-bee/src/components/ClueButton.tsx games/spelling-bee/src/components/ClueButton.module.css
git commit -m "$(cat <<'EOF'
feat(spelling-bee): add ClueButton component for clue actions

Game-local secondary button used by WordDisplay for the Definition,
Origin, and Sentence clue actions. Rounded pill, emoji icon, tap-scale
animation gated on useReducedMotion.
EOF
)"
```

---

## Task 6: WordDisplay redesign (Layer 3 — final slice)

**Files:**

- Modify: `games/spelling-bee/src/components/WordDisplay.tsx`
- Modify: `games/spelling-bee/src/components/WordDisplay.module.css`
- Modify: `games/spelling-bee/src/__tests__/WordDisplay.test.tsx`

**Context:** Four behavior changes to `WordDisplay`:

1. Replace the raw `Hear the word` button with `OptionButton` (large, primary, 🔊 icon).
2. Replace the three raw clue buttons with `ClueButton`s using emoji icons.
3. Reset `showDefinition` / `showOrigin` / `showSentence` when the word changes.
4. Render the sentence with `blankSentence(…)` so the target word is hidden on screen.

- [ ] **Step 6.1: Extend the existing tests**

Open `games/spelling-bee/src/__tests__/WordDisplay.test.tsx`. The existing `makeWord` factory needs some overrides; extend it first, then add new tests. Update the signature:

```ts
function makeWord(
  overrides: Partial<{
    word: string;
    image: string;
    definition: string;
    origin: string;
    sentence: string;
  }> = {},
) {
  return {
    word: 'cat',
    difficulty: 1,
    image: 'cat.webp',
    definition: '',
    origin: '',
    sentence: '',
    ...overrides,
  };
}
```

At the bottom of the file, append:

```tsx
describe('WordDisplay — clue buttons (non-tiny)', () => {
  it('hides the target word from the rendered sentence using a fixed blank', () => {
    render(
      <WordDisplay
        word={makeWord({ word: 'cat', sentence: 'The cat sat on the mat.' })}
        ageTier="junior"
        audioManager={mockAudio}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'getSentence' }));
    // Rendered sentence must not contain the exact word.
    const rendered = screen.getByText(/sat on the mat/i).textContent ?? '';
    expect(rendered.toLowerCase()).not.toContain('cat');
    expect(rendered).toContain('_____');
  });

  it('resets clue visibility when the word prop changes', () => {
    const { rerender } = render(
      <WordDisplay
        word={makeWord({ word: 'cat', definition: 'A small furry pet.' })}
        ageTier="junior"
        audioManager={mockAudio}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'getDefinition' }));
    expect(screen.getByText('A small furry pet.')).toBeTruthy();

    rerender(
      <WordDisplay
        word={makeWord({ word: 'dog', definition: 'A loyal four-legged friend.' })}
        ageTier="junior"
        audioManager={mockAudio}
      />,
    );
    // Previous definition must be gone; new one not yet shown.
    expect(screen.queryByText('A small furry pet.')).toBeNull();
    expect(screen.queryByText('A loyal four-legged friend.')).toBeNull();
  });

  it('plays the pronunciation when the Hear button is clicked', () => {
    render(
      <WordDisplay word={makeWord({ word: 'cat' })} ageTier="junior" audioManager={mockAudio} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /hearWord/ }));
    expect(mockAudio.playVoice).toHaveBeenCalledWith('voice:word-cat');
  });
});
```

**Note on test selectors:** the project's `react-i18next` mock returns the key as the rendered string. The existing clue buttons use `aria-label={t('getDefinition')}` / `t('getOrigin')` / `t('getSentence')`, so the test selectors target those keys. Keep the same `aria-label` wiring in the component in Step 6.3.

- [ ] **Step 6.2: Run the new tests and confirm they fail**

Run: `pnpm --filter spelling-bee test -- src/__tests__/WordDisplay.test.tsx`
Expected: the three new tests FAIL (the current component doesn't blank sentences, doesn't reset state, and the Hear button still passes but selectors may need the role tweak — adjust if needed).

- [ ] **Step 6.3: Update `WordDisplay.tsx`**

Replace the entire file contents with:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OptionButton } from '@kids-games-zone/shared';
import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';
import { blankSentence } from '../utils/blankSentence';
import { ClueButton } from './ClueButton';
import styles from './WordDisplay.module.css';

interface WordDisplayProps {
  word: WordEntry;
  ageTier: AgeTier;
  audioManager: AudioManager;
}

export function WordDisplay({ word, ageTier, audioManager }: WordDisplayProps) {
  const { t } = useTranslation('spelling-bee');
  const isTiny = ageTier === 'tiny';
  const [showDefinition, setShowDefinition] = useState(false);
  const [showOrigin, setShowOrigin] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setShowDefinition(false);
    setShowOrigin(false);
    setShowSentence(false);
  }, [word.word]);

  const handlePlayWord = useCallback(() => {
    audioManager.playVoice(`voice:word-${word.word}`);
  }, [audioManager, word.word]);

  const handleDefinition = useCallback(() => {
    setShowDefinition(true);
    if (word.definition) {
      audioManager.playVoice(`voice:def-${word.word}`);
    }
  }, [audioManager, word]);

  const handleOrigin = useCallback(() => {
    setShowOrigin(true);
  }, []);

  const handleSentence = useCallback(() => {
    setShowSentence(true);
    if (word.sentence) {
      audioManager.playVoice(`voice:sentence-${word.word}`);
    }
  }, [audioManager, word]);

  return (
    <div className={styles.container}>
      {isTiny && word.image && !imageError && (
        <img
          src={`/images/spelling-bee/${word.image}`}
          alt={word.word}
          className={styles.wordImage}
          onError={() => setImageError(true)}
        />
      )}

      {isTiny && (!word.image || imageError) && (
        <div className={styles.imageFallback} role="img" aria-label={t('imageFallbackLabel')}>
          <span aria-hidden="true">🐝</span>
        </div>
      )}

      <OptionButton
        label={t('hearWord')}
        icon={<span aria-hidden="true">🔊</span>}
        size="large"
        onSelect={handlePlayWord}
      />

      {!isTiny && (
        <div className={styles.clueButtons}>
          <ClueButton
            label={t('definition')}
            icon="📖"
            onClick={handleDefinition}
            ariaLabel={t('getDefinition')}
          />
          <ClueButton
            label={t('origin')}
            icon="📜"
            onClick={handleOrigin}
            ariaLabel={t('getOrigin')}
          />
          <ClueButton
            label={t('sentence')}
            icon="💬"
            onClick={handleSentence}
            ariaLabel={t('getSentence')}
          />
        </div>
      )}

      {showDefinition && word.definition && (
        <p className={styles.clueText} aria-live="polite">
          {word.definition}
        </p>
      )}
      {showOrigin && word.origin && (
        <p className={styles.clueText} aria-live="polite">
          {t('originLabel', { origin: word.origin })}
        </p>
      )}
      {showSentence && word.sentence && (
        <p className={styles.clueText} aria-live="polite">
          {blankSentence(word.sentence, word.word)}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6.4: Clean up unused styles**

Open `games/spelling-bee/src/components/WordDisplay.module.css` and delete the now-unused `.playButton`, `.clueButtons` spacing overrides that conflict with the new layout, and `.clueButton` blocks. Keep `.container`, `.wordImage`, `.imageFallback`, and `.clueText`. The replacement `.clueButtons` is just a flex wrapper:

```css
.clueButtons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  justify-content: center;
}
```

Remove `.playButton` and `.clueButton` + its `:hover` / `:focus-visible` descendants.

- [ ] **Step 6.5: Run WordDisplay tests and confirm they pass**

Run: `pnpm --filter spelling-bee test -- src/__tests__/WordDisplay.test.tsx`
Expected: all tests PASS, including the three new ones from Step 6.1.

- [ ] **Step 6.6: Run the full spelling-bee test suite**

Run: `pnpm --filter spelling-bee test`
Expected: all tests pass.

- [ ] **Step 6.7: Typecheck**

Run: `pnpm --filter spelling-bee typecheck`
Expected: no errors.

- [ ] **Step 6.8: Commit**

```bash
git add games/spelling-bee/src/components/WordDisplay.tsx games/spelling-bee/src/components/WordDisplay.module.css games/spelling-bee/src/__tests__/WordDisplay.test.tsx
git commit -m "$(cat <<'EOF'
refactor(spelling-bee): redesign WordDisplay buttons, reset clues per word, hide sentence word

- Swap raw Hear button for the shared OptionButton (large, 🔊 icon).
- Swap raw clue buttons for the new ClueButton (📖 / 📜 / 💬).
- Reset showDefinition / showOrigin / showSentence when word.word changes
  — previously, clues revealed on word N carried over to word N+1.
- Render the sentence with the target word replaced by a fixed-width
  blank so kids can't read the spelling off the clue. Audio narration
  still speaks the real sentence.
EOF
)"
```

---

## Task 7: LevelIndicator polish (Layer 4)

**Files:**

- Modify: `games/spelling-bee/src/components/LevelIndicator.tsx`
- Modify: `games/spelling-bee/src/components/LevelIndicator.module.css`
- Create: `games/spelling-bee/src/__tests__/LevelIndicator.test.tsx`

**Context:** The level indicator is currently a small primary-colored pill with 0.9rem text. Make it more prominent and child-friendly with a leading ⭐ icon and larger text.

- [ ] **Step 7.1: Write the test**

Create `games/spelling-bee/src/__tests__/LevelIndicator.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { LevelIndicator } from '../components/LevelIndicator';

describe('LevelIndicator', () => {
  it('renders the translated level text', () => {
    render(<LevelIndicator current={2} total={5} />);
    // The i18n mock returns the raw key; the aria-label is the same key.
    expect(screen.getByLabelText('levelOf')).toBeTruthy();
  });

  it('includes a star icon that is hidden from assistive tech', () => {
    const { container } = render(<LevelIndicator current={1} total={5} />);
    const star = container.querySelector('[aria-hidden="true"]');
    expect(star?.textContent).toBe('⭐');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LevelIndicator current={1} total={5} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 7.2: Run and confirm the test fails**

Run: `pnpm --filter spelling-bee test -- src/__tests__/LevelIndicator.test.tsx`
Expected: the star assertion FAILS (no star element yet).

- [ ] **Step 7.3: Update the component**

Replace the contents of `games/spelling-bee/src/components/LevelIndicator.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import styles from './LevelIndicator.module.css';

interface LevelIndicatorProps {
  current: number;
  total: number;
}

export function LevelIndicator({ current, total }: LevelIndicatorProps) {
  const { t } = useTranslation('spelling-bee');

  return (
    <div className={styles.indicator} aria-label={t('levelOf', { current, total })}>
      <span className={styles.star} aria-hidden="true">
        ⭐
      </span>
      <span className={styles.label}>{t('levelOf', { current, total })}</span>
    </div>
  );
}
```

- [ ] **Step 7.4: Update the styles**

Replace the contents of `games/spelling-bee/src/components/LevelIndicator.module.css`:

```css
.indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-large, 16px);
  font-family: var(--font-family-display);
  font-weight: 700;
  font-size: 1.25rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.star {
  font-size: 1.4em;
  line-height: 1;
}

.label {
  white-space: nowrap;
}
```

- [ ] **Step 7.5: Run the test and confirm it passes**

Run: `pnpm --filter spelling-bee test -- src/__tests__/LevelIndicator.test.tsx`
Expected: all assertions PASS.

- [ ] **Step 7.6: Typecheck**

Run: `pnpm --filter spelling-bee typecheck`
Expected: no errors.

- [ ] **Step 7.7: Commit**

```bash
git add games/spelling-bee/src/components/LevelIndicator.tsx games/spelling-bee/src/components/LevelIndicator.module.css games/spelling-bee/src/__tests__/LevelIndicator.test.tsx
git commit -m "$(cat <<'EOF'
refactor(spelling-bee): make LevelIndicator more prominent

Bigger text, rounded-badge shape, leading ⭐ icon, soft shadow. The
small pill read as incidental UI — a children's game benefits from a
clearly visible "you are on level X of Y" indicator.
EOF
)"
```

---

## Task 8: Keyboard i18n (Layer 5)

**Files:**

- Modify: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Modify: `games/spelling-bee/src/locales/fr/spelling-bee.json`
- Modify: `games/spelling-bee/src/components/Keyboard.tsx`
- Modify: `games/spelling-bee/src/__tests__/Keyboard.test.tsx`

**Context:** `Keyboard.tsx` currently has six hard-coded English strings. Move them into the existing spelling-bee locale files and translate to French.

- [ ] **Step 8.1: Add keyboard keys to the English locale**

Open `games/spelling-bee/src/locales/en/spelling-bee.json` and add a `keyboard` object (alongside the existing top-level keys). The new keys:

```json
"keyboard": {
  "placeholder": "Type your answer...",
  "typedPrefix": "Typed: ",
  "typedEmpty": "nothing yet",
  "groupLabel": "On-screen keyboard",
  "backspace": "Backspace",
  "submit": "Submit"
}
```

Insert before the closing `}`. Keep the existing keys untouched.

- [ ] **Step 8.2: Add the French translations**

Open `games/spelling-bee/src/locales/fr/spelling-bee.json` and add:

```json
"keyboard": {
  "placeholder": "Écris ta réponse…",
  "typedPrefix": "Saisi : ",
  "typedEmpty": "rien pour l'instant",
  "groupLabel": "Clavier à l'écran",
  "backspace": "Retour arrière",
  "submit": "Valider"
}
```

- [ ] **Step 8.3: Update the existing Keyboard test**

Open `games/spelling-bee/src/__tests__/Keyboard.test.tsx` and update the assertion at line 41 (the `'Typed: nothing yet'` label). Because the react-i18next mock returns keys verbatim, the new aria label will be `"keyboard.typedPrefixkeyboard.typedEmpty"` (the prefix key concatenated with the empty-state key). Update the test:

```tsx
// The typed display announces the running buffer via aria-label.
expect(screen.getByLabelText(/keyboard\.typedPrefix.*keyboard\.typedEmpty/)).toBeInTheDocument();
```

(A regex keeps the test robust to whitespace between the two keys.)

- [ ] **Step 8.4: Update `Keyboard.tsx`**

Replace the file with:

```tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnounce } from '@kids-games-zone/shared';
import styles from './Keyboard.module.css';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface KeyboardProps {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function Keyboard({ onSubmit, disabled = false }: KeyboardProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const [typed, setTyped] = useState('');

  const handleKey = useCallback(
    (letter: string) => {
      if (disabled) return;
      setTyped((prev) => prev + letter);
      announce(letter);
    },
    [disabled, announce],
  );

  const handleBackspace = useCallback(() => {
    setTyped((prev) => prev.slice(0, -1));
  }, []);

  const typedRef = useRef(typed);
  typedRef.current = typed;

  const handleSubmit = useCallback(() => {
    if (typedRef.current.length === 0) return;
    onSubmit(typedRef.current);
    setTyped('');
  }, [onSubmit]);

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
        return;
      }
      if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        handleKey(event.key.toUpperCase());
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleKey, handleBackspace, handleSubmit]);

  const typedStatus = `${t('keyboard.typedPrefix')}${typed || t('keyboard.typedEmpty')}`;

  return (
    <div className={styles.container}>
      <div className={styles.typedWord} aria-live="polite" aria-label={typedStatus}>
        {typed || <span className={styles.placeholder}>{t('keyboard.placeholder')}</span>}
      </div>

      <div className={styles.keyboard} role="group" aria-label={t('keyboard.groupLabel')}>
        {ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className={styles.row}>
            {row.map((letter) => (
              <button
                key={letter}
                className={styles.key}
                onClick={() => handleKey(letter)}
                disabled={disabled}
                aria-label={letter}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          <button
            className={`${styles.key} ${styles.actionKey}`}
            onClick={handleBackspace}
            disabled={disabled || typed.length === 0}
            aria-label={t('keyboard.backspace')}
          >
            ⌫
          </button>
          <button
            className={`${styles.key} ${styles.submitKey}`}
            onClick={handleSubmit}
            disabled={disabled || typed.length === 0}
            aria-label={t('keyboard.submit')}
          >
            {t('keyboard.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.5: Run the Keyboard tests**

Run: `pnpm --filter spelling-bee test -- src/__tests__/Keyboard.test.tsx`
Expected: all assertions PASS.

- [ ] **Step 8.6: Run the full spelling-bee suite**

Run: `pnpm --filter spelling-bee test`
Expected: all tests pass.

- [ ] **Step 8.7: Typecheck**

Run: `pnpm --filter spelling-bee typecheck`
Expected: no errors.

- [ ] **Step 8.8: Commit**

```bash
git add games/spelling-bee/src/locales/en/spelling-bee.json games/spelling-bee/src/locales/fr/spelling-bee.json games/spelling-bee/src/components/Keyboard.tsx games/spelling-bee/src/__tests__/Keyboard.test.tsx
git commit -m "$(cat <<'EOF'
feat(spelling-bee): translate Keyboard labels via i18n

Moves the six hard-coded English strings ("Type your answer…",
"Typed: ", "nothing yet", "On-screen keyboard", "Backspace", "Submit")
into the spelling-bee locale files under a "keyboard" sub-object, with
French translations alongside.
EOF
)"
```

---

## Task 9: OptionButton forwardRef (Layer 6 — prep)

**Files:**

- Modify: `shared/src/components/OptionButton/OptionButton.tsx`
- Modify: `shared/src/components/OptionButton/OptionButton.test.tsx`

**Context:** Shared `OptionButton` doesn't currently forward refs. `GameOverOverlay` needs to call `.focus()` on the retry button after mounting, which means we need ref support on the OptionButton. Trivial `forwardRef` wrap; behavior is unchanged.

- [ ] **Step 9.1: Add a failing test for ref forwarding**

Open `shared/src/components/OptionButton/OptionButton.test.tsx` and add this test at the bottom of the `describe('OptionButton', ...)` block:

```tsx
it('forwards ref to the underlying button element', () => {
  const ref = { current: null as HTMLButtonElement | null };
  render(<OptionButton label="Cat" ref={ref} />);
  expect(ref.current).toBeInstanceOf(HTMLButtonElement);
});
```

Also add this import at the top if it isn't already there:

```tsx
import { createRef } from 'react';
```

Actually the inline ref object above doesn't need `createRef`. Leave imports as-is.

- [ ] **Step 9.2: Run and confirm it fails**

Run: `pnpm --filter @kids-games-zone/shared test -- src/components/OptionButton`
Expected: FAIL — `ref.current` is `null` because the component doesn't forward refs yet. (TypeScript will also likely error on the `ref` prop.)

- [ ] **Step 9.3: Add forwardRef to the component**

Open `shared/src/components/OptionButton/OptionButton.tsx`. Replace the file contents:

```tsx
import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './OptionButton.module.css';

interface OptionButtonProps {
  label: string;
  icon?: ReactNode;
  state?: 'default' | 'correct' | 'incorrect';
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  size?: 'normal' | 'large';
}

export const OptionButton = forwardRef<HTMLButtonElement, OptionButtonProps>(function OptionButton(
  { label, icon, state = 'default', disabled = false, selected, onSelect, size = 'normal' },
  ref,
) {
  const shouldReduceMotion = useReducedMotion();

  const classNames = [
    styles.button,
    state !== 'default' ? styles[state] : '',
    size === 'large' ? styles.large : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (!disabled && onSelect) {
      onSelect();
    }
  }

  return (
    <motion.button
      ref={ref}
      className={classNames}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={selected}
      whileTap={!disabled && !shouldReduceMotion ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {state === 'correct' && <span className={styles.stateIcon}>✓</span>}
      {state === 'incorrect' && <span className={styles.stateIcon}>✗</span>}
      {icon}
      {label}
    </motion.button>
  );
});
```

- [ ] **Step 9.4: Run the test and confirm it passes**

Run: `pnpm --filter @kids-games-zone/shared test -- src/components/OptionButton`
Expected: all assertions PASS, including the new ref-forwarding test.

- [ ] **Step 9.5: Typecheck the shared package and everything that depends on it**

Run: `pnpm typecheck`
Expected: no errors across the monorepo. (All existing `<OptionButton label=... />` usages remain valid because `forwardRef` is a transparent wrapper.)

- [ ] **Step 9.6: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass across all packages.

- [ ] **Step 9.7: Commit**

```bash
git add shared/src/components/OptionButton/OptionButton.tsx shared/src/components/OptionButton/OptionButton.test.tsx
git commit -m "$(cat <<'EOF'
refactor(shared): forwardRef on OptionButton

Wraps OptionButton in forwardRef so consumers can focus the underlying
button programmatically. Prep for the spelling-bee GameOverOverlay,
which needs to move initial focus to the retry button on mount.
EOF
)"
```

---

## Task 10: GameOverOverlay button consistency (Layer 6 — final)

**Files:**

- Modify: `games/spelling-bee/src/components/GameOverOverlay.tsx`
- Modify: `games/spelling-bee/src/components/GameOverOverlay.module.css`

**Context:** Replace the two raw styled `<button>` elements in `GameOverOverlay` with the shared `OptionButton` (now ref-forwarding, courtesy of Task 9). Existing focus-on-mount behavior must be preserved — the existing test already asserts this.

- [ ] **Step 10.1: Update `GameOverOverlay.tsx`**

Replace the file contents:

```tsx
import { useEffect, useId, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { OptionButton } from '@kids-games-zone/shared';
import styles from './GameOverOverlay.module.css';

interface GameOverOverlayProps {
  levelReached: number;
  score: number;
  maxScore: number;
  onRetry: () => void;
  onExit: () => void;
}

export function GameOverOverlay({
  levelReached,
  score,
  maxScore,
  onRetry,
  onExit,
}: GameOverOverlayProps) {
  const { t } = useTranslation('spelling-bee');
  const titleId = useId();
  const subtitleId = useId();
  const retryRef = useRef<HTMLButtonElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onExitRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <FocusTrap focusTrapOptions={{ fallbackFocus: '[role="dialog"]' }}>
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
      >
        <div className={styles.content}>
          <div className={styles.emoji} aria-hidden="true">
            {'\u{1F41D}'}
          </div>
          <h2 id={titleId} className={styles.title}>
            {t('gameOverTitle')}
          </h2>
          <p id={subtitleId} className={styles.subtitle}>
            {t('gameOverSubtitle', { level: levelReached })}
          </p>
          <p className={styles.score}>
            {score} / {maxScore}
          </p>
          <div className={styles.actions}>
            <OptionButton ref={retryRef} label={t('tryAgain')} size="large" onSelect={onRetry} />
            <OptionButton label={t('backToHome')} size="normal" onSelect={onExit} />
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
```

- [ ] **Step 10.2: Clean up unused styles**

Open `games/spelling-bee/src/components/GameOverOverlay.module.css`. Delete the `.primary`, `.primary:focus-visible`, `.secondary`, and `.secondary:focus-visible` blocks (they're no longer referenced). Keep everything else.

- [ ] **Step 10.3: Run the GameOverOverlay test**

Run: `pnpm --filter spelling-bee test -- src/__tests__/GameOverOverlay.test.tsx`
Expected: all 8 existing tests PASS, including:

- `moves focus to the Try again button on mount` (relies on `ref.current?.focus()` now hitting OptionButton's forwarded ref)
- `has no accessibility violations`

- [ ] **Step 10.4: Run the full monorepo test suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 10.5: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: no errors.

- [ ] **Step 10.6: Manually verify in the browser**

Run: `pnpm --filter platform dev`
Open `http://localhost:3000`. Pick a profile, start the Spelling Bee game, and verify:

1. Header reads `"Spelling Bee"` (not `"title"`).
2. `"Let's Go!"` button is visible and reads correctly.
3. Level badge reads `"Level 1 of 5"` with a ⭐ icon.
4. Hear-the-word button reads `"🔊 Hear the word"`.
5. Definition / Origin / Sentence buttons read their labels with emoji icons; clicking each reveals the corresponding text.
6. Advance past the first word. When the next word loads, previously-revealed clues are hidden — you must click the clue buttons again.
7. Clicking Sentence shows the sentence with `_____` in place of the target word; audio still plays the full sentence.
8. Intentionally fail enough words (non-tiny tier) to trigger Game Over. Both `Try again` and `Back` buttons render in the shared button style; initial focus lands on `Try again`.
9. Switch language to French (if the app exposes a toggle): all labels translate.

- [ ] **Step 10.7: Commit**

```bash
git add games/spelling-bee/src/components/GameOverOverlay.tsx games/spelling-bee/src/components/GameOverOverlay.module.css
git commit -m "$(cat <<'EOF'
refactor(spelling-bee): use shared OptionButton in GameOverOverlay

Replaces the two raw styled buttons with the shared OptionButton.
Removes the local .primary / .secondary CSS blocks. Uses the newly
ref-forwarding OptionButton so initial focus on the retry button
continues to work.
EOF
)"
```

---

## Task 11: Final verification + PR

**Files:**

- No code changes.

- [ ] **Step 11.1: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

- [ ] **Step 11.2: Review the commit series**

Run: `git log --oneline main..HEAD`
Expected: 10 commits (spec + 9 implementation layers, Task 0 had no commit).

- [ ] **Step 11.3: Push and open PR**

Run: `git push -u origin fix/spelling-bee-ux-polish`

Then:

```bash
gh pr create --title "fix(spelling-bee): UX polish — i18n, button hierarchy, sentence blanks" --body "$(cat <<'EOF'
## Summary
- Register the missing `spelling-bee` i18n namespace in the platform (root cause of the "title", "hearWord", "levelOf" raw-key rendering).
- Redesign `WordDisplay` buttons with a primary `OptionButton` for "Hear the word" and a new game-local `ClueButton` for Definition / Origin / Sentence (emoji icons, rounded pill).
- Reset clue visibility when the word changes, and hide the target word from the on-screen sentence with a fixed-width blank so the sentence clue no longer spoils the spelling.
- Polish the level indicator (bigger, star icon, badge shape).
- i18n the `Keyboard` labels (en + fr).
- Make `GameOverOverlay` use the shared `OptionButton` (via a new `forwardRef` on the shared component).
- Add a word-data integrity test guarding that every sentence contains its target word verbatim.

## Test plan
- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` all green
- [ ] Manually walked through the game in the browser (see Task 10 checklist in the plan)

Spec: `docs/superpowers/specs/2026-04-19-spelling-bee-ux-polish-design.md`
Plan: `docs/superpowers/plans/2026-04-19-spelling-bee-ux-polish.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Rollback notes

If a layer lands badly, each commit is independently revertable with `git revert <hash>`. The layer dependency graph:

- Layer 3 (Task 6) depends on Layer 2 data cleanup (Task 3) and Layer 3 prep (Tasks 4–5).
- Layer 6 (Task 10) depends on Task 9.
- Layers 1, 4, 5 are independent and can be reverted without cascading.
