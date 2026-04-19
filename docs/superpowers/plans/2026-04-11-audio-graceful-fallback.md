# Audio Graceful Fallback & Programmatic Music — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make audio loading fail gracefully and provide a programmatic background music fallback via Web Audio API so games never crash from missing audio files.

**Architecture:** `RealAudioManager` gets a `failedAssets` set and guards all play calls. A new `WebAudioMusicGenerator` synthesizes a looping pentatonic melody using oscillator nodes. The manager falls back to the generator when file-based music loading fails.

**Tech Stack:** TypeScript, Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`), Vitest, existing Howler.js integration unchanged.

**Spec:** `docs/superpowers/specs/2026-04-11-audio-graceful-fallback-design.md`

---

## File Map

| File                                                            | Action | Responsibility                                                         |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `platform/src/services/audio-manager.ts`                        | Modify | Add `failedAssets` set, guard play calls, integrate generator fallback |
| `platform/src/services/audio-music-generator.ts`                | Create | Web Audio API music synthesis — pentatonic melody loop                 |
| `platform/src/main.tsx`                                         | Modify | Wire `WebAudioMusicGenerator` into `RealAudioManager` constructor      |
| `platform/src/services/__tests__/audio-manager.test.ts`         | Create | Tests for graceful error handling + generator integration              |
| `platform/src/services/__tests__/audio-music-generator.test.ts` | Create | Tests for the music generator                                          |

---

## Task 1: Graceful Error Handling — Tests

**Files:**

- Create: `platform/src/services/__tests__/audio-manager.test.ts`

- [ ] **Step 1: Create the mock backend and test file scaffold**

```typescript
// platform/src/services/__tests__/audio-manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealAudioManager } from '../audio-manager';
import type { AudioBackend } from '../audio-backend';

function createMockBackend(failIds: Set<string> = new Set()): AudioBackend {
  let playbackCounter = 0;
  const loaded = new Set<string>();

  return {
    load: vi.fn(async (id: string, _src: string) => {
      if (failIds.has(id)) {
        throw new Error(`Failed to load audio "${id}": Decoding audio data failed.`);
      }
      loaded.add(id);
    }),
    play: vi.fn((id: string, _options?: { loop?: boolean; volume?: number }) => {
      if (!loaded.has(id)) {
        throw new Error(`Audio "${id}" not loaded.`);
      }
      playbackCounter++;
      return `${id}:${playbackCounter}`;
    }),
    stop: vi.fn(),
    stopAll: vi.fn(),
    fade: vi.fn(),
    volume: vi.fn(),
    isPlaying: vi.fn(() => false),
    onEnd: vi.fn(),
    unload: vi.fn(),
  };
}
```

- [ ] **Step 2: Write failing tests for graceful error handling**

Add these tests below the mock factory:

```typescript
describe('RealAudioManager — graceful error handling', () => {
  let backend: AudioBackend;
  let manager: RealAudioManager;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('playMusic with missing asset', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['game-bgm']));
      manager = new RealAudioManager(backend);
    });

    it('does not throw when music file fails to load', async () => {
      await expect(manager.playMusic('music:game-bgm', { loop: true })).resolves.toBeUndefined();
    });

    it('logs a warning when audio fails to load', async () => {
      await manager.playMusic('music:game-bgm');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('game-bgm'));
    });

    it('does not call backend.play for failed assets', async () => {
      await manager.playMusic('music:game-bgm');
      expect(backend.play).not.toHaveBeenCalled();
    });

    it('skips load attempt on second call for same failed asset', async () => {
      await manager.playMusic('music:game-bgm');
      await manager.playMusic('music:game-bgm');
      expect(backend.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('playSFX with missing asset', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['missing-sfx']));
      manager = new RealAudioManager(backend);
    });

    it('does not throw when SFX file fails to load', async () => {
      await expect(manager.playSFX('missing-sfx')).resolves.toBeUndefined();
    });

    it('does not call backend.play for failed SFX', async () => {
      await manager.playSFX('missing-sfx');
      expect(backend.play).not.toHaveBeenCalled();
    });
  });

  describe('playVoice with missing asset', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['missing-voice']));
      manager = new RealAudioManager(backend);
    });

    it('does not throw when voice file fails to load', async () => {
      await expect(manager.playVoice('voice:missing-voice')).resolves.toBeUndefined();
    });

    it('calls onComplete even when voice asset fails', async () => {
      const onComplete = vi.fn();
      await manager.playVoice('voice:missing-voice', onComplete);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('preload with mixed assets', () => {
    beforeEach(() => {
      backend = createMockBackend(new Set(['bad-sound']));
      manager = new RealAudioManager(backend);
    });

    it('loads valid assets and warns for invalid ones', async () => {
      await manager.preload(['sfx:click', 'sfx:bad-sound', 'sfx:correct']);
      expect(backend.load).toHaveBeenCalledTimes(3);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('playMusic with valid asset still works', () => {
    beforeEach(() => {
      backend = createMockBackend();
      manager = new RealAudioManager(backend);
    });

    it('plays music normally when asset loads successfully', async () => {
      await manager.playMusic('music:game-bgm', { loop: true });
      expect(backend.play).toHaveBeenCalledWith('game-bgm', {
        loop: true,
        volume: 0.3,
      });
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter platform vitest run src/services/__tests__/audio-manager.test.ts`

Expected: Multiple failures — `playMusic` throws unhandled rejection, `backend.play` gets called for failed assets, no `console.warn` emitted.

- [ ] **Step 4: Commit the failing tests**

```bash
git add platform/src/services/__tests__/audio-manager.test.ts
git commit -m "test(audio): add failing tests for graceful error handling"
```

---

## Task 2: Graceful Error Handling — Implementation

**Files:**

- Modify: `platform/src/services/audio-manager.ts`

- [ ] **Step 1: Add `failedAssets` set to `RealAudioManager`**

In `platform/src/services/audio-manager.ts`, add after line 14 (`private loadedAssets = new Set<string>();`):

```typescript
  private failedAssets = new Set<string>();
```

- [ ] **Step 2: Modify `ensureLoaded` to catch failures**

Replace the `ensureLoaded` method (lines 185-195) with:

```typescript
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
```

- [ ] **Step 3: Guard `playMusic` — skip `backend.play` if asset not loaded**

In `playMusic()`, after the `await this.ensureLoaded(trackId, 'music');` line (line 35), add:

```typescript
if (!this.loadedAssets.has(trackId)) {
  return;
}
```

Note: `trackId` here is the raw ID passed to `playMusic` (e.g. `'music:game-bgm'`). But `ensureLoaded` is called with the parsed key. We need to parse first. Looking at the current code, `playMusic` passes the full `trackId` string directly to `ensureLoaded` — but `ensureLoaded` uses it as-is for the filename. We need to parse the asset ID first, just like `preload` does.

Update `playMusic` to parse the asset ID. Replace lines 25-51 with:

```typescript
  async playMusic(
    trackId: string,
    options?: { loop?: boolean; fadeIn?: number },
  ): Promise<void> {
    const current = this.channels.music.currentPlaybackId;
    if (current !== null) {
      this.backend.stop(current);
      this.channels.music.currentPlaybackId = null;
    }

    const { key, category } = this.parseAssetId(trackId);
    await this.ensureLoaded(key, category);

    if (!this.loadedAssets.has(key)) {
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
```

- [ ] **Step 4: Guard `playSFX` — skip if asset not loaded**

Replace `playSFX` (lines 76-84) with:

```typescript
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
  }
```

- [ ] **Step 5: Guard `playVoice` — skip if asset not loaded, still call onComplete**

Replace `playVoice` (lines 86-110) with:

```typescript
  async playVoice(voiceId: string, onComplete?: () => void): Promise<void> {
    const current = this.channels.voice.currentPlaybackId;
    if (current !== null) {
      this.backend.stop(current);
      this.channels.voice.currentPlaybackId = null;
    }

    const { key, category } = this.parseAssetId(voiceId);
    await this.ensureLoaded(key, category);

    if (!this.loadedAssets.has(key)) {
      onComplete?.();
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
```

- [ ] **Step 6: Run the error handling tests**

Run: `pnpm --filter platform vitest run src/services/__tests__/audio-manager.test.ts`

Expected: All tests pass.

- [ ] **Step 7: Run existing tests to check for regressions**

Run: `pnpm test`

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add platform/src/services/audio-manager.ts
git commit -m "fix(audio): graceful error handling for missing audio assets"
```

---

## Task 3: Web Audio Music Generator — Tests

**Files:**

- Create: `platform/src/services/__tests__/audio-music-generator.test.ts`

- [ ] **Step 1: Create Web Audio API mocks and test scaffold**

```typescript
// platform/src/services/__tests__/audio-music-generator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebAudioMusicGenerator } from '../audio-music-generator';

// Mock Web Audio API
class MockGainNode {
  gain = { value: 1, linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode {
  frequency = { value: 0, setValueAtTime: vi.fn() };
  type: OscillatorType = 'sine';
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = {};
  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  close = vi.fn(async () => {});
  resume = vi.fn(async () => {});
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', MockAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: Write failing tests for the generator**

```typescript
describe('WebAudioMusicGenerator', () => {
  let generator: WebAudioMusicGenerator;

  beforeEach(() => {
    generator = new WebAudioMusicGenerator();
  });

  afterEach(() => {
    generator.stop();
  });

  describe('start()', () => {
    it('creates an AudioContext and begins playback', () => {
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });

    it('does not create multiple AudioContexts on repeated start calls', () => {
      generator.start({ volume: 0.3 });
      generator.start({ volume: 0.5 });
      expect(AudioContext).toHaveBeenCalledTimes(1);
    });

    it('respects the volume option', () => {
      generator.start({ volume: 0.5 });
      expect(generator.isActive()).toBe(true);
    });
  });

  describe('stop()', () => {
    it('stops playback and isActive returns false', () => {
      generator.start({ volume: 0.3 });
      generator.stop();
      expect(generator.isActive()).toBe(false);
    });

    it('is a no-op when not playing', () => {
      expect(() => generator.stop()).not.toThrow();
    });
  });

  describe('setVolume()', () => {
    it('updates volume while playing', () => {
      generator.start({ volume: 0.3 });
      expect(() => generator.setVolume(0.8)).not.toThrow();
    });

    it('is a no-op when not playing', () => {
      expect(() => generator.setVolume(0.5)).not.toThrow();
    });
  });

  describe('isActive()', () => {
    it('returns false before start', () => {
      expect(generator.isActive()).toBe(false);
    });

    it('returns true after start', () => {
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });

    it('returns false after stop', () => {
      generator.start({ volume: 0.3 });
      generator.stop();
      expect(generator.isActive()).toBe(false);
    });
  });

  describe('restart', () => {
    it('can start again after stop', () => {
      generator.start({ volume: 0.3 });
      generator.stop();
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter platform vitest run src/services/__tests__/audio-music-generator.test.ts`

Expected: FAIL — `WebAudioMusicGenerator` does not exist yet.

- [ ] **Step 4: Commit the failing tests**

```bash
git add platform/src/services/__tests__/audio-music-generator.test.ts
git commit -m "test(audio): add failing tests for WebAudioMusicGenerator"
```

---

## Task 4: Web Audio Music Generator — Implementation

**Files:**

- Create: `platform/src/services/audio-music-generator.ts`

This is the creative core of the solution — a programmatic melody generator. This task has a meaningful design choice for the user.

- [ ] **Step 1: Create the generator with core lifecycle methods**

```typescript
// platform/src/services/audio-music-generator.ts

// Pentatonic scale frequencies (C4, D4, E4, G4, A4, C5)
const MELODY_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

// 8-bar melody pattern — indices into MELODY_NOTES
// USER INPUT POINT: The user will write this melody pattern
const MELODY_PATTERN: number[] = []; // filled in by user

const NOTE_DURATION = 250; // ms per note
const BASS_OCTAVE_DIVISOR = 2; // bass plays one octave below

export class WebAudioMusicGenerator {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private playing = false;
  private scheduleTimer: ReturnType<typeof setTimeout> | null = null;
  private activeOscillators: OscillatorNode[] = [];

  start(options?: { volume?: number; fadeIn?: number }): void {
    if (this.playing) {
      this.setVolume(options?.volume ?? 0.3);
      return;
    }

    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

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

    this.playing = true;
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
  }

  setVolume(level: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  isActive(): boolean {
    return this.playing;
  }

  private scheduleLoop(noteIndex: number): void {
    if (!this.playing || !this.context || !this.masterGain) {
      return;
    }

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

    // Gentle envelope: quick attack, soft decay
    noteGain.gain.value = relativeVolume;
    noteGain.gain.linearRampToValueAtTime(0, this.context.currentTime + NOTE_DURATION / 1000);

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
```

- [ ] **Step 2: User writes the melody pattern**

The `MELODY_PATTERN` array is the creative heart of this generator. Each number is an index into `MELODY_NOTES`:

| Index | Note | Frequency | Character    |
| ----- | ---- | --------- | ------------ |
| 0     | C4   | 261.63 Hz | Home/rest    |
| 1     | D4   | 293.66 Hz | Stepping up  |
| 2     | E4   | 329.63 Hz | Bright       |
| 3     | G4   | 392.00 Hz | Open/happy   |
| 4     | A4   | 440.00 Hz | Soaring      |
| 5     | C5   | 523.25 Hz | High resolve |

Write a 32-number array (8 bars x 4 notes) in `platform/src/services/audio-music-generator.ts` for the `MELODY_PATTERN` constant.

Guidance: Pentatonic melodies sound best when they move mostly by step (adjacent indices) with occasional leaps. Starting and ending on index 0 (C) gives a sense of resolution. A pattern like ascending in the first half and descending in the second half creates natural phrasing.

Example to get started:

```typescript
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
```

- [ ] **Step 3: Run the generator tests**

Run: `pnpm --filter platform vitest run src/services/__tests__/audio-music-generator.test.ts`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add platform/src/services/audio-music-generator.ts
git commit -m "feat(audio): add WebAudioMusicGenerator with pentatonic melody loop"
```

---

## Task 5: Integration — Generator Fallback Tests

**Files:**

- Modify: `platform/src/services/__tests__/audio-manager.test.ts`

- [ ] **Step 1: Add a mock generator factory to the test file**

Add after the `createMockBackend` function:

```typescript
import type { WebAudioMusicGenerator } from '../audio-music-generator';

function createMockGenerator(): WebAudioMusicGenerator {
  let active = false;
  return {
    start: vi.fn(() => {
      active = true;
    }),
    stop: vi.fn(() => {
      active = false;
    }),
    setVolume: vi.fn(),
    isActive: vi.fn(() => active),
  } as unknown as WebAudioMusicGenerator;
}
```

- [ ] **Step 2: Write failing integration tests**

Add a new `describe` block at the end of the test file:

```typescript
describe('RealAudioManager — generator fallback', () => {
  let backend: AudioBackend;
  let generator: WebAudioMusicGenerator;
  let manager: RealAudioManager;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    backend = createMockBackend(new Set(['game-bgm']));
    generator = createMockGenerator();
    manager = new RealAudioManager(backend, generator);
  });

  it('falls back to generator when music asset fails to load', async () => {
    await manager.playMusic('music:game-bgm', { loop: true, fadeIn: 1000 });
    expect(generator.start).toHaveBeenCalledWith({
      volume: 0.3,
      fadeIn: 1000,
    });
  });

  it('stops generator when stopMusic is called', async () => {
    await manager.playMusic('music:game-bgm');
    manager.stopMusic();
    expect(generator.stop).toHaveBeenCalled();
  });

  it('stops generator with fadeOut when specified', async () => {
    await manager.playMusic('music:game-bgm');
    manager.stopMusic({ fadeOut: 500 });
    expect(generator.stop).toHaveBeenCalledWith({ fadeOut: 500 });
  });

  it('forwards setVolume to generator when generator is active', async () => {
    await manager.playMusic('music:game-bgm');
    manager.setVolume('music', 0.7);
    expect(generator.setVolume).toHaveBeenCalledWith(0.7);
  });

  it('forwards mute to generator as setVolume(0)', async () => {
    await manager.playMusic('music:game-bgm');
    manager.mute('music');
    expect(generator.setVolume).toHaveBeenCalledWith(0);
  });

  it('forwards unmute to generator with restored volume', async () => {
    await manager.playMusic('music:game-bgm');
    manager.mute('music');
    manager.unmute('music');
    expect(generator.setVolume).toHaveBeenLastCalledWith(0.3);
  });

  it('prefers file-based music when asset loads successfully', async () => {
    const goodBackend = createMockBackend(); // nothing fails
    const mgr = new RealAudioManager(goodBackend, generator);
    await mgr.playMusic('music:game-bgm');
    expect(generator.start).not.toHaveBeenCalled();
    expect(goodBackend.play).toHaveBeenCalled();
  });

  it('stops generator before playing file-based music', async () => {
    // First play triggers generator (asset fails)
    await manager.playMusic('music:game-bgm');
    expect(generator.start).toHaveBeenCalled();

    // Now create a manager where the asset succeeds
    const goodBackend = createMockBackend();
    const mgr = new RealAudioManager(goodBackend, generator);
    // Simulate generator still active
    await mgr.playMusic('music:other-track');
    // File-based music should play, generator should not be called again
    expect(goodBackend.play).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter platform vitest run src/services/__tests__/audio-manager.test.ts`

Expected: FAIL — `RealAudioManager` constructor doesn't accept a second argument, no generator fallback logic.

- [ ] **Step 4: Commit the failing tests**

```bash
git add platform/src/services/__tests__/audio-manager.test.ts
git commit -m "test(audio): add failing tests for generator fallback integration"
```

---

## Task 6: Integration — Wire Generator into RealAudioManager

**Files:**

- Modify: `platform/src/services/audio-manager.ts`

- [ ] **Step 1: Add generator as optional constructor parameter and new state**

Import the generator type and update the constructor. At the top of the class (after `private channels`):

```typescript
import type { WebAudioMusicGenerator } from './audio-music-generator';

// ... inside the class:
  private musicGenerator: WebAudioMusicGenerator | null;
  private usingGenerator = false;

  constructor(backend: AudioBackend, musicGenerator?: WebAudioMusicGenerator) {
    this.backend = backend;
    this.musicGenerator = musicGenerator ?? null;
  }
```

- [ ] **Step 2: Update `playMusic` to fall back to generator**

Replace the early return for failed assets with generator fallback:

```typescript
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
```

- [ ] **Step 3: Update `stopMusic` to handle generator**

Replace the `stopMusic` method:

```typescript
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
```

- [ ] **Step 4: Update `muteChannel` and `unmuteChannel` to forward to generator**

In `muteChannel`, add before the existing `if (category === 'sfx')` check:

```typescript
if (category === 'music' && this.usingGenerator && this.musicGenerator) {
  this.musicGenerator.setVolume(0);
  return;
}
```

In `unmuteChannel`, add before the existing `if (category === 'sfx')` check:

```typescript
if (category === 'music' && this.usingGenerator && this.musicGenerator) {
  this.musicGenerator.setVolume(channel.volume);
  return;
}
```

- [ ] **Step 5: Update `setVolume` to forward to generator**

In `setVolume`, after `channel.volume = clamped;` and before `if (category === 'sfx')`:

```typescript
if (category === 'music' && this.usingGenerator && this.musicGenerator) {
  this.musicGenerator.setVolume(channel.muted ? 0 : clamped);
  return;
}
```

- [ ] **Step 6: Run all audio tests**

Run: `pnpm --filter platform vitest run src/services/__tests__/audio-manager.test.ts`

Expected: All tests pass (both error handling and integration tests).

- [ ] **Step 7: Commit**

```bash
git add platform/src/services/audio-manager.ts
git commit -m "feat(audio): integrate WebAudioMusicGenerator as fallback in RealAudioManager"
```

---

## Task 7: Wire Up in Production Entry Point

**Files:**

- Modify: `platform/src/main.tsx`

- [ ] **Step 1: Import and instantiate the generator**

In `platform/src/main.tsx`, add the import after the `HowlerBackend` import (line 11):

```typescript
import { WebAudioMusicGenerator } from './services/audio-music-generator';
```

- [ ] **Step 2: Update the audioManager instantiation**

Replace line 30:

```typescript
const audioManager = new RealAudioManager(new HowlerBackend());
```

with:

```typescript
const audioManager = new RealAudioManager(new HowlerBackend(), new WebAudioMusicGenerator());
```

- [ ] **Step 3: Run full test suite and typecheck**

Run: `pnpm typecheck && pnpm test`

Expected: No type errors, all tests pass.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: No lint errors.

- [ ] **Step 5: Commit**

```bash
git add platform/src/main.tsx
git commit -m "feat(audio): wire WebAudioMusicGenerator into production entry point"
```

---

## Task 8: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Open a game that plays music**

Open the app in a browser, navigate to any game (More Or Less, Spelling Bee, or Safety Scout). Verify:

1. No console errors about audio decoding failures
2. A `console.warn` appears for the missing file (graceful handling)
3. Background music plays via the generator (you should hear a soft pentatonic melody)
4. Music stops when leaving the game

- [ ] **Step 3: Verify SFX still work**

Click through game interactions and verify SFX (click, correct, incorrect) still play normally.

- [ ] **Step 4: Commit any fixes if needed**

Only if issues are found during smoke testing.
