import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '../../context/PlatformContext';
import { useConfigOverrides } from '../../context/ConfigOverrideContext';
import { REWARD_CATALOG } from '../../config/rewardCatalog';
import {
  resolveFeatureFlags,
  resolveGameConstraint,
  resolveScopeOverride,
  isRewardEnabled as isRewardEnabledFor,
} from '../../config/overrides/merge';
import {
  clearGameOverride,
  readScope,
  setFeatureOverride,
  setGameOverride,
  setRewardOverride,
  writeScope,
} from '../../config/overrides/mutations';
import type { ConfigOverride } from '../../config/overrides/types';
import styles from './ParentalConfig.module.css';

export function ParentalConfig() {
  const { t } = useTranslation('common');
  const { state } = usePlatform();
  const { store, setStore, defaultFlags } = useConfigOverrides();

  // null = the global scope; otherwise a profile id.
  const [scopeId, setScopeId] = useState<string | null>(null);

  const activeProfiles = useMemo(
    () => state.profiles.filter((p) => p.deletedAt === null),
    [state.profiles],
  );

  const featureKeys = useMemo(
    () => Object.keys(defaultFlags).filter((k) => !k.startsWith('game.')),
    [defaultFlags],
  );

  // Merged view of what this scope's children actually experience (global +,
  // for a profile scope, that profile's own delta on top).
  const effective: ConfigOverride = useMemo(
    () => resolveScopeOverride(store, scopeId),
    [store, scopeId],
  );
  const scopeOwn = readScope(store, scopeId);
  const mergedFlags = useMemo(
    () => resolveFeatureFlags(defaultFlags, effective),
    [defaultFlags, effective],
  );

  const applyScopeChange = useCallback(
    (mutate: (o: ConfigOverride) => ConfigOverride) => {
      setStore((prev) => writeScope(prev, scopeId, mutate(readScope(prev, scopeId))));
    },
    [setStore, scopeId],
  );

  const scopeLabel =
    scopeId === null
      ? t('parental.config.scopeGlobal')
      : (activeProfiles.find((p) => p.id === scopeId)?.name ?? scopeId);

  return (
    <div className={styles.root}>
      <p className={styles.intro}>{t('parental.config.intro')}</p>

      {/* Scope selector */}
      <div className={styles.scopeRow}>
        <label className={styles.scopeLabel} htmlFor="config-scope">
          {t('parental.config.scopeLabel')}
        </label>
        <select
          id="config-scope"
          className={styles.scopeSelect}
          value={scopeId ?? ''}
          onChange={(e) => setScopeId(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{t('parental.config.scopeGlobal')}</option>
          {activeProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {t('parental.config.scopeProfile', { name: p.name })}
            </option>
          ))}
        </select>
      </div>

      {/* Games */}
      <section className={styles.panel} aria-labelledby="config-games-title">
        <h3 id="config-games-title" className={styles.panelTitle}>
          {t('parental.config.gamesTitle')}
        </h3>
        <ul className={styles.list}>
          {state.gameRegistry.map((game) => {
            const enabled = mergedFlags[`game.${game.id}`]?.enabled ?? true;
            const constraint = resolveGameConstraint(game, effective);
            const customised = Boolean(scopeOwn.games?.[game.id]);
            const levels = Array.from({ length: game.maxDifficulty }, (_, i) => i + 1);

            return (
              <li key={game.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <div className={styles.itemText}>
                    <span className={styles.itemName}>
                      {game.name}
                      {customised && (
                        <span className={styles.badge}>{t('parental.config.customised')}</span>
                      )}
                    </span>
                    <span className={styles.itemDesc}>{game.description}</span>
                  </div>
                  <div className={styles.itemControls}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      aria-pressed={enabled}
                      onClick={() =>
                        applyScopeChange((o) =>
                          setGameOverride(o, game.id, { enabled: !enabled }),
                        )
                      }
                    >
                      {enabled ? t('settings.on') : t('settings.off')}
                    </button>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      disabled={!customised}
                      onClick={() => applyScopeChange((o) => clearGameOverride(o, game.id))}
                    >
                      {t('parental.config.useDefault')}
                    </button>
                  </div>
                </div>

                {game.maxDifficulty > 1 && (
                  <div
                    className={styles.difficultyRow}
                    role="group"
                    aria-label={t('parental.config.maxDifficultyFor', { name: game.name })}
                  >
                    <span className={styles.difficultyLabel}>
                      {t('parental.config.maxDifficulty')}
                    </span>
                    <div className={styles.levels}>
                      {levels.map((level) => {
                        const active = level === constraint.maxDifficulty;
                        return (
                          <button
                            key={level}
                            type="button"
                            className={`${styles.levelBtn} ${active ? styles.levelBtnActive : ''}`}
                            aria-pressed={active}
                            disabled={!enabled}
                            onClick={() =>
                              applyScopeChange((o) =>
                                setGameOverride(o, game.id, {
                                  maxDifficulty:
                                    level === game.maxDifficulty ? undefined : level,
                                }),
                              )
                            }
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Features */}
      <section className={styles.panel} aria-labelledby="config-features-title">
        <h3 id="config-features-title" className={styles.panelTitle}>
          {t('parental.config.featuresTitle')}
        </h3>
        <ul className={styles.list}>
          {featureKeys.map((key) => {
            const enabled = mergedFlags[key]?.enabled ?? true;
            const customised = Boolean(scopeOwn.features?.[key]);
            return (
              <li key={key} className={styles.item}>
                <div className={styles.itemHead}>
                  <div className={styles.itemText}>
                    <span className={styles.itemName}>
                      {t(`parental.config.feature.${key}`, {
                        defaultValue: defaultFlags[key]?.description || key,
                      })}
                      {customised && (
                        <span className={styles.badge}>{t('parental.config.customised')}</span>
                      )}
                    </span>
                    <span className={styles.itemDesc}>{defaultFlags[key]?.description}</span>
                  </div>
                  <div className={styles.itemControls}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      aria-pressed={enabled}
                      onClick={() =>
                        applyScopeChange((o) => setFeatureOverride(o, key, !enabled))
                      }
                    >
                      {enabled ? t('settings.on') : t('settings.off')}
                    </button>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      disabled={!customised}
                      onClick={() =>
                        applyScopeChange((o) => setFeatureOverride(o, key, undefined))
                      }
                    >
                      {t('parental.config.useDefault')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Rewards */}
      <section className={styles.panel} aria-labelledby="config-rewards-title">
        <h3 id="config-rewards-title" className={styles.panelTitle}>
          {t('parental.config.rewardsTitle')}
        </h3>
        <ul className={styles.list}>
          {REWARD_CATALOG.map((reward) => {
            const enabled = isRewardEnabledFor(reward.id, effective);
            const customised = Boolean(scopeOwn.rewards?.[reward.id]);
            return (
              <li key={reward.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <div className={styles.itemText}>
                    <span className={styles.itemName}>
                      <span aria-hidden="true" className={styles.rewardIcon}>
                        {reward.icon}
                      </span>
                      {reward.name}
                      {customised && (
                        <span className={styles.badge}>{t('parental.config.customised')}</span>
                      )}
                    </span>
                    <span className={styles.itemDesc}>{reward.description}</span>
                  </div>
                  <div className={styles.itemControls}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      aria-pressed={enabled}
                      onClick={() =>
                        applyScopeChange((o) => setRewardOverride(o, reward.id, !enabled))
                      }
                    >
                      {enabled ? t('settings.on') : t('settings.off')}
                    </button>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      disabled={!customised}
                      onClick={() =>
                        applyScopeChange((o) => setRewardOverride(o, reward.id, undefined))
                      }
                    >
                      {t('parental.config.useDefault')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className={styles.scopeNote}>
        {t('parental.config.editingScope', { scope: scopeLabel })}
      </p>
    </div>
  );
}
