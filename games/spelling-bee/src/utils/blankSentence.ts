export const SENTENCE_BLANK = '_____';

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function blankSentence(sentence: string, word: string): string {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
  return sentence.replace(pattern, SENTENCE_BLANK);
}
