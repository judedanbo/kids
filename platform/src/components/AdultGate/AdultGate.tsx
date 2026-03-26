import { useState, useMemo } from 'react';
import styles from './AdultGate.module.css';

interface AdultGateProps {
  onVerified: () => void;
  onCancel: () => void;
}

function generateProblem(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 15) + 5;  // 5-19
  const b = Math.floor(Math.random() * 9) + 2;   // 2-10
  return { question: `What is ${a} x ${b}?`, answer: a * b };
}

export function AdultGate({ onVerified, onCancel }: AdultGateProps) {
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
        <h2 className={styles.title}>Adult Verification</h2>
        <p className={styles.description}>
          Please solve this problem to continue:
        </p>
        <p className={styles.question}>{problem.question}</p>
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
            placeholder="Your answer"
            aria-label="Answer"
          />
          {error && <p className={styles.error}>Incorrect answer. Try again.</p>}
          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn}>
              Verify
            </button>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
