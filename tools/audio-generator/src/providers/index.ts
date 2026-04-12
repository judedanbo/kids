import { OpenAITTSProvider } from './openai-tts.js';
import type { TTSProvider } from './tts-provider.js';

export type TTSProviderName = 'openai';

export function makeTTSProvider(name: TTSProviderName): TTSProvider {
  switch (name) {
    case 'openai': {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error(
          'OPENAI_API_KEY is not set. Copy tools/audio-generator/.env.example ' +
            'to .env and add your key.',
        );
      }
      return new OpenAITTSProvider(key);
    }
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown TTS provider: ${String(exhaustive)}`);
    }
  }
}

export type { TTSProvider } from './tts-provider.js';
