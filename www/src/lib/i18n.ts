import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import th from '@/locales/th.json'

// Get initial language from localStorage
function getInitialLanguage(): 'en' | 'th' {
  try {
    const stored = localStorage.getItem('stockflows-settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.state?.language === 'en' || parsed.state?.language === 'th') {
        return parsed.state.language
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return 'th' // Default to Thai
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      th: { translation: th },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
