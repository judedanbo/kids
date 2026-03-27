# Phase 5A — Accessibility Design Spec

> **Date:** 2026-03-27
> **Scope:** Accessibility audit, fixes, and enhancements for Kids Games Zone
> **WCAG Target:** 2.1 AA baseline with select AAA enhancements (7:1 text contrast in high-contrast mode, larger text)
> **Approach:** Component-first — fix shared components, then platform pages, then games

---

## 1. Audit Tooling & Infrastructure

### New Dependencies

| Package | Purpose |
|---------|---------|
| `axe-core` | Accessibility rule engine |
| `@axe-core/react` | Dev overlay — logs violations to browser console |
| `vitest-axe` | `toHaveNoViolations()` matcher for Vitest |

### Dev Overlay

Initialize `@axe-core/react` in `platform/src/main.tsx` behind an `import.meta.env.DEV` guard. Violations appear in the browser console during development with severity, element, and fix suggestions.

### Test Helper

A shared `renderAndCheckA11y()` utility that renders a component and runs `axe()` against it. Lives in the test setup so all component tests can call it with a single line.

### CI Enforcement

Axe-based Vitest tests fail the existing `pnpm test` step in GitHub Actions. No additional CI configuration required.

### ESLint

Already configured with `eslint-plugin-jsx-a11y` — no changes needed.

---

## 2. Shared Component Fixes

### Global Focus Indicator

Add to `tokens.css`:
- New token: `--color-focus-ring` (visible in both light and dark themes)
- Global `:focus-visible` style: 2px outline with 2px offset using `--color-focus-ring`
- High-contrast mode: 3px outline, higher contrast color

### Component-by-Component Changes

| Component | Current State | Changes |
|-----------|--------------|---------|
| **ScoreDisplay** | No ARIA | Add `aria-live="polite"` to announce score changes |
| **ProgressBar** | No ARIA | Add `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` |
| **GameTimer** | Has aria-label | Add `aria-live="polite"` with debounced announcements (every 10s, not every tick) |
| **InstructionBubble** | No ARIA | Add `role="status"`, `aria-live="polite"` for dynamic instruction changes |
| **DifficultySelector** | No ARIA | Add `role="radiogroup"`, each star gets `role="radio"` + `aria-checked`, arrow key navigation via roving tabindex |
| **OptionButton** | Has aria-disabled | Add visible `:focus-visible` styles (inherits global), add `aria-pressed` for selected state |
| **CelebrationOverlay** | Has aria-live | Verify auto-dismiss announces content before removing. No changes expected. |
| **PauseMenu** | Focus trap, dialog role | Add `prefers-reduced-motion` check to Framer Motion animations. Verify focus returns to trigger element on close. |
| **GameShell** | Escape key handler | Add skip-to-content link. Use semantic landmarks: `<header>` for controls, `<main>` for game content. Manage focus on game state transitions. Add `<Announcer>` component (see Section 5). |

### Reduced Motion Audit

All Framer Motion animations and CSS `@keyframes` must respect `prefers-reduced-motion`. The existing pattern is:
- Framer Motion: `useReducedMotion()` hook (already used in OptionButton, CelebrationOverlay)
- CSS: `@media (prefers-reduced-motion: reduce)` (already used in LoadingSpinner, DifficultySelector, word-puzzle tiles)

**Fix:** PauseMenu Framer Motion animations currently do not check reduced motion — add `useReducedMotion()` check. Audit all other CSS module files for animations missing the media query.

---

## 3. High-Contrast Mode

### Detection & Toggle

- **OS detection:** `prefers-contrast: more` media query
- **Manual toggle:** Checkbox on Settings page, stored in `PlatformSettings.highContrast: boolean`, persisted to IndexedDB
- **Hook:** `useHighContrast()` returns `true` if either OS preference or manual toggle is active
- **Application:** Sets `[data-high-contrast="true"]` attribute on the root `<div>`, same pattern as `[data-theme]`

### Visual Changes When Active

- All borders become solid 2px with a high-contrast border color
- Text contrast minimum 7:1 ratio (WCAG AAA)
- UI element contrast minimum 4.5:1 (AAA for non-text)
- Focus ring becomes 3px, higher contrast color
- Game cards, option buttons, interactive elements get distinct borders (no reliance on color/shadow alone)
- Backgrounds simplified — no gradients, solid colors only

### CSS Implementation

New token overrides in `tokens.css` under `[data-high-contrast="true"]`:

```css
[data-high-contrast="true"] {
  --color-focus-ring: /* high contrast value */;
  --shadow-card: none;
  --shadow-button: none;
  --color-border: /* high contrast border */;
  /* ... additional overrides */
}
```

Tokens cascade automatically — no per-component CSS changes needed except for components using `color-mix()` (OptionButton, DifficultySelector) which need explicit high-contrast overrides since mixed colors may not meet contrast ratios.

### Baseline Contrast Audit

Verify all existing color token pairings in both light and dark themes meet WCAG AA:
- 4.5:1 for normal text
- 3:1 for large text and UI elements

Fix any failures — these are baseline fixes independent of high-contrast mode.

---

## 4. Keyboard Navigation — Roving Tabindex

### Page-Level Flow (Tab Key)

Tab moves between logical regions. Each page defines its own tab-stop regions:

- **Hub:** Skip-link → Nav → search bar (if visible) → filter bar → game card grid → daily challenge → streak badge
- **Game (GameShell):** Skip-to-game link → header controls (back, pause) → game board → score/progress area
- **Settings/Rewards/Profile:** Standard tab order through form controls and interactive elements

### useRovingTabindex Hook

New hook in `shared/src/hooks/useRovingTabindex.ts`:

**API:**
```typescript
function useRovingTabindex(options: {
  itemCount: number;
  columns?: number;        // >1 enables 2D grid navigation
  wrap?: boolean;          // default true
  orientation?: 'horizontal' | 'vertical' | 'grid';
}): {
  activeIndex: number;
  getItemProps: (index: number) => {
    tabIndex: number;
    onKeyDown: KeyboardEventHandler;
    ref: RefCallback;
  };
  setActiveIndex: (index: number) => void;
}
```

**Behavior:**
- `tabIndex={0}` on active item, `tabIndex={-1}` on all others
- Arrow keys move focus between items
- 1D mode: Left/Right or Up/Down depending on orientation
- 2D mode: All four arrows, row-aware wrapping
- Home/End jump to first/last item
- Wraps at boundaries (configurable)

### Application Map

| Context | Layout | Arrow Behavior |
|---------|--------|---------------|
| Hub game card grid | 2D (responsive columns) | All four arrows, wrap per row |
| Memory Match card grid | 2D (fixed columns per difficulty) | All four arrows |
| Word Puzzle letter tiles | 1D horizontal | Left/Right |
| Math Adventure option buttons | 1D vertical | Up/Down |
| DifficultySelector stars | 1D horizontal | Left/Right |
| NavBar links | 1D horizontal | Left/Right |
| NumberPad buttons | 2D (3 columns) | All four arrows |

### Focus Management on Transitions

| Transition | Focus Target |
|-----------|-------------|
| Game loads | Game board (or skip-to-game link) |
| Game completes | Results/celebration area |
| PauseMenu opens | First menu item (already handled by focus trap) |
| PauseMenu closes | Element that triggered the pause |
| Page navigation | Page heading or main content area |

---

## 5. Platform Page & Game-Specific Fixes

### Announcer Component

A centralized screen reader announcement mechanism, added to `GameShell`:

- Visually hidden `aria-live="polite"` region
- Games call `announce(message: string)` via a prop or context
- Decouples announcements from DOM structure — games don't need to manage their own aria-live regions for game events

### Platform Pages

| Page | Changes |
|------|---------|
| **Hub.tsx** | Landmark roles: `<main>`, `<section aria-label="...">` for each region (Continue Playing, All Games, Daily Challenge). Streak badge gets `aria-live="polite"`. Game card `aria-label` combines: game name + progress + locked state. |
| **Settings.tsx** | Associate `<label>` elements with form controls. Add high-contrast toggle. Group related controls with `<fieldset>`/`<legend>`. |
| **Rewards.tsx** | Reward grid gets roving tabindex. Verify locked/unlocked state conveyed via `aria-label`. |
| **ProfileCreator.tsx** | Multi-step flow gets `aria-current="step"`. Avatar grid gets roving tabindex. Age input validation announced via `aria-describedby`. |
| **ParentalDashboard.tsx** | Data tables use proper `<th scope>`. Bar chart gets `aria-label` summarizing the data. |

### Game-Specific Fixes

**Memory Match:**
- Cards: `aria-label` describes state ("Card 3 of 8, face down" / "Cat, matched")
- Flip action announced via `<Announcer>`
- Preview phase: screen reader announcement of visible cards

**Math Adventure:**
- New question announced via `<Announcer>` using an `assertive` priority parameter (questions are time-sensitive content that shouldn't be missed)
- Option buttons inherit shared OptionButton fixes
- Score/progress updates via shared component fixes

**Word Puzzle:**
- Letter tiles: `aria-label` ("Letter A, position 3")
- Answer slots: `aria-label` ("Slot 2 of 5, filled with letter R" / "Slot 3 of 5, empty")
- New round: scrambled word announced via `<Announcer>`

---

## 6. Testing Strategy

### Axe Tests on Existing Components

Every shared and platform component with an existing test file gets `expect(container).toHaveNoViolations()` added. Covers ~20+ test files.

### Keyboard Navigation Tests

| Test File | Coverage |
|-----------|----------|
| `shared/src/hooks/__tests__/useRovingTabindex.test.tsx` | Arrow key movement, wrap-around, Home/End, 1D vs 2D modes |
| `platform/src/__tests__/keyboard-nav.test.tsx` | Tab through Hub regions, arrow keys within game card grid, Enter to select |
| Per-game keyboard tests | Arrow navigation within each game's interactive grid/list |

### Focus Management Tests

- Focus moves to game board on game load
- Focus returns to trigger element when PauseMenu closes
- Focus moves to results area on game completion

### High-Contrast Mode Tests

- `[data-high-contrast="true"]` attribute toggles on root element
- `useHighContrast()` hook responds to both manual toggle and OS preference

### Out of Scope

- E2E tests with Playwright (Phase 6)
- Automated color contrast ratio verification beyond axe-core's checks
- Automated screen reader testing (manual testing with NVDA/VoiceOver recommended)

---

## Dependencies & New Files Summary

### New Packages
- `axe-core`
- `@axe-core/react`
- `vitest-axe`

### New Files
- `shared/src/hooks/useRovingTabindex.ts` — roving tabindex hook
- `shared/src/hooks/useHighContrast.ts` — high-contrast detection hook
- `shared/src/components/Announcer/Announcer.tsx` — visually hidden aria-live region
- `shared/src/hooks/__tests__/useRovingTabindex.test.tsx`
- `shared/src/hooks/__tests__/useHighContrast.test.tsx`
- `platform/src/__tests__/keyboard-nav.test.tsx`

### Modified Files (Key)
- `shared/src/styles/tokens.css` — focus ring token, high-contrast overrides, baseline contrast fixes
- `platform/src/main.tsx` — axe-core dev overlay initialization
- `platform/src/context/PlatformContext.tsx` — `highContrast` setting
- `platform/src/pages/Settings.tsx` — high-contrast toggle
- All 9 shared components — ARIA and focus fixes per Section 2
- All platform pages — landmark and label fixes per Section 5
- All 3 games — game-specific ARIA and keyboard fixes per Section 5
- ~20+ existing test files — axe violation checks added
