import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealAudioManager } from '../audio-manager';
import type { AudioBackend } from '../audio-backend';
import type { WebAudioMusicGenerator } from '../audio-music-generator';

function createMockGenerator(): WebAudioMusicGenerator {
  let active = false;
  return {
    start: vi.fn(() => { active = true; }),
    stop: vi.fn(() => { active = false; }),
    setVolume: vi.fn(),
    isActive: vi.fn(() => active),
  } as unknown as WebAudioMusicGenerator;
}

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

describe('RealAudioManager — speech synthesis fallback', () => {
  let backend: AudioBackend;
  let manager: RealAudioManager;
  let mockSpeak: ReturnType<typeof vi.fn>;
  let mockCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    backend = createMockBackend(new Set(['word-cat', 'encouragement-correct']));
    manager = new RealAudioManager(backend);
    mockSpeak = vi.fn();
    mockCancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak: mockSpeak, cancel: mockCancel });
    vi.stubGlobal('SpeechSynthesisUtterance', vi.fn().mockImplementation((text: string) => ({
      text,
      rate: 1,
      volume: 1,
      onend: null,
      onerror: null,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('speaks the word when voice file is missing', async () => {
    await manager.playVoice('voice:word-cat');
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('cat');
  });

  it('speaks encouragement when voice file is missing', async () => {
    await manager.playVoice('voice:encouragement-correct');
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Well done!');
  });

  it('does not speak for unrecognised key patterns', async () => {
    backend = createMockBackend(new Set(['unknown-key']));
    manager = new RealAudioManager(backend);
    const onComplete = vi.fn();
    await manager.playVoice('voice:unknown-key', onComplete);
    expect(mockSpeak).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onComplete when utterance ends', async () => {
    const onComplete = vi.fn();
    mockSpeak.mockImplementation((u: { onend: (() => void) | null }) => {
      u.onend?.();
    });
    await manager.playVoice('voice:word-cat', onComplete);
    expect(onComplete).toHaveBeenCalled();
  });

  it('does not speak when voice channel is muted', async () => {
    manager.mute('voice');
    await manager.playVoice('voice:word-cat');
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

describe('RealAudioManager — generator fallback', () => {
  let backend: AudioBackend;
  let generator: WebAudioMusicGenerator;
  let manager: RealAudioManager;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    backend = createMockBackend(new Set(['game-bgm']));
    generator = createMockGenerator();
    manager = new RealAudioManager(backend, generator);
  });

  it('falls back to generator when music asset fails to load', async () => {
    await manager.playMusic('music:game-bgm', { loop: true, fadeIn: 1000 });
    expect(generator.start).toHaveBeenCalledWith({
      volume: 0.3,
      fadeIn: 1000,
    });
  });

  it('stops generator when stopMusic is called', async () => {
    await manager.playMusic('music:game-bgm');
    manager.stopMusic();
    expect(generator.stop).toHaveBeenCalled();
  });

  it('stops generator with fadeOut when specified', async () => {
    await manager.playMusic('music:game-bgm');
    manager.stopMusic({ fadeOut: 500 });
    expect(generator.stop).toHaveBeenCalledWith({ fadeOut: 500 });
  });

  it('forwards setVolume to generator when generator is active', async () => {
    await manager.playMusic('music:game-bgm');
    manager.setVolume('music', 0.7);
    expect(generator.setVolume).toHaveBeenCalledWith(0.7);
  });

  it('forwards mute to generator as setVolume(0)', async () => {
    await manager.playMusic('music:game-bgm');
    manager.mute('music');
    expect(generator.setVolume).toHaveBeenCalledWith(0);
  });

  it('forwards unmute to generator with restored volume', async () => {
    await manager.playMusic('music:game-bgm');
    manager.mute('music');
    manager.unmute('music');
    expect(generator.setVolume).toHaveBeenLastCalledWith(0.3);
  });

  it('prefers file-based music when asset loads successfully', async () => {
    const goodBackend = createMockBackend();
    const mgr = new RealAudioManager(goodBackend, generator);
    await mgr.playMusic('music:game-bgm');
    expect(generator.start).not.toHaveBeenCalled();
    expect(goodBackend.play).toHaveBeenCalled();
  });
});
