import { useState } from 'react';
import type { UserProfile, AgeTier } from '@kids-games-zone/shared';
import styles from './ProfileCreator.module.css';

interface ProfileCreatorProps {
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

type Step = 'name' | 'age' | 'avatar' | 'confirm';

const AVATARS = ['🦉', '🦊', '🐱', '🐶', '🐸', '🦁', '🐼', '🐰', '🦄', '🐙'];

function getAgeTier(age: number): AgeTier {
  if (age <= 5) return 'tiny';
  if (age <= 8) return 'junior';
  return 'explorer';
}

export function ProfileCreator({ onComplete, onCancel }: ProfileCreatorProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState('');

  function handleNameSubmit() {
    if (name.trim().length >= 1 && name.trim().length <= 20) {
      setStep('age');
    }
  }

  function handleAgeSelect(selectedAge: number) {
    setAge(selectedAge);
    setStep('avatar');
  }

  function handleAvatarSelect(selectedAvatar: string) {
    setAvatar(selectedAvatar);
    setStep('confirm');
  }

  function handleConfirm() {
    if (!age) return;

    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatar,
      age,
      ageTier: getAgeTier(age),
      createdAt: new Date().toISOString(),
      parentPin: '',
      preferences: {
        musicVolume: 0.7,
        sfxVolume: 1,
        voiceVolume: 1,
        language: 'en',
        theme: 'default',
      },
      progress: {},
      rewards: [],
      stats: {
        totalPlayTime: 0,
        totalGamesPlayed: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedAt: '',
      },
    };

    onComplete(profile);
  }

  function handleBack() {
    switch (step) {
      case 'age':
        setStep('name');
        break;
      case 'avatar':
        setStep('age');
        break;
      case 'confirm':
        setStep('avatar');
        break;
      default:
        onCancel?.();
    }
  }

  return (
    <div className={styles.creator}>
      {step !== 'name' && (
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
      )}

      {step === 'name' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>What&apos;s your name?</h2>
          <input
            className={styles.nameInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Type your name..."
            maxLength={20}
            autoFocus
            aria-label="Your name"
          />
          <button
            className={styles.nextButton}
            onClick={handleNameSubmit}
            disabled={name.trim().length < 1}
          >
            Next
          </button>
          {onCancel && (
            <button className={styles.cancelButton} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}

      {step === 'age' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>How old are you?</h2>
          <div className={styles.ageGrid}>
            {Array.from({ length: 10 }, (_, i) => i + 3).map((ageOption) => (
              <button
                key={ageOption}
                className={`${styles.ageButton} ${age === ageOption ? styles.selected : ''}`}
                onClick={() => handleAgeSelect(ageOption)}
              >
                {ageOption}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'avatar' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>Pick your avatar!</h2>
          <div className={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                className={`${styles.avatarButton} ${avatar === emoji ? styles.selected : ''}`}
                onClick={() => handleAvatarSelect(emoji)}
                aria-label={`Select ${emoji} avatar`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>Ready to play?</h2>
          <div className={styles.summary}>
            <div className={styles.summaryAvatar}>{avatar}</div>
            <div className={styles.summaryName}>{name.trim()}</div>
            <div className={styles.summaryAge}>
              Age {age} • {age ? getAgeTier(age) : ''} tier
            </div>
          </div>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            Let&apos;s go!
          </button>
        </div>
      )}
    </div>
  );
}
