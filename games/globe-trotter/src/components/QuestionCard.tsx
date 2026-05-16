import { IconImage } from '@kids-games-zone/shared';
import type { Question } from '../utils/questionGenerator';
import { flagEmoji, flagSrc, localizedFact, localizedName } from '../utils/countryPool';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  question: Question;
  lang: string;
  /** Translator scoped to the `globe-trotter` namespace. */
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function QuestionCard({ question, lang, t }: QuestionCardProps) {
  const { mode, subject, factIndex } = question;
  const name = localizedName(subject, lang);

  if (mode === 'flag') {
    return (
      <div className={styles.card}>
        <p className={styles.prompt}>{t('prompt.flag')}</p>
        <span className={styles.bigFlag}>
          <IconImage
            src={flagSrc(subject.code)}
            alt={t('flagOf', { country: name })}
            fallback={flagEmoji(subject.code)}
            size={140}
          />
        </span>
      </div>
    );
  }

  if (mode === 'fact') {
    return (
      <div className={styles.card}>
        <p className={styles.fact}>{localizedFact(subject, factIndex, lang)}</p>
        <p className={styles.prompt}>{t('prompt.fact')}</p>
      </div>
    );
  }

  const promptKey = mode === 'capital' ? 'prompt.capital' : 'prompt.continent';

  return (
    <div className={styles.card}>
      <span className={styles.flag}>
        <IconImage
          src={flagSrc(subject.code)}
          alt=""
          fallback={flagEmoji(subject.code)}
          size={72}
        />
      </span>
      <p className={styles.country}>{name}</p>
      <p className={styles.prompt}>{t(promptKey, { country: name })}</p>
    </div>
  );
}
