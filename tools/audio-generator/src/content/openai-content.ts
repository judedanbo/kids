import OpenAI from 'openai';
import { z } from 'zod';
import type { AgeTier } from '@kids-games-zone/shared';
import type {
  ContentProvider,
  ContentRequest,
  ContentResult,
} from './content-provider.js';

const ResponseSchema = z.object({
  definition: z.string().min(3).max(200),
  sentence: z.string().min(5).max(200),
  origin: z.union([z.string().min(3).max(220), z.null()]),
});

const SYSTEM_PROMPTS: Record<AgeTier, string> = {
  tiny: [
    'You write spelling-bee content for children ages 3 to 5.',
    'Use only simple, common English words a preschooler would know.',
    'Exactly one short sentence per field (under 15 words each).',
    'Never use the target word inside its own definition.',
    'Keep everything safe, positive, concrete, and non-scary.',
    'Origin: return null for this age tier.',
  ].join(' '),
  junior: [
    'You write spelling-bee content for children ages 6 to 8.',
    'Use clear, simple vocabulary. One sentence per field (under 20 words each).',
    'Never use the target word inside its own definition.',
    'Origin: return one short sentence only if you are confident in the etymology; otherwise null.',
    'Keep content safe, positive, and non-violent.',
  ].join(' '),
  explorer: [
    'You write spelling-bee content for children ages 9 to 12.',
    'Be accurate and age-appropriate. One sentence per field (under 25 words each).',
    'Never use the target word inside its own definition.',
    'Origin: include etymology (Latin, Greek, Old English, etc.) only if confidently known; otherwise null.',
    'Keep content safe, neutral, and non-violent.',
  ].join(' '),
};

export class OpenAIContentProvider implements ContentProvider {
  readonly name = 'openai-content';
  readonly version = 'gpt-4o-mini@2024-07-18';
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(req: ContentRequest): Promise<ContentResult> {
    const system = SYSTEM_PROMPTS[req.ageTier];
    const user = [
      `Word: "${req.word}"`,
      `Language: ${req.lang}`,
      'Return JSON with exactly these keys: definition, sentence, origin.',
      'definition: explain the word in plain language without reusing it.',
      'sentence: an everyday example sentence that uses the word naturally.',
      'origin: one short etymology sentence, or null if uncertain.',
    ].join('\n');

    const res = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error(`No content returned for "${req.word}"`);
    const raw: unknown = JSON.parse(content);
    return ResponseSchema.parse(raw);
  }

  // Rough blended estimate: ~$0.15/M in + $0.60/M out for gpt-4o-mini,
  // averaged for the tiny payloads we send (~200 tokens round-trip).
  estimateCostUsd(_req: ContentRequest): number {
    return 0.0003;
  }
}
