import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '../../context/PlatformContext';
import { useConfigOverrides } from '../../context/ConfigOverrideContext';
import { TypedConfirmModal } from '../TypedConfirmModal';
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
import { emptyStore } from '../../config/overrides/store';
import { validateConfigOverride, validateStore } from '../../config/overrides/validate';
import type {
  ConfigOverride,
  ConfigOverrideStore,
  ConfigValidationContext,
} from '../../config/overrides/types';
import styles from './ParentalConfig.module.css';

type PendingAction =
  | { kind: 'apply'; value: ConfigOverride }
  | { kind: 'resetScope' }
  | { kind: 'resetAll' }
  | { kind: 'import'; value: ConfigOverrideStore }
  | null;

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

  const validationCtx = useMemo<ConfigValidationContext>(
    () => ({
      featureKeys,
      gameRegistry: state.gameRegistry,
      rewardIds: REWARD_CATALOG.map((r) => r.id),
    }),
    [featureKeys, state.gameRegistry],
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

  // --- Advanced (raw JSON) editor ---
  const [rawText, setRawText] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [importError, setImportError] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the selected scope's own override into the editor when scope changes.
  useEffect(() => {
    setRawText(JSON.stringify(scopeOwn, null, 2));
    setImportError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId]);

  const rawValidation = useMemo(() => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { ok: false as const, errors: [t('parental.config.rawInvalidJson')] };
    }
    return validateConfigOverride(parsed, validationCtx);
  }, [rawText, validationCtx, t]);

  const handleFormat = () => {
    try {
      setRawText(JSON.stringify(JSON.parse(rawText), null, 2));
    } catch {
      /* leave text as-is; the error region already explains the problem */
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kids-games-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    file
      .text()
      .then((text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          setImportError([t('parental.config.rawInvalidJson')]);
          return;
        }
        const result = validateStore(parsed, validationCtx);
        if (result.ok) {
          setImportError(null);
          setPending({ kind: 'import', value: result.value });
        } else {
          setImportError(result.errors);
        }
      })
      .catch(() => setImportError([t('parental.config.rawInvalidJson')]));
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === 'apply') {
      applyScopeChange(() => pending.value);
    } else if (pending.kind === 'resetScope') {
      setStore((prev) => writeScope(prev, scopeId, {}));
      setRawText('{}');
    } else if (pending.kind === 'resetAll') {
      setStore(emptyStore());
      setRawText('{}');
    } else if (pending.kind === 'import') {
      setStore(pending.value);
    }
    setPending(null);
  };

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

      {/* Advanced: raw JSON editor */}
      <section className={styles.panel} aria-labelledby="config-advanced-title">
        <h3 id="config-advanced-title" className={styles.panelTitle}>
          {t('parental.config.advancedTitle')}
        </h3>
        <p className={styles.itemDesc}>{t('parental.config.advancedHelp')}</p>

        <label className={styles.rawLabel} htmlFor="config-raw">
          {t('parental.config.rawLabel', { scope: scopeLabel })}
        </label>
        <textarea
          id="config-raw"
          className={styles.rawEditor}
          value={rawText}
          spellCheck={false}
          rows={10}
          onChange={(e) => setRawText(e.target.value)}
          aria-describedby={rawValidation.ok ? undefined : 'config-raw-error'}
          aria-invalid={!rawValidation.ok}
        />
        {!rawValidation.ok && (
          <ul id="config-raw-error" className={styles.errorList} role="alert">
            {rawValidation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.linkBtn} onClick={handleFormat}>
            {t('parental.config.format')}
          </button>
          <button
            type="button"
            className={styles.toggleBtn}
            disabled={!rawValidation.ok}
            onClick={() =>
              rawValidation.ok && setPending({ kind: 'apply', value: rawValidation.value })
            }
          >
            {t('parental.config.apply')}
          </button>
        </div>

        <details className={styles.effective}>
          <summary>{t('parental.config.effectiveTitle')}</summary>
          <p className={styles.itemDesc}>{t('parental.config.effectiveHelp')}</p>
          <pre className={styles.effectivePre}>{JSON.stringify(effective, null, 2)}</pre>
        </details>
      </section>

      {/* Backup & reset */}
      <section className={styles.panel} aria-labelledby="config-danger-title">
        <h3 id="config-danger-title" className={styles.panelTitle}>
          {t('parental.config.dangerTitle')}
        </h3>
        <div className={styles.actions}>
          <button type="button" className={styles.toggleBtn} onClick={handleExport}>
            {t('parental.config.export')}
          </button>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('parental.config.import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenInput}
            aria-label={t('parental.config.import')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setPending({ kind: 'resetScope' })}
          >
            {t('parental.config.resetScope')}
          </button>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => setPending({ kind: 'resetAll' })}
          >
            {t('parental.config.resetAll')}
          </button>
        </div>
        {importError && (
          <ul className={styles.errorList} role="alert">
            {importError.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </section>

      {pending?.kind === 'apply' && (
        <TypedConfirmModal
          title={t('parental.config.confirmApplyTitle')}
          description={t('parental.config.confirmApplyBody', { scope: scopeLabel })}
          expected={t('parental.config.confirmApplyExpected')}
          confirmLabel={t('parental.config.apply')}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'resetScope' && (
        <TypedConfirmModal
          title={t('parental.config.confirmResetScopeTitle')}
          description={t('parental.config.confirmResetScopeBody', { scope: scopeLabel })}
          expected={t('parental.config.confirmResetExpected')}
          confirmLabel={t('parental.config.resetScope')}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'resetAll' && (
        <TypedConfirmModal
          title={t('parental.config.confirmResetAllTitle')}
          description={t('parental.config.confirmResetAllBody')}
          warning={t('parental.config.confirmResetAllWarning')}
          expected={t('parental.config.confirmResetExpected')}
          confirmLabel={t('parental.config.resetAll')}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'import' && (
        <TypedConfirmModal
          title={t('parental.config.confirmImportTitle')}
          description={t('parental.config.confirmImportBody')}
          warning={t('parental.config.confirmImportWarning')}
          expected={t('parental.config.confirmImportExpected')}
          confirmLabel={t('parental.config.import')}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
