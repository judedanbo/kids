/**
 * Light content safety checks. The LLM is already prompted to be age-appropriate;
 * these are defensive filters that flag suspicious output for human review.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(kill|killed|dead|death|die|dying|murder|blood|bloody|gun|weapon|knife|stab|shoot|shot)\b/i,
  /\b(hate|hated|hell|damn|stupid|idiot)\b/i,
  /\b(scary|terrif|horror|nightmare|monster)\b/i,
  /[<>]/, // raw HTML or injected markup
];

export function isSafe(text: string): boolean {
  return !BLOCKED_PATTERNS.some((r) => r.test(text));
}

/**
 * A definition shouldn't restate the word inside itself. We check whole-word
 * (case-insensitive) so "catch" in a definition of "catch" is caught but
 * "kitten" in a definition of "kit" is not.
 */
export function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}
