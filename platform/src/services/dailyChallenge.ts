import type { DailyChallenge, GameManifest, SkillCategory, UserProfile } from '@kids-games-zone/shared';

interface ChallengeTemplate {
  type: DailyChallenge['type'];
  description: string;
  target: number;
  skillCategory?: SkillCategory;
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { type: 'play_count', description: 'Play 3 games today', target: 3 },
  { type: 'play_count', description: 'Play 2 games today', target: 2 },
  { type: 'score_threshold', description: 'Score 80%+ on any math game', target: 80, skillCategory: 'numeracy' },
  { type: 'score_threshold', description: 'Score 80%+ on any word game', target: 80, skillCategory: 'literacy' },
  { type: 'score_threshold', description: 'Score 90%+ on any game', target: 90 },
  { type: 'try_new_game', description: 'Try a game you haven\'t played before', target: 1 },
];

/**
 * Simple deterministic hash from a date string.
 * Produces a non-negative integer.
 */
export function hashDateString(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Returns today's daily challenge, deterministically selected from the date.
 */
export function getDailyChallenge(
  date: string,
  _gameRegistry: GameManifest[],
): DailyChallenge {
  const seed = hashDateString(date);
  const template = CHALLENGE_TEMPLATES[seed % CHALLENGE_TEMPLATES.length];

  return {
    id: `daily-${date}`,
    date,
    type: template.type,
    description: template.description,
    target: template.target,
    skillCategory: template.skillCategory,
  };
}

/**
 * Checks if a daily challenge has been completed based on today's activity.
 */
export function checkChallengeCompletion(
  challenge: DailyChallenge,
  profile: UserProfile,
  todayResults: Array<{ gameId: string; score: number; maxScore: number }>,
): boolean {
  switch (challenge.type) {
    case 'play_count':
      return todayResults.length >= challenge.target;

    case 'score_threshold': {
      const relevant = challenge.skillCategory
        ? todayResults // Caller should filter by skill if needed, but we check score
        : todayResults;
      return relevant.some(
        (r) => r.maxScore > 0 && (r.score / r.maxScore) * 100 >= challenge.target,
      );
    }

    case 'try_new_game': {
      const playedGameIds = new Set(Object.keys(profile.progress));
      return todayResults.some((r) => !playedGameIds.has(r.gameId));
    }

    default:
      return false;
  }
}
