import { z } from 'zod';

export const MusicTrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be kebab-case (a-z, 0-9, -)'),
  prompt: z.string().min(10),
  durationMs: z.number().int().min(5_000).max(300_000),
});

export const MusicManifestSchema = z.object({
  version: z.literal(1),
  provider: z.literal('elevenlabs-music').default('elevenlabs-music'),
  modelId: z.string().default('music_v1'),
  outputDir: z.string().min(1).default('platform/public/audio/music'),
  tracks: z.array(MusicTrackSchema).min(1),
});

export type MusicTrack = z.infer<typeof MusicTrackSchema>;
export type MusicManifest = z.infer<typeof MusicManifestSchema>;
