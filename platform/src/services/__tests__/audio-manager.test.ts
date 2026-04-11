import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealAudioManager } from '../audio-manager';
import type { AudioBackend } from '../audio-backend';

function createMockBackend(failIds: Set<string> = new Set()): AudioBackend {
  let playbackCounter = 0;
  const loaded = new Set<string>();

  return {
    load: vi.fn(async (id: string, _src: string) => {
      if (failIds.has(id)) {
        throw new Error(
          `Failed to load audio "${id}": Decoding audio data failed.`,
        );
      }
      loaded.add(id);
    }),
    play: vi.fn((id: string, _options?: { loop?: boolean; volume?: number }) => {
      if (!loaded.has(id)) {
        throw new Error(`Audio "${id}" not loaded.`);
      }
      playbackCounter++;
      return `${id}:${playbackCounter}`;
    }),
    stop: vi.fn(),
    stopAll: vi.fn(),
    fade: vi.fn(),
    volume: vi.fn(),
    isPlaying: vi.fn(() => false),
    onEnd: vi.fn(),
    unload: vi.fn(),
  };
}

describe('RealAudioManager — graceful error handling', () => {
  let backend: AudioBackend;
  let manager: RealAudioManager;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('playMusic with missing asset', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['game-bgm']));
      manager = new RealAudioManager(backend);
    });

    it('does not throw when music file fails to load', async () => {
      await expect(
        manager.playMusic('music:game-bgm', { loop: true }),
      ).resolves.toBeUndefined();
    });

    it('logs a warning when audio fails to load', async () => {
      await manager.playMusic('music:game-bgm');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('game-bgm'),
        expect.anything(),
      );
    });

    it('does not call backend.play for failed assets', async () => {
      await manager.playMusic('music:game-bgm');
      expect(backend.play).not.toHaveBeenCalled();
    });

    it('skips load attempt on second call for same failed asset', async () => {
      await manager.playMusic('music:game-bgm');
      await manager.playMusic('music:game-bgm');
      expect(backend.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('playSFX with missing asset', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['missing-sfx']));
      manager = new RealAudioManager(backend);
    });

    it('does not throw when SFX file fails to load', async () => {
      await expect(manager.playSFX('missing-sfx')).resolves.toBeUndefined();
    });

    it('does not call backend.play for failed SFX', async () => {
      await manager.playSFX('missing-sfx');
      expect(backend.play).not.toHaveBeenCalled();
    });
  });

  describe('playVoice with missing asset', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['missing-voice']));
      manager = new RealAudioManager(backend);
    });

    it('does not throw when voice file fails to load', async () => {
      await expect(
        manager.playVoice('voice:missing-voice'),
      ).resolves.toBeUndefined();
    });

    it('calls onComplete even when voice asset fails', async () => {
      const onComplete = vi.fn();
      await manager.playVoice('voice:missing-voice', onComplete);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('preload with mixed assets', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['bad-sound']));
      manager = new RealAudioManager(backend);
    });

    it('loads valid assets and warns for invalid ones', async () => {
      await manager.preload(['sfx:click', 'sfx:bad-sound', 'sfx:correct']);
      expect(backend.load).toHaveBeenCalledTimes(3);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('playMusic with valid asset still works', () => {
    beforeEach(() => {
      backend = createMockBackend();
      manager = new RealAudioManager(backend);
    });

    it('plays music normally when asset loads successfully', async () => {
      await manager.playMusic('music:game-bgm', { loop: true });
      expect(backend.play).toHaveBeenCalledWith('game-bgm', {
        loop: true,
        volume: 0.3,
      });
    });
  });
});
