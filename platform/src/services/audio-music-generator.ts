// Pentatonic scale frequencies (C4, D4, E4, G4, A4, C5)
const MELODY_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

// 8-bar melody pattern — indices into MELODY_NOTES
const MELODY_PATTERN = [
  0,
  1,
  2,
  3, // bar 1: ascending walk up
  2,
  3,
  4,
  3, // bar 2: playful bounce
  4,
  5,
  4,
  3, // bar 3: peak and descend
  2,
  1,
  2,
  3, // bar 4: gentle return
  3,
  4,
  3,
  2, // bar 5: echo the bounce
  1,
  2,
  3,
  2, // bar 6: wandering
  1,
  0,
  1,
  2, // bar 7: settling down
  1,
  0,
  0,
  0, // bar 8: resolve to home
];

const NOTE_DURATION = 250; // ms per note
const BASS_OCTAVE_DIVISOR = 2; // bass plays one octave below

export class WebAudioMusicGenerator {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private playing = false;
  private paused = false;
  private scheduleTimer: ReturnType<typeof setTimeout> | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private pendingOptions: { volume?: number; fadeIn?: number } | undefined;
  private unlockBound = false;
  private nextNoteIndex = 0;
  private volumeBeforePause = 0.3;

  start(options?: { volume?: number; fadeIn?: number }): void {
    if (this.playing) {
      this.setVolume(options?.volume ?? 0.3);
      return;
    }

    if (!this.context) {
      this.context = new AudioContext();
    }

    this.pendingOptions = options;
    this.playing = true;
    this.paused = false;
    this.nextNoteIndex = 0;
    this.volumeBeforePause = options?.volume ?? 0.3;

    if (this.context.state === 'suspended') {
      // Browser autoplay policy blocks AudioContext until a user gesture.
      // Register a one-time interaction listener to resume and begin playback.
      this.context.resume().then(() => {
        if (this.playing) {
          this.beginPlayback();
        }
      });
      if (!this.unlockBound) {
        this.unlockBound = true;
        const unlock = () => {
          if (this.context && this.context.state === 'suspended') {
            this.context.resume();
          }
          document.removeEventListener('click', unlock);
          document.removeEventListener('keydown', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: false });
        document.addEventListener('keydown', unlock, { once: false });
        document.addEventListener('touchstart', unlock, { once: false });
      }
      return;
    }

    this.beginPlayback();
  }

  private beginPlayback(): void {
    if (!this.context || this.masterGain) {
      return;
    }

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    const options = this.pendingOptions;
    const targetVolume = options?.volume ?? 0.3;
    const fadeIn = options?.fadeIn ?? 0;

    if (fadeIn > 0) {
      this.masterGain.gain.value = 0;
      this.masterGain.gain.linearRampToValueAtTime(
        targetVolume,
        this.context.currentTime + fadeIn / 1000,
      );
    } else {
      this.masterGain.gain.value = targetVolume;
    }

    this.scheduleLoop(0);
  }

  stop(options?: { fadeOut?: number }): void {
    if (!this.playing) {
      return;
    }

    const fadeOut = options?.fadeOut ?? 0;

    if (fadeOut > 0 && this.masterGain && this.context) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeOut / 1000);
      setTimeout(() => this.cleanup(), fadeOut);
    } else {
      this.cleanup();
    }

    this.playing = false;
    this.paused = false;
  }

  setVolume(level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    this.volumeBeforePause = clamped;
    if (this.masterGain && !this.paused) {
      this.masterGain.gain.value = clamped;
    }
  }

  pause(): void {
    if (!this.playing || this.paused) {
      return;
    }
    this.paused = true;
    if (this.scheduleTimer !== null) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    if (this.masterGain) {
      this.volumeBeforePause = this.masterGain.gain.value;
      this.masterGain.gain.value = 0;
    }
  }

  resume(): void {
    if (!this.playing || !this.paused) {
      return;
    }
    this.paused = false;
    if (this.masterGain) {
      this.masterGain.gain.value = this.volumeBeforePause;
    }
    this.scheduleLoop(this.nextNoteIndex);
  }

  isActive(): boolean {
    return this.playing;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private scheduleLoop(noteIndex: number): void {
    if (!this.playing || this.paused || !this.context || !this.masterGain) {
      return;
    }

    this.nextNoteIndex = noteIndex + 1;
    const patternIndex = noteIndex % MELODY_PATTERN.length;
    const melodyFreq = MELODY_NOTES[MELODY_PATTERN[patternIndex]];
    const bassFreq = melodyFreq / BASS_OCTAVE_DIVISOR;

    this.playNote(melodyFreq, 'triangle', 0.6);
    this.playNote(bassFreq, 'sine', 0.3);

    this.scheduleTimer = setTimeout(() => {
      this.scheduleLoop(noteIndex + 1);
    }, NOTE_DURATION);
  }

  private playNote(frequency: number, type: OscillatorType, relativeVolume: number): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const noteGain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // Gentle envelope: quick attack, soft decay.
    // setValueAtTime anchors the ramp start — without it linearRamp has no
    // defined origin and may hold a constant value on some browsers.
    const now = this.context.currentTime;
    noteGain.gain.setValueAtTime(relativeVolume, now);
    noteGain.gain.linearRampToValueAtTime(0, now + NOTE_DURATION / 1000);

    oscillator.connect(noteGain);
    noteGain.connect(this.masterGain);

    oscillator.start();
    oscillator.stop(this.context.currentTime + NOTE_DURATION / 1000);

    this.activeOscillators.push(oscillator);

    // Remove from tracking after it finishes
    setTimeout(() => {
      const idx = this.activeOscillators.indexOf(oscillator);
      if (idx !== -1) {
        this.activeOscillators.splice(idx, 1);
      }
    }, NOTE_DURATION);
  }

  private cleanup(): void {
    if (this.scheduleTimer !== null) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }

    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
    }
    this.activeOscillators = [];

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
  }
}
