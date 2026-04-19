import { z } from 'zod';

/**
 * A single TTS phrase to render. `id` becomes the MP3 filename and the asset
 * id consumed by `AudioManager.playVoice`. Exactly one of `text` or `ssml`
 * must be supplied.
 */
export const PhraseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be kebab-case (a-z, 0-9, -)'),
    text: z.string().min(1).optional(),
    ssml: z.string().min(1).optional(),
    voice: z.string().optional(),
    rate: z.number().min(0.5).max(1.5).default(1.0),
  })
  .refine((p) => Boolean(p.text) !== Boolean(p.ssml), {
    message: 'exactly one of text or ssml is required',
  });

export const ManifestSchema = z.object({
  name: z.string().min(1),
  lang: z.string().min(2),
  provider: z.enum(['openai']).default('openai'),
  voice: z.string().min(1),
  outputDir: z.string().min(1),
  phrases: z.array(PhraseSchema),
});

export type Phrase = z.infer<typeof PhraseSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
