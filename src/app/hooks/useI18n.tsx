/**
 * D-Music i18n — Context / Provider / Hook
 * §8.4 — Translation dictionary extracted to ./i18n-translations.ts
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations } from './i18n-translations';
import type { TranslationKey } from './i18n-translations';
import { loadPref, savePref } from '../lib/preferences';

export type Lang = 'zh' | 'en';
export type { TranslationKey };

// ==========================================
// Context
// ==========================================
interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

// ==========================================
// Provider
// ==========================================
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    // §13.x — Read from unified preferences system (falls back to 'zh')
    return loadPref('lang');
  });

  const handleSetLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    // §13.x — Persist to unified preferences + legacy key
    savePref('lang', newLang);
    try {
      localStorage.setItem('d-music-lang', newLang);
    } catch {}
  }, []);

  const toggleLang = useCallback(() => {
    handleSetLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, handleSetLang]);

  const t = useCallback(
    (key: TranslationKey): string => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[lang] || entry.en || key;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang: handleSetLang, toggleLang, t }),
    [lang, handleSetLang, toggleLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// ==========================================
// Hook
// ==========================================
export const useI18n = () => useContext(I18nContext);