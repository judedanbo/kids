const DEFAULT_ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';

export interface SFXGenerateOptions {
  prompt: string;
  durationSeconds?: number;
  promptInfluence?: number;
}

export interface SFXProvider {
  readonly name: string;
  readonly version: string;
  generate(opts: SFXGenerateOptions): Promise<Buffer>;
}

export class ElevenLabsSFXProvider implements SFXProvider {
  readonly name = 'elevenlabs-sfx';
  readonly version = 'sound-generation@2024';
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(apiKey: string, endpoint = DEFAULT_ENDPOINT) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async generate(opts: SFXGenerateOptions): Promise<Buffer> {
    const body: Record<string, unknown> = { text: opts.prompt };
    if (opts.durationSeconds !== undefined) {
      body.duration_seconds = opts.durationSeconds;
    }
    if (opts.promptInfluence !== undefined) {
      body.prompt_influence = opts.promptInfluence;
    }

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(
        `ElevenLabs SFX API ${res.status} ${res.statusText}: ${errBody.slice(0, 500)}`,
      );
    }

    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
}
