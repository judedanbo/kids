import { vi } from 'vitest';

const t = (key: string) => key;
const i18n = { changeLanguage: vi.fn(), language: 'en' };

export const useTranslation = vi.fn(() => ({ t, i18n }));

export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
