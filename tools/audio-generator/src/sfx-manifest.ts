import { z } from 'zod';

export const SFXEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be kebab-case (a-z, 0-9, -)'),
  prompt: z.string().min(3),
  durationSeconds: z.number().min(0.5).max(22).optional(),
  promptInfluence: z.number().min(0).max(1).optional(),
});

export const SFXManifestSchema = z.object({
  version: z.literal(1),
  provider: z.literal('elevenlabs-sfx').default('elevenlabs-sfx'),
  outputDir: z.string().min(1).default('platform/public/audio/sfx'),
  entries: z.array(SFXEntrySchema).min(1),
});

export type SFXEntry = z.infer<typeof SFXEntrySchema>;
export type SFXManifest = z.infer<typeof SFXManifestSchema>;
