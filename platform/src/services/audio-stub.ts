import type { AudioManager } from '@kids-games-zone/shared';

export class StubAudioManager implements AudioManager {
  playMusic(trackId: string, options?: { loop?: boolean; fadeIn?: number }): void {
    console.log('[AudioManager] playMusic:', trackId, options);
  }

  stopMusic(options?: { fadeOut?: number }): void {
    console.log('[AudioManager] stopMusic:', options);
  }

  pauseMusic(): void {
    console.log('[AudioManager] pauseMusic');
  }

  resumeMusic(): void {
    console.log('[AudioManager] resumeMusic');
  }

  playSFX(sfxId: string): void {
    console.log('[AudioManager] playSFX:', sfxId);
  }

  playVoice(voiceId: string, onComplete?: () => void): void {
    console.log('[AudioManager] playVoice:', voiceId);
    onComplete?.();
  }

  setVolume(category: 'music' | 'sfx' | 'voice', level: number): void {
    console.log('[AudioManager] setVolume:', category, level);
  }

  mute(category?: 'music' | 'sfx' | 'voice'): void {
    console.log('[AudioManager] mute:', category ?? 'all');
  }

  unmute(category?: 'music' | 'sfx' | 'voice'): void {
    console.log('[AudioManager] unmute:', category ?? 'all');
  }

  async preload(assetIds: string[]): Promise<void> {
    console.log('[AudioManager] preload:', assetIds);
  }

  setLanguage(language: string): void {
    console.log('[AudioManager] setLanguage:', language);
  }
}
