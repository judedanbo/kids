import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import type {
  StorageManager,
  AudioManager,
  UserProfile,
  GameManifest,
  FeatureFlags,
} from '@kids-games-zone/shared';
import enCommon from '../../locales/en/common.json';
import { PlatformProvider } from '../../context/PlatformContext';
import { ConfigOverrideProvider } from '../../context/ConfigOverrideContext';
import { CONFIG_OVERRIDE_STORAGE_KEY } from '../../config/overrides/store';
import { ParentalConfig } from './ParentalConfig';

// Deterministic i18n: resolve real English copy with {{var}} interpolation.
vi.mock('react-i18next', () => {
  const dict = enCommon as Record<string, string>;
  const translate = (key: string, opts?: Record<string, unknown>) => {
    let str = dict[key] ?? (opts?.defaultValue as string) ?? key;
    if (opts) {
      for (const [k, v] of Object.entries(opts)) {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      }
    }
    return str;
  };
  return {
    useTranslation: () => ({ t: translate, i18n: { language: 'en', changeLanguage: vi.fn() } }),
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

const profile: UserProfile = {
  id: 'kid1',
  name: 'Maya',
  avatar: '🦊',
  age: 7,
  ageTier: 'junior',
  createdAt: '2026-01-01T00:00:00.000Z',
  parentPin: '',
  preferences: { musicVolume: 0.7, sfxVolume: 1, voiceVolume: 1, language: 'en', theme: 'default' },
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
};

const gameRegistry: GameManifest[] = [
  {
    id: 'math-adventure',
    name: 'Math Adventure',
    description: 'Solve math problems',
    thumbnail: '',
    ageRange: [6, 8],
    skills: ['numeracy'],
    version: '1.0.0',
    entryPoint: '',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedPlayTime: 5,
    offlineCapable: true,
    status: 'active',
    releaseDate: '2026-03-16',
    tags: [],
  },
];

const defaultFlags: FeatureFlags = {
  'game.math-adventure': { enabled: true, description: 'Math Adventure' },
  'daily-challenge': { enabled: true, description: 'Daily challenge card on the Hub' },
};

function makeStorage(): StorageManager {
  return {
    saveProfile: vi.fn().mockResolvedValue(undefined),
    loadProfile: vi.fn().mockResolvedValue(null),
    listProfiles: vi.fn().mockResolvedValue([profile]),
    listActiveProfiles: vi.fn().mockResolvedValue([profile]),
    softDeleteProfile: vi.fn().mockResolvedValue(undefined),
    restoreProfile: vi.fn().mockResolvedValue(undefined),
    purgeProfile: vi.fn().mockResolvedValue(undefined),
    resetProfileProgress: vi.fn().mockResolvedValue(undefined),
    saveProgress: vi.fn().mockResolvedValue(undefined),
    loadProgress: vi.fn().mockResolvedValue(null),
    saveCheckpoint: vi.fn().mockResolvedValue(undefined),
    loadCheckpoint: vi.fn().mockResolvedValue(null),
    unlockReward: vi.fn().mockResolvedValue(undefined),
    getRewards: vi.fn().mockResolvedValue([]),
    logEvent: vi.fn().mockResolvedValue(undefined),
    getEvents: vi.fn().mockResolvedValue([]),
  };
}

const mockAudio: AudioManager = {
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
  pauseMusic: vi.fn(),
  resumeMusic: vi.fn(),
  playSFX: vi.fn(),
  playVoice: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  preload: vi.fn().mockResolvedValue(undefined),
  setLanguage: vi.fn(),
};

function renderConfig() {
  return render(
    <PlatformProvider
      storageManager={makeStorage()}
      audioManager={mockAudio}
      gameRegistry={gameRegistry}
    >
      <ConfigOverrideProvider defaultFlags={defaultFlags}>
        <ParentalConfig />
      </ConfigOverrideProvider>
    </PlatformProvider>,
  );
}

function readStore() {
  const raw = window.localStorage.getItem(CONFIG_OVERRIDE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('ParentalConfig', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the games, features and rewards panels', async () => {
    renderConfig();
    expect(await screen.findByRole('heading', { name: 'Games' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rewards' })).toBeInTheDocument();
    expect(screen.getByText('Math Adventure')).toBeInTheDocument();
  });

  it('disabling a game persists an override and a Custom badge appears', async () => {
    renderConfig();
    const mathRow = (await screen.findByText('Math Adventure')).closest('li')!;
    const toggle = mathRow.querySelector('button[aria-pressed]') as HTMLButtonElement;
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(readStore()?.global?.games?.['math-adventure']?.enabled).toBe(false);
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(mathRow).toHaveTextContent('Custom');

    // "Use default" clears the override.
    fireEvent.click(screen.getAllByRole('button', { name: 'Use default' })[0]);
    await waitFor(() => {
      expect(readStore()?.global?.games?.['math-adventure']).toBeUndefined();
    });
  });

  it('writes a per-profile override when the scope is a child', async () => {
    renderConfig();
    const select = (await screen.findByLabelText('Applies to')) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'kid1' } });

    const dailyToggle = screen
      .getByText('Daily challenge')
      .closest('li')!
      .querySelector('button[aria-pressed]') as HTMLButtonElement;
    fireEvent.click(dailyToggle);

    await waitFor(() => {
      expect(readStore()?.perProfile?.kid1?.features?.['daily-challenge']?.enabled).toBe(false);
    });
    expect(readStore()?.global?.features).toBeUndefined();
  });

  it('rejects invalid raw JSON and blocks Apply', async () => {
    renderConfig();
    const editor = (await screen.findByLabelText(/Overrides for/)) as HTMLTextAreaElement;

    fireEvent.change(editor, { target: { value: '{ not json' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

    fireEvent.change(editor, {
      target: { value: '{ "games": { "math-adventure": { "enabled": false } } }' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled(),
    );
  });

  it('reset everything clears the store after typed confirmation', async () => {
    renderConfig();
    const mathRow = (await screen.findByText('Math Adventure')).closest('li')!;
    fireEvent.click(mathRow.querySelector('button[aria-pressed]') as HTMLButtonElement);
    await waitFor(() => expect(readStore()?.global?.games).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    const dialog = await screen.findByRole('dialog');
    const input = dialog.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'RESET' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset everything' }));

    await waitFor(() => {
      expect(readStore()?.global?.games ?? undefined).toBeUndefined();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderConfig();
    await screen.findByRole('heading', { name: 'Games' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
