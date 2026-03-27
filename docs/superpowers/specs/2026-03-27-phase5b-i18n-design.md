# Phase 5B — Internationalization (i18n) Design Spec

> **Date:** 2026-03-27
> **Scope:** Add i18n support to Kids Games Zone with English + French, infrastructure for easy language expansion
> **Approach:** i18next with static JSON imports, colocated locale files per package
> **RTL:** Not in scope — LTR languages only for now

---

## 1. i18next Setup & Configuration

### New Dependencies

| Package | Purpose |
|---------|---------|
| `i18next` | Core translation framework |
| `react-i18next` | React bindings (`useTranslation` hook, `Trans` component) |
| `i18next-browser-languagedetector` | Auto-detect browser language on first visit |

### Initialization

A single `i18n.ts` config file in `platform/src/` that:

- Initializes i18next with `en` as the default and fallback language
- Registers the browser language detector (checks `navigator.language`, falls back to `en`)
- Loads all namespace resources via static JSON imports at build time
- Syncs with `PlatformSettings.language` — if a user has a saved language preference, that overrides browser detection

### Namespace Registration

| Namespace | Source | Loaded When |
|-----------|--------|-------------|
| `common` | Platform pages + shared component strings | App startup |
| `memory-match` | Memory Match game strings | App startup (static import) |
| `math-adventure` | Math Adventure game strings | App startup (static import) |
| `word-puzzle` | Word Puzzle game strings | App startup (static import) |
| (no `shared` namespace) | Shared component strings live in `common` | N/A — no separate file |

### Language Change Flow

1. User selects language in Settings
2. `i18next.changeLanguage('fr')` called
3. `dispatch({ type: 'SET_SETTINGS', payload: { language: 'fr' } })` persists to IndexedDB
4. All components re-render with new translations via react-i18next's context

---

## 2. Locale File Structure & String Extraction

### File Layout

```
platform/src/locales/
  en/common.json        # Platform pages + shared component strings
  fr/common.json

games/memory-match/src/locales/
  en/memory-match.json
  fr/memory-match.json

games/math-adventure/src/locales/
  en/math-adventure.json
  fr/math-adventure.json

games/word-puzzle/src/locales/
  en/word-puzzle.json
  fr/word-puzzle.json
```

### Key Naming Convention

Flat dot-notation keys grouped by component/page:

```json
{
  "hub.welcome": "Welcome back",
  "hub.dailyChallenge": "Daily Challenge",
  "hub.searchPlaceholder": "Search games",
  "hub.filterAll": "All",
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "nav.home": "Home",
  "pause.title": "Paused",
  "pause.resume": "Resume"
}
```

### Interpolation

i18next's built-in interpolation for dynamic values:

```json
{
  "hub.streak": "{{count}} day streak",
  "game.questionOf": "Question {{current}} of {{total}}",
  "timer.remaining": "{{time}} remaining"
}
```

### Pluralization

i18next handles plurals natively with `_one` / `_other` suffixes:

```json
{
  "hub.streak_one": "{{count}} day streak",
  "hub.streak_other": "{{count}} day streak"
}
```

### String Counts by Namespace

| Namespace | Approx. Strings | Sources |
|-----------|----------------|---------|
| `common` | ~100 | Hub (~28), Settings (~10), Rewards (~8), ParentalDashboard (~15), ProfileCreator (~20), NavBar (~4), PauseMenu (~4), other shared components (~11) |
| `memory-match` | ~12 | MemoryMatch.tsx game strings + announcements |
| `math-adventure` | ~15 | MathAdventure.tsx game strings + announcements |
| `word-puzzle` | ~12 | WordPuzzle.tsx game strings + announcements |

### What Does NOT Get Extracted

- Emoji characters (universal symbols)
- ARIA labels that are purely structural
- CSS class names, data attributes
- Game content data (word lists, math problems) — these are data, not UI strings

---

## 3. Component Integration Pattern

### Pages and Games — `useTranslation` Hook

Every component with hardcoded strings uses the `useTranslation` hook:

```tsx
import { useTranslation } from 'react-i18next';

function NavBar() {
  const { t } = useTranslation('common');
  return <span>{t('nav.home')}</span>;
}
```

Game components use their own namespace:

```tsx
import { useTranslation } from 'react-i18next';

function MemoryMatch(props: GameProps) {
  const { t } = useTranslation('memory-match');
  return <InstructionBubble text={t('instruction')} />;
}
```

### Shared Components — Prop-Driven (No Direct i18n)

Shared components remain namespace-agnostic. They receive already-translated strings as props:

- `GameShell` receives `title` as a prop (already translated by the game)
- `OptionButton` receives `label` as a prop
- `InstructionBubble` receives `text` as a prop
- `ScoreDisplay`, `ProgressBar`, `GameTimer` — display numbers/visuals, minimal text

**Exception:** `PauseMenu` has its own hardcoded strings ("Paused", "Resume", "Restart", "Exit to Hub"). These use the `common` namespace directly since PauseMenu is always rendered in the platform context.

### Screen Reader Announcements

Announcements via `useAnnounce` use translated strings:

```tsx
const { t } = useTranslation('memory-match');
const announce = useAnnounce();
announce(t('matchFound'));
```

### ARIA Labels

ARIA labels with translatable text get extracted:

```tsx
// Before
<button aria-label="Go back">

// After
<button aria-label={t('gameShell.goBack')}>
```

---

## 4. Language Selector in Settings

### UI Design

A button row in the existing Appearance section of Settings, consistent with the Theme and High Contrast toggles:

```
Appearance
  Theme          [Light]
  Language        [English] [Français]
```

Each language button:
- Shows the language's native name (e.g., "Français" not "French")
- Uses `aria-pressed` on the active language
- On click: calls `i18next.changeLanguage(code)` and dispatches `SET_SETTINGS` to persist

### Supported Languages Config

A constant in `platform/src/config/languages.ts`:

```typescript
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const;
```

Adding a new language: create locale JSON files + add an entry to this array.

### Browser Language Detection

- `i18next-browser-languagedetector` checks `navigator.language` on first visit
- If browser language matches a supported language code, use it
- Otherwise fall back to `en`
- A saved profile language preference takes priority over browser detection

---

## 5. Testing Strategy

### i18n Setup Tests

- Verify `i18next` initializes with `en` as default
- Verify `changeLanguage('fr')` switches translations
- Verify fallback to `en` for unsupported language codes

### Component Test Wrapper

A test helper that wraps components with an initialized i18next instance. Existing component tests continue to work — `react-i18next` provides a fallback mode where missing translations return the key.

For tests that assert on specific visible text (e.g., `getByText('Resume')`):
- Update to use the i18n test wrapper, OR
- Query by role/label instead of text content (more resilient)

### Translation Completeness Check

A test that compares `en` and `fr` JSON files to verify all keys exist in both languages. Fails if `fr` is missing keys that `en` has. Runs as part of `pnpm test`.

### Out of Scope

- RTL layout testing (deferred)
- Visual regression testing for text overflow (Phase 6 E2E)
- Audio narration testing (no audio files yet)

---

## 6. Audio Narration File Structure

Structure-only prep — no actual audio files created.

### Directory Convention

```
shared/assets/audio/
  narration/
    en/
      memory-match/
      math-adventure/
      word-puzzle/
    fr/
      memory-match/
      math-adventure/
      word-puzzle/
  sfx/                  # existing — language-independent
```

### Integration Point

Games pass a locale-aware path to `InstructionBubble`:

```tsx
const { i18n } = useTranslation();
<InstructionBubble
  text={t('instruction')}
  audioSrc={`/audio/narration/${i18n.language}/memory-match/instruction.mp3`}
/>
```

---

## Dependencies & New Files Summary

### New Packages

- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector`

### New Files

- `platform/src/i18n.ts` — i18next initialization and config
- `platform/src/config/languages.ts` — supported languages constant
- `platform/src/locales/en/common.json` — English platform/shared strings
- `platform/src/locales/fr/common.json` — French platform/shared strings
- `games/memory-match/src/locales/en/memory-match.json` — English game strings
- `games/memory-match/src/locales/fr/memory-match.json` — French game strings
- `games/math-adventure/src/locales/en/math-adventure.json` — English game strings
- `games/math-adventure/src/locales/fr/math-adventure.json` — French game strings
- `games/word-puzzle/src/locales/en/word-puzzle.json` — English game strings
- `games/word-puzzle/src/locales/fr/word-puzzle.json` — French game strings
- `shared/assets/audio/narration/en/` — empty directory structure
- `shared/assets/audio/narration/fr/` — empty directory structure
- Test: translation completeness check

### Modified Files

- `platform/src/main.tsx` — import and initialize i18n
- `platform/src/pages/Settings.tsx` — add language selector
- `platform/src/pages/Hub.tsx` — replace hardcoded strings with `t()` calls
- `platform/src/pages/Rewards.tsx` — replace hardcoded strings
- `platform/src/pages/ParentalDashboard.tsx` — replace hardcoded strings
- `platform/src/components/ProfileCreator/ProfileCreator.tsx` — replace hardcoded strings
- `platform/src/components/NavBar/NavBar.tsx` — replace hardcoded strings
- `platform/src/components/PinEntry/PinEntry.tsx` — replace hardcoded strings
- `platform/src/components/AdultGate/AdultGate.tsx` — replace hardcoded strings
- `platform/src/components/GameCard/GameCard.tsx` — replace hardcoded strings
- `platform/src/components/RewardCard/RewardCard.tsx` — replace hardcoded strings
- `shared/src/components/PauseMenu/PauseMenu.tsx` — replace hardcoded strings
- `games/memory-match/src/MemoryMatch.tsx` — replace hardcoded strings
- `games/math-adventure/src/MathAdventure.tsx` — replace hardcoded strings
- `games/word-puzzle/src/WordPuzzle.tsx` — replace hardcoded strings
- Multiple existing test files — update text assertions or add i18n wrapper
