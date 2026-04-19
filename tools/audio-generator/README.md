# @kids-games-zone/audio-generator

Offline pipeline that turns game content into pre-recorded MP3s.

Stages:

1. **`content`** — uses an LLM to fill missing `definition` / `sentence` / `origin`
   fields on the spelling-bee word lists (written back in place).
2. **`audio`** — derives a TTS manifest from the enriched word lists, synthesises
   each phrase with OpenAI TTS, runs it through ffmpeg for loudness normalisation,
   and writes MP3s to `platform/public/audio/narration/<lang>/`.
3. **`music`** — reads `plans/music.json` and generates background music tracks
   via the ElevenLabs Music API, writing MP3s to `platform/public/audio/music/`.
4. **`sfx`** — reads `plans/sfx.json` and generates UI/feedback sound effects via
   the ElevenLabs Sound Generation API, writing MP3s to `platform/public/audio/sfx/`.
5. **`encouragement`** — reads `plans/encouragement.json`, synthesises each text
   variant with OpenAI TTS, and emits `platform/src/generated/voice-variants.ts`
   so the runtime knows how to rotate through variants per base id.

## Prerequisites

- Node 20+
- `ffmpeg` on `PATH`
- `OPENAI_API_KEY` (for `content`, `audio`, `encouragement`)
- `ELEVENLABS_API_KEY` (for `music`, `sfx`)
- Copy `.env.example` to `.env` and add both keys.

## Usage

```bash
# From the repo root:
pnpm --filter @kids-games-zone/audio-generator content --game spelling-bee
pnpm --filter @kids-games-zone/audio-generator audio   --game spelling-bee --lang en
pnpm --filter @kids-games-zone/audio-generator audio:music
pnpm --filter @kids-games-zone/audio-generator audio:sfx
pnpm --filter @kids-games-zone/audio-generator audio:encouragement
```

Every command accepts `--dry-run` (lists work + cost estimate, no API calls) and
`--force` (ignore cache and regenerate).

### Outputs and lockfiles

| Command         | Plan file                  | Output dir                                | Lockfile          |
| --------------- | -------------------------- | ----------------------------------------- | ----------------- |
| `audio`         | (derived from word lists)  | `platform/public/audio/narration/{lang}/` | `audio-lock.json` |
| `encouragement` | `plans/encouragement.json` | `platform/public/audio/narration/{lang}/` | `audio-lock.json` |
| `music`         | `plans/music.json`         | `platform/public/audio/music/`            | `music-lock.json` |
| `sfx`           | `plans/sfx.json`           | `platform/public/audio/sfx/`              | `sfx-lock.json`   |

`encouragement` additionally writes `platform/src/generated/voice-variants.ts`,
which the platform imports in `main.tsx` and hands to `RealAudioManager.setVoiceVariants`
so `playVoice('voice:encouragement-correct')` picks a random variant per call.

Cache lives in `.audio-cache/` (gitignored). Each lockfile maps its ids to the
hash of the inputs used, so PR diffs show which assets changed.

### Approximate cost

- OpenAI TTS (`tts-1`): **$15 per 1M chars**. Encouragement plan (~350 chars)
  is well under $0.01 per full run.
- ElevenLabs Music: metered in credits per second of audio. A full music plan
  (~4 tracks, ~225s) spends roughly 225 × the per-second credit rate for your
  subscription tier — check your plan.
- ElevenLabs Sound Generation: metered in credits per second of audio.
  SFX plan (~4.5s total) is a negligible slice of a Creator-tier monthly budget.

## Adding a word

1. Add a new entry to the relevant `games/spelling-bee/src/data/words-*.json`
   file (only `word` and `difficulty` are required).
2. Run `pnpm gen:content --game spelling-bee` to fill in definition/sentence/origin.
3. Review the JSON diff — reject anything unsafe or off-tone by editing the field
   directly. Reviewed hand-edits are preserved on future runs.
4. Run `pnpm gen:audio --game spelling-bee` to produce MP3s.
5. Commit the JSON diffs and the new MP3s.
