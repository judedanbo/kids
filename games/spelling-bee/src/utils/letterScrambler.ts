const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Returns the word's letters (uppercase) plus N distractor letters, all shuffled.
 * Distractors are random letters NOT present in the word.
 */
export function scrambleWithDistractors(word: string, distractorCount: number): string[] {
  const upperWord = word.toUpperCase();
  const wordLetters = upperWord.split('');
  const wordSet = new Set(wordLetters);

  const available = ALPHABET.split('').filter((l) => !wordSet.has(l));
  const distractors: string[] = [];
  for (let i = 0; i < distractorCount && i < available.length; i++) {
    const idx = Math.floor(Math.random() * available.length);
    distractors.push(available[idx]);
    available.splice(idx, 1);
  }

  const all = [...wordLetters, ...distractors];

  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all;
}
