import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../context/PlatformContext';
import styles from './Settings.module.css';

export function Settings() {
  const navigate = useNavigate();
  const { state, dispatch } = usePlatform();
  const profile = state.currentProfile;

  const handleThemeToggle = () => {
    const next = state.settings.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_SETTINGS', payload: { theme: next } });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      {/* Profile section */}
      {profile && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.profileInfo}>
            <span className={styles.avatar}>{profile.avatar}</span>
            <div>
              <p className={styles.profileName}>{profile.name}</p>
              <p className={styles.profileAge}>Age {profile.age}</p>
            </div>
          </div>
          <button
            className={styles.linkBtn}
            onClick={() => navigate('/profile')}
          >
            Switch Profile
          </button>
        </section>
      )}

      {/* Appearance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.settingRow}>
          <span>Theme</span>
          <button className={styles.toggleBtn} onClick={handleThemeToggle}>
            {state.settings.theme === 'light' ? 'Light' : 'Dark'}
          </button>
        </div>
      </section>

      {/* Parental Controls */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Parental Controls</h2>
        <p className={styles.description}>
          View activity reports, set time limits, and manage game access.
        </p>
        <button
          className={styles.primaryBtn}
          onClick={() => navigate('/settings/parental')}
        >
          Open Parental Dashboard
        </button>
      </section>
    </div>
  );
}
