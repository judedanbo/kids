import { Howl } from 'howler';
import type { AudioBackend } from './audio-backend';

export class HowlerBackend implements AudioBackend {
  private sounds = new Map<string, Howl>();
  private playbackMap = new Map<string, { howl: Howl; soundId: number }>();

  async load(id: string, src: string): Promise<void> {
    if (this.sounds.has(id)) {
      return;
    }

    // Pre-flight check: verify the file exists and is audio.
    // Vite's SPA fallback serves index.html (200) for missing files,
    // which causes Howler to fail with a misleading "Decoding audio data failed".
    const res = await fetch(src, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.startsWith('audio/')) {
      throw new Error(
        `Audio file not found: ${src}`,
      );
    }

    return new Promise<void>((resolve, reject) => {
      const howl = new Howl({
        src: [src],
        preload: true,
        onload: () => resolve(),
        onloaderror: (_soundId, error) =>
          reject(new Error(`Failed to load audio "${id}": ${error}`)),
      });
      this.sounds.set(id, howl);
    });
  }

  play(id: string, options?: { loop?: boolean; volume?: number }): string {
    const howl = this.sounds.get(id);
    if (!howl) {
      throw new Error(`Audio "${id}" not loaded. Call load() first.`);
    }

    if (options?.loop !== undefined) {
      howl.loop(options.loop);
    }

    const soundId = howl.play();

    if (options?.volume !== undefined) {
      howl.volume(options.volume, soundId);
    }

    const playbackId = `${id}:${soundId}`;
    this.playbackMap.set(playbackId, { howl, soundId });

    return playbackId;
  }

  stop(playbackId: string): void {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      entry.howl.stop(entry.soundId);
      this.playbackMap.delete(playbackId);
    }
  }

  stopAll(): void {
    for (const [playbackId, entry] of this.playbackMap) {
      entry.howl.stop(entry.soundId);
      this.playbackMap.delete(playbackId);
    }
  }

  fade(
    playbackId: string,
    from: number,
    to: number,
    duration: number,
  ): void {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      entry.howl.fade(from, to, duration, entry.soundId);
    }
  }

  volume(playbackId: string, level: number): void {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      entry.howl.volume(level, entry.soundId);
    }
  }

  isPlaying(playbackId: string): boolean {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      return entry.howl.playing(entry.soundId);
    }
    return false;
  }

  onEnd(playbackId: string, callback: () => void): void {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      entry.howl.on('end', callback, entry.soundId);
    }
  }

  unload(id: string): void {
    const howl = this.sounds.get(id);
    if (howl) {
      howl.unload();
      this.sounds.delete(id);

      // Clean up any playback entries for this sound
      for (const [playbackId, entry] of this.playbackMap) {
        if (entry.howl === howl) {
          this.playbackMap.delete(playbackId);
        }
      }
    }
  }
}
