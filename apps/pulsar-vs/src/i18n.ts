import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enVirtualSet from './locales/en/virtualSet.json';
import enChannels from './locales/en/channels.json';
import enProjects from './locales/en/projects.json';
import enContent from './locales/en/content.json';
import enPlaylist from './locales/en/playlist.json';
import enSettings from './locales/en/settings.json';
import enSupport from './locales/en/support.json';

import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esVirtualSet from './locales/es/virtualSet.json';
import esChannels from './locales/es/channels.json';
import esProjects from './locales/es/projects.json';
import esContent from './locales/es/content.json';
import esPlaylist from './locales/es/playlist.json';
import esSettings from './locales/es/settings.json';
import esSupport from './locales/es/support.json';

import frCommon from './locales/fr/common.json';
import frNav from './locales/fr/nav.json';
import frVirtualSet from './locales/fr/virtualSet.json';
import frChannels from './locales/fr/channels.json';
import frProjects from './locales/fr/projects.json';
import frContent from './locales/fr/content.json';
import frPlaylist from './locales/fr/playlist.json';
import frSettings from './locales/fr/settings.json';
import frSupport from './locales/fr/support.json';

import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arVirtualSet from './locales/ar/virtualSet.json';
import arChannels from './locales/ar/channels.json';
import arProjects from './locales/ar/projects.json';
import arContent from './locales/ar/content.json';
import arPlaylist from './locales/ar/playlist.json';
import arSettings from './locales/ar/settings.json';
import arSupport from './locales/ar/support.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    virtualSet: enVirtualSet,
    channels: enChannels,
    projects: enProjects,
    content: enContent,
    playlist: enPlaylist,
    settings: enSettings,
    support: enSupport,
  },
  es: {
    common: esCommon,
    nav: esNav,
    virtualSet: esVirtualSet,
    channels: esChannels,
    projects: esProjects,
    content: esContent,
    playlist: esPlaylist,
    settings: esSettings,
    support: esSupport,
  },
  fr: {
    common: frCommon,
    nav: frNav,
    virtualSet: frVirtualSet,
    channels: frChannels,
    projects: frProjects,
    content: frContent,
    playlist: frPlaylist,
    settings: frSettings,
    support: frSupport,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    virtualSet: arVirtualSet,
    channels: arChannels,
    projects: arProjects,
    content: arContent,
    playlist: arPlaylist,
    settings: arSettings,
    support: arSupport,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav', 'virtualSet', 'channels', 'projects', 'content', 'playlist', 'settings', 'support'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pulsar_vs_language',
    },

    interpolation: {
      escapeValue: false, // React already escapes
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
  localStorage.setItem('pulsar_vs_language', lang);

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
