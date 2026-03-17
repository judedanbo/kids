export function scrambleWord(word: string): string {
  if (word.length <= 1) return word;
  if (word.length === 2) return word[1] + word[0];

  const letters = word.split('');

  for (let attempt = 0; attempt < 10; attempt++) {
    // Fisher-Yates shuffle
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const result = shuffled.join('');
    if (result !== word) return result;
  }

  // Fallback: swap first two letters
  const fallback = [...letters];
  [fallback[0], fallback[1]] = [fallback[1], fallback[0]];
  return fallback.join('');
}
