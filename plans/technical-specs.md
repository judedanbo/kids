# Technical Specifications: Kids Games Zone (Ages 3+)

---

## 1. Platform & Navigation

### 1.1 Unified Game Hub (Home Screen)

**Description:** A visually rich landing page that serves as the entry point to all available games.

**Functional Specs:**
- Display games as large, animated thumbnail cards (minimum 150x150px) in a scrollable grid
- Each card shows: game icon/thumbnail, game name, age badge, skill category icon, locked/unlocked state
- Cards animate on hover/touch (subtle scale or bounce) to invite interaction
- Support filtering by: age group, skill category, favorites, recently played
- Search bar (hidden for ages 3-5 profiles, visible for 6+) with icon-based search suggestions
- "Continue Playing" section at the top showing last 3 played games with progress indicators
- New games highlighted with a "NEW" animated badge

**Data Model:**
```typescript
interface GameManifest {
  id: string;                    // unique game identifier e.g. "word-puzzle"
  name: string;                  // display name
  description: string;           // short description (1-2 sentences)
  thumbnail: string;             // path to thumbnail asset
  ageRange: [number, number];    // e.g. [3, 5]
  skills: SkillCategory[];       // e.g. ["literacy", "memory"]
  version: string;               // semver
  entryPoint: string;            // lazy-load path e.g. "/games/word-puzzle"
  minDifficulty: number;         // 1-5 scale
  maxDifficulty: number;
  estimatedPlayTime: number;     // in minutes
  offlineCapable: boolean;
  status: "active" | "beta" | "coming_soon" | "retired";
  releaseDate: string;           // ISO date
  tags: string[];
}

type SkillCategory =
  | "literacy"
  | "numeracy"
  | "logic"
  | "memory"
  | "creativity"
  | "motor_skills"
  | "science"
  | "social_skills";
```

### 1.2 Age-Based Filtering

**Functional Specs:**
- Three age tiers: **Tiny (3-5)**, **Junior (6-8)**, **Explorer (9-12)**
- Age tier selected during profile creation; stored on the user profile
- Hub automatically filters to the child's age tier on load
- Parent can unlock cross-tier access from parental settings
- Visual theme subtly adapts per tier (e.g., rounder shapes for Tiny, sharper for Explorer)

**Filter Logic:**
```
display_game = game.ageRange[0] <= profile.age <= game.ageRange[1]
             OR profile.crossTierAccess === true
```

### 1.3 Navigation System

**Functional Specs:**
- Persistent bottom navigation bar (mobile) or sidebar (desktop) with icon-only buttons:
  - Home (hub), My Profile (avatar), Rewards (trophy), Settings (gear)
- Floating "Home" button always visible inside any game (top-left corner, semi-transparent)
- Back button uses browser/OS native back behavior; also available as an in-app button
- No nested navigation deeper than 2 levels: Hub → Game → (Game sub-screens)
- Navigation transitions use smooth slide animations (300ms ease-in-out)
- Breadcrumb-style indicator for current location (icon-based, not text)

---

## 2. User Experience

### 2.1 Touch & Interaction Design

**Specs:**
- Minimum touch target size: **48x48dp** (following Material Design guidelines)
- Recommended button size for ages 3-5: **64x64dp or larger**
- Tap feedback: visual press state (scale to 0.95) + haptic vibration (where supported)
- Drag-and-drop: large drag handles, generous drop zones with snap-to behavior
- No swipe gestures required for core navigation (swipe supported as enhancement only)
- Double-tap and long-press avoided entirely for ages 3-5; optional for 6+
- Debounce all taps by 300ms to prevent accidental double-triggers

### 2.2 Visual Design System

**Specs:**
- **Color palette:** High contrast, warm and inviting colors
  - Primary: Vibrant blue (#4A90D9), Secondary: Warm orange (#FF8C42)
  - Success: Green (#4CAF50), Error: Soft red (#E57373, not harsh)
  - Backgrounds: Light pastels, never pure white
- **Typography:**
  - Ages 3-5: Minimum 24px, rounded sans-serif (e.g., Nunito, Baloo)
  - Ages 6-8: Minimum 18px
  - Ages 9-12: Minimum 16px
- **Iconography:** Filled icons (not outline), consistent style across platform
- **Animations:** Playful but not distracting; all animations respect `prefers-reduced-motion`
- **Illustrations:** Friendly characters with diverse representation

**Design Tokens (CSS Custom Properties):**
```css
:root {
  --color-primary: #4A90D9;
  --color-secondary: #FF8C42;
  --color-success: #4CAF50;
  --color-error: #E57373;
  --color-bg-primary: #FFF8F0;
  --color-bg-secondary: #F0F4FF;

  --radius-small: 8px;
  --radius-medium: 16px;
  --radius-large: 24px;
  --radius-round: 50%;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  --font-family-display: 'Baloo 2', cursive;
  --font-family-body: 'Nunito', sans-serif;

  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;

  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-button: 0 2px 8px rgba(0, 0, 0, 0.12);
}
```

### 2.3 Audio System

**Specs:**
- **Audio Manager** singleton handles all sound playback across the platform
- Sound categories with independent volume controls:
  - **Music:** Background loops per game (default 30% volume)
  - **SFX:** Button clicks, correct/incorrect sounds, transitions
  - **Voice:** Narration, instructions, character speech
- Audio narration available for every on-screen instruction (triggered by tap or auto-play)
- Text-to-speech fallback for dynamic text where pre-recorded audio isn't available
- Audio preloading strategy: preload current screen's audio; prefetch next likely screen
- Mute toggle always accessible; mute state persisted per profile
- Audio sprites for SFX (single file, multiple sounds) to reduce HTTP requests

**Audio Manager Interface:**
```typescript
interface AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void;
  stopMusic(options?: { fadeOut?: number }): void;
  playSFX(sfxId: string): void;
  playVoice(voiceId: string, onComplete?: () => void): void;
  setVolume(category: "music" | "sfx" | "voice", level: number): void;
  mute(category?: "music" | "sfx" | "voice"): void;
  unmute(category?: "music" | "sfx" | "voice"): void;
  preload(assetIds: string[]): Promise<void>;
}
```

### 2.4 Feedback System

**Specs:**
- **Correct answer:** Green glow animation + cheerful SFX + optional confetti burst + score increment animation
- **Incorrect answer:** Gentle shake animation + soft "try again" SFX + encouraging message (never punitive)
- **Level complete:** Celebration animation (stars, fireworks) + reward reveal + progress bar fill
- **Streak milestone:** Special animation at 3, 5, 10 consecutive correct answers
- Feedback intensity scales with age tier:
  - Tiny (3-5): Maximum celebration, longer animations
  - Junior (6-8): Moderate celebration
  - Explorer (9-12): Subtle, quicker feedback

---

## 3. Game Architecture

### 3.1 Modular Plugin System

**Architecture:** Each game is a standalone module that conforms to a `GamePlugin` interface and is lazy-loaded into the platform shell.

**Directory Structure:**
```
kids/
├── platform/                    # Shell application
│   ├── src/
│   │   ├── components/          # Shared UI components
│   │   ├── context/             # Global state providers
│   │   ├── hooks/               # Shared hooks
│   │   ├── services/            # Audio, storage, analytics
│   │   ├── types/               # Shared type definitions
│   │   └── App.tsx              # Shell with router
│   └── package.json
├── games/                       # Individual game modules
│   ├── word-puzzle/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   ├── hooks/
│   │   │   └── index.tsx        # Exports GamePlugin
│   │   └── package.json
│   ├── math-adventure/
│   │   └── ...
│   └── memory-match/
│       └── ...
├── shared/                      # Shared library package
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── assets/
│   └── package.json
└── plans/
```

**Game Plugin Interface:**
```typescript
interface GamePlugin {
  manifest: GameManifest;

  // Lifecycle hooks
  onLoad(): Promise<void>;           // Called when game module loads
  onStart(config: GameConfig): void; // Called when game begins
  onPause(): void;                   // Called on app background/blur
  onResume(): void;                  // Called on app foreground/focus
  onEnd(): GameResult;               // Called when game session ends
  onUnload(): void;                  // Cleanup when leaving game

  // Required export
  GameComponent: React.ComponentType<GameProps>;
}

interface GameConfig {
  difficulty: number;
  profile: UserProfile;
  settings: GameSettings;
}

interface GameProps {
  config: GameConfig;
  onScore: (points: number) => void;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  audioManager: AudioManager;
  storageManager: StorageManager;
}

interface GameResult {
  gameId: string;
  score: number;
  maxScore: number;
  timeSpent: number;           // seconds
  difficulty: number;
  completedAt: string;         // ISO timestamp
  metrics: Record<string, number>; // game-specific metrics
}
```

### 3.2 Shared Component Library

**Core Components:**

| Component | Description | Props |
|-----------|-------------|-------|
| `<GameTimer>` | Countdown or count-up timer with visual ring | `mode`, `duration`, `onExpire`, `paused` |
| `<ScoreDisplay>` | Animated score counter with optional star rating | `score`, `maxScore`, `animate` |
| `<ProgressBar>` | Visual progress indicator | `current`, `total`, `color`, `showLabel` |
| `<DifficultySelector>` | Star-based difficulty picker | `levels`, `current`, `onChange` |
| `<CelebrationOverlay>` | Confetti/stars/fireworks overlay | `type`, `duration`, `onComplete` |
| `<InstructionBubble>` | Speech bubble with optional audio narration | `text`, `audioSrc`, `character` |
| `<DragItem>` / `<DropZone>` | Accessible drag-and-drop primitives | `data`, `onDrop`, `snapTo` |
| `<OptionButton>` | Large, animated answer/choice button | `label`, `icon`, `state`, `onSelect` |
| `<PauseMenu>` | Standardized pause overlay | `onResume`, `onRestart`, `onExit` |
| `<GameShell>` | Wrapper providing header, back button, pause | `title`, `showTimer`, `children` |

### 3.3 Shared State Management

**Technology:** React Context + useReducer for global state; per-game state is local.

**Global State Shape:**
```typescript
interface GlobalState {
  currentProfile: UserProfile | null;
  profiles: UserProfile[];
  gameRegistry: GameManifest[];
  session: {
    activeGameId: string | null;
    startedAt: string | null;
    elapsedTime: number;
  };
  settings: PlatformSettings;
}

interface UserProfile {
  id: string;
  name: string;
  avatar: string;                // avatar asset ID
  age: number;
  ageTier: "tiny" | "junior" | "explorer";
  createdAt: string;
  parentPin: string;             // hashed 4-digit PIN
  preferences: {
    musicVolume: number;
    sfxVolume: number;
    voiceVolume: number;
    language: string;
    theme: string;
  };
  progress: Record<string, GameProgress>;  // keyed by gameId
  rewards: Reward[];
  stats: {
    totalPlayTime: number;       // seconds
    totalGamesPlayed: number;
    currentStreak: number;
    longestStreak: number;
    lastPlayedAt: string;
  };
}

interface GameProgress {
  gameId: string;
  highScore: number;
  currentLevel: number;
  maxLevelReached: number;
  totalAttempts: number;
  totalTimePlayed: number;
  lastPlayedAt: string;
  difficulty: number;
  checkpointData?: unknown;      // game-specific save state
}
```

### 3.4 Game Lifecycle

**State Machine:**
```
[IDLE] → onLoad() → [LOADED] → onStart() → [PLAYING]
                                                 ↕
                                          onPause() / onResume()
                                                 ↓
                                            onEnd() → [COMPLETED] → onUnload() → [IDLE]
```

**Platform responsibilities at each stage:**
- **IDLE → LOADED:** Lazy-import game module, display loading animation, preload audio assets
- **LOADED → PLAYING:** Pass `GameConfig` with profile-appropriate difficulty, start session timer
- **PLAYING ↔ PAUSED:** Triggered by app blur, home button, or pause button; auto-save checkpoint
- **PLAYING → COMPLETED:** Collect `GameResult`, update progress, check for reward unlocks, show celebration
- **COMPLETED → IDLE:** Run `onUnload()` cleanup, navigate back to hub or "play again" prompt

---

## 4. Progress & Motivation

### 4.1 Progress Tracking

**Storage:** IndexedDB (via a wrapper library) for local persistence; optional cloud sync.

**Per-Game Progress:**
- Track: level reached, high score, total attempts, time played, last difficulty
- Checkpoint saves for resuming mid-game (stored as serialized JSON blob)
- Progress bar on hub card shows `currentLevel / totalLevels`

**Overall Progress:**
- Aggregate stats: total games played, total time, favorite category
- Weekly activity heatmap (visual calendar showing play days)
- Skill radar chart showing strength across categories

**Storage Interface:**
```typescript
interface StorageManager {
  // Profile
  saveProfile(profile: UserProfile): Promise<void>;
  loadProfile(profileId: string): Promise<UserProfile | null>;
  listProfiles(): Promise<UserProfile[]>;

  // Game progress
  saveProgress(profileId: string, gameId: string, progress: GameProgress): Promise<void>;
  loadProgress(profileId: string, gameId: string): Promise<GameProgress | null>;
  saveCheckpoint(profileId: string, gameId: string, data: unknown): Promise<void>;
  loadCheckpoint(profileId: string, gameId: string): Promise<unknown | null>;

  // Rewards
  unlockReward(profileId: string, reward: Reward): Promise<void>;
  getRewards(profileId: string): Promise<Reward[]>;

  // Analytics (local)
  logEvent(event: AnalyticsEvent): Promise<void>;
  getEvents(filter: EventFilter): Promise<AnalyticsEvent[]>;
}
```

### 4.2 Reward System

**Reward Types:**
```typescript
type RewardType = "star" | "badge" | "avatar_item" | "theme_unlock" | "character_unlock";

interface Reward {
  id: string;
  type: RewardType;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  criteria: RewardCriteria;
}

interface RewardCriteria {
  type: "score" | "streak" | "completion" | "time" | "category_mastery";
  gameId?: string;             // null = platform-wide
  threshold: number;
}
```

**Predefined Reward Milestones:**
| Reward | Criteria | Type |
|--------|----------|------|
| First Star | Complete any game once | star |
| Speed Demon | Complete a game in under 60s | badge |
| Bookworm | Complete 5 literacy games | badge |
| Math Wizard | Score 100% on any math game | badge |
| Super Streak | 7-day play streak | avatar_item |
| Explorer | Play every available game at least once | theme_unlock |
| Master | Reach max level in any game | character_unlock |

**Reward Evaluation Engine:**
- Runs after every `GameResult` submission
- Checks all unearned rewards against updated profile stats
- Queues unlocked rewards for celebration display
- Supports compound criteria (AND/OR) for complex rewards

### 4.3 Difficulty Scaling

**Adaptive Difficulty Algorithm:**
```typescript
function calculateNextDifficulty(history: GameResult[], currentDifficulty: number): number {
  const recentResults = history.slice(-5); // last 5 attempts
  const avgScorePercent = average(recentResults.map(r => r.score / r.maxScore));

  if (avgScorePercent >= 0.85 && recentResults.length >= 3) {
    return Math.min(currentDifficulty + 1, MAX_DIFFICULTY);  // increase
  } else if (avgScorePercent <= 0.40 && recentResults.length >= 3) {
    return Math.max(currentDifficulty - 1, MIN_DIFFICULTY);  // decrease
  }
  return currentDifficulty; // maintain
}
```

- Difficulty stored per game per profile
- Manual override available: child or parent can select difficulty
- Difficulty affects: question complexity, time limits, number of options, hint availability

### 4.4 Streaks & Daily Challenges

**Streak Logic:**
- A "play day" counts if at least one game is completed
- Streak increments daily; resets to 0 after missing a full calendar day
- Streak milestones: 3, 7, 14, 30 days — each unlocks a reward
- Visual streak counter on the hub (flame icon with number)

**Daily Challenges:**
- One challenge per day, rotated from a predefined pool
- Challenge types: "Play 3 games", "Score 80%+ on any math game", "Try a new game"
- Completing the daily challenge awards bonus stars
- Challenge data stored locally; generated deterministically from date seed (no server needed)

```typescript
function getDailyChallenge(date: string, gameRegistry: GameManifest[]): DailyChallenge {
  const seed = hashDateString(date);
  const challengePool = generateChallengePool(gameRegistry);
  return challengePool[seed % challengePool.length];
}
```

---

## 5. Parental Controls & Safety

### 5.1 Parental Access Gate

**Specs:**
- All parental features protected behind a **4-digit PIN** set during first profile creation
- PIN entry uses a custom number pad (not a text input) to prevent keyboard-based bypasses
- Additional gate for sensitive actions: **"adult verification" challenge** (e.g., solve a simple math problem like "What is 14 x 3?") to prevent young children from guessing the PIN
- 3 failed PIN attempts = 60-second lockout
- PIN is stored as a salted hash (bcrypt or similar)

### 5.2 Parental Dashboard

**Features:**
- Per-child activity summary: games played today/this week, time spent, scores
- Visual charts: play time by day (bar chart), skill category breakdown (pie chart)
- Game-by-game progress report
- Ability to: reset progress, lock/unlock specific games, adjust difficulty range
- Export progress report as PDF (optional, future feature)

**Access:** Settings → Parental Dashboard → PIN entry

### 5.3 Time Limits

**Specs:**
```typescript
interface TimeLimitConfig {
  enabled: boolean;
  dailyLimitMinutes: number;        // e.g., 60
  sessionLimitMinutes: number;      // e.g., 30
  reminderBeforeEndMinutes: number; // e.g., 5
  cooldownMinutes: number;          // forced break between sessions, e.g., 15
  schedule?: {
    allowedDays: number[];          // 0=Sun, 6=Sat
    allowedStartHour: number;       // e.g., 8
    allowedEndHour: number;         // e.g., 20
  };
}
```

**Behavior:**
- Gentle on-screen reminder at `reminderBeforeEndMinutes` (friendly character says "Almost time to take a break!")
- At limit: game auto-pauses, checkpoint saved, kind message displayed ("Great playing today! Time for a break.")
- Timer pauses when app is backgrounded
- Daily limit resets at midnight local time
- Parent can grant "bonus time" extensions from the dashboard

### 5.4 Privacy & COPPA Compliance

**Requirements:**
- No account creation requiring email or personal info from children
- Profiles stored 100% on-device (IndexedDB) — no server transmission of child data
- If cloud sync is added later: requires verifiable parental consent, data encrypted in transit and at rest
- No third-party analytics SDKs that track children (no Google Analytics, no Facebook Pixel)
- No advertising of any kind
- Privacy policy accessible from settings (plain language, not legalese)
- Data deletion: parent can delete all child data from the dashboard

---

## 6. Accessibility & Inclusivity

### 6.1 Color & Visual Accessibility

**Specs:**
- All color-conveying elements must also use shape, icon, pattern, or label differentiation
  - Correct answers: green + checkmark icon
  - Incorrect answers: red + X icon
- Minimum color contrast ratio: **4.5:1** for text, **3:1** for large text and UI elements (WCAG AA)
- Provide a **high contrast mode** toggle in settings
- Avoid: pure red/green combinations, flashing animations faster than 3Hz

### 6.2 Responsive Design

**Breakpoints:**
```css
/* Mobile-first approach */
--bp-mobile: 320px;    /* small phones */
--bp-tablet: 768px;    /* tablets — primary target */
--bp-desktop: 1024px;  /* desktop/laptop */
--bp-large: 1440px;    /* large screens */
```

**Layout Rules:**
- Hub grid: 2 columns (mobile), 3 columns (tablet), 4-5 columns (desktop)
- Game area: always fills available viewport; games use relative units
- Orientation: support both portrait and landscape; games may prefer one (indicated in manifest)
- Safe area insets respected for notched devices

### 6.3 Input Support

| Input Method | Support Level | Notes |
|-------------|---------------|-------|
| Touch | Primary | All interactions must be touch-compatible |
| Mouse | Full | Hover states, click equivalents |
| Keyboard | Full navigation | Tab order, Enter/Space to activate, arrow keys for lists |
| Gamepad | Future | Map to directional + confirm/cancel |
| Switch access | Future | Sequential focus navigation |

**Keyboard Navigation:**
- Logical tab order matching visual layout (left-to-right, top-to-bottom)
- Visible focus indicators (thick outline, not just color change)
- Escape key always triggers pause/back
- No keyboard traps

### 6.4 Screen Reader Support

- All interactive elements have meaningful `aria-label` attributes
- Game state changes announced via `aria-live` regions
- Score changes, timer updates, and feedback announced (politely, not aggressively)
- Images have descriptive `alt` text
- Decorative elements marked with `aria-hidden="true"`

### 6.5 Multilingual Support

**Architecture:**
```typescript
// i18n namespace per game + shared platform namespace
interface I18nConfig {
  defaultLocale: string;           // "en"
  supportedLocales: string[];      // ["en", "fr", "es", "tw", "ha"]
  fallbackLocale: string;          // "en"
}

// Translation files structure
// platform/locales/en.json    — hub, navigation, settings
// games/word-puzzle/locales/en.json — game-specific strings
```

- Use a lightweight i18n library (e.g., `i18next` with React bindings)
- All user-visible strings externalized to JSON translation files
- Right-to-left (RTL) layout support via CSS logical properties (`margin-inline-start` instead of `margin-left`)
- Language selector in settings (icon-based: flags or language name in native script)
- Audio narration files organized by locale

---

## 7. Content & Educational Value

### 7.1 Curriculum Mapping

**Skill-to-Game Matrix:**

| Skill Category | Age 3-5 Games | Age 6-8 Games | Age 9-12 Games |
|---------------|---------------|---------------|----------------|
| Literacy | Letter recognition, Phonics match | Word puzzle, Spelling bee | Reading comprehension, Vocabulary builder |
| Numeracy | Counting, Shape sorting | Addition/subtraction, Patterns | Multiplication, Fractions, Word problems |
| Logic | Simple sequences, Odd-one-out | Sudoku lite, Code puzzles | Strategy games, Logic grids |
| Memory | Card matching (4-8 cards) | Card matching (12-16 cards), Simon says | Memory palace, Sequence recall |
| Creativity | Coloring, Free drawing | Story builder, Music maker | Comic creator, Animation tool |
| Motor Skills | Tap targets, Tracing | Maze navigation, Drawing shapes | Typing practice, Precision games |

### 7.2 Game Metadata Tags

```typescript
interface EducationalMetadata {
  skills: SkillCategory[];
  learningObjectives: string[];    // e.g., ["Recognize uppercase letters A-Z"]
  curriculumStandards?: string[];  // e.g., ["CCSS.ELA-LITERACY.RF.K.1"]
  difficultyProgression: string;   // description of how difficulty scales
  estimatedLearningOutcome: string;
}
```

### 7.3 Content Guidelines

- Every game must have a documented educational objective
- Fun-to-learning ratio: aim for 70% fun, 30% explicit learning
- No penalty-based mechanics (no "lives", no "game over" for ages 3-5)
- Encouragement-first feedback: "Almost! Try again!" instead of "Wrong!"
- Cultural sensitivity review for all content (characters, scenarios, examples)

---

## 8. Technical Requirements

### 8.1 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | React 18+ | Component model, ecosystem, existing team knowledge |
| Language | TypeScript (strict mode) | Type safety across platform and games |
| Build | Vite | Fast HMR, native ESM, optimized builds |
| Routing | React Router v6+ | Lazy route loading, nested routes |
| State | React Context + useReducer | Simple, no extra dependency for global state |
| Storage | IndexedDB (via idb wrapper) | Large local storage, structured data |
| Styling | CSS Modules + CSS Custom Properties | Scoped styles, theming via variables |
| Audio | Howler.js | Cross-browser audio, sprites, spatial audio |
| i18n | i18next + react-i18next | Lightweight, namespace support per game |
| Animation | Framer Motion | Declarative, gesture support, accessible |
| Testing | Vitest + React Testing Library + Playwright | Unit, component, and E2E coverage |
| Linting | ESLint + Prettier | Consistent code style |
| Package mgmt | pnpm workspaces | Monorepo support, efficient disk usage |

### 8.2 Responsive Design Implementation

- Mobile-first CSS with `min-width` media queries
- CSS Grid for hub layout; Flexbox for game internal layouts
- `rem`/`em` units for typography; `vw`/`vh` for game canvas sizing
- `aspect-ratio` CSS property for game containers to maintain proportions
- Test targets: iPhone SE (375px), iPad (768px), iPad Pro (1024px), Desktop (1440px)

### 8.3 Offline Support

**Strategy:** Service Worker with Cache-First for static assets, Network-First for dynamic data.

```typescript
// Service worker caching strategy
const CACHE_STRATEGIES = {
  platformShell: "cache-first",      // HTML, CSS, JS for the hub
  gameModules: "cache-first",        // individual game bundles (versioned)
  sharedAssets: "cache-first",       // images, audio, fonts
  gameData: "cache-first",           // question sets, level data
  userProgress: "indexeddb-only",    // never cached in SW, always from IndexedDB
};
```

- Platform shell and core games pre-cached on first load
- Additional games cached on first play
- Offline indicator in the UI when network is unavailable
- All user data operations work offline (IndexedDB)
- Cache versioning: game update triggers cache refresh on next online visit

### 8.4 Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Game module load time | < 1.0s | Custom metric |
| Total bundle (platform shell) | < 150KB gzipped | Build output |
| Per-game bundle | < 100KB gzipped | Build output |
| Audio asset per game | < 2MB total | Asset audit |
| Image assets per game | < 1MB total | Asset audit |

**Optimization Strategies:**
- Route-based code splitting via `React.lazy()` and `Suspense`
- Game modules loaded on demand, never in the main bundle
- Image optimization: WebP with PNG fallback, responsive `srcset`
- Audio: compressed MP3/OGG, sprite sheets for SFX
- Font subsetting: only include used character ranges
- Tree-shaking enforced via ESM imports

### 8.5 Error Resilience

```typescript
// Error boundary wrapper for each game
class GameErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log error locally (never to external service with child data)
    storageManager.logEvent({
      type: "game_error",
      gameId: this.props.gameId,
      error: error.message,
      stack: info.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      return <FriendlyErrorScreen onRetry={this.handleRetry} onGoHome={this.handleGoHome} />;
    }
    return this.props.children;
  }
}
```

- Every game wrapped in its own `GameErrorBoundary`
- Auto-save checkpoint every 30 seconds during active play
- On crash: show friendly character ("Oops! Let's try that again!"), offer retry or return home
- Platform errors never expose technical details to children

---

## 9. Extensibility

### 9.1 Game Template / SDK

**New Game Scaffolding CLI:**
```bash
pnpm create-game <game-name>

# Generates:
# games/<game-name>/
#   ├── src/
#   │   ├── components/
#   │   ├── data/
#   │   ├── hooks/
#   │   ├── index.tsx          # GamePlugin export
#   │   └── types.ts
#   ├── locales/
#   │   └── en.json
#   ├── assets/
#   │   ├── images/
#   │   └── audio/
#   ├── tests/
#   │   └── game.test.tsx
#   ├── package.json
#   └── README.md
```

**Developer Checklist (enforced by CI):**
- [ ] Exports valid `GamePlugin` interface
- [ ] Has manifest with all required fields
- [ ] Includes at least 1 unit test
- [ ] Bundle size under 100KB gzipped
- [ ] All strings in locale files (no hardcoded text)
- [ ] Accessibility audit passes (axe-core)
- [ ] Works offline after first load

### 9.2 Shared Asset Library

**Structure:**
```
shared/assets/
├── characters/          # Reusable mascot/character SVGs and animations
│   ├── owl-helper/
│   ├── fox-friend/
│   └── robot-buddy/
├── audio/
│   ├── sfx/            # click.mp3, correct.mp3, incorrect.mp3, celebrate.mp3
│   ├── music/          # background loops by mood (calm, upbeat, exciting)
│   └── voice/          # shared narration clips by locale
├── icons/              # UI icons (SVG)
├── backgrounds/        # Reusable background patterns/illustrations
└── animations/         # Lottie files for shared animations
```

- Assets referenced by ID, resolved at build time via import aliases
- Shared assets are a separate package in the monorepo; tree-shaken per game

### 9.3 Feature Flags

```typescript
interface FeatureFlags {
  [flagName: string]: {
    enabled: boolean;
    rolloutPercentage?: number;    // 0-100 for gradual rollout
    ageTiers?: AgeTier[];          // restrict to specific tiers
    description: string;
  };
}

// Example flags
const defaultFlags: FeatureFlags = {
  "daily-challenges": { enabled: true, description: "Daily challenge system" },
  "new-game-math-adventure": { enabled: false, rolloutPercentage: 25, description: "Math Adventure game beta" },
  "cloud-sync": { enabled: false, description: "Cloud progress sync" },
};
```

- Flags stored in a JSON config file, loaded at app start
- No server dependency — flags bundled with the app, updated on deploy
- `useFeatureFlag(name)` hook for conditional rendering

### 9.4 Analytics (Privacy-Safe)

**Local-only analytics — no external transmission of child data.**

```typescript
interface AnalyticsEvent {
  id: string;
  type: "game_start" | "game_end" | "level_complete" | "reward_unlocked" | "error" | "navigation";
  profileId: string;
  gameId?: string;
  timestamp: string;
  data: Record<string, string | number | boolean>;
}
```

- Events stored in IndexedDB, queryable by the parental dashboard
- Aggregate metrics computed on-device for the dashboard charts
- Retention: auto-purge events older than 90 days
- If server analytics needed in future: anonymize, aggregate, and require parental consent

---

## 10. Deployment & Operations

### 10.1 CI/CD Pipeline

**Pipeline Stages:**
```
[Push/PR] → [Lint + Type Check] → [Unit Tests] → [Build] → [Bundle Size Check] → [E2E Tests] → [Deploy Preview] → [Production Deploy]
```

**Per-Stage Details:**

| Stage | Tool | Criteria |
|-------|------|----------|
| Lint | ESLint + Prettier | Zero errors, zero warnings |
| Type Check | tsc --noEmit | Zero errors |
| Unit Tests | Vitest | 80%+ coverage on shared lib, 70%+ per game |
| Build | Vite | Successful production build |
| Bundle Size | bundlesize / size-limit | Under defined budgets |
| Accessibility | axe-core (via Playwright) | Zero critical/serious violations |
| E2E Tests | Playwright | Core user flows passing |
| Deploy Preview | Vercel/Netlify preview | Auto-generated per PR |
| Production | Vercel/Netlify/Cloudflare Pages | Triggered on main branch merge |

### 10.2 Versioning Strategy

- **Platform shell:** Semver, deployed as a whole
- **Individual games:** Independent semver, can be deployed independently
- **Game manifest registry:** Version field in each `GameManifest`; platform loads registry on start
- **Breaking changes:** If platform API changes, bump major version and provide migration guide
- **Monorepo versioning:** Use changesets for coordinated releases

### 10.3 Content Review Workflow

```
Developer creates game
    → PR with game code + manifest
    → Automated checks (CI pipeline above)
    → Manual review checklist:
        [ ] Educational value verified
        [ ] Age-appropriateness confirmed
        [ ] Cultural sensitivity reviewed
        [ ] Accessibility manually tested
        [ ] Play-tested with target age group
    → Merge to main (status: "beta" with feature flag)
    → Beta testing period
    → Promote to status: "active" (remove feature flag)
```

### 10.4 Monitoring

- **Error logging:** Local-only error log viewable in parental dashboard (last 50 errors)
- **Performance:** Lighthouse CI on every deploy; budget alerts if metrics regress
- **Uptime:** If hosted: basic uptime monitoring via free tier (e.g., UptimeRobot)
- **User feedback:** "Report a problem" button in settings (opens email draft to support address)
