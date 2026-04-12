import type { AudioManager } from '@kids-games-zone/shared';
import type { AudioBackend } from './audio-backend';
import type { WebAudioMusicGenerator } from './audio-music-generator';

type AudioCategory = 'music' | 'sfx' | 'voice';

interface ChannelState {
  volume: number;
  muted: boolean;
  currentPlaybackId: string | null;
}

export type VoiceVariants = Record<string, Record<string, string[]>>;

export class RealAudioManager implements AudioManager {
  private backend: AudioBackend;
  private loadedAssets = new Set<string>();
  private failedAssets = new Set<string>();
  private musicGenerator: WebAudioMusicGenerator | null;
  private usingGenerator = false;
  private language = 'en';
  private voiceVariants: VoiceVariants = {};
  private lastVariantByBase = new Map<string, string>();
  private pendingMusic: {
    trackId: string;
    options?: { loop?: boolean; fadeIn?: number };
  } | null = null;
  private channels: Record<AudioCategory, ChannelState> = {
    music: { volume: 0.3, muted: false, currentPlaybackId: null },
    sfx: { volume: 1.0, muted: false, currentPlaybackId: null },
    voice: { volume: 1.0, muted: false, currentPlaybackId: null },
  };

  constructor(backend: AudioBackend, musicGenerator?: WebAudioMusicGenerator) {
    this.backend = backend;
    this.musicGenerator = musicGenerator ?? null;
  }

  setLanguage(language: string): void {
    this.language = language;
  }

  setVoiceVariants(variants: VoiceVariants): void {
    this.voiceVariants = variants;
  }

  private pickVariant(baseKey: string): string {
    const langTable = this.voiceVariants[this.language];
    const variants = langTable?.[baseKey];
    if (!variants || variants.length === 0) {
      return baseKey;
    }
    if (variants.length === 1) {
      return variants[0];
    }
    const lastPick = this.lastVariantByBase.get(baseKey);
    const pool = lastPick
      ? variants.filter((v) => v !== lastPick)
      : variants;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.lastVariantByBase.set(baseKey, pick);
    return pick;
  }

  async playMusic(
    trackId: string,
    options?: { loop?: boolean; fadeIn?: number },
  ): Promise<void> {
    // Browsers block audio until the user interacts with the page. Queue the
    // request and retry once the backend reports it's ready.
    if (!this.backend.isReady()) {
      this.pendingMusic = { trackId, options };
      this.backend.onReady(() => {
        if (!this.pendingMusic) return;
        const queued = this.pendingMusic;
        this.pendingMusic = null;
        void this.playMusic(queued.trackId, queued.options);
      });
      return;
    }

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

  pauseMusic(): void {
    if (this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.pause();
      return;
    }
    const playbackId = this.channels.music.currentPlaybackId;
    if (playbackId !== null) {
      this.backend.pause(playbackId);
    }
  }

  resumeMusic(): void {
    if (this.usingGenerator && this.musicGenerator) {
      this.musicGenerator.resume();
      return;
    }
    const playbackId = this.channels.music.currentPlaybackId;
    if (playbackId !== null) {
      this.backend.resume(playbackId);
    }
  }

  stopMusic(options?: { fadeOut?: number }): void {
    // Any queued "play once ready" becomes stale the moment someone stops.
    this.pendingMusic = null;

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

    const { key: baseKey } = this.parseAssetId(voiceId);
    const key = this.pickVariant(baseKey);
    const playbackKey = await this.ensureVoiceLoaded(key);

    if (playbackKey === null) {
      // No audio file — try speech synthesis for word pronunciation
      this.speakFallback(key, onComplete);
      return;
    }

    const channel = this.channels.voice;
    const playbackId = this.backend.play(playbackKey, {
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
    const loadPromises: Promise<unknown>[] = [];
    for (const assetId of assetIds) {
      const { key, category } = this.parseAssetId(assetId);
      if (category === 'voice') {
        const variants = this.voiceVariants[this.language]?.[key];
        if (variants && variants.length > 0) {
          for (const variantKey of variants) {
            loadPromises.push(this.ensureVoiceLoaded(variantKey));
          }
        } else {
          loadPromises.push(this.ensureVoiceLoaded(key));
        }
      } else {
        loadPromises.push(this.ensureLoaded(key, category));
      }
    }
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
    const path = `/audio/${category}/${id}.mp3`;
    await this.ensureLoadedAt(id, path);
  }

  private async ensureLoadedAt(
    cacheKey: string,
    path: string,
  ): Promise<boolean> {
    if (this.loadedAssets.has(cacheKey)) {
      return true;
    }
    if (this.failedAssets.has(cacheKey)) {
      return false;
    }
    try {
      await this.backend.load(cacheKey, path);
      this.loadedAssets.add(cacheKey);
      return true;
    } catch (error) {
      this.failedAssets.add(cacheKey);
      console.warn(
        `[AudioManager] Failed to load "${cacheKey}" from ${path}:`,
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  private async ensureVoiceLoaded(key: string): Promise<string | null> {
    const narrationKey = `narration/${this.language}/${key}`;
    const narrationPath = `/audio/narration/${this.language}/${key}.mp3`;
    if (await this.ensureLoadedAt(narrationKey, narrationPath)) {
      return narrationKey;
    }
    const voiceKey = `voice/${key}`;
    const voicePath = `/audio/voice/${key}.mp3`;
    if (await this.ensureLoadedAt(voiceKey, voicePath)) {
      return voiceKey;
    }
    return null;
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
