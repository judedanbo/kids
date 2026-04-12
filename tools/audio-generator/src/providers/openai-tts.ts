import OpenAI from 'openai';
import type { TTSGenerateOptions, TTSProvider } from './tts-provider.js';

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';
const OPENAI_VOICES: readonly OpenAIVoice[] = [
  'alloy',
  'echo',
  'fable',
  'nova',
  'onyx',
  'shimmer',
];

function isOpenAIVoice(v: string): v is OpenAIVoice {
  return (OPENAI_VOICES as readonly string[]).includes(v);
}

export class OpenAITTSProvider implements TTSProvider {
  readonly name = 'openai-tts';
  readonly version = 'tts-1@2024-06';
  readonly supportsSSML = false;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(opts: TTSGenerateOptions): Promise<Buffer> {
    if (opts.ssml) {
      throw new Error('OpenAI TTS does not support SSML; use plain text.');
    }
    if (!opts.text) {
      throw new Error('OpenAI TTS requires a non-empty `text` field.');
    }
    if (!isOpenAIVoice(opts.voice)) {
      throw new Error(
        `Unknown OpenAI voice "${opts.voice}". ` +
          `Valid voices: ${OPENAI_VOICES.join(', ')}.`,
      );
    }

    const res = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: opts.voice,
      input: opts.text,
      speed: opts.rate,
      response_format: 'mp3',
    });
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  // tts-1 pricing (as of 2024-06): $15 per 1M input characters.
  estimateCostUsd(charCount: number): number {
    return (charCount / 1_000_000) * 15;
  }
}
