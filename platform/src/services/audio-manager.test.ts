import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealAudioManager } from './audio-manager';
import type { AudioBackend } from './audio-backend';

function createMockBackend(): AudioBackend {
  return {
    load: vi.fn<AudioBackend['load']>().mockResolvedValue(undefined),
    play: vi.fn<AudioBackend['play']>().mockReturnValue('playback-1'),
    stop: vi.fn<AudioBackend['stop']>(),
    stopAll: vi.fn<AudioBackend['stopAll']>(),
    pause: vi.fn<AudioBackend['pause']>(),
    resume: vi.fn<AudioBackend['resume']>(),
    fade: vi.fn<AudioBackend['fade']>(),
    volume: vi.fn<AudioBackend['volume']>(),
    isPlaying: vi.fn<AudioBackend['isPlaying']>().mockReturnValue(false),
    onEnd: vi.fn<AudioBackend['onEnd']>(),
    unload: vi.fn<AudioBackend['unload']>(),
    isReady: vi.fn<AudioBackend['isReady']>().mockReturnValue(true),
    onReady: vi.fn<AudioBackend['onReady']>((cb: () => void) => cb()),
  };
}

describe('RealAudioManager', () => {
  let backend: ReturnType<typeof createMockBackend>;
  let audio: RealAudioManager;

  beforeEach(() => {
    backend = createMockBackend();
    audio = new RealAudioManager(backend);
  });

  describe('playMusic', () => {
    it('loads and plays music with loop:true by default', async () => {
      await audio.playMusic('music:main-theme');

      expect(backend.load).toHaveBeenCalledWith('main-theme', '/audio/music/main-theme.mp3');
      expect(backend.play).toHaveBeenCalledWith('main-theme', {
        loop: true,
        volume: 0.3,
      });
    });

    it('respects loop:false option', async () => {
      await audio.playMusic('intro', { loop: false });

      expect(backend.play).toHaveBeenCalledWith('intro', {
        loop: false,
        volume: 0.3,
      });
    });

    it('applies fadeIn when specified', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb-1');

      await audio.playMusic('main-theme', { fadeIn: 1000 });

      expect(backend.play).toHaveBeenCalledWith('main-theme', {
        loop: true,
        volume: 0,
      });
      expect(backend.fade).toHaveBeenCalledWith('music-pb-1', 0, 0.3, 1000);
    });

    it('stops current music before playing new track', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValueOnce('pb-old');

      await audio.playMusic('track-a');
      await audio.playMusic('track-b');

      expect(backend.stop).toHaveBeenCalledWith('pb-old');
    });

    it('plays music at volume 0 when muted', async () => {
      audio.mute('music');
      await audio.playMusic('main-theme');

      expect(backend.play).toHaveBeenCalledWith('main-theme', {
        loop: true,
        volume: 0,
      });
    });

    it('does not reload an already-loaded asset', async () => {
      await audio.playMusic('main-theme');
      await audio.playMusic('main-theme');

      expect(backend.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopMusic', () => {
    it('stops current music immediately when no fadeOut', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track-a');

      audio.stopMusic();

      expect(backend.stop).toHaveBeenCalledWith('music-pb');
    });

    it('does nothing when no music is playing', () => {
      audio.stopMusic();

      expect(backend.stop).not.toHaveBeenCalled();
      expect(backend.fade).not.toHaveBeenCalled();
    });

    it('fades out before stopping when fadeOut specified', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track-a');

      audio.stopMusic({ fadeOut: 500 });

      expect(backend.fade).toHaveBeenCalledWith('music-pb', 0.3, 0, 500);
    });

    it('clears currentPlaybackId immediately on stopMusic (race condition prevention)', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('pb-old')
        .mockReturnValueOnce('pb-new');

      await audio.playMusic('track-a');
      audio.stopMusic({ fadeOut: 1000 });

      // playMusic during fade-out should not try to stop the old (already-fading) playback
      await audio.playMusic('track-b');

      // backend.stop should NOT have been called with 'pb-old' by the second playMusic
      // (stopMusic already cleared the currentPlaybackId)
      const stopCalls = (backend.stop as ReturnType<typeof vi.fn>).mock.calls;
      const stopCallsFromPlayMusic = stopCalls.filter(
        (call: string[]) => call[0] === 'pb-old',
      );
      expect(stopCallsFromPlayMusic).toHaveLength(0);
    });
  });

  describe('playSFX', () => {
    it('loads and plays SFX with channel volume', async () => {
      await audio.playSFX('click');

      expect(backend.load).toHaveBeenCalledWith('click', '/audio/sfx/click.mp3');
      expect(backend.play).toHaveBeenCalledWith('click', { volume: 1.0 });
    });

    it('plays SFX at volume 0 when muted', async () => {
      audio.mute('sfx');
      await audio.playSFX('click');

      expect(backend.play).toHaveBeenCalledWith('click', { volume: 0 });
    });

    it('fire-and-forget — does not track playback ID', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('sfx-pb');
      await audio.playSFX('click');

      // Subsequent volume change should not try to update this playback
      audio.setVolume('sfx', 0.5);
      expect(backend.volume).not.toHaveBeenCalledWith('sfx-pb', expect.any(Number));
    });
  });

  describe('playVoice', () => {
    it('loads and plays voice from narration path for active language', async () => {
      await audio.playVoice('voice:welcome');

      expect(backend.load).toHaveBeenCalledWith(
        'narration/en/welcome',
        '/audio/narration/en/welcome.mp3',
      );
      expect(backend.play).toHaveBeenCalledWith('narration/en/welcome', {
        volume: 1.0,
      });
    });

    it('uses the configured language in the narration path', async () => {
      audio.setLanguage('fr');
      await audio.playVoice('voice:welcome');

      expect(backend.load).toHaveBeenCalledWith(
        'narration/fr/welcome',
        '/audio/narration/fr/welcome.mp3',
      );
    });

    it('falls back to /audio/voice/ when narration is missing', async () => {
      (backend.load as ReturnType<typeof vi.fn>).mockImplementation(
        async (id: string) => {
          if (id.startsWith('narration/')) {
            throw new Error('not found');
          }
        },
      );

      await audio.playVoice('voice:welcome');

      expect(backend.load).toHaveBeenCalledWith(
        'narration/en/welcome',
        '/audio/narration/en/welcome.mp3',
      );
      expect(backend.load).toHaveBeenCalledWith(
        'voice/welcome',
        '/audio/voice/welcome.mp3',
      );
      expect(backend.play).toHaveBeenCalledWith('voice/welcome', {
        volume: 1.0,
      });
    });

    it('registers onEnd callback when onComplete provided', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('voice-pb');
      const onComplete = vi.fn();

      await audio.playVoice('welcome', onComplete);

      expect(backend.onEnd).toHaveBeenCalledWith('voice-pb', expect.any(Function));
    });

    it('stops previous voice before playing new one', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('voice-pb-1')
        .mockReturnValueOnce('voice-pb-2');

      await audio.playVoice('greeting');
      await audio.playVoice('instruction');

      expect(backend.stop).toHaveBeenCalledWith('voice-pb-1');
    });

    it('plays voice at volume 0 when muted', async () => {
      audio.mute('voice');
      await audio.playVoice('welcome');

      expect(backend.play).toHaveBeenCalledWith('narration/en/welcome', {
        volume: 0,
      });
    });
  });

  describe('setVolume', () => {
    it('clamps volume to 0-1 range', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');

      audio.setVolume('music', 1.5);
      expect(backend.volume).toHaveBeenCalledWith('music-pb', 1);

      audio.setVolume('music', -0.5);
      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0);
    });

    it('updates active music playback volume', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');

      audio.setVolume('music', 0.7);

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0.7);
    });

    it('updates active voice playback volume', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('voice-pb');
      await audio.playVoice('clip');

      audio.setVolume('voice', 0.5);

      expect(backend.volume).toHaveBeenCalledWith('voice-pb', 0.5);
    });

    it('does not update backend for SFX (fire-and-forget)', async () => {
      await audio.playSFX('click');

      audio.setVolume('sfx', 0.5);

      expect(backend.volume).not.toHaveBeenCalled();
    });

    it('does not update backend when channel is muted', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');
      audio.mute('music');

      // Clear mock to isolate the setVolume call
      (backend.volume as ReturnType<typeof vi.fn>).mockClear();

      audio.setVolume('music', 0.8);

      expect(backend.volume).not.toHaveBeenCalled();
    });
  });

  describe('mute', () => {
    it('mutes a specific channel and sets active playback volume to 0', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');

      audio.mute('music');

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0);
    });

    it('mutes all channels when no argument', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('music-pb')
        .mockReturnValueOnce('voice-pb');
      await audio.playMusic('track');
      await audio.playVoice('clip');

      audio.mute();

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0);
      expect(backend.volume).toHaveBeenCalledWith('voice-pb', 0);
    });
  });

  describe('unmute', () => {
    it('unmutes a specific channel and restores active playback volume', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');
      audio.mute('music');

      // Clear mock to isolate unmute behavior
      (backend.volume as ReturnType<typeof vi.fn>).mockClear();

      audio.unmute('music');

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0.3);
    });

    it('unmutes all channels when no argument', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('music-pb')
        .mockReturnValueOnce('voice-pb');
      await audio.playMusic('track');
      await audio.playVoice('clip');
      audio.mute();

      (backend.volume as ReturnType<typeof vi.fn>).mockClear();

      audio.unmute();

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0.3);
      expect(backend.volume).toHaveBeenCalledWith('voice-pb', 1.0);
    });
  });

  describe('preload', () => {
    it('loads each asset with correct category path', async () => {
      await audio.preload(['sfx:click', 'music:main-theme', 'voice:welcome']);

      expect(backend.load).toHaveBeenCalledWith('click', '/audio/sfx/click.mp3');
      expect(backend.load).toHaveBeenCalledWith('main-theme', '/audio/music/main-theme.mp3');
      expect(backend.load).toHaveBeenCalledWith(
        'narration/en/welcome',
        '/audio/narration/en/welcome.mp3',
      );
    });

    it('defaults to sfx category when no prefix', async () => {
      await audio.preload(['click', 'correct']);

      expect(backend.load).toHaveBeenCalledWith('click', '/audio/sfx/click.mp3');
      expect(backend.load).toHaveBeenCalledWith('correct', '/audio/sfx/correct.mp3');
    });

    it('resolves when all assets are loaded', async () => {
      await expect(audio.preload(['sfx:click', 'music:theme'])).resolves.toBeUndefined();
      expect(backend.load).toHaveBeenCalledTimes(2);
    });

    it('does not reload already-loaded assets', async () => {
      await audio.preload(['sfx:click']);
      await audio.preload(['sfx:click']);

      expect(backend.load).toHaveBeenCalledTimes(1);
    });
  });
});
