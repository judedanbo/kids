import type { AudioManager } from '@kids-games-zone/shared';
import type { AudioBackend } from './audio-backend';
import type { WebAudioMusicGenerator } from './audio-music-generator';

type AudioCategory = 'music' | 'sfx' | 'voice';

interface ChannelState {
  volume: number;
  muted: boolean;
  currentPlaybackId: string | null;
}

export class RealAudioManager implements AudioManager {
  private backend: AudioBackend;
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private musicGenerator: WebAudioMusicGenerator | null;
  private usingGenerator = false;
  private channels: Record<AudioCategory, ChannelState> = {
    music: { volume: 0.3, muted: false, currentPlaybackId: null },
    sfx: { volume: 1.0, muted: false, currentPlaybackId: null },
    voice: { volume: 1.0, muted: false, currentPlaybackId: null },
  };

  constructor(backend: AudioBackend, musicGenerator?: WebAudioMusicGenerator) {
    this.backend = backend;
    this.musicGenerator = musicGenerator ?? null;
  }

  async playMusic(
    trackId: string,
    options?: { loop?: boolean; fadeIn?: number },
  ): Promise<void> {
    // Stop any current music (file-based or generated)
    const current = this.channels.music.currentPlaybackId;
    if (current !== null) {
      this.backend.stop(current);
      this.channels.music.currentPlaybackId = null;
    }
    if (this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.stop();
      this.usingGenerator = false;
    }

    const { key, category } = this.parseAssetId(trackId);
    await this.ensureLoaded(key, category);

    if (!this.loadedAssets.has(key)) {
      // File failed — fall back to generator if available
      if (this.musicGenerator) {
        const channel = this.channels.music;
        this.musicGenerator.start({
          volume: channel.muted ? 0 : channel.volume,
          fadeIn: options?.fadeIn,
        });
        this.usingGenerator = true;
      }
      return;
    }

    const loop = options?.loop ?? true;
    const channel = this.channels.music;
    const hasFadeIn = options?.fadeIn !== undefined && options.fadeIn > 0;
    const playVolume = hasFadeIn ? 0 : channel.muted ? 0 : channel.volume;

    const playbackId = this.backend.play(key, {
      loop,
      volume: playVolume,
    });

    channel.currentPlaybackId = playbackId;

    if (hasFadeIn && !channel.muted) {
      this.backend.fade(playbackId, 0, channel.volume, options!.fadeIn!);
    }
  }

  stopMusic(options?: { fadeOut?: number }): void {
    if (this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.stop(
        options?.fadeOut ? { fadeOut: options.fadeOut } : undefined,
      );
      this.usingGenerator = false;
      return;
    }

    const channel = this.channels.music;
    const playbackId = channel.currentPlaybackId;

    if (playbackId === null) {
      return;
    }

    channel.currentPlaybackId = null;

    if (options?.fadeOut !== undefined && options.fadeOut > 0) {
      this.backend.fade(playbackId, channel.volume, 0, options.fadeOut);
      setTimeout(() => {
        this.backend.stop(playbackId);
      }, options.fadeOut);
    } else {
      this.backend.stop(playbackId);
    }
  }

  async playSFX(sfxId: string): Promise<void> {
    const { key, category } = this.parseAssetId(sfxId);
    await this.ensureLoaded(key, category);

    if (!this.loadedAssets.has(key)) {
      return;
    }

    const channel = this.channels.sfx;
    this.backend.play(key, {
      volume: channel.muted ? 0 : channel.volume,
    });
    // Fire-and-forget — no playback ID tracking
  }

  async playVoice(voiceId: string, onComplete?: () => void): Promise<void> {
    const current = this.channels.voice.currentPlaybackId;
    if (current !== null) {
      this.backend.stop(current);
      this.channels.voice.currentPlaybackId = null;
    }

    const { key, category } = this.parseAssetId(voiceId);
    await this.ensureLoaded(key, category);

    if (!this.loadedAssets.has(key)) {
      // No audio file — try speech synthesis for word pronunciation
      this.speakFallback(key, onComplete);
      return;
    }

    const channel = this.channels.voice;
    const playbackId = this.backend.play(key, {
      volume: channel.muted ? 0 : channel.volume,
    });

    channel.currentPlaybackId = playbackId;

    if (onComplete) {
      this.backend.onEnd(playbackId, () => {
        if (channel.currentPlaybackId === playbackId) {
          channel.currentPlaybackId = null;
        }
        onComplete();
      });
    }
  }

  private speakFallback(key: string, onComplete?: () => void): void {
    if (
      this.channels.voice.muted ||
      typeof speechSynthesis === 'undefined'
    ) {
      onComplete?.();
      return;
    }

    // Extract the speakable text from the asset key.
    // Keys follow patterns like "word-cat", "def-cat", "encouragement-correct".
    const text = this.extractSpeechText(key);
    if (!text) {
      onComplete?.();
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.volume = this.channels.voice.volume;
    if (onComplete) {
      utterance.onend = () => onComplete();
      utterance.onerror = () => onComplete();
    }
    speechSynthesis.speak(utterance);
  }

  private extractSpeechText(key: string): string | null {
    // "word-cat" -> "cat"
    if (key.startsWith('word-')) {
      return key.slice(5);
    }
    // "def-cat" -> null (definitions need full text, not available here)
    // "sentence-cat" -> null
    // "encouragement-correct" -> "Well done!"
    if (key === 'encouragement-correct') {
      return 'Well done!';
    }
    if (key === 'encouragement-tryagain') {
      return 'Try again!';
    }
    return null;
  }

  setVolume(category: AudioCategory, level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    const channel = this.channels[category];
    channel.volume = clamped;

    if (category === 'music' && this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.setVolume(channel.muted ? 0 : clamped);
      return;
    }

    // SFX is fire-and-forget — volume only affects future calls
    if (category === 'sfx') {
      return;
    }

    if (channel.currentPlaybackId !== null && !channel.muted) {
      this.backend.volume(channel.currentPlaybackId, clamped);
    }
  }

  mute(category?: AudioCategory): void {
    if (category) {
      this.muteChannel(category);
    } else {
      this.muteChannel('music');
      this.muteChannel('sfx');
      this.muteChannel('voice');
    }
  }

  unmute(category?: AudioCategory): void {
    if (category) {
      this.unmuteChannel(category);
    } else {
      this.unmuteChannel('music');
      this.unmuteChannel('sfx');
      this.unmuteChannel('voice');
    }
  }

  async preload(assetIds: string[]): Promise<void> {
    const loadPromises = assetIds.map((assetId) => {
      const { key, category } = this.parseAssetId(assetId);
      return this.ensureLoaded(key, category);
    });
    await Promise.all(loadPromises);
  }

  // --- Private helpers ---

  private muteChannel(category: AudioCategory): void {
    const channel = this.channels[category];
    channel.muted = true;

    if (category === 'music' && this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.setVolume(0);
      return;
    }

    // SFX is fire-and-forget — mute only affects future calls
    if (category === 'sfx') {
      return;
    }

    if (channel.currentPlaybackId !== null) {
      this.backend.volume(channel.currentPlaybackId, 0);
    }
  }

  private unmuteChannel(category: AudioCategory): void {
    const channel = this.channels[category];
    channel.muted = false;

    if (category === 'music' && this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.setVolume(channel.volume);
      return;
    }

    // SFX is fire-and-forget — unmute only affects future calls
    if (category === 'sfx') {
      return;
    }

    if (channel.currentPlaybackId !== null) {
      this.backend.volume(channel.currentPlaybackId, channel.volume);
    }
  }

  private async ensureLoaded(
    id: string,
    category: AudioCategory,
  ): Promise<void> {
    if (this.loadedAssets.has(id)) {
      return;
    }
    if (this.failedAssets.has(id)) {
      return;
    }
    const path = `/audio/${category}/${id}.mp3`;
    try {
      await this.backend.load(id, path);
      this.loadedAssets.add(id);
    } catch (error) {
      this.failedAssets.add(id);
      console.warn(
        `[AudioManager] Failed to load "${id}" from ${path}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  private parseAssetId(assetId: string): {
    key: string;
    category: AudioCategory;
  } {
    const colonIndex = assetId.indexOf(':');
    if (colonIndex === -1) {
      return { key: assetId, category: 'sfx' };
    }
    const prefix = assetId.slice(0, colonIndex) as AudioCategory;
    const key = assetId.slice(colonIndex + 1);
    return { key, category: prefix };
  }
}
