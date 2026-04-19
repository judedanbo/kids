import type React from 'react';
import styles from './VisualAid.module.css';

interface VisualAidProps {
  operandA: number;
  operandB: number;
  operation: string;
}

function DotGroup({ count, color }: { count: number; color: string }) {
  const dots = Array.from({ length: count }, (_, i) => (
    <span key={i} className={styles.dot} style={{ backgroundColor: color }} aria-hidden="true" />
  ));
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < dots.length; i += 5) {
    rows.push(dots.slice(i, i + 5));
  }
  return (
    <div className={styles.dotGroup}>
      {rows.map((row, i) => (
        <div key={i} className={styles.dotRow}>
          {row}
        </div>
      ))}
    </div>
  );
}

export function VisualAid({ operandA, operandB, operation }: VisualAidProps) {
  const symbol = operation === 'add' ? '+' : operation === 'subtract' ? '−' : '×';
  return (
    <div className={styles.container} role="img" aria-label={`${operandA} ${symbol} ${operandB}`}>
      <DotGroup count={operandA} color="var(--color-primary)" />
      <span className={styles.symbol}>{symbol}</span>
      <DotGroup count={operandB} color="var(--color-secondary)" />
    </div>
  );
}
