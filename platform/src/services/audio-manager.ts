import type { AudioManager } from '@kids-games-zone/shared';
import type { AudioBackend } from './audio-backend';

type AudioCategory = 'music' | 'sfx' | 'voice';

interface ChannelState {
  volume: number;
  muted: boolean;
  currentPlaybackId: string | null;
}

export class RealAudioManager implements AudioManager {
  private backend: AudioBackend;
  private loadedAssets = new Set<string>();
  private channels: Record<AudioCategory, ChannelState> = {
    music: { volume: 0.3, muted: false, currentPlaybackId: null },
    sfx: { volume: 1.0, muted: false, currentPlaybackId: null },
    voice: { volume: 1.0, muted: false, currentPlaybackId: null },
  };

  constructor(backend: AudioBackend) {
    this.backend = backend;
  }

  async playMusic(
    trackId: string,
    options?: { loop?: boolean; fadeIn?: number },
  ): Promise<void> {
    const current = this.channels.music.currentPlaybackId;
    if (current !== null) {
      this.backend.stop(current);
      this.channels.music.currentPlaybackId = null;
    }

    await this.ensureLoaded(trackId, 'music');

    const loop = options?.loop ?? true;
    const channel = this.channels.music;
    const hasFadeIn = options?.fadeIn !== undefined && options.fadeIn > 0;
    const playVolume = hasFadeIn ? 0 : channel.muted ? 0 : channel.volume;

    const playbackId = this.backend.play(trackId, {
      loop,
      volume: playVolume,
    });

    channel.currentPlaybackId = playbackId;

    if (hasFadeIn && !channel.muted) {
      this.backend.fade(playbackId, 0, channel.volume, options!.fadeIn!);
    }
  }

  stopMusic(options?: { fadeOut?: number }): void {
    const channel = this.channels.music;
    const playbackId = channel.currentPlaybackId;

    if (playbackId === null) {
      return;
    }

    // Clear immediately to prevent race conditions
    channel.currentPlaybackId = null;

    if (options?.fadeOut !== undefined && options.fadeOut > 0) {
      this.backend.fade(playbackId, channel.volume, 0, options.fadeOut);
      // Stop after fade completes
      setTimeout(() => {
        this.backend.stop(playbackId);
      }, options.fadeOut);
    } else {
      this.backend.stop(playbackId);
    }
  }

  async playSFX(sfxId: string): Promise<void> {
    await this.ensureLoaded(sfxId, 'sfx');

    const channel = this.channels.sfx;
    this.backend.play(sfxId, {
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

    await this.ensureLoaded(voiceId, 'voice');

    const channel = this.channels.voice;
    const playbackId = this.backend.play(voiceId, {
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

  setVolume(category: AudioCategory, level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    const channel = this.channels[category];
    channel.volume = clamped;

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
    const path = `/audio/${category}/${id}.mp3`;
    await this.backend.load(id, path);
    this.loadedAssets.add(id);
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
