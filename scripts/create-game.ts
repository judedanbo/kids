#!/usr/bin/env tsx
/**
 * create-game.ts
 * Interactive scaffolder for new Kids Games Zone game packages.
 * Usage: pnpm create-game
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..');

function kebabToPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Prompts the user for input.
 * When stdin is not a TTY (e.g. piped), reads the next pre-loaded line instead
 * so the script can be driven non-interactively.
 */
let _stdinLines: string[] | null = null;
let _stdinLineIndex = 0;

async function loadStdinLines(): Promise<void> {
  if (process.stdin.isTTY) return; // interactive — skip
  _stdinLines = [];
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    _stdinLines.push(line);
  }
}

let _rl: readline.Interface | null = null;

function getRL(): readline.Interface {
  if (!_rl) {
    _rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return _rl;
}

function closeRL(): void {
  _rl?.close();
  _rl = null;
}

function ask(question: string): Promise<string> {
  if (_stdinLines !== null) {
    // non-TTY mode: consume from pre-loaded lines
    const line = _stdinLines[_stdinLineIndex++] ?? '';
    process.stdout.write(question + line + '\n');
    return Promise.resolve(line);
  }
  return new Promise((resolve) => getRL().question(question, resolve));
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Created: ${path.relative(ROOT, filePath)}`);
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

const AGE_RANGES: Record<string, [number, number]> = {
  tiny: [3, 5],
  junior: [6, 8],
  explorer: [9, 12],
};

const SKILL_OPTIONS = [
  'literacy',
  'numeracy',
  'logic',
  'memory',
  'creativity',
  'motor_skills',
  'science',
  'social_skills',
] as const;

type Skill = (typeof SKILL_OPTIONS)[number];

async function promptAgeTier(): Promise<keyof typeof AGE_RANGES> {
  console.log('\nAge range options:');
  console.log('  1) tiny     (3-5)');
  console.log('  2) junior   (6-8)');
  console.log('  3) explorer (9-12)');
  const tiers = Object.keys(AGE_RANGES) as (keyof typeof AGE_RANGES)[];
  while (true) {
    const answer = (await ask('Choose age range [1-3]: ')).trim();
    const index = parseInt(answer, 10) - 1;
    if (index >= 0 && index < tiers.length) {
      return tiers[index];
    }
    // Also accept the tier name directly
    if (answer in AGE_RANGES) {
      return answer as keyof typeof AGE_RANGES;
    }
    console.log('  Invalid choice. Enter 1, 2, or 3 (or the tier name).');
  }
}

async function promptSkills(): Promise<Skill[]> {
  console.log('\nSkill categories (comma-separated numbers or names):');
  SKILL_OPTIONS.forEach((s, i) => console.log(`  ${i + 1}) ${s}`));
  while (true) {
    const answer = (await ask('Select skills [e.g. 1,3 or literacy,logic]: ')).trim();
    const parts = answer.split(',').map((p) => p.trim()).filter(Boolean);
    const skills: Skill[] = [];
    let valid = true;
    for (const part of parts) {
      const asNumber = parseInt(part, 10);
      if (!isNaN(asNumber) && asNumber >= 1 && asNumber <= SKILL_OPTIONS.length) {
        skills.push(SKILL_OPTIONS[asNumber - 1]);
      } else if (SKILL_OPTIONS.includes(part as Skill)) {
        skills.push(part as Skill);
      } else {
        console.log(`  Unknown skill: "${part}"`);
        valid = false;
        break;
      }
    }
    if (valid && skills.length > 0) {
      return skills;
    }
    if (valid && skills.length === 0) {
      console.log('  Please select at least one skill.');
    }
  }
}

async function promptGameName(): Promise<string> {
  const kebabPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  while (true) {
    const name = (await ask('\nGame name (kebab-case, e.g. spelling-bee): ')).trim();
    if (!kebabPattern.test(name)) {
      console.log('  Must be kebab-case (lowercase letters, digits, hyphens; no leading/trailing hyphens).');
      continue;
    }
    const dest = path.join(ROOT, 'games', name);
    if (fs.existsSync(dest)) {
      console.log(`  Directory already exists: games/${name}. Choose a different name.`);
      continue;
    }
    return name;
  }
}

// ---------------------------------------------------------------------------
// File generators
// ---------------------------------------------------------------------------

function generatePackageJson(name: string): string {
  return JSON.stringify(
    {
      name: `@kids-games-zone/${name}`,
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        typecheck: 'tsc --noEmit',
        test: 'vitest run --passWithNoTests',
      },
      dependencies: {
        'framer-motion': '^11.0.0',
      },
      peerDependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        '@kids-games-zone/shared': 'workspace:*',
        'react-i18next': '^16.0.0',
      },
    },
    null,
    2,
  ) + '\n';
}

function generateTsConfig(): string {
  return (
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          outDir: './dist',
          rootDir: './src',
          paths: { '@shared/*': ['../../shared/src/*'] },
          types: ['vitest/globals'],
        },
        include: ['src'],
        references: [{ path: '../../shared' }],
      },
      null,
      2,
    ) + '\n'
  );
}

function generateVitestConfig(_name: string): string {
  return `import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  resolve: {
    alias: {
      '@kids-games-zone/shared': path.resolve(__dirname, '../../shared/src'),
      'react-i18next': path.resolve(__dirname, 'src/__mocks__/react-i18next.ts'),
    },
  },
});
`;
}

function generateTestSetup(): string {
  return `import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
expect.extend(axeMatchers);
`;
}

function generateI18nMock(): string {
  return `import { vi } from 'vitest';

const t = (key: string) => key;
const i18n = { changeLanguage: vi.fn(), language: 'en' };

export const useTranslation = vi.fn(() => ({ t, i18n }));

export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
`;
}

function generateViteEnvDts(): string {
  return `/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
`;
}

function generateVitestAxeDts(): string {
  return `import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
`;
}

function generateIndexTs(
  name: string,
  displayName: string,
  ageRange: [number, number],
  skills: Skill[],
): string {
  const pascal = kebabToPascal(name);
  const skillsJson = JSON.stringify(skills);
  const today = new Date().toISOString().split('T')[0];
  return `import type { GamePlugin, GameConfig } from '@kids-games-zone/shared';
import { ${pascal} } from './components/${pascal}';

let _startTime = 0;
let _score = 0;
let _difficulty = 1;

const plugin: GamePlugin = {
  manifest: {
    id: '${name}',
    name: '${displayName}',
    description: 'TODO: Add a description for ${displayName}',
    thumbnail: '/images/games/${name}.webp',
    ageRange: [${ageRange[0]}, ${ageRange[1]}],
    skills: ${skillsJson},
    version: '0.1.0',
    entryPoint: '../../../games/${name}/src/index.ts',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'beta',
    releaseDate: '${today}',
    tags: [],
  },

  onLoad: async () => {},

  onStart: (config: GameConfig) => {
    _startTime = Date.now();
    _score = 0;
    _difficulty = config.difficulty;
  },

  onPause: () => {},
  onResume: () => {},

  onEnd: () => {
    const timeSpent = Math.round((Date.now() - _startTime) / 1000);
    return {
      gameId: '${name}',
      score: _score,
      maxScore: 100,
      timeSpent,
      difficulty: _difficulty,
      completedAt: new Date().toISOString(),
      metrics: {},
    };
  },

  onUnload: () => {
    _startTime = 0;
    _score = 0;
    _difficulty = 1;
  },

  GameComponent: ${pascal},
};

export default plugin;
`;
}

function generateComponent(name: string, _displayName: string): string {
  const pascal = kebabToPascal(name);
  return `import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell } from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import styles from './${pascal}.module.css';

export function ${pascal}({ config, onComplete, onExit }: GameProps) {
  const { t } = useTranslation('${name}');

  const handlePlay = useCallback(() => {
    const result: GameResult = {
      gameId: '${name}',
      score: 0,
      maxScore: 100,
      timeSpent: 0,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {},
    };
    onComplete(result);
  }, [config.difficulty, onComplete]);

  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.container}>
        <p className={styles.instruction}>{t('instruction')}</p>
        <button className={styles.playButton} onClick={handlePlay} type="button">
          {t('play')}
        </button>
      </div>
    </GameShell>
  );
}
`;
}

function generateComponentCss(_name: string): string {
  return `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl, 24px);
  padding: var(--spacing-xl, 24px);
  max-width: 600px;
  margin: 0 auto;
}

.instruction {
  font-size: 1.125rem;
  color: var(--color-text-primary, #1a1a2e);
  text-align: center;
  line-height: 1.6;
  margin: 0;
}

.playButton {
  padding: var(--spacing-md, 12px) var(--spacing-xl, 24px);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-on-primary, #fff);
  background: var(--color-primary, #6c63ff);
  border: none;
  border-radius: var(--radius-lg, 12px);
  cursor: pointer;
  transition: transform 0.1s ease, background 0.15s ease;
}

.playButton:hover {
  background: var(--color-primary-dark, #5a52d5);
}

.playButton:active {
  transform: scale(0.97);
}

.playButton:focus-visible {
  outline: 3px solid var(--color-focus, #6c63ff);
  outline-offset: 3px;
}
`;
}

function generateLocaleEn(name: string, displayName: string): string {
  return (
    JSON.stringify(
      {
        title: displayName,
        instruction: 'TODO: Add instructions',
        play: 'Play',
      },
      null,
      2,
    ) + '\n'
  );
}

function generateLocaleFr(name: string, displayName: string): string {
  return (
    JSON.stringify(
      {
        title: displayName,
        instruction: 'TODO: Ajouter les instructions',
        play: 'Jouer',
      },
      null,
      2,
    ) + '\n'
  );
}

function generateTest(name: string): string {
  const pascal = kebabToPascal(name);
  return `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ${pascal} } from '../components/${pascal}';
import type { GameProps } from '@kids-games-zone/shared';

function createMockProps(overrides: Partial<GameProps> = {}): GameProps {
  return {
    config: {
      difficulty: 1,
      profile: {
        id: 'test',
        name: 'Test',
        avatar: '',
        age: 7,
        ageTier: 'junior',
        createdAt: new Date().toISOString(),
        parentPin: '',
        preferences: {
          musicVolume: 50,
          sfxVolume: 100,
          voiceVolume: 100,
          language: 'en',
          theme: 'default',
        },
        progress: {},
        rewards: [],
        stats: {
          totalPlayTime: 0,
          totalGamesPlayed: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastPlayedAt: '',
        },
        deletedAt: null,
      },
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        backgroundMusicEnabled: true,
        language: 'en',
        highContrastMode: false,
      },
    },
    onScore: vi.fn(),
    onComplete: vi.fn(),
    onExit: vi.fn(),
    audioManager: {
      playMusic: vi.fn(),
      stopMusic: vi.fn(),
      playSFX: vi.fn(),
      playVoice: vi.fn(),
      stopVoice: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn().mockReturnValue(100),
      mute: vi.fn(),
      unmute: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      preload: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

describe('${pascal}', () => {
  it('renders the title', () => {
    const props = createMockProps();
    render(<${pascal} {...props} />);
    // With i18n mock, t() returns the key
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('renders the play button', () => {
    const props = createMockProps();
    render(<${pascal} {...props} />);
    expect(screen.getByRole('button', { name: 'play' })).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    const props = createMockProps();
    const { container } = render(<${pascal} {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
`;
}

// ---------------------------------------------------------------------------
// Feature flag updater
// ---------------------------------------------------------------------------

function addFeatureFlag(name: string, displayName: string): void {
  const flagsPath = path.join(ROOT, 'platform/src/config/featureFlags.json');
  const flags = JSON.parse(fs.readFileSync(flagsPath, 'utf8')) as Record<
    string,
    { enabled: boolean; description: string }
  >;
  const key = `game.${name}`;
  if (key in flags) {
    console.log(`  Feature flag "${key}" already exists — skipping.`);
    return;
  }
  flags[key] = { enabled: false, description: `${displayName} game` };
  fs.writeFileSync(flagsPath, JSON.stringify(flags, null, 2) + '\n', 'utf8');
  console.log(`  Updated: platform/src/config/featureFlags.json (added "${key}")`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Pre-load stdin lines when running non-interactively (piped input)
  await loadStdinLines();

  console.log('\n=== Kids Games Zone — Game Scaffolder ===\n');

  let name: string;
  let displayName: string;
  let ageTier: keyof typeof AGE_RANGES;
  let skills: Skill[];

  try {
    name = await promptGameName();
    displayName = (await ask('Display name (e.g. "Spelling Bee"): ')).trim() || kebabToPascal(name);
    ageTier = await promptAgeTier();
    skills = await promptSkills();
  } finally {
    closeRL();
  }

  const ageRange = AGE_RANGES[ageTier];
  const pascal = kebabToPascal(name);
  const gameDir = path.join(ROOT, 'games', name);

  console.log(`\nScaffolding games/${name}/ ...\n`);

  // Root files
  writeFile(path.join(gameDir, 'package.json'), generatePackageJson(name));
  writeFile(path.join(gameDir, 'tsconfig.json'), generateTsConfig());
  writeFile(path.join(gameDir, 'vitest.config.ts'), generateVitestConfig(name));

  // src/ support files
  writeFile(path.join(gameDir, 'src/test-setup.ts'), generateTestSetup());
  writeFile(path.join(gameDir, 'src/vite-env.d.ts'), generateViteEnvDts());
  writeFile(path.join(gameDir, 'src/vitest-axe.d.ts'), generateVitestAxeDts());

  // i18n mock
  writeFile(path.join(gameDir, 'src/__mocks__/react-i18next.ts'), generateI18nMock());

  // src/index.ts
  writeFile(path.join(gameDir, 'src/index.ts'), generateIndexTs(name, displayName, ageRange, skills));

  // Component files
  writeFile(path.join(gameDir, `src/components/${pascal}.tsx`), generateComponent(name, displayName));
  writeFile(path.join(gameDir, `src/components/${pascal}.module.css`), generateComponentCss(name));

  // Locale files
  writeFile(path.join(gameDir, `src/locales/en/${name}.json`), generateLocaleEn(name, displayName));
  writeFile(path.join(gameDir, `src/locales/fr/${name}.json`), generateLocaleFr(name, displayName));

  // Test file
  writeFile(path.join(gameDir, `src/__tests__/${pascal}.test.tsx`), generateTest(name));

  // Feature flag
  console.log('\nUpdating feature flags ...\n');
  addFeatureFlag(name, displayName);

  // Next steps
  console.log(`
=== Done! Next steps ===

1.  Install dependencies:
      pnpm install

2.  Add the game manifest to the registry:
      platform/src/config/gameRegistry.ts
    (import the plugin and add to the registry array)

3.  Add locale namespace to:
      platform/src/i18n.ts
    (import and register the "${name}" namespace for en and fr)

4.  Enable the feature flag when ready:
      platform/src/config/featureFlags.json
    Set "game.${name}".enabled to true

5.  Run typechecks:
      pnpm --filter @kids-games-zone/${name} typecheck

6.  Run tests:
      pnpm --filter @kids-games-zone/${name} test

Happy hacking!
`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
