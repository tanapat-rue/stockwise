import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings-store'

/**
 * Hook to sync the i18n language with the settings store.
 * Should be used once in the root component (Layout).
 */
export function useLanguageSync() {
  const { i18n } = useTranslation()
  const language = useSettingsStore((state) => state.language)

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [i18n, language])
}
