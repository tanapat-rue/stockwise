import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'
type ColorTheme = 'ocean' | 'emerald' | 'sunset' | 'violet' | 'rose' | 'ruby' | 'amber' | 'teal' | 'indigo' | 'slate'
type Language = 'en' | 'th'
type Currency = 'THB' | 'USD'
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

export const colorThemes: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'ocean', label: 'Ocean', color: 'hsl(199 89% 39%)' },
  { value: 'emerald', label: 'Emerald', color: 'hsl(152 69% 31%)' },
  { value: 'sunset', label: 'Sunset', color: 'hsl(24 95% 53%)' },
  { value: 'violet', label: 'Violet', color: 'hsl(263 70% 50%)' },
  { value: 'rose', label: 'Rose', color: 'hsl(346 77% 50%)' },
  { value: 'ruby', label: 'Ruby', color: 'hsl(0 72% 51%)' },
  { value: 'amber', label: 'Amber', color: 'hsl(38 92% 50%)' },
  { value: 'teal', label: 'Teal', color: 'hsl(173 80% 36%)' },
  { value: 'indigo', label: 'Indigo', color: 'hsl(239 84% 67%)' },
  { value: 'slate', label: 'Slate', color: 'hsl(215 20% 40%)' },
]

interface SettingsState {
  theme: Theme
  colorTheme: ColorTheme
  language: Language
  currency: Currency
  dateFormat: DateFormat

  // Actions
  setTheme: (theme: Theme) => void
  setColorTheme: (colorTheme: ColorTheme) => void
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
  setDateFormat: (format: DateFormat) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'ocean',
      language: 'th',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      setColorTheme: (colorTheme) => {
        set({ colorTheme })
        applyColorTheme(colorTheme)
      },

      setLanguage: (language) => set({ language }),

      setCurrency: (currency) => set({ currency }),

      setDateFormat: (dateFormat) => set({ dateFormat }),
    }),
    {
      name: 'stockwise-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
          applyColorTheme(state.colorTheme)
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

function applyColorTheme(colorTheme: ColorTheme) {
  const root = window.document.documentElement
  // Remove all theme classes
  colorThemes.forEach(t => {
    root.classList.remove(`theme-${t.value}`)
  })
  // Add the new theme class (ocean is default, no class needed)
  if (colorTheme !== 'ocean') {
    root.classList.add(`theme-${colorTheme}`)
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
