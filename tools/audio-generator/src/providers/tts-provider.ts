export interface TTSGenerateOptions {
  text?: string;
  ssml?: string;
  voice: string;
  lang: string;
  rate: number;
}

export interface TTSProvider {
  /** Stable name — part of the cache hash. */
  readonly name: string;
  /** Bump to invalidate the cache when the upstream model changes. */
  readonly version: string;
  readonly supportsSSML: boolean;

  generate(opts: TTSGenerateOptions): Promise<Buffer>;
  estimateCostUsd(charCount: number): number;
}
