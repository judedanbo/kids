import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LANGUAGES } from './config/languages';

import enCommon from './locales/en/common.json';
import frCommon from './locales/fr/common.json';
import enMemoryMatch from '../../games/memory-match/src/locales/en/memory-match.json';
import frMemoryMatch from '../../games/memory-match/src/locales/fr/memory-match.json';
import enMathAdventure from '../../games/math-adventure/src/locales/en/math-adventure.json';
import frMathAdventure from '../../games/math-adventure/src/locales/fr/math-adventure.json';
import enWordPuzzle from '../../games/word-puzzle/src/locales/en/word-puzzle.json';
import frWordPuzzle from '../../games/word-puzzle/src/locales/fr/word-puzzle.json';
import enSpellingBee from '../../games/spelling-bee/src/locales/en/spelling-bee.json';
import frSpellingBee from '../../games/spelling-bee/src/locales/fr/spelling-bee.json';

const supportedLngs = SUPPORTED_LANGUAGES.map((l) => l.code);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        'memory-match': enMemoryMatch,
        'math-adventure': enMathAdventure,
        'word-puzzle': enWordPuzzle,
        'spelling-bee': enSpellingBee,
      },
      fr: {
        common: frCommon,
        'memory-match': frMemoryMatch,
        'math-adventure': frMathAdventure,
        'word-puzzle': frWordPuzzle,
        'spelling-bee': frSpellingBee,
      },
    },
    supportedLngs,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
