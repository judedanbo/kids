import type {
  Reward,
  UserProfile,
  GameResult,
  GameManifest,
  GameProgress,
} from '@kids-games-zone/shared';
import { REWARD_CATALOG } from '../config/rewardCatalog';

/**
 * Evaluate which rewards the player has newly earned after a game completion.
 */
export function evaluateRewards(
  profile: UserProfile,
  result: GameResult,
  gameRegistry: GameManifest[],
): Reward[] {
  const unlockedIds = new Set(profile.rewards.map((r) => r.id));
  const now = new Date().toISOString();
  const newRewards: Reward[] = [];

  for (const reward of REWARD_CATALOG) {
    if (unlockedIds.has(reward.id)) continue;

    let earned = false;

    // Special-case rewards by ID
    if (reward.id === 'explorer') {
      earned = checkExplorer(profile, gameRegistry);
    } else if (reward.id === 'master') {
      earned = checkMaster(result, gameRegistry);
    } else {
      switch (reward.criteria.type) {
        case 'completion':
          earned = checkCompletion(profile, reward.criteria.threshold);
          break;
        case 'time':
          earned = result.timeSpent <= reward.criteria.threshold;
          break;
        case 'score':
          earned = checkScore(result, reward.criteria.gameId, gameRegistry);
          break;
        case 'streak':
          earned = profile.stats.currentStreak >= reward.criteria.threshold;
          break;
        case 'category_mastery':
          earned = checkCategoryMastery(
            profile,
            reward.criteria.gameId!,
            reward.criteria.threshold,
            gameRegistry,
          );
          break;
      }
    }

    if (earned) {
      newRewards.push({ ...reward, unlockedAt: now });
    }
  }

  return newRewards;
}

function checkCompletion(profile: UserProfile, threshold: number): boolean {
  const gamesPlayed = Object.values<GameProgress>(profile.progress).filter(
    (p) => p.totalAttempts > 0,
  ).length;
  return gamesPlayed >= threshold;
}

function checkScore(
  result: GameResult,
  skillCategory: string | undefined,
  gameRegistry: GameManifest[],
): boolean {
  if (skillCategory) {
    const manifest = gameRegistry.find((g) => g.id === result.gameId);
    if (!manifest || !manifest.skills.includes(skillCategory as never)) return false;
  }
  const percentage = (result.score / result.maxScore) * 100;
  return percentage >= 100;
}

function checkCategoryMastery(
  profile: UserProfile,
  skillCategory: string,
  threshold: number,
  gameRegistry: GameManifest[],
): boolean {
  const gamesInCategory = gameRegistry.filter((g) => g.skills.includes(skillCategory as never));
  const playedCount = gamesInCategory.filter(
    (g) => profile.progress[g.id]?.totalAttempts > 0,
  ).length;
  return playedCount >= threshold;
}

function checkExplorer(profile: UserProfile, gameRegistry: GameManifest[]): boolean {
  const activeGames = gameRegistry.filter((g) => g.status === 'active');
  if (activeGames.length === 0) return false;
  return activeGames.every((g) => profile.progress[g.id]?.totalAttempts > 0);
}

function checkMaster(result: GameResult, gameRegistry: GameManifest[]): boolean {
  const manifest = gameRegistry.find((g) => g.id === result.gameId);
  if (!manifest) return false;
  const atMaxDifficulty = result.difficulty >= manifest.maxDifficulty;
  const highScore = (result.score / result.maxScore) * 100 >= 80;
  return atMaxDifficulty && highScore;
}

/**
 * Get a human-readable progress hint for a locked reward.
 */
export function getRewardProgress(
  reward: Reward,
  profile: UserProfile,
  gameRegistry: GameManifest[],
): string {
  if (reward.id === 'explorer') {
    const activeGames = gameRegistry.filter((g) => g.status === 'active');
    const played = activeGames.filter((g) => profile.progress[g.id]?.totalAttempts > 0).length;
    return `${played} / ${activeGames.length} games played`;
  }

  if (reward.id === 'master') {
    return 'Reach max difficulty with 80%+ score';
  }

  switch (reward.criteria.type) {
    case 'completion': {
      const gamesPlayed = Object.values<GameProgress>(profile.progress).filter(
        (p) => p.totalAttempts > 0,
      ).length;
      return `${gamesPlayed} / ${reward.criteria.threshold} games completed`;
    }
    case 'time':
      return `Finish a game in under ${reward.criteria.threshold}s`;
    case 'score':
      return 'Score 100% on a matching game';
    case 'streak':
      return `${profile.stats.currentStreak} / ${reward.criteria.threshold} day streak`;
    case 'category_mastery': {
      const gamesInCategory = gameRegistry.filter((g) =>
        g.skills.includes(reward.criteria.gameId as never),
      );
      const played = gamesInCategory.filter(
        (g) => profile.progress[g.id]?.totalAttempts > 0,
      ).length;
      return `${played} / ${reward.criteria.threshold} ${reward.criteria.gameId} games`;
    }
    default:
      return '';
  }
}
