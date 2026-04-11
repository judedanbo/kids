import { useAnnounce } from '@kids-games-zone/shared';
import styles from './NumberCards.module.css';

interface NumberCardsProps {
  values: string[];
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export function NumberCards({ values, onSelect, disabled = false }: NumberCardsProps) {
  const announce = useAnnounce();

  const handleSelect = (index: number) => {
    if (disabled) return;
    announce(`Selected ${values[index]}`);
    onSelect(index);
  };

  return (
    <div className={styles.container} role="group" aria-label="Choose a number">
      {values.map((value, index) => (
        <button
          key={index}
          className={styles.card}
          onClick={() => handleSelect(index)}
          disabled={disabled}
          aria-label={value}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
