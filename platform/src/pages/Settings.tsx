import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHighContrast } from '@kids-games-zone/shared';
import { usePlatform } from '../context/PlatformContext';
import { SUPPORTED_LANGUAGES } from '../config/languages';
import styles from './Settings.module.css';

export function Settings() {
  const navigate = useNavigate();
  const { state, dispatch } = usePlatform();
  const { t, i18n } = useTranslation('common');
  const profile = state.currentProfile;

  const handleThemeToggle = () => {
    const next = state.settings.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_SETTINGS', payload: { theme: next } });
  };

  const { isHighContrast, setHighContrast } = useHighContrast(
    state.settings.highContrast,
  );

  const handleHighContrastToggle = () => {
    const next = !isHighContrast;
    setHighContrast(next);
    dispatch({ type: 'SET_SETTINGS', payload: { highContrast: next } });
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    dispatch({ type: 'SET_SETTINGS', payload: { language: code } });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('settings.title')}</h1>

      {/* Profile section */}
      {profile && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('settings.profile')}</h2>
          <div className={styles.profileInfo}>
            <span className={styles.avatar}>{profile.avatar}</span>
            <div>
              <p className={styles.profileName}>{profile.name}</p>
              <p className={styles.profileAge}>{t('settings.age', { age: profile.age })}</p>
            </div>
          </div>
          <button
            className={styles.linkBtn}
            onClick={() => navigate('/profile')}
          >
            {t('settings.switchProfile')}
          </button>
        </section>
      )}

      {/* Appearance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.appearance')}</h2>
        <div className={styles.settingRow}>
          <span>{t('settings.theme')}</span>
          <button className={styles.toggleBtn} onClick={handleThemeToggle}>
            {state.settings.theme === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
          </button>
        </div>
        <div className={styles.settingRow}>
          <span>{t('settings.language')}</span>
          <div className={styles.langGroup}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`${styles.langBtn} ${i18n.language === lang.code ? styles.langBtnActive : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                aria-pressed={i18n.language === lang.code}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.accessibility')}</h2>
        <div className={styles.settingRow}>
          <label htmlFor="high-contrast-toggle">{t('settings.highContrast')}</label>
          <button
            id="high-contrast-toggle"
            className={styles.toggleBtn}
            onClick={handleHighContrastToggle}
            aria-pressed={isHighContrast}
          >
            {isHighContrast ? t('settings.on') : t('settings.off')}
          </button>
        </div>
      </section>

      {/* Parental Controls */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.parentalControls')}</h2>
        <p className={styles.description}>
          {t('settings.parentalDescription')}
        </p>
        <button
          className={styles.primaryBtn}
          onClick={() => navigate('/settings/parental')}
        >
          {t('settings.openParentalDashboard')}
        </button>
      </section>
    </div>
  );
}
