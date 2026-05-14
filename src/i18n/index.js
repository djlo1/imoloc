import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
export const changeLanguage = (lang) => i18n.changeLanguage(lang)
export const getCurrentLang = () => i18n.language?.slice(0,2) || 'fr'
