import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';

export const languageStorageKey = 'ui-language';
export const supportedLanguages = ['es', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value === 'es' || value === 'en';
}

export function resolveSupportedLanguage(value: string | undefined): SupportedLanguage {
  return value?.startsWith('en') ? 'en' : 'es';
}

export function getStoredLanguage(): SupportedLanguage {
  const storedLanguage = localStorage.getItem(languageStorageKey);
  return isSupportedLanguage(storedLanguage) ? storedLanguage : 'es';
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en }
  },
  lng: getStoredLanguage(),
  fallbackLng: 'es',
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false
  },
  returnNull: false
});

export default i18n;
