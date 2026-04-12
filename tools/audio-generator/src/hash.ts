import { createHash } from 'node:crypto';
import type { Phrase } from './manifest.js';
import type { TTSProvider } from './providers/tts-provider.js';

/**
 * Deterministic content-addressed hash for a phrase. Any field that could
 * change the rendered audio participates; `id` and `outputDir` do not, so a
 * renamed phrase with identical text stays cache-hit.
 */
export function phraseHash(
  phrase: Phrase,
  manifestVoice: string,
  lang: string,
  provider: TTSProvider,
): string {
  const payload = JSON.stringify({
    text: phrase.text ?? null,
    ssml: phrase.ssml ?? null,
    voice: phrase.voice ?? manifestVoice,
    rate: phrase.rate,
    lang,
    provider: provider.name,
    providerVersion: provider.version,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}
