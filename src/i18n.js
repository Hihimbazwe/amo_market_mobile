import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import commonRw from './locales/rw/common.json';
import dashboardRw from './locales/rw/dashboard.json';

const resources = {
  en: {
    common: commonEn,
    dashboard: dashboardEn,
  },
  rw: {
    common: commonRw,
    dashboard: dashboardRw,
  },
};

const LANGUAGE_KEY = 'user-language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      callback('en');
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch (error) {
      console.error('Error caching language:', error);
    }
  },
};

// Dev-only auto-translation using LibreTranslate
const autoTranslate = async (key, lng) => {
  if (!__DEV__) return;

  console.warn(`[i18n] Missing key: "${key}" for language: "${lng}". Attempting auto-translation...`);
  
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: key.replace(/_/g, ' '), // Try to make it human readable
        source: 'en',
        target: lng,
        format: 'text',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate returned status ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("LibreTranslate returned non-JSON response (likely an error page)");
    }

    const data = await response.json();
    if (data.translatedText) {
      console.log(`[i18n] Auto-translated "${key}" to "${lng}": "${data.translatedText}"`);
    }
  } catch (error) {
    console.error('[i18n] Auto-translation failed:', error.message);
  }
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    fallbackLng: 'en',
    ns: ['common', 'dashboard'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    saveMissing: __DEV__,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      autoTranslate(key, lng);
    },
    react: {
      useSuspense: false, // React Native doesn't support suspense well for i18n yet
    },
  });

export default i18n;
