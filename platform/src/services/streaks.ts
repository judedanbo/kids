/**
 * Calculates updated streak values based on the last play date.
 * A "play day" counts if at least one game is completed.
 * Streak increments if played yesterday, resets to 1 if gap > 1 day.
 */
export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastPlayedAt: string,
): { currentStreak: number; longestStreak: number } {
  const now = new Date();
  const todayStr = toDateString(now);

  if (!lastPlayedAt) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) };
  }

  const lastDate = toDateString(new Date(lastPlayedAt));

  // Already played today — no change
  if (lastDate === todayStr) {
    return { currentStreak, longestStreak };
  }

  // Played yesterday — increment
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastDate === toDateString(yesterday)) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
    };
  }

  // Missed more than one day — reset
  return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) };
}

/** Formats a Date to YYYY-MM-DD in local timezone */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
