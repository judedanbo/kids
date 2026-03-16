import {
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
  StorageManager,
  AudioManager,
} from '@kids-games-zone/shared';

// --- State types ---

export interface PlatformSettings {
  theme: 'light' | 'dark';
  language: string;
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

const initialState: GlobalState = {
  currentProfile: null,
  profiles: [],
  gameRegistry: [],
  session: {
    activeGameId: null,
    startedAt: null,
    elapsedTime: 0,
  },
  settings: {
    theme: 'light',
    language: 'en',
  },
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
