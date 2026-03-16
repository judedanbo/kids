# AudioManager — Real Implementation with Swappable Backend

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Replace StubAudioManager with a real AudioManager using Howler.js, adapter pattern for backend swapability, placeholder SFX files

---

## Summary

Replace the console-logging `StubAudioManager` with a real `RealAudioManager` that plays audio via Howler.js. Uses an adapter pattern (`AudioBackend` interface) so the audio library can be swapped without touching game code or the AudioManager's public API. Includes 4 placeholder SFX files for immediate use by Phase 3 games.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audio library | Howler.js (~10KB gzipped) | Battle-tested, handles autoplay policies, codec fallbacks, audio sprites, mobile quirks |
| Architecture | Adapter pattern — `AudioBackend` interface | Swappable backends (Howler.js now, Web Audio API later) without changing consumers |
| Location | `platform/src/services/` | AudioManager is a platform service; games receive it via `GameProps` |
| Audio files | 4 placeholder SFX in `platform/public/audio/sfx/` | Gives Phase 3 games immediate audio feedback without sourcing their own |
| Asset resolution | Convention-based: `/audio/sfx/{id}.mp3` | Simple, no config needed; configurable later if required |
| Testing | Mock `AudioBackend`, not Howler.js | Tests validate AudioManager logic without browser audio APIs |

---

## Architecture

```
AudioManager (implements shared AudioManager interface)
  └── AudioBackend (internal interface)
        ├── HowlerBackend (default — wraps Howler.js)
        └── StubBackend (for tests — no-op)
        └── (future: WebAudioBackend, etc.)
```

**Three independent channels:** music, sfx, voice — each with its own volume level and mute state.

- **Music:** Background loops. One track at a time. Supports fade-in/fade-out.
- **SFX:** Fire-and-forget short sounds. Multiple can overlap.
- **Voice:** Narration/speech. One at a time. Calls `onComplete` when finished.

---

## AudioBackend Interface

### `platform/src/services/audio-backend.ts`

The internal contract for audio library adapters:

```typescript
export interface AudioBackend {
  load(id: string, src: string): Promise<void>;
  play(id: string, options?: { loop?: boolean; volume?: number }): string;
  stop(playbackId: string): void;
  stopAll(): void;
  fade(playbackId: string, from: number, to: number, duration: number): void;
  volume(playbackId: string, level: number): void;
  isPlaying(playbackId: string): boolean;
  onEnd(playbackId: string, callback: () => void): void;
  unload(id: string): void;
}
```

Methods return simple types (string playback IDs, booleans). No Howler-specific types leak through the interface.

---

## HowlerBackend

### `platform/src/services/audio-howler.ts`

Wraps Howler.js's `Howl` class:

- Maintains a `Map<string, Howl>` of loaded sounds keyed by asset ID
- `load(id, src)` — creates a `new Howl({ src: [src] })`, returns a Promise that resolves on the `load` event (rejects on `loaderror`)
- `play(id, options)` — calls `howl.play()`, applies loop and volume if provided, returns the Howler sound ID as a string
- `stop(playbackId)` — calls `howl.stop(soundId)`
- `stopAll()` — stops all active Howl instances
- `fade(playbackId, from, to, duration)` — calls `howl.fade(from, to, duration, soundId)`
- `volume(playbackId, level)` — calls `howl.volume(level, soundId)`
- `isPlaying(playbackId)` — calls `howl.playing(soundId)`
- `onEnd(playbackId, callback)` — calls `howl.on('end', callback, soundId)`
- `unload(id)` — calls `howl.unload()`, removes from map

---

## RealAudioManager

### `platform/src/services/audio-manager.ts`

Implements the shared `AudioManager` interface. Delegates playback to an injected `AudioBackend`.

**Channel state:**

```typescript
interface ChannelState {
  volume: number;
  muted: boolean;
  currentPlaybackId: string | null;
}
```

Three channels initialized with defaults:
- music: `{ volume: 0.3, muted: false, currentPlaybackId: null }`
- sfx: `{ volume: 1.0, muted: false, currentPlaybackId: null }`
- voice: `{ volume: 1.0, muted: false, currentPlaybackId: null }`

**Asset resolution:**

Audio assets are referenced by ID (e.g., `"click"`, `"correct"`). The AudioManager resolves IDs to file paths:
- SFX: `/audio/sfx/{id}.mp3`
- Music: `/audio/music/{id}.mp3`
- Voice: `/audio/voice/{id}.mp3`

The category is inferred from the method called (playSFX → sfx path, playMusic → music path, playVoice → voice path).

**Method implementations:**

### `playMusic(trackId, options?)`
1. If music is currently playing, stop it (with fade-out if `options.fadeOut` from `stopMusic` applies, else immediate)
2. Resolve path: `/audio/music/${trackId}.mp3`
3. Load if not already loaded: `backend.load(trackId, path)`
4. Play with `{ loop: options?.loop ?? true, volume: muted ? 0 : channels.music.volume }`
5. If `options?.fadeIn`, fade from 0 to channel volume over `fadeIn` ms
6. Store playback ID in `channels.music.currentPlaybackId`

### `stopMusic(options?)`
1. If no music playing, return
2. If `options?.fadeOut`, fade to 0 over `fadeOut` ms, then stop
3. Else, stop immediately
4. Clear `channels.music.currentPlaybackId`

### `playSFX(sfxId)`
1. Resolve path: `/audio/sfx/${sfxId}.mp3`
2. Load if not already loaded
3. Play with `{ volume: muted ? 0 : channels.sfx.volume }`
4. Fire-and-forget — no tracking of playback ID

### `playVoice(voiceId, onComplete?)`
1. If voice is currently playing, stop it
2. Resolve path: `/audio/voice/${voiceId}.mp3`
3. Load if not already loaded
4. Play with `{ volume: muted ? 0 : channels.voice.volume }`
5. Register `onEnd` callback: calls `onComplete()` when voice clip finishes
6. Store playback ID in `channels.voice.currentPlaybackId`

### `setVolume(category, level)`
1. Clamp `level` to 0-1
2. Update `channels[category].volume = level`
3. If channel has an active playback and is not muted, update `backend.volume(playbackId, level)`

### `mute(category?)`
1. If category specified, mute that channel: set `channels[category].muted = true`, set active playback volume to 0
2. If no category, mute all three channels

### `unmute(category?)`
1. If category specified, unmute: set `channels[category].muted = false`, restore volume on active playback
2. If no category, unmute all three channels

### `preload(assetIds)`
1. For each asset ID, determine category by prefix convention (or default to sfx)
2. Call `backend.load(id, resolvedPath)` for each
3. Return `Promise.all()` — resolves when all assets are loaded

**Preload prefix convention:** Asset IDs can be prefixed to indicate category:
- `music:track-name` → loads from `/audio/music/track-name.mp3`
- `voice:instruction-1` → loads from `/audio/voice/instruction-1.mp3`
- `click` (no prefix) → defaults to `/audio/sfx/click.mp3`

---

## Placeholder Audio Files

### `platform/public/audio/sfx/`

Four MP3 files, CC0-licensed or generated:

| File | Description | Duration | Source |
|------|-------------|----------|--------|
| `click.mp3` | Soft UI tap/click | ~100ms | Generated tone |
| `correct.mp3` | Cheerful ascending chime | ~500ms | Generated tone |
| `incorrect.mp3` | Gentle low tone (not harsh — encouragement-first design) | ~400ms | Generated tone |
| `celebrate.mp3` | Short celebration fanfare | ~1.5s | Generated tone |

These are minimal synthesized tones. Real game-specific audio replaces or supplements them in Phase 3+.

---

## Integration

### `platform/src/main.tsx` update

Replace:
```typescript
import { StubAudioManager } from './services/audio';
const audioManager = new StubAudioManager();
```

With:
```typescript
import { RealAudioManager } from './services/audio-manager';
import { HowlerBackend } from './services/audio-howler';
const audioManager = new RealAudioManager(new HowlerBackend());
```

### Existing code preserved

- `StubAudioManager` stays in `audio-stub.ts` (renamed from `audio.ts`) — used in tests and as a fallback
- Existing `audio.test.ts` stays, testing the stub
- No changes to the `AudioManager` interface in `shared/src/types/services.ts`
- No changes to how games receive the audio manager (via `GameProps`)

---

## Dependencies

### New packages

| Package | Location | Purpose |
|---------|----------|---------|
| `howler` | `platform/package.json` dependencies | Audio playback library |
| `@types/howler` | root `package.json` devDependencies | TypeScript type definitions |

---

## File Structure

```
platform/src/services/
├── audio-stub.ts           # (renamed from audio.ts) StubAudioManager — unchanged
├── audio-backend.ts        # AudioBackend interface
├── audio-howler.ts         # HowlerBackend (Howler.js adapter)
├── audio-manager.ts        # RealAudioManager (implements shared AudioManager)
├── audio-manager.test.ts   # Tests for RealAudioManager (mocked backend)
├── audio.test.ts           # (existing) StubAudioManager tests
└── storage.ts              # (existing, unchanged)

platform/public/audio/sfx/
├── click.mp3
├── correct.mp3
├── incorrect.mp3
└── celebrate.mp3
```

---

## Testing Strategy

### RealAudioManager tests (`audio-manager.test.ts`)

Mock the `AudioBackend` interface — create a mock object with `vi.fn()` for each method. Test:

- `playMusic` calls `backend.play` with `{ loop: true }` by default
- `playMusic` with `fadeIn` calls `backend.fade`
- `stopMusic` calls `backend.stop` on current music playback
- `stopMusic` with `fadeOut` calls `backend.fade` before stopping
- `playSFX` calls `backend.play` with correct volume (fire-and-forget)
- `playVoice` calls `backend.play` and registers `onEnd` callback
- `playVoice` stops previous voice before playing new one
- `setVolume` updates channel volume and applies to active playback
- `mute` sets active playback volume to 0
- `unmute` restores active playback volume
- `mute()` with no argument mutes all channels
- `preload` calls `backend.load` for each asset ID

### HowlerBackend

Not unit-tested — thin wrapper over Howler.js. Validated by manual browser testing.

### StubAudioManager

Existing tests unchanged.

---

## Acceptance Criteria

- [ ] `RealAudioManager` implements the shared `AudioManager` interface
- [ ] `AudioBackend` interface enables swappable audio libraries
- [ ] `HowlerBackend` wraps Howler.js and handles load/play/stop/fade/volume
- [ ] Three independent channels (music, sfx, voice) with separate volume/mute state
- [ ] `StubAudioManager` preserved for tests and fallback
- [ ] Placeholder SFX files present in `platform/public/audio/sfx/`
- [ ] `main.tsx` uses `RealAudioManager` with `HowlerBackend`
- [ ] All tests pass (`pnpm test`)
- [ ] Typecheck clean (`pnpm typecheck`)
- [ ] Lint clean (`pnpm lint`)
