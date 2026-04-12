# @kids-games-zone/audio-generator

Offline pipeline that turns game content into pre-recorded MP3s.

Two stages:

1. **`content`** — uses an LLM to fill missing `definition` / `sentence` / `origin`
   fields on the spelling-bee word lists (written back in place).
2. **`audio`** — derives a TTS manifest from the enriched word lists, synthesises
   each phrase with OpenAI TTS, runs it through ffmpeg for loudness normalisation,
   and writes MP3s to `platform/public/audio/narration/<lang>/`.

## Prerequisites

- Node 20+
- `ffmpeg` on `PATH`
- `OPENAI_API_KEY` (copy `.env.example` to `.env`)

## Usage

```bash
# From the repo root:
pnpm gen:content --game spelling-bee           # fill in missing word metadata
pnpm gen:audio   --game spelling-bee --lang en # synthesize audio
pnpm gen:audio   --game spelling-bee --dry-run # cost estimate, no API calls
pnpm gen:audio   --game spelling-bee --force   # ignore cache
```

Cache lives in `.audio-cache/` (gitignored). Lockfile at `audio-lock.json` maps
each phrase id to the hash of the input used to generate it, so PR diffs show
which phrases changed.

## Adding a word

1. Add a new entry to the relevant `games/spelling-bee/src/data/words-*.json`
   file (only `word` and `difficulty` are required).
2. Run `pnpm gen:content --game spelling-bee` to fill in definition/sentence/origin.
3. Review the JSON diff — reject anything unsafe or off-tone by editing the field
   directly. Reviewed hand-edits are preserved on future runs.
4. Run `pnpm gen:audio --game spelling-bee` to produce MP3s.
5. Commit the JSON diffs and the new MP3s.
