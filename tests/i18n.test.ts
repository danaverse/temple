import { describe, expect, it } from 'vitest';
import {
  bootLocale,
  localeFromSearch,
  withLangQuery,
} from '../src/i18n.js';

describe('locale from W Lotus', () => {
  it('reads ?lang= the same way share URLs do', () => {
    expect(localeFromSearch('?lang=vi')).toBe('vi');
    expect(localeFromSearch('lang=zh')).toBe('zh');
    expect(localeFromSearch('?q=Cô+Hồn&lang=en')).toBe('en');
    expect(localeFromSearch('?locale=zh-Hans')).toBe('zh');
    expect(localeFromSearch('?lang=en-US')).toBe('en');
    expect(localeFromSearch('?lang=fr')).toBeNull();
    expect(localeFromSearch('')).toBeNull();
  });

  it('prefers the URL language over the browser list', () => {
    expect(bootLocale('?lang=en', ['vi-VN', 'en'])).toBe('en');
    expect(bootLocale('', ['zh-CN'])).toBe('zh');
  });

  it('keeps other query params when stamping lang onto a path', () => {
    expect(withLangQuery('/offering/abc', 'vi')).toBe(
      '/offering/abc?lang=vi',
    );
    expect(withLangQuery('/?q=Vu+Lan', 'zh')).toBe('/?q=Vu+Lan&lang=zh');
    expect(withLangQuery('/offering/abc?lang=en#top', 'vi')).toBe(
      '/offering/abc?lang=vi#top',
    );
  });
});
