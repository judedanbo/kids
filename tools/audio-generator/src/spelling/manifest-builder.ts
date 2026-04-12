import type { SpellingTierFile } from '@kids-games-zone/shared';
import type { Manifest, Phrase } from '../manifest.js';

export interface BuildManifestOptions {
  lang: string; // e.g. "en-US"
  voice: string;
  outputDir: string; // repo-relative, e.g. "platform/public/audio/narration/en"
}

/**
 * Turns reviewed spelling-bee word lists into a TTS manifest. Every non-empty
 * metadata field becomes one phrase:
 *
 *   word       → word-{slug}
 *   definition → def-{slug}
 *   sentence   → sentence-{slug}
 *   origin     → origin-{slug}
 */
export function buildSpellingManifest(
  tierFiles: SpellingTierFile[],
  opts: BuildManifestOptions,
): Manifest {
  const phrases: Phrase[] = [];
  const seen = new Set<string>();

  for (const tier of tierFiles) {
    for (const entry of tier.words) {
      const slug = slugify(entry.word);
      if (!slug) continue;

      push(phrases, seen, {
        id: `word-${slug}`,
        text: entry.word,
        rate: 0.9,
      });

      if (nonEmpty(entry.definition)) {
        push(phrases, seen, {
          id: `def-${slug}`,
          text: entry.definition,
          rate: 1.0,
        });
      }
      if (nonEmpty(entry.sentence)) {
        push(phrases, seen, {
          id: `sentence-${slug}`,
          text: entry.sentence,
          rate: 1.0,
        });
      }
      if (nonEmpty(entry.origin)) {
        push(phrases, seen, {
          id: `origin-${slug}`,
          text: entry.origin,
          rate: 1.0,
        });
      }
    }
  }

  return {
    name: 'spelling-bee',
    lang: opts.lang,
    provider: 'openai',
    voice: opts.voice,
    outputDir: opts.outputDir,
    phrases,
  };
}

function slugify(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

function push(phrases: Phrase[], seen: Set<string>, phrase: Phrase): void {
  if (seen.has(phrase.id)) return; // first occurrence wins (lowest tier)
  seen.add(phrase.id);
  phrases.push(phrase);
}
