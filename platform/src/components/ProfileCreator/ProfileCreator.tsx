import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserProfile, AgeTier } from '@kids-games-zone/shared';
import { NumberPad } from '../NumberPad';
import { hashPin } from '../../utils/pin';
import styles from './ProfileCreator.module.css';

interface ProfileCreatorProps {
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

type Step = 'name' | 'age' | 'avatar' | 'pin' | 'pin_confirm' | 'confirm';

const AVATARS = ['🦉', '🦊', '🐱', '🐶', '🐸', '🦁', '🐼', '🐰', '🦄', '🐙'];

function getAgeTier(age: number): AgeTier {
  if (age <= 5) return 'tiny';
  if (age <= 8) return 'junior';
  return 'explorer';
}

export function ProfileCreator({ onComplete, onCancel }: ProfileCreatorProps) {
  const { t } = useTranslation('common');
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState('');
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState('');
  const [hashedPin, setHashedPin] = useState('');

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
    setStep('pin');
  }

  function handlePinDigit(digit: string) {
    setPinError('');
    setPinDigits((prev) => {
      if (prev.length >= 4) return prev;
      const next = [...prev, digit];
      if (next.length === 4) {
        const pin = next.join('');
        if (step === 'pin') {
          setPinFirst(pin);
          setTimeout(() => {
            setPinDigits([]);
            setStep('pin_confirm');
          }, 200);
        } else if (step === 'pin_confirm') {
          if (pin === pinFirst) {
            hashPin(pin).then((hash) => {
              setHashedPin(hash);
              setStep('confirm');
            });
          } else {
            setPinError(t('profile.pinMismatch'));
            setTimeout(() => {
              setPinDigits([]);
              setStep('pin');
              setPinFirst('');
            }, 1000);
          }
        }
      }
      return next;
    });
  }

  function handlePinDelete() {
    setPinDigits((prev) => prev.slice(0, -1));
  }

  function handleSkipPin() {
    setHashedPin('');
    setStep('confirm');
  }

  function handleConfirm() {
    if (!age) return;

    const profile: UserProfile = {
      id: globalThis.crypto.randomUUID(),
      name: name.trim(),
      avatar,
      age,
      ageTier: getAgeTier(age),
      createdAt: new Date().toISOString(),
      parentPin: hashedPin,
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
      deletedAt: null,
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
      case 'pin':
        setPinDigits([]);
        setStep('avatar');
        break;
      case 'pin_confirm':
        setPinDigits([]);
        setPinFirst('');
        setStep('pin');
        break;
      case 'confirm':
        setStep('pin');
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
          <h2 className={styles.prompt}>{t('profile.whatsYourName')}</h2>
          <input
            className={styles.nameInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder={t('profile.typeName')}
            maxLength={20}
            aria-label="Your name"
          />
          <button
            className={styles.nextButton}
            onClick={handleNameSubmit}
            disabled={name.trim().length < 1}
          >
            {t('profile.next')}
          </button>
          {onCancel && (
            <button className={styles.cancelButton} onClick={onCancel}>
              {t('profile.cancel')}
            </button>
          )}
        </div>
      )}

      {step === 'age' && (
        <div className={styles.stepContainer}>
          <fieldset className={styles.ageFieldset}>
            <legend className={styles.prompt}>{t('profile.howOld')}</legend>
            <div className={styles.ageGrid}>
              {Array.from({ length: 10 }, (_, i) => i + 3).map((ageOption) => (
                <button
                  key={ageOption}
                  className={`${styles.ageButton} ${age === ageOption ? styles.selected : ''}`}
                  onClick={() => handleAgeSelect(ageOption)}
                  aria-pressed={age === ageOption}
                >
                  {ageOption}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 'avatar' && (
        <div className={styles.stepContainer}>
          <fieldset className={styles.avatarFieldset}>
            <legend className={styles.prompt}>{t('profile.chooseAvatar')}</legend>
            <div className={styles.avatarGrid}>
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  className={`${styles.avatarButton} ${avatar === emoji ? styles.selected : ''}`}
                  onClick={() => handleAvatarSelect(emoji)}
                  aria-label={`Select ${emoji} avatar`}
                  aria-pressed={avatar === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {(step === 'pin' || step === 'pin_confirm') && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>
            {step === 'pin' ? t('profile.setPin') : t('profile.confirmPin')}
          </h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-md)',
              fontSize: '0.9rem',
            }}
          >
            {step === 'pin' ? t('profile.pinInstruction') : t('profile.confirmPinInstruction')}
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid var(--color-border)',
                  backgroundColor: i < pinDigits.length ? 'var(--color-primary)' : 'transparent',
                  transition: 'background-color 0.15s',
                }}
              />
            ))}
          </div>
          {pinError && (
            <p
              style={{
                color: 'var(--color-error, #e53935)',
                fontWeight: 600,
                marginBottom: 'var(--spacing-md)',
              }}
            >
              {pinError}
            </p>
          )}
          <NumberPad onDigit={handlePinDigit} onDelete={handlePinDelete} />
          <button
            className={styles.cancelButton}
            onClick={handleSkipPin}
            style={{ marginTop: 'var(--spacing-md)' }}
          >
            {t('profile.skipPin')}
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.prompt}>{t('profile.readyToPlay')}</h2>
          <div className={styles.summary}>
            <div className={styles.summaryAvatar}>{avatar}</div>
            <div className={styles.summaryName}>{name.trim()}</div>
            <div className={styles.summaryAge}>
              {age ? t('profile.ageTier', { age, tier: getAgeTier(age) }) : ''}
            </div>
          </div>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            {t('profile.letsGo')}
          </button>
        </div>
      )}
    </div>
  );
}
