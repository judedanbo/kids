import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '../context/PlatformContext';
import { ProfileCreator } from '../components/ProfileCreator/ProfileCreator';
import type { UserProfile } from '@kids-games-zone/shared';
import styles from './ProfileSelect.module.css';

export default function ProfileSelect() {
  const { state, dispatch, storageManager } = usePlatform();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const activeProfiles = useMemo(
    () => state.profiles.filter((p) => p.deletedAt === null),
    [state.profiles],
  );

  const [showCreator, setShowCreator] = useState(activeProfiles.length === 0);

  function handleSelectProfile(profile: UserProfile) {
    dispatch({ type: 'SET_PROFILE', payload: profile });
    navigate('/');
  }

  async function handleCreateProfile(profile: UserProfile) {
    await storageManager.saveProfile(profile);
    dispatch({ type: 'ADD_PROFILE', payload: profile });
    dispatch({ type: 'SET_PROFILE', payload: profile });
    navigate('/');
  }

  if (showCreator || activeProfiles.length === 0) {
    return (
      <ProfileCreator
        onComplete={handleCreateProfile}
        onCancel={activeProfiles.length > 0 ? () => setShowCreator(false) : undefined}
      />
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('profile.whoIsPlaying')}</h1>
      <div className={styles.profileGrid}>
        {activeProfiles.map((profile) => (
          <button
            key={profile.id}
            className={`${styles.profileCard} ${
              state.currentProfile?.id === profile.id ? styles.active : ''
            }`}
            onClick={() => handleSelectProfile(profile)}
          >
            <span className={styles.avatar}>{profile.avatar}</span>
            <span className={styles.name}>{profile.name}</span>
          </button>
        ))}
        <button className={styles.createCard} onClick={() => setShowCreator(true)}>
          <span className={styles.createIcon}>+</span>
          <span className={styles.createLabel}>{t('profile.newPlayer')}</span>
        </button>
      </div>
    </div>
  );
}
