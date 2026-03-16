import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StubAudioManager } from './audio-stub';

describe('StubAudioManager', () => {
  let audio: StubAudioManager;

  beforeEach(() => {
    audio = new StubAudioManager();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('logs playMusic calls', () => {
    audio.playMusic('bgm-01', { loop: true });
    expect(console.log).toHaveBeenCalledWith('[AudioManager] playMusic:', 'bgm-01', { loop: true });
  });

  it('logs stopMusic calls', () => {
    audio.stopMusic({ fadeOut: 500 });
    expect(console.log).toHaveBeenCalledWith('[AudioManager] stopMusic:', { fadeOut: 500 });
  });

  it('logs playSFX calls', () => {
    audio.playSFX('click');
    expect(console.log).toHaveBeenCalledWith('[AudioManager] playSFX:', 'click');
  });

  it('calls onComplete callback for playVoice', () => {
    const onComplete = vi.fn();
    audio.playVoice('welcome', onComplete);
    expect(onComplete).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('[AudioManager] playVoice:', 'welcome');
  });

  it('logs setVolume calls', () => {
    audio.setVolume('music', 0.5);
    expect(console.log).toHaveBeenCalledWith('[AudioManager] setVolume:', 'music', 0.5);
  });

  it('logs mute/unmute calls', () => {
    audio.mute('sfx');
    expect(console.log).toHaveBeenCalledWith('[AudioManager] mute:', 'sfx');

    audio.unmute();
    expect(console.log).toHaveBeenCalledWith('[AudioManager] unmute:', 'all');
  });

  it('resolves preload promise', async () => {
    await expect(audio.preload(['asset1', 'asset2'])).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith('[AudioManager] preload:', ['asset1', 'asset2']);
  });
});
