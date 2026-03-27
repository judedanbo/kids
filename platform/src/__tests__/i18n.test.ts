import { describe, it, expect, afterEach } from 'vitest';
import i18n from '../i18n';

describe('i18n setup', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('initializes with English as default', () => {
    expect(i18n.language).toBe('en');
  });

  it('translates a key in English', () => {
    expect(i18n.t('nav.home')).toBe('Home');
  });

  it('switches to French', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('nav.home')).toBe('Accueil');
  });

  it('falls back to English for unsupported language', async () => {
    await i18n.changeLanguage('zh');
    expect(i18n.t('nav.home')).toBe('Home');
  });

  it('returns key for missing translation', () => {
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });
});
