import {
  CONFIG_OVERRIDE_VERSION,
  type ConfigOverride,
  type ConfigOverrideStore,
  type ConfigValidationContext,
  type FeatureOverride,
  type GameOverride,
  type RewardOverride,
  type ValidationResult,
} from './types';

const MAX_AGE = 18;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

/**
 * Strictly validate a parent-supplied ConfigOverride (used by the raw-JSON
 * editor and defensively when applying imported config). Unknown keys, wrong
 * types and out-of-range difficulty/age values are all rejected so a parent
 * can never corrupt the app or reach developer-only manifest fields.
 */
export function validateConfigOverride(
  input: unknown,
  ctx: ConfigValidationContext,
): ValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, errors: ['Configuration must be a JSON object.'] };
  }

  const allowedTop = new Set(['features', 'games', 'rewards']);
  for (const key of Object.keys(input)) {
    if (!allowedTop.has(key)) errors.push(`Unknown section "${key}".`);
  }

  const featureKeys = new Set(ctx.featureKeys);
  const manifestById = new Map(ctx.gameRegistry.map((g) => [g.id, g]));
  const rewardIds = new Set(ctx.rewardIds);

  const value: ConfigOverride = {};

  // --- features ---
  if (input.features !== undefined) {
    if (!isPlainObject(input.features)) {
      errors.push('"features" must be an object.');
    } else {
      const features: Record<string, FeatureOverride> = {};
      for (const [key, raw] of Object.entries(input.features)) {
        if (!featureKeys.has(key)) {
          errors.push(`Unknown feature "${key}".`);
          continue;
        }
        if (!isPlainObject(raw)) {
          errors.push(`Feature "${key}" must be an object.`);
          continue;
        }
        for (const sub of Object.keys(raw)) {
          if (sub !== 'enabled') errors.push(`Feature "${key}" has unknown field "${sub}".`);
        }
        if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') {
          errors.push(`Feature "${key}".enabled must be true or false.`);
          continue;
        }
        if (typeof raw.enabled === 'boolean') features[key] = { enabled: raw.enabled };
      }
      value.features = features;
    }
  }

  // --- games ---
  if (input.games !== undefined) {
    if (!isPlainObject(input.games)) {
      errors.push('"games" must be an object.');
    } else {
      const games: Record<string, GameOverride> = {};
      for (const [id, raw] of Object.entries(input.games)) {
        const manifest = manifestById.get(id);
        if (!manifest) {
          errors.push(`Unknown game "${id}".`);
          continue;
        }
        if (!isPlainObject(raw)) {
          errors.push(`Game "${id}" must be an object.`);
          continue;
        }
        const allowed = new Set(['enabled', 'minDifficulty', 'maxDifficulty', 'ageRange']);
        for (const sub of Object.keys(raw)) {
          if (!allowed.has(sub)) errors.push(`Game "${id}" has unknown field "${sub}".`);
        }

        const entry: GameOverride = {};

        if (raw.enabled !== undefined) {
          if (typeof raw.enabled !== 'boolean') {
            errors.push(`Game "${id}".enabled must be true or false.`);
          } else {
            entry.enabled = raw.enabled;
          }
        }

        for (const field of ['minDifficulty', 'maxDifficulty'] as const) {
          const v = raw[field];
          if (v === undefined) continue;
          if (!isInteger(v) || v < 1 || v > manifest.maxDifficulty) {
            errors.push(
              `Game "${id}".${field} must be an integer between 1 and ${manifest.maxDifficulty}.`,
            );
          } else {
            entry[field] = v;
          }
        }
        if (
          entry.minDifficulty !== undefined &&
          entry.maxDifficulty !== undefined &&
          entry.minDifficulty > entry.maxDifficulty
        ) {
          errors.push(`Game "${id}" minDifficulty cannot exceed maxDifficulty.`);
        }

        if (raw.ageRange !== undefined) {
          const ar = raw.ageRange;
          if (
            !Array.isArray(ar) ||
            ar.length !== 2 ||
            !isInteger(ar[0]) ||
            !isInteger(ar[1]) ||
            ar[0] < 0 ||
            ar[1] > MAX_AGE ||
            ar[0] > ar[1]
          ) {
            errors.push(
              `Game "${id}".ageRange must be [min, max] integers within 0–${MAX_AGE}.`,
            );
          } else {
            entry.ageRange = [ar[0], ar[1]];
          }
        }

        games[id] = entry;
      }
      value.games = games;
    }
  }

  // --- rewards ---
  if (input.rewards !== undefined) {
    if (!isPlainObject(input.rewards)) {
      errors.push('"rewards" must be an object.');
    } else {
      const rewards: Record<string, RewardOverride> = {};
      for (const [id, raw] of Object.entries(input.rewards)) {
        if (!rewardIds.has(id)) {
          errors.push(`Unknown reward "${id}".`);
          continue;
        }
        if (!isPlainObject(raw)) {
          errors.push(`Reward "${id}" must be an object.`);
          continue;
        }
        for (const sub of Object.keys(raw)) {
          if (sub !== 'enabled') errors.push(`Reward "${id}" has unknown field "${sub}".`);
        }
        if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') {
          errors.push(`Reward "${id}".enabled must be true or false.`);
          continue;
        }
        if (typeof raw.enabled === 'boolean') rewards[id] = { enabled: raw.enabled };
      }
      value.rewards = rewards;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export type StoreValidationResult =
  | { ok: true; value: ConfigOverrideStore }
  | { ok: false; errors: string[] };

/**
 * Validate a full exported/imported store: the version must match and every
 * scope (global + each profile) must pass validateConfigOverride. Errors are
 * prefixed with the scope they came from.
 */
export function validateStore(
  input: unknown,
  ctx: ConfigValidationContext,
): StoreValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, errors: ['Import must be a JSON object.'] };
  }
  if (input.version !== CONFIG_OVERRIDE_VERSION) {
    return {
      ok: false,
      errors: [`Unsupported config version (expected ${CONFIG_OVERRIDE_VERSION}).`],
    };
  }
  if (input.perProfile !== undefined && !isPlainObject(input.perProfile)) {
    return { ok: false, errors: ['"perProfile" must be an object.'] };
  }

  const errors: string[] = [];
  const value: ConfigOverrideStore = {
    version: CONFIG_OVERRIDE_VERSION,
    global: {},
    perProfile: {},
  };

  const globalResult = validateConfigOverride(input.global ?? {}, ctx);
  if (globalResult.ok) {
    value.global = globalResult.value;
  } else {
    errors.push(...globalResult.errors.map((e) => `global: ${e}`));
  }

  for (const [profileId, override] of Object.entries(
    (input.perProfile as Record<string, unknown>) ?? {},
  )) {
    const result = validateConfigOverride(override, ctx);
    if (result.ok) {
      value.perProfile[profileId] = result.value;
    } else {
      errors.push(...result.errors.map((e) => `${profileId}: ${e}`));
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}
