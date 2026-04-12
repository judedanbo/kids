const DEFAULT_ENDPOINT = 'https://api.elevenlabs.io/v1/music';

export interface MusicGenerateOptions {
  prompt: string;
  durationMs: number;
  modelId?: string;
}

export interface MusicProvider {
  readonly name: string;
  readonly version: string;
  generate(opts: MusicGenerateOptions): Promise<Buffer>;
}

export class ElevenLabsMusicProvider implements MusicProvider {
  readonly name = 'elevenlabs-music';
  readonly version = 'music_v1@2025';
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(apiKey: string, endpoint = DEFAULT_ENDPOINT) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async generate(opts: MusicGenerateOptions): Promise<Buffer> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        music_length_ms: opts.durationMs,
        model_id: opts.modelId ?? 'music_v1',
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `ElevenLabs Music API ${res.status} ${res.statusText}: ${body.slice(0, 500)}`,
      );
    }

    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
}
