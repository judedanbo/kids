import { useState, useCallback, useEffect } from 'react';
import { NumberPad } from '../NumberPad';
import { verifyPin } from '../../utils/pin';
import styles from './PinEntry.module.css';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

interface PinEntryProps {
  storedHash: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinEntry({ storedHash, onSuccess, onCancel }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [verifying, setVerifying] = useState(false);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  // Countdown timer during lockout
  useEffect(() => {
    if (!lockoutEnd) return;

    const tick = () => {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setLockoutRemaining(0);
        setAttempts(0);
        setError('');
      } else {
        setLockoutRemaining(remaining);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockoutEnd]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLocked || verifying) return;
      setError('');
      setDigits((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = [...prev, digit];

        if (next.length === PIN_LENGTH) {
          // Verify asynchronously
          setVerifying(true);
          const pin = next.join('');
          verifyPin(pin, storedHash).then((valid) => {
            if (valid) {
              onSuccess();
            } else {
              const newAttempts = attempts + 1;
              setAttempts(newAttempts);
              if (newAttempts >= MAX_ATTEMPTS) {
                setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
                setError(`Too many attempts. Please wait ${LOCKOUT_SECONDS} seconds.`);
              } else {
                setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
              }
              setDigits([]);
            }
            setVerifying(false);
          });
        }

        return next;
      });
    },
    [isLocked, verifying, storedHash, onSuccess, attempts],
  );

  const handleDelete = useCallback(() => {
    if (isLocked || verifying) return;
    setDigits((prev) => prev.slice(0, -1));
  }, [isLocked, verifying]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Enter PIN</h2>

        {/* Dot indicators */}
        <div className={styles.dots} aria-label={`${digits.length} of ${PIN_LENGTH} digits entered`}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i < digits.length ? styles.dotFilled : ''}`}
            />
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {isLocked && (
          <p className={styles.lockout}>
            Locked for {lockoutRemaining}s
          </p>
        )}

        <NumberPad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={isLocked || verifying}
        />

        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
