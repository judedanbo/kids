export interface AudioBackend {
  /** Load an audio file by ID and source path. Resolves when ready to play. */
  load(id: string, src: string): Promise<void>;

  /** Play a loaded sound. Returns a playback ID for controlling this instance. */
  play(id: string, options?: { loop?: boolean; volume?: number }): string;

  /** Stop a specific playback instance. */
  stop(playbackId: string): void;

  /** Stop all active playback instances. */
  stopAll(): void;

  /** Pause a playback instance, preserving position for a later resume. */
  pause(playbackId: string): void;

  /** Resume a previously paused playback instance. */
  resume(playbackId: string): void;

  /** Fade a playback instance between volume levels over a duration (ms). */
  fade(playbackId: string, from: number, to: number, duration: number): void;

  /** Set the volume of a specific playback instance. */
  volume(playbackId: string, level: number): void;

  /** Check if a specific playback instance is currently playing. */
  isPlaying(playbackId: string): boolean;

  /** Register a callback for when a playback instance finishes. */
  onEnd(playbackId: string, callback: () => void): void;

  /** Unload an audio asset by ID, freeing memory. */
  unload(id: string): void;

  /**
   * Whether the backend can accept `play()` calls right now. Returns false
   * while the browser's autoplay policy still blocks the audio context.
   */
  isReady(): boolean;

  /**
   * Register a one-shot callback fired the moment the backend becomes ready
   * (typically on first user gesture). Called immediately if already ready.
   */
  onReady(callback: () => void): void;
}
