import { CONFIG_OVERRIDE_VERSION, type ConfigOverride, type ConfigOverrideStore } from './types';

export const CONFIG_OVERRIDE_STORAGE_KEY = 'kids-games-zone:config-overrides';

export function emptyStore(): ConfigOverrideStore {
  return { version: CONFIG_OVERRIDE_VERSION, global: {}, perProfile: {} };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Structurally coerce arbitrary parsed JSON into a well-shaped store. This is
 * intentionally permissive about *which* games/flags exist (semantic checks
 * live in validateConfigOverride) but guarantees the shape so consumers and
 * the merge layer never crash on a hand-edited or stale payload.
 */
function sanitizeOverride(raw: unknown): ConfigOverride {
  if (!isPlainObject(raw)) return {};
  const out: ConfigOverride = {};
  for (const section of ['features', 'games', 'rewards'] as const) {
    const value = raw[section];
    if (!isPlainObject(value)) continue;
    const entries: Record<string, Record<string, unknown>> = {};
    for (const [key, sub] of Object.entries(value)) {
      if (isPlainObject(sub)) entries[key] = sub;
    }
    out[section] = entries as never;
  }
  return out;
}

function sanitizeStore(raw: unknown): ConfigOverrideStore {
  if (!isPlainObject(raw) || raw.version !== CONFIG_OVERRIDE_VERSION) {
    return emptyStore();
  }
  const perProfileRaw = isPlainObject(raw.perProfile) ? raw.perProfile : {};
  const perProfile: Record<string, ConfigOverride> = {};
  for (const [profileId, override] of Object.entries(perProfileRaw)) {
    perProfile[profileId] = sanitizeOverride(override);
  }
  return {
    version: CONFIG_OVERRIDE_VERSION,
    global: sanitizeOverride(raw.global),
    perProfile,
  };
}

/**
 * Load the override store from localStorage. Any parse error, version
 * mismatch or malformed payload falls back to an empty store so the app
 * always boots with bundled defaults.
 */
export function loadConfigOverrides(): ConfigOverrideStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return emptyStore();
  }
  try {
    const rawText = window.localStorage.getItem(CONFIG_OVERRIDE_STORAGE_KEY);
    if (!rawText) return emptyStore();
    return sanitizeStore(JSON.parse(rawText));
  } catch {
    return emptyStore();
  }
}

export function saveConfigOverrides(store: ConfigOverrideStore): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CONFIG_OVERRIDE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Full disk / private-mode Safari — acceptable to drop, same as settings.
  }
}

/** Drop a profile's per-profile overrides (used when a profile is purged). */
export function removeProfileOverrides(
  store: ConfigOverrideStore,
  profileId: string,
): ConfigOverrideStore {
  if (!(profileId in store.perProfile)) return store;
  const perProfile = { ...store.perProfile };
  delete perProfile[profileId];
  return { ...store, perProfile };
}
