import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'
type Language = 'en' | 'th'
type Currency = 'THB' | 'USD'
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

interface SettingsState {
  theme: Theme
  language: Language
  currency: Currency
  dateFormat: DateFormat

  // Actions
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
  setDateFormat: (format: DateFormat) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'th',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      setLanguage: (language) => set({ language }),

      setCurrency: (currency) => set({ currency }),

      setDateFormat: (dateFormat) => set({ dateFormat }),
    }),
    {
      name: 'stockflows-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

function applyTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useSettingsStore.getState()
    if (theme === 'system') {
      applyTheme('system')
    }
  })
}
