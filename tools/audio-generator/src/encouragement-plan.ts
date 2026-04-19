import { z } from 'zod';

export const EncouragementEntrySchema = z.object({
  baseId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'baseId must be kebab-case (a-z, 0-9, -)'),
  texts: z.array(z.string().min(1)).min(1),
});

export const EncouragementPlanSchema = z.object({
  version: z.literal(1),
  lang: z.string().min(2).default('en-US'),
  voice: z.string().min(1).default('nova'),
  provider: z.enum(['openai']).default('openai'),
  outputDir: z.string().min(1).default('platform/public/audio/narration/{langShort}'),
  entries: z.array(EncouragementEntrySchema).min(1),
});

export type EncouragementEntry = z.infer<typeof EncouragementEntrySchema>;
export type EncouragementPlan = z.infer<typeof EncouragementPlanSchema>;
