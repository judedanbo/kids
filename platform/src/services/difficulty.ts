const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const MIN_RESULTS_FOR_ADJUSTMENT = 3;
const INCREASE_THRESHOLD = 0.85;
const DECREASE_THRESHOLD = 0.4;

/**
 * Calculates the next difficulty based on recent score history.
 * Requires at least 3 results before adjusting.
 * Increases if avg score >= 85%, decreases if avg score <= 40%.
 */
export function calculateNextDifficulty(
  recentScores: Array<{ score: number; maxScore: number }>,
  currentDifficulty: number,
): number {
  const last5 = recentScores.slice(-5);

  if (last5.length < MIN_RESULTS_FOR_ADJUSTMENT) {
    return currentDifficulty;
  }

  const avgScorePercent =
    last5.reduce((sum, r) => sum + (r.maxScore > 0 ? r.score / r.maxScore : 0), 0) / last5.length;

  if (avgScorePercent >= INCREASE_THRESHOLD) {
    return Math.min(currentDifficulty + 1, MAX_DIFFICULTY);
  }
  if (avgScorePercent <= DECREASE_THRESHOLD) {
    return Math.max(currentDifficulty - 1, MIN_DIFFICULTY);
  }

  return currentDifficulty;
}
