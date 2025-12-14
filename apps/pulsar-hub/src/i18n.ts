import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enHome from './locales/en/home.json';
import enDashboard from './locales/en/dashboard.json';
import enSupport from './locales/en/support.json';

// French
import frCommon from './locales/fr/common.json';
import frNav from './locales/fr/nav.json';
import frHome from './locales/fr/home.json';
import frDashboard from './locales/fr/dashboard.json';
import frSupport from './locales/fr/support.json';

// Arabic
import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arHome from './locales/ar/home.json';
import arDashboard from './locales/ar/dashboard.json';
import arSupport from './locales/ar/support.json';

// Spanish
import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esHome from './locales/es/home.json';
import esDashboard from './locales/es/dashboard.json';
import esSupport from './locales/es/support.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    home: enHome,
    dashboard: enDashboard,
    support: enSupport,
  },
  fr: {
    common: frCommon,
    nav: frNav,
    home: frHome,
    dashboard: frDashboard,
    support: frSupport,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    home: arHome,
    dashboard: arDashboard,
    support: arSupport,
  },
  es: {
    common: esCommon,
    nav: esNav,
    home: esHome,
    dashboard: esDashboard,
    support: esSupport,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pulsar_hub_language',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Get language direction (ltr or rtl)
export const getLanguageDirection = (lang: SupportedLanguage): 'ltr' | 'rtl' => {
  const language = SUPPORTED_LANGUAGES.find(l => l.code === lang);
  return language?.dir || 'ltr';
};

// Helper to change language and update document direction
export const changeLanguage = (lang: SupportedLanguage) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('pulsar_hub_language', lang);

  // Update document direction for RTL support
  const dir = getLanguageDirection(lang);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
};

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language?.substring(0, 2) as SupportedLanguage) || 'en';
};

// Initialize direction on load
const initDirection = () => {
  const lang = getCurrentLanguage();
  const dir = getLanguageDirection(lang);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
};

// Run on module load
initDirection();

// Also run when i18n language changes
i18n.on('languageChanged', (lang) => {
  const dir = getLanguageDirection(lang as SupportedLanguage);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
});
