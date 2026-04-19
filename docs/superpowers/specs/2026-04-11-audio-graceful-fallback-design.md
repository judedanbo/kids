# Audio Graceful Fallback & Programmatic Music

**Date:** 2026-04-11
**Status:** Approved
**Branch:** feat/phase7-first-game-batch

## Problem

Games call `audioManager.playMusic('music:game-bgm')` but no music files exist at `/platform/public/audio/music/`. This causes an unhandled promise rejection:

```
Uncaught (in promise) Error: Failed to load audio "music:game-bgm": Decoding audio data failed.
```

The error surfaces because `HowlerBackend.load()` rejects, and `RealAudioManager.ensureLoaded()` does not catch the rejection.

## Solution

Two changes:

1. **Graceful error handling** in `RealAudioManager` so missing audio files never crash the app.
2. **Programmatic music generator** using Web Audio API that provides a fallback background track when file-based music is unavailable.

## Design

### 1. Graceful Error Handling

**File:** `platform/src/services/audio-manager.ts`

`RealAudioManager` gains a `failedAssets: Set<string>` alongside the existing `loadedAssets: Set<string>`.

**Modified `ensureLoaded()` flow:**

1. If id is in `loadedAssets` — return (already loaded successfully).
2. If id is in `failedAssets` — return (already tried and failed, skip silently).
3. Try `backend.load(id, path)`.
4. On success — add to `loadedAssets`.
5. On failure — `console.warn`, add to `failedAssets`.

**Guarding callers:** `playMusic()`, `playSFX()`, and `playVoice()` check `loadedAssets.has(id)` before calling `backend.play()`. If the asset never loaded, the call becomes a no-op.

**No interface changes.** `AudioManager`, `AudioBackend`, `GameProps`, and all game code remain untouched.

### 2. Web Audio Music Generator

**New file:** `platform/src/services/audio-music-generator.ts`

Synthesizes a short, looping, playful melody using the Web Audio API.

**Sound design (playful & minimal):**

- **Melody:** Pentatonic scale pattern (C, D, E, G, A) — always pleasant, no dissonant intervals.
- **Voices:** 2 oscillators — melody (sine/triangle wave) + soft bass (sine, low octave).
- **Rhythm:** 8-bar loop, ~120 BPM, each note ~250ms.
- **Envelope:** Gentle attack/decay via `GainNode` to avoid harsh clicks.
- **Volume:** Respects the music channel volume (default 0.3).

**API:**

```typescript
class WebAudioMusicGenerator {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  start(options?: { volume?: number; fadeIn?: number }): void;
  stop(options?: { fadeOut?: number }): void;
  setVolume(level: number): void;
  isActive(): boolean;
}
```

**Key decisions:**

- Single shared `AudioContext`, created lazily and reused.
- Melody loops via `setTimeout`-based note scheduling.
- Not an `AudioBackend` implementation — it's a separate collaborator for music-only fallback.

### 3. Integration

**Modified `RealAudioManager` constructor:**

```typescript
constructor(backend: AudioBackend, musicGenerator?: WebAudioMusicGenerator)
```

Optional parameter so existing tests and stub usage don't break.

**Modified `playMusic()` flow:**

1. Stop any current music (file-based OR generated).
2. Try `ensureLoaded(trackId, 'music')`.
3. If loaded successfully — play via backend (existing path).
4. If in `failedAssets` AND generator exists — `musicGenerator.start({ volume, fadeIn })`, set `usingGenerator = true`.
5. If failed AND no generator — silent no-op.

**Modified `stopMusic()` flow:**

1. If `usingGenerator` — `musicGenerator.stop({ fadeOut })`.
2. Else — stop via backend.
3. Reset state.

**Volume/mute forwarding:** When `usingGenerator` is true, `setVolume('music')` and `mute()`/`unmute()` forward to `musicGenerator.setVolume()`.

**New state on `RealAudioManager`:**

- `failedAssets: Set<string>` — IDs that failed to load.
- `usingGenerator: boolean` — whether current music is from the generator.
- `musicGenerator: WebAudioMusicGenerator | null` — optional generator instance.

**Production wiring** (`main.tsx`):

```typescript
const musicGenerator = new WebAudioMusicGenerator();
const audioManager = new RealAudioManager(new HowlerBackend(), musicGenerator);
```

### 4. Testing Strategy

**Graceful error handling tests (`audio-manager.test.ts`):**

- `ensureLoaded` catches rejection, adds to `failedAssets`, logs warning.
- Second call for same failed asset skips load attempt.
- `playMusic`/`playSFX`/`playVoice` with failed asset — silent no-op.
- `preload` with mix of valid/invalid assets — loads what it can, warns for rest.

**Generator tests (`audio-music-generator.test.ts`):**

- `start()` creates AudioContext and begins playback.
- `stop()` cleans up nodes, `isActive()` returns false.
- `setVolume()` adjusts gain node value.
- `stop({ fadeOut })` ramps gain to 0 before cleanup.
- Multiple `start()` calls don't create multiple contexts.
- Restart works after `stop()` then `start()`.

**Integration tests (`audio-manager.test.ts` — extended):**

- Failed asset + generator present — generator.start() called.
- `stopMusic` when generator active — generator.stop() called.
- Volume/mute forwarding when generator active.
- File-based music takes priority when available.

**Mocking:** Mock `AudioContext`, `OscillatorNode`, `GainNode` for generator tests. Existing `AudioBackend` mock pattern for manager tests (reject `load()` for specific IDs).

**No game test changes needed.**

## Files Changed

| File                                                            | Change                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `platform/src/services/audio-manager.ts`                        | Add failedAssets, guard callers, generator integration |
| `platform/src/services/audio-music-generator.ts`                | New file — Web Audio music generator                   |
| `platform/src/main.tsx`                                         | Wire generator into RealAudioManager                   |
| `platform/src/services/__tests__/audio-manager.test.ts`         | Error handling + integration tests                     |
| `platform/src/services/__tests__/audio-music-generator.test.ts` | New file — generator tests                             |

## Scope Boundaries

**In scope:**

- Graceful error handling for all audio load failures.
- Programmatic background music fallback.
- Tests for both.

**Out of scope:**

- Sourcing real music/voice/narration audio files.
- Generating fallback SFX or voice (only music gets the generator fallback).
- Changes to the `AudioBackend` or `AudioManager` interfaces.
- Changes to any game code.
