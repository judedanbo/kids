import type { ConfigOverride, ConfigOverrideStore, GameOverride } from './types';

/** Read a scope's own (unmerged) override. `null` = the global scope. */
export function readScope(
  store: ConfigOverrideStore,
  profileId: string | null,
): ConfigOverride {
  const o = profileId === null ? store.global : store.perProfile[profileId];
  return o ?? {};
}

export function isOverrideEmpty(o: ConfigOverride): boolean {
  return (
    Object.keys(o.features ?? {}).length === 0 &&
    Object.keys(o.games ?? {}).length === 0 &&
    Object.keys(o.rewards ?? {}).length === 0
  );
}

/**
 * Write a scope's override back into the store. An empty per-profile scope is
 * pruned so the persisted store never accumulates dead entries; the global
 * scope is always kept.
 */
export function writeScope(
  store: ConfigOverrideStore,
  profileId: string | null,
  override: ConfigOverride,
): ConfigOverrideStore {
  if (profileId === null) {
    return { ...store, global: override };
  }
  const perProfile = { ...store.perProfile };
  if (isOverrideEmpty(override)) {
    delete perProfile[profileId];
  } else {
    perProfile[profileId] = override;
  }
  return { ...store, perProfile };
}

function pruneSection<T>(section: Record<string, T> | undefined): Record<string, T> | undefined {
  if (!section || Object.keys(section).length === 0) return undefined;
  return section;
}

/**
 * Merge a patch into a game's override. A field set to `undefined` is removed;
 * a game whose override becomes empty is dropped entirely so the store stays
 * sparse and the "customised" indicator stays accurate.
 */
export function setGameOverride(
  o: ConfigOverride,
  gameId: string,
  patch: Partial<GameOverride>,
): ConfigOverride {
  const games = { ...(o.games ?? {}) };
  const next: GameOverride = { ...(games[gameId] ?? {}) };

  for (const [key, value] of Object.entries(patch) as [keyof GameOverride, unknown][]) {
    if (value === undefined) {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }

  if (Object.keys(next).length === 0) {
    delete games[gameId];
  } else {
    games[gameId] = next;
  }
  return { ...o, games: pruneSection(games) };
}

export function clearGameOverride(o: ConfigOverride, gameId: string): ConfigOverride {
  if (!o.games?.[gameId]) return o;
  const games = { ...o.games };
  delete games[gameId];
  return { ...o, games: pruneSection(games) };
}

function setFlagLike(
  o: ConfigOverride,
  section: 'features' | 'rewards',
  key: string,
  enabled: boolean | undefined,
): ConfigOverride {
  const map = { ...((o[section] as Record<string, { enabled?: boolean }>) ?? {}) };
  if (enabled === undefined) {
    delete map[key];
  } else {
    map[key] = { enabled };
  }
  return { ...o, [section]: pruneSection(map) };
}

export function setFeatureOverride(
  o: ConfigOverride,
  key: string,
  enabled: boolean | undefined,
): ConfigOverride {
  return setFlagLike(o, 'features', key, enabled);
}

export function setRewardOverride(
  o: ConfigOverride,
  rewardId: string,
  enabled: boolean | undefined,
): ConfigOverride {
  return setFlagLike(o, 'rewards', rewardId, enabled);
}
