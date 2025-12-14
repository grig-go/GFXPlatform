import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enDashboard from './locales/en/dashboard.json';
import enSystems from './locales/en/systems.json';
import enDevices from './locales/en/devices.json';
import enWorkflows from './locales/en/workflows.json';
import enZones from './locales/en/zones.json';
import enLogs from './locales/en/logs.json';

// French
import frCommon from './locales/fr/common.json';
import frNav from './locales/fr/nav.json';
import frDashboard from './locales/fr/dashboard.json';
import frSystems from './locales/fr/systems.json';
import frDevices from './locales/fr/devices.json';
import frWorkflows from './locales/fr/workflows.json';
import frZones from './locales/fr/zones.json';
import frLogs from './locales/fr/logs.json';

// Arabic
import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arDashboard from './locales/ar/dashboard.json';
import arSystems from './locales/ar/systems.json';
import arDevices from './locales/ar/devices.json';
import arWorkflows from './locales/ar/workflows.json';
import arZones from './locales/ar/zones.json';
import arLogs from './locales/ar/logs.json';

// Spanish
import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esDashboard from './locales/es/dashboard.json';
import esSystems from './locales/es/systems.json';
import esDevices from './locales/es/devices.json';
import esWorkflows from './locales/es/workflows.json';
import esZones from './locales/es/zones.json';
import esLogs from './locales/es/logs.json';

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
    dashboard: enDashboard,
    systems: enSystems,
    devices: enDevices,
    workflows: enWorkflows,
    zones: enZones,
    logs: enLogs,
  },
  fr: {
    common: frCommon,
    nav: frNav,
    dashboard: frDashboard,
    systems: frSystems,
    devices: frDevices,
    workflows: frWorkflows,
    zones: frZones,
    logs: frLogs,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    dashboard: arDashboard,
    systems: arSystems,
    devices: arDevices,
    workflows: arWorkflows,
    zones: arZones,
    logs: arLogs,
  },
  es: {
    common: esCommon,
    nav: esNav,
    dashboard: esDashboard,
    systems: esSystems,
    devices: esDevices,
    workflows: esWorkflows,
    zones: esZones,
    logs: esLogs,
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
      lookupLocalStorage: 'nexus_language',
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
  localStorage.setItem('nexus_language', lang);

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
