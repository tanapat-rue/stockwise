import { Toaster as SonnerToaster } from 'sonner'
import { useSettingsStore } from '@/stores/settings-store'

export function Toaster() {
  const theme = useSettingsStore((s) => s.theme)

  return (
    <SonnerToaster
      theme={theme === 'system' ? undefined : theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}
