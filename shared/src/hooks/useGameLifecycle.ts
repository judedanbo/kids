import { useCallback, useRef, useState } from 'react';
import type { GameConfig, GamePlugin, GameResult } from '../types';

type GameState = 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED' | 'COMPLETED';

interface GameLifecycle {
  state: GameState;
  load: () => Promise<void>;
  start: (config: GameConfig) => void;
  pause: () => void;
  resume: () => void;
  end: () => GameResult | undefined;
  reset: () => void;
}

export function useGameLifecycle(plugin: GamePlugin): GameLifecycle {
  const [state, setState] = useState<GameState>('IDLE');
  const stateRef = useRef<GameState>('IDLE');

  const setGameState = useCallback((newState: GameState) => {
    stateRef.current = newState;
    setState(newState);
  }, []);

  const load = useCallback(async () => {
    if (stateRef.current !== 'IDLE') return;
    await plugin.onLoad();
    setGameState('LOADED');
  }, [plugin, setGameState]);

  const start = useCallback((config: GameConfig) => {
    if (stateRef.current !== 'LOADED') return;
    plugin.onStart(config);
    setGameState('PLAYING');
  }, [plugin, setGameState]);

  const pause = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    plugin.onPause();
    setGameState('PAUSED');
  }, [plugin, setGameState]);

  const resume = useCallback(() => {
    if (stateRef.current !== 'PAUSED') return;
    plugin.onResume();
    setGameState('PLAYING');
  }, [plugin, setGameState]);

  const end = useCallback(() => {
    if (stateRef.current !== 'PLAYING' && stateRef.current !== 'PAUSED') return undefined;
    const result = plugin.onEnd();
    setGameState('COMPLETED');
    return result;
  }, [plugin, setGameState]);

  const reset = useCallback(() => {
    if (stateRef.current !== 'COMPLETED') return;
    plugin.onUnload();
    setGameState('IDLE');
  }, [plugin, setGameState]);

  return { state, load, start, pause, resume, end, reset };
}
