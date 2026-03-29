import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('appLanguage') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    saveMissing: true,
    missingKeyHandler: async (lng, ns, key, fallbackValue) => {
      // Dynamic translation logic can be added here
    },
  });

export default i18n;
