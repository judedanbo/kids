import type { AgeTier } from '@kids-games-zone/shared';

export interface ContentRequest {
  word: string;
  ageTier: AgeTier;
  lang: string;
}

export interface ContentResult {
  definition: string;
  sentence: string;
  /** `null` when the model is not confident about the etymology. */
  origin: string | null;
}

export interface ContentProvider {
  readonly name: string;
  readonly version: string;
  generate(req: ContentRequest): Promise<ContentResult>;
  /** Approximate cost in USD for one call. */
  estimateCostUsd(req: ContentRequest): number;
}
