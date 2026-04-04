import { useTranslation } from 'react-i18next';
import styles from './CategoryPicker.module.css';

const CATEGORY_ICONS: Record<string, string> = {
  kitchen: '🍳',
  bathroom: '🛁',
  'living-room': '🛋️',
  outdoor: '🌳',
  garage: '🔧',
  playground: '🎪',
};

interface CategoryPickerProps {
  categories: string[];
  onSelect: (category: string | null) => void;
}

export function CategoryPicker({ categories, onSelect }: CategoryPickerProps) {
  const { t } = useTranslation('safety-scout');

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>{t('pickCategory')}</h2>
      <div className={styles.grid} role="group" aria-label={t('categories')}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={styles.categoryButton}
            onClick={() => onSelect(cat)}
            aria-label={t(`category.${cat}`)}
          >
            <span className={styles.icon} aria-hidden="true">{CATEGORY_ICONS[cat] ?? '📦'}</span>
            <span className={styles.label}>{t(`category.${cat}`)}</span>
          </button>
        ))}
        <button
          className={`${styles.categoryButton} ${styles.randomButton}`}
          onClick={() => onSelect(null)}
          aria-label={t('randomMix')}
        >
          <span className={styles.icon} aria-hidden="true">🎲</span>
          <span className={styles.label}>{t('randomMix')}</span>
        </button>
      </div>
    </div>
  );
}
