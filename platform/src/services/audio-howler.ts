import { Howl, Howler } from 'howler';
import type { AudioBackend } from './audio-backend';

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export class HowlerBackend implements AudioBackend {
  private sounds = new Map<string, Howl>();
  private playbackMap = new Map<string, { howl: Howl; soundId: number }>();
  private ready = false;
  private readyCallbacks: Array<() => void> = [];
  private unlockBound = false;

  constructor() {
    // Howler lazily creates the shared AudioContext on first .play() call. If
    // the document has already been interacted with (e.g. returning from a
    // route change), we're good; otherwise we wait for a gesture before
    // reporting ready so callers can queue their first play.
    if (typeof document === 'undefined') {
      this.ready = true;
      return;
    }
    const ctx = this.getContext();
    if (ctx && ctx.state === 'running') {
      this.ready = true;
      return;
    }
    this.bindUnlockListeners();
  }

  private getContext(): AudioContext | null {
    // Howler.ctx is typed as AudioContext on modern builds; guard for safety.
    const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx;
    return ctx ?? null;
  }

  private bindUnlockListeners(): void {
    if (this.unlockBound || typeof document === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
      this.markReady();
      for (const event of UNLOCK_EVENTS) {
        document.removeEventListener(event, unlock);
      }
    };
    for (const event of UNLOCK_EVENTS) {
      document.addEventListener(event, unlock, { once: true });
    }
  }

  private markReady(): void {
    if (this.ready) return;
    this.ready = true;
    const pending = this.readyCallbacks.splice(0);
    for (const cb of pending) {
      try {
        cb();
      } catch (error) {
        console.warn('[HowlerBackend] onReady callback threw:', error);
      }
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  onReady(callback: () => void): void {
    if (this.ready) {
      callback();
      return;
    }
    this.readyCallbacks.push(callback);
  }

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
      throw new Error(`Audio file not found: ${src}`);
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

  pause(playbackId: string): void {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      entry.howl.pause(entry.soundId);
    }
  }

  resume(playbackId: string): void {
    const entry = this.playbackMap.get(playbackId);
    if (entry) {
      entry.howl.play(entry.soundId);
    }
  }

  fade(playbackId: string, from: number, to: number, duration: number): void {
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
