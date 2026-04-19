import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AdultGate.module.css';

interface AdultGateProps {
  onVerified: () => void;
  onCancel: () => void;
}

function generateProblem(): { a: number; b: number; answer: number } {
  const a = Math.floor(Math.random() * 15) + 5; // 5-19
  const b = Math.floor(Math.random() * 9) + 2; // 2-10
  return { a, b, answer: a * b };
}

export function AdultGate({ onVerified, onCancel }: AdultGateProps) {
  const { t } = useTranslation('common');
  const problem = useMemo(() => generateProblem(), []);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (parseInt(input, 10) === problem.answer) {
      onVerified();
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>{t('adultGate.title')}</h2>
        <p className={styles.description}>{t('adultGate.description')}</p>
        <p className={styles.question}>{t('adultGate.whatIs', { a: problem.a, b: problem.b })}</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="number"
            inputMode="numeric"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder={t('adultGate.placeholder')}
            aria-label={t('adultGate.placeholder')}
          />
          {error && <p className={styles.error}>{t('adultGate.incorrect')}</p>}
          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn}>
              {t('adultGate.verify')}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              {t('adultGate.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
