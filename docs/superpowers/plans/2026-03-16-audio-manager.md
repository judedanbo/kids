# AudioManager — Real Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the console-logging `StubAudioManager` with a real `RealAudioManager` backed by Howler.js, using an adapter pattern (`AudioBackend` interface) for backend swapability. Include 4 placeholder SFX files for immediate use by Phase 3 games.

**Architecture:** `RealAudioManager` implements the shared `AudioManager` interface and delegates all playback to an injected `AudioBackend`. Three independent channels (music, sfx, voice) each maintain their own volume/mute state. `HowlerBackend` wraps Howler.js's `Howl` class, keeping all library-specific code behind the adapter boundary. The existing `StubAudioManager` is preserved (renamed file) for tests and fallback.

**Tech Stack:** Howler.js 2.x, TypeScript 5.7 (strict), Vitest (mocked backend for unit tests).

**Spec:** `docs/superpowers/specs/2026-03-16-audio-manager-design.md`

---

## File Map

### New files

| Path | Responsibility |
|------|---------------|
| `platform/src/services/audio-stub.ts` | Renamed from `audio.ts` — StubAudioManager (unchanged code) |
| `platform/src/services/audio-backend.ts` | `AudioBackend` interface — internal contract for audio library adapters |
| `platform/src/services/audio-manager.ts` | `RealAudioManager` — implements shared `AudioManager`, delegates to `AudioBackend` |
| `platform/src/services/audio-manager.test.ts` | Unit tests for `RealAudioManager` (mocked `AudioBackend`) |
| `platform/src/services/audio-howler.ts` | `HowlerBackend` — Howler.js adapter implementing `AudioBackend` |
| `platform/public/audio/sfx/click.mp3` | Placeholder SFX — soft UI tap/click (~100ms) |
| `platform/public/audio/sfx/correct.mp3` | Placeholder SFX — ascending chime (~500ms) |
| `platform/public/audio/sfx/incorrect.mp3` | Placeholder SFX — gentle low tone (~400ms) |
| `platform/public/audio/sfx/celebrate.mp3` | Placeholder SFX — short celebration fanfare (~1.5s) |

### Modified files

| Path | Change |
|------|--------|
| `platform/package.json` | Add `howler` dependency, `@types/howler` devDependency |
| `platform/src/services/audio.test.ts` | Update import path from `./audio` to `./audio-stub` |
| `platform/src/main.tsx` | Replace `StubAudioManager` with `RealAudioManager` + `HowlerBackend` |

### Deleted files

| Path | Reason |
|------|--------|
| `platform/src/services/audio.ts` | Renamed to `audio-stub.ts` (git mv) |

---

## Chunk 1: Infrastructure (Tasks 1-3)

Dependencies, file rename, AudioBackend interface, RealAudioManager with TDD.

### Task 1: Install dependencies and rename audio.ts to audio-stub.ts

**Files:**
- Modify: `platform/package.json`
- Rename: `platform/src/services/audio.ts` → `platform/src/services/audio-stub.ts`
- Modify: `platform/src/services/audio.test.ts`
- Modify: `platform/src/main.tsx`

- [ ] **Step 1: Add howler dependencies to platform package.json**

In `/home/jude/code/kids/platform/package.json`, add `howler` to `dependencies` and `@types/howler` to `devDependencies`:

```json
{
  "dependencies": {
    "@kids-games-zone/shared": "workspace:*",
    "howler": "^2.2.0",
    "idb": "^8.0.0",
    "framer-motion": "^11.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@types/howler": "^2.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd /home/jude/code/kids && pnpm install`
Expected: Clean install with no errors.

- [ ] **Step 3: Rename audio.ts to audio-stub.ts**

Run:
```bash
cd /home/jude/code/kids
git mv platform/src/services/audio.ts platform/src/services/audio-stub.ts
```

- [ ] **Step 4: Update import in audio.test.ts**

In `/home/jude/code/kids/platform/src/services/audio.test.ts`, change the import:

```typescript
import { StubAudioManager } from './audio-stub';
```

(was: `import { StubAudioManager } from './audio';`)

- [ ] **Step 5: Update import in main.tsx**

In `/home/jude/code/kids/platform/src/main.tsx`, change the import:

```typescript
import { StubAudioManager } from './services/audio-stub';
```

(was: `import { StubAudioManager } from './services/audio';`)

- [ ] **Step 6: Verify everything still works**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm test`
Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add platform/package.json platform/src/services/audio-stub.ts platform/src/services/audio.test.ts platform/src/main.tsx pnpm-lock.yaml
git commit -m "feat: install howler and rename audio.ts to audio-stub.ts

Add howler and @types/howler to platform package.
Rename StubAudioManager file to audio-stub.ts, update imports."
```

---

### Task 2: Create AudioBackend interface

**Files:**
- Create: `platform/src/services/audio-backend.ts`

- [ ] **Step 1: Create audio-backend.ts**

Create `/home/jude/code/kids/platform/src/services/audio-backend.ts`:

```typescript
export interface AudioBackend {
  /** Load an audio file by ID and source path. Resolves when ready to play. */
  load(id: string, src: string): Promise<void>;

  /** Play a loaded sound. Returns a playback ID for controlling this instance. */
  play(id: string, options?: { loop?: boolean; volume?: number }): string;

  /** Stop a specific playback instance. */
  stop(playbackId: string): void;

  /** Stop all active playback instances. */
  stopAll(): void;

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
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add platform/src/services/audio-backend.ts
git commit -m "feat: add AudioBackend interface for swappable audio adapters"
```

---

### Task 3: Create RealAudioManager with TDD

**Files:**
- Create: `platform/src/services/audio-manager.test.ts`
- Create: `platform/src/services/audio-manager.ts`

- [ ] **Step 1: Write failing tests for RealAudioManager**

Create `/home/jude/code/kids/platform/src/services/audio-manager.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealAudioManager } from './audio-manager';
import type { AudioBackend } from './audio-backend';

function createMockBackend(): AudioBackend {
  return {
    load: vi.fn<AudioBackend['load']>().mockResolvedValue(undefined),
    play: vi.fn<AudioBackend['play']>().mockReturnValue('playback-1'),
    stop: vi.fn<AudioBackend['stop']>(),
    stopAll: vi.fn<AudioBackend['stopAll']>(),
    fade: vi.fn<AudioBackend['fade']>(),
    volume: vi.fn<AudioBackend['volume']>(),
    isPlaying: vi.fn<AudioBackend['isPlaying']>().mockReturnValue(false),
    onEnd: vi.fn<AudioBackend['onEnd']>(),
    unload: vi.fn<AudioBackend['unload']>(),
  };
}

describe('RealAudioManager', () => {
  let backend: ReturnType<typeof createMockBackend>;
  let audio: RealAudioManager;

  beforeEach(() => {
    backend = createMockBackend();
    audio = new RealAudioManager(backend);
  });

  describe('playMusic', () => {
    it('loads and plays music with loop:true by default', async () => {
      await audio.playMusic('main-theme');

      expect(backend.load).toHaveBeenCalledWith('main-theme', '/audio/music/main-theme.mp3');
      expect(backend.play).toHaveBeenCalledWith('main-theme', {
        loop: true,
        volume: 0.3,
      });
    });

    it('respects loop:false option', async () => {
      await audio.playMusic('intro', { loop: false });

      expect(backend.play).toHaveBeenCalledWith('intro', {
        loop: false,
        volume: 0.3,
      });
    });

    it('applies fadeIn when specified', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb-1');

      await audio.playMusic('main-theme', { fadeIn: 1000 });

      expect(backend.play).toHaveBeenCalledWith('main-theme', {
        loop: true,
        volume: 0,
      });
      expect(backend.fade).toHaveBeenCalledWith('music-pb-1', 0, 0.3, 1000);
    });

    it('stops current music before playing new track', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValueOnce('pb-old');

      await audio.playMusic('track-a');
      await audio.playMusic('track-b');

      expect(backend.stop).toHaveBeenCalledWith('pb-old');
    });

    it('plays music at volume 0 when muted', async () => {
      audio.mute('music');
      await audio.playMusic('main-theme');

      expect(backend.play).toHaveBeenCalledWith('main-theme', {
        loop: true,
        volume: 0,
      });
    });

    it('does not reload an already-loaded asset', async () => {
      await audio.playMusic('main-theme');
      await audio.playMusic('main-theme');

      expect(backend.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopMusic', () => {
    it('stops current music immediately when no fadeOut', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track-a');

      audio.stopMusic();

      expect(backend.stop).toHaveBeenCalledWith('music-pb');
    });

    it('does nothing when no music is playing', () => {
      audio.stopMusic();

      expect(backend.stop).not.toHaveBeenCalled();
      expect(backend.fade).not.toHaveBeenCalled();
    });

    it('fades out before stopping when fadeOut specified', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track-a');

      audio.stopMusic({ fadeOut: 500 });

      expect(backend.fade).toHaveBeenCalledWith('music-pb', 0.3, 0, 500);
    });

    it('clears currentPlaybackId immediately on stopMusic (race condition prevention)', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('pb-old')
        .mockReturnValueOnce('pb-new');

      await audio.playMusic('track-a');
      audio.stopMusic({ fadeOut: 1000 });

      // playMusic during fade-out should not try to stop the old (already-fading) playback
      await audio.playMusic('track-b');

      // backend.stop should NOT have been called with 'pb-old' by the second playMusic
      // (stopMusic already cleared the currentPlaybackId)
      const stopCalls = (backend.stop as ReturnType<typeof vi.fn>).mock.calls;
      const stopCallsFromPlayMusic = stopCalls.filter(
        (call: string[]) => call[0] === 'pb-old',
      );
      expect(stopCallsFromPlayMusic).toHaveLength(0);
    });
  });

  describe('playSFX', () => {
    it('loads and plays SFX with channel volume', async () => {
      await audio.playSFX('click');

      expect(backend.load).toHaveBeenCalledWith('click', '/audio/sfx/click.mp3');
      expect(backend.play).toHaveBeenCalledWith('click', { volume: 1.0 });
    });

    it('plays SFX at volume 0 when muted', async () => {
      audio.mute('sfx');
      await audio.playSFX('click');

      expect(backend.play).toHaveBeenCalledWith('click', { volume: 0 });
    });

    it('fire-and-forget — does not track playback ID', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('sfx-pb');
      await audio.playSFX('click');

      // Subsequent volume change should not try to update this playback
      audio.setVolume('sfx', 0.5);
      expect(backend.volume).not.toHaveBeenCalledWith('sfx-pb', expect.any(Number));
    });
  });

  describe('playVoice', () => {
    it('loads and plays voice with channel volume', async () => {
      await audio.playVoice('welcome');

      expect(backend.load).toHaveBeenCalledWith('welcome', '/audio/voice/welcome.mp3');
      expect(backend.play).toHaveBeenCalledWith('welcome', { volume: 1.0 });
    });

    it('registers onEnd callback when onComplete provided', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('voice-pb');
      const onComplete = vi.fn();

      await audio.playVoice('welcome', onComplete);

      expect(backend.onEnd).toHaveBeenCalledWith('voice-pb', expect.any(Function));
    });

    it('stops previous voice before playing new one', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('voice-pb-1')
        .mockReturnValueOnce('voice-pb-2');

      await audio.playVoice('greeting');
      await audio.playVoice('instruction');

      expect(backend.stop).toHaveBeenCalledWith('voice-pb-1');
    });

    it('plays voice at volume 0 when muted', async () => {
      audio.mute('voice');
      await audio.playVoice('welcome');

      expect(backend.play).toHaveBeenCalledWith('welcome', { volume: 0 });
    });
  });

  describe('setVolume', () => {
    it('clamps volume to 0-1 range', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');

      audio.setVolume('music', 1.5);
      expect(backend.volume).toHaveBeenCalledWith('music-pb', 1);

      audio.setVolume('music', -0.5);
      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0);
    });

    it('updates active music playback volume', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');

      audio.setVolume('music', 0.7);

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0.7);
    });

    it('updates active voice playback volume', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('voice-pb');
      await audio.playVoice('clip');

      audio.setVolume('voice', 0.5);

      expect(backend.volume).toHaveBeenCalledWith('voice-pb', 0.5);
    });

    it('does not update backend for SFX (fire-and-forget)', async () => {
      await audio.playSFX('click');

      audio.setVolume('sfx', 0.5);

      expect(backend.volume).not.toHaveBeenCalled();
    });

    it('does not update backend when channel is muted', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');
      audio.mute('music');

      // Clear mock to isolate the setVolume call
      (backend.volume as ReturnType<typeof vi.fn>).mockClear();

      audio.setVolume('music', 0.8);

      expect(backend.volume).not.toHaveBeenCalled();
    });
  });

  describe('mute', () => {
    it('mutes a specific channel and sets active playback volume to 0', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');

      audio.mute('music');

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0);
    });

    it('mutes all channels when no argument', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('music-pb')
        .mockReturnValueOnce('voice-pb');
      await audio.playMusic('track');
      await audio.playVoice('clip');

      audio.mute();

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0);
      expect(backend.volume).toHaveBeenCalledWith('voice-pb', 0);
    });
  });

  describe('unmute', () => {
    it('unmutes a specific channel and restores active playback volume', async () => {
      (backend.play as ReturnType<typeof vi.fn>).mockReturnValue('music-pb');
      await audio.playMusic('track');
      audio.mute('music');

      // Clear mock to isolate unmute behavior
      (backend.volume as ReturnType<typeof vi.fn>).mockClear();

      audio.unmute('music');

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0.3);
    });

    it('unmutes all channels when no argument', async () => {
      (backend.play as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('music-pb')
        .mockReturnValueOnce('voice-pb');
      await audio.playMusic('track');
      await audio.playVoice('clip');
      audio.mute();

      (backend.volume as ReturnType<typeof vi.fn>).mockClear();

      audio.unmute();

      expect(backend.volume).toHaveBeenCalledWith('music-pb', 0.3);
      expect(backend.volume).toHaveBeenCalledWith('voice-pb', 1.0);
    });
  });

  describe('preload', () => {
    it('loads each asset with correct category path', async () => {
      await audio.preload(['sfx:click', 'music:main-theme', 'voice:welcome']);

      expect(backend.load).toHaveBeenCalledWith('click', '/audio/sfx/click.mp3');
      expect(backend.load).toHaveBeenCalledWith('main-theme', '/audio/music/main-theme.mp3');
      expect(backend.load).toHaveBeenCalledWith('welcome', '/audio/voice/welcome.mp3');
    });

    it('defaults to sfx category when no prefix', async () => {
      await audio.preload(['click', 'correct']);

      expect(backend.load).toHaveBeenCalledWith('click', '/audio/sfx/click.mp3');
      expect(backend.load).toHaveBeenCalledWith('correct', '/audio/sfx/correct.mp3');
    });

    it('resolves when all assets are loaded', async () => {
      await expect(audio.preload(['sfx:click', 'music:theme'])).resolves.toBeUndefined();
      expect(backend.load).toHaveBeenCalledTimes(2);
    });

    it('does not reload already-loaded assets', async () => {
      await audio.preload(['sfx:click']);
      await audio.preload(['sfx:click']);

      expect(backend.load).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: FAIL — `./audio-manager` module not found.

- [ ] **Step 3: Implement RealAudioManager**

Create `/home/jude/code/kids/platform/src/services/audio-manager.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kids-games-zone/platform test`
Expected: All RealAudioManager tests PASS. All existing StubAudioManager tests PASS.

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm lint`
Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add platform/src/services/audio-manager.ts platform/src/services/audio-manager.test.ts
git commit -m "feat: add RealAudioManager with full test coverage

TDD implementation of RealAudioManager with three independent channels
(music, sfx, voice). Tests mock AudioBackend interface. Covers playback,
volume, mute/unmute, preload, and race condition prevention."
```

---

## Chunk 2: Backend, Audio Files & Integration (Tasks 4-6)

HowlerBackend adapter, placeholder audio files, and final integration.

### Task 4: Create HowlerBackend

**Files:**
- Create: `platform/src/services/audio-howler.ts`

- [ ] **Step 1: Create HowlerBackend**

Create `/home/jude/code/kids/platform/src/services/audio-howler.ts`:

```typescript
import { Howl } from 'howler';
import type { AudioBackend } from './audio-backend';

export class HowlerBackend implements AudioBackend {
  private sounds = new Map<string, Howl>();
  private playbackMap = new Map<string, { howl: Howl; soundId: number }>();

  load(id: string, src: string): Promise<void> {
    if (this.sounds.has(id)) {
      return Promise.resolve();
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
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add platform/src/services/audio-howler.ts
git commit -m "feat: add HowlerBackend wrapping Howler.js

Thin adapter implementing AudioBackend interface. Manages Howl instances
and maps string playback IDs to Howler sound IDs."
```

---

### Task 5: Create placeholder audio files

**Files:**
- Create: `platform/public/audio/sfx/click.mp3`
- Create: `platform/public/audio/sfx/correct.mp3`
- Create: `platform/public/audio/sfx/incorrect.mp3`
- Create: `platform/public/audio/sfx/celebrate.mp3`

- [ ] **Step 1: Create audio directory**

Run:
```bash
mkdir -p /home/jude/code/kids/platform/public/audio/sfx
```

- [ ] **Step 2: Generate placeholder MP3 files**

Create a Node.js script to generate minimal valid MP3 files. These are tiny valid MPEG audio frames that will play as brief silent/near-silent clips. They serve as placeholders until real audio assets are created.

Run:
```bash
node -e "
const fs = require('fs');
const path = require('path');

// Minimal valid MP3 frame (MPEG1 Layer 3, 128kbps, 44100Hz, mono)
// This is a single valid MPEG audio frame header + padding that produces
// a brief silent click. ~417 bytes per frame.
const MP3_HEADER = Buffer.from([
  // Frame header: sync word (0xFFE0) + MPEG1, Layer3, 128kbps, 44100Hz, mono
  0xFF, 0xFB, 0x90, 0x00,
]);

// Create a minimal valid MP3 with a few frames of silence
function createMinimalMp3(frameCount) {
  // Each MPEG1 Layer3 128kbps frame is 417 bytes
  const frameSize = 417;
  const buf = Buffer.alloc(frameCount * frameSize, 0);
  for (let i = 0; i < frameCount; i++) {
    buf[i * frameSize] = 0xFF;
    buf[i * frameSize + 1] = 0xFB;
    buf[i * frameSize + 2] = 0x90;
    buf[i * frameSize + 3] = 0x00;
  }
  return buf;
}

const dir = '/home/jude/code/kids/platform/public/audio/sfx';

// click.mp3 — ~100ms (4 frames at ~26ms each)
fs.writeFileSync(path.join(dir, 'click.mp3'), createMinimalMp3(4));

// correct.mp3 — ~500ms (19 frames)
fs.writeFileSync(path.join(dir, 'correct.mp3'), createMinimalMp3(19));

// incorrect.mp3 — ~400ms (15 frames)
fs.writeFileSync(path.join(dir, 'incorrect.mp3'), createMinimalMp3(15));

// celebrate.mp3 — ~1.5s (58 frames)
fs.writeFileSync(path.join(dir, 'celebrate.mp3'), createMinimalMp3(58));

console.log('Created placeholder MP3 files:');
for (const f of fs.readdirSync(dir)) {
  const stat = fs.statSync(path.join(dir, f));
  console.log('  ' + f + ' (' + stat.size + ' bytes)');
}
"
```

Expected: Four MP3 files created in `platform/public/audio/sfx/`.

- [ ] **Step 3: Verify files exist**

Run: `ls -la /home/jude/code/kids/platform/public/audio/sfx/`
Expected: `click.mp3`, `correct.mp3`, `incorrect.mp3`, `celebrate.mp3` all present.

- [ ] **Step 4: Commit**

```bash
git add platform/public/audio/sfx/
git commit -m "feat: add placeholder SFX audio files

Four minimal MP3 placeholders (click, correct, incorrect, celebrate)
for immediate use by Phase 3 games. Will be replaced with real audio."
```

---

### Task 6: Integration — wire up RealAudioManager in main.tsx

**Files:**
- Modify: `platform/src/main.tsx`

- [ ] **Step 1: Update main.tsx to use RealAudioManager**

Replace the contents of `/home/jude/code/kids/platform/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PlatformProvider } from './context/PlatformContext';
import { IndexedDBStorageManager } from './services/storage';
import { RealAudioManager } from './services/audio-manager';
import { HowlerBackend } from './services/audio-howler';
import { gameRegistry } from './config/gameRegistry';
import './styles/global.css';

const storageManager = new IndexedDBStorageManager();
storageManager.init().catch((err) => {
  console.warn('IndexedDB initialization failed. Running in-memory only:', err);
});

const audioManager = new RealAudioManager(new HowlerBackend());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider
        storageManager={storageManager}
        audioManager={audioManager}
        gameRegistry={gameRegistry}
      >
        <App />
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 2: Verify everything works**

Run: `pnpm typecheck`
Expected: Zero errors.

Run: `pnpm lint`
Expected: Zero errors.

Run: `pnpm test`
Expected: All tests pass (both StubAudioManager and RealAudioManager tests).

Run: `pnpm build`
Expected: Successful production build.

- [ ] **Step 3: Commit**

```bash
git add platform/src/main.tsx
git commit -m "feat: integrate RealAudioManager with HowlerBackend

Replace StubAudioManager with RealAudioManager in main.tsx.
Platform now plays real audio via Howler.js."
```
