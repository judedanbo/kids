import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  UserProfile,
  GameManifest,
  GameProgress,
  Reward,
  TimeLimitConfig,
  StorageManager,
  AudioManager,
} from '@kids-games-zone/shared';

// --- State types ---

export interface PlatformSettings {
  theme: 'light' | 'dark';
  language: string;
  timeLimits: TimeLimitConfig;
  highContrast: boolean;
  /** Master toggle for all background music. Default: true. */
  backgroundMusicEnabled: boolean;
  /**
   * When true, games play their own background track during gameplay.
   * When false, music stops during gameplay so the child can focus. Default: false.
   */
  musicDuringGameplay: boolean;
}

export interface GlobalState {
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

// --- Actions ---

export type PlatformAction =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'ADD_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROGRESS'; payload: { profileId: string; gameId: string; progress: GameProgress } }
  | { type: 'REGISTER_GAME'; payload: GameManifest }
  | { type: 'START_SESSION'; payload: { gameId: string } }
  | { type: 'END_SESSION' }
  | { type: 'UNLOCK_REWARD'; payload: { profileId: string; reward: Reward } }
  | { type: 'UPDATE_STATS'; payload: { profileId: string; stats: Partial<UserProfile['stats']> } }
  | { type: 'LOAD_PROFILES'; payload: UserProfile[] }
  | { type: 'SET_SETTINGS'; payload: Partial<PlatformSettings> };

// --- Reducer ---

function platformReducer(state: GlobalState, action: PlatformAction): GlobalState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, currentProfile: action.payload };

    case 'ADD_PROFILE':
      return {
        ...state,
        profiles: [...state.profiles, action.payload],
      };

    case 'UPDATE_PROGRESS': {
      const { profileId, gameId, progress } = action.payload;
      if (state.currentProfile && state.currentProfile.id === profileId) {
        return {
          ...state,
          currentProfile: {
            ...state.currentProfile,
            progress: { ...state.currentProfile.progress, [gameId]: progress },
          },
        };
      }
      return state;
    }

    case 'REGISTER_GAME':
      return {
        ...state,
        gameRegistry: [...state.gameRegistry, action.payload],
      };

    case 'START_SESSION':
      return {
        ...state,
        session: {
          activeGameId: action.payload.gameId,
          startedAt: new Date().toISOString(),
          elapsedTime: 0,
        },
      };

    case 'END_SESSION':
      return {
        ...state,
        session: {
          activeGameId: null,
          startedAt: null,
          elapsedTime: 0,
        },
      };

    case 'UPDATE_STATS': {
      const { profileId, stats } = action.payload;
      if (state.currentProfile && state.currentProfile.id === profileId) {
        return {
          ...state,
          currentProfile: {
            ...state.currentProfile,
            stats: { ...state.currentProfile.stats, ...stats },
          },
        };
      }
      return state;
    }

    case 'UNLOCK_REWARD': {
      const { profileId, reward } = action.payload;
      if (state.currentProfile && state.currentProfile.id === profileId) {
        return {
          ...state,
          currentProfile: {
            ...state.currentProfile,
            rewards: [...state.currentProfile.rewards, reward],
          },
        };
      }
      return state;
    }

    case 'LOAD_PROFILES':
      return { ...state, profiles: action.payload };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

// --- Context ---

interface PlatformContextValue {
  state: GlobalState;
  dispatch: React.Dispatch<PlatformAction>;
  storageManager: StorageManager;
  audioManager: AudioManager;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

// --- Provider ---

interface PlatformProviderProps {
  children: ReactNode;
  storageManager: StorageManager;
  audioManager: AudioManager;
  gameRegistry: GameManifest[];
}

const SETTINGS_STORAGE_KEY = 'kids-games-zone:platform-settings';

const defaultSettings: PlatformSettings = {
  theme: 'light',
  language: 'en',
  timeLimits: {
    enabled: false,
    dailyLimitMinutes: 60,
    sessionLimitMinutes: 30,
    reminderBeforeEndMinutes: 5,
    cooldownMinutes: 15,
  },
  highContrast: false,
  backgroundMusicEnabled: true,
  musicDuringGameplay: false,
};

function loadPersistedSettings(): PlatformSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultSettings;
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<PlatformSettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

const initialState: GlobalState = {
  currentProfile: null,
  profiles: [],
  gameRegistry: [],
  session: {
    activeGameId: null,
    startedAt: null,
    elapsedTime: 0,
  },
  settings: loadPersistedSettings(),
};

export function PlatformProvider({
  children,
  storageManager,
  audioManager,
  gameRegistry,
}: PlatformProviderProps) {
  const [state, dispatch] = useReducer(platformReducer, {
    ...initialState,
    gameRegistry,
  });

  // Hydrate profiles from IndexedDB on mount
  useEffect(() => {
    async function hydrate() {
      try {
        const profiles = await storageManager.listProfiles();
        dispatch({ type: 'LOAD_PROFILES', payload: profiles });

        // Set last active profile if available
        if (profiles.length > 0) {
          const sorted = [...profiles].sort(
            (a, b) =>
              new Date(b.stats.lastPlayedAt || b.createdAt).getTime() -
              new Date(a.stats.lastPlayedAt || a.createdAt).getTime(),
          );
          dispatch({ type: 'SET_PROFILE', payload: sorted[0] });
        }
      } catch (err) {
        console.warn('[PlatformProvider] Failed to hydrate from IndexedDB:', err);
      }
    }
    hydrate();
  }, [storageManager]);

  // Persist current profile changes to IndexedDB
  useEffect(() => {
    if (state.currentProfile) {
      storageManager.saveProfile(state.currentProfile).catch((err) => {
        console.warn('[PlatformProvider] Failed to persist profile:', err);
      });
    }
  }, [state.currentProfile, storageManager]);

  // Follow the active profile's language into the audio manager so voice
  // assets resolve under /audio/narration/{lang}/ for the right locale.
  useEffect(() => {
    const language = state.currentProfile?.preferences.language ?? 'en';
    audioManager.setLanguage(language);
  }, [state.currentProfile?.preferences.language, audioManager]);

  // Persist platform settings to localStorage so music/theme/etc. choices
  // survive a reload.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(state.settings),
      );
    } catch {
      // Full disk, private-mode Safari, etc. — acceptable to drop.
    }
  }, [state.settings]);

  // When the master music toggle flips off, stop any currently-playing music
  // immediately regardless of which screen the user is on.
  useEffect(() => {
    if (!state.settings.backgroundMusicEnabled) {
      audioManager.stopMusic({ fadeOut: 300 });
    }
  }, [state.settings.backgroundMusicEnabled, audioManager]);

  return (
    <PlatformContext.Provider
      value={{ state, dispatch, storageManager, audioManager }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

// --- Hook ---

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return ctx;
}
