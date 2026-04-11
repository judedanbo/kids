import { vi } from 'vitest';

export const useTranslation = vi.fn(() => ({
  t: (key: string) => key,
  i18n: { changeLanguage: vi.fn() },
}));

export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;
