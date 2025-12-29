import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Building2, Bell, Palette, Globe, Lock, Sun, Moon, Monitor, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore, colorThemes } from '@/stores/settings-store'

type Theme = 'light' | 'dark' | 'system'

const themeOptions: { value: Theme; key: string; icon: typeof Sun }[] = [
  { value: 'light', key: 'light', icon: Sun },
  { value: 'dark', key: 'dark', icon: Moon },
  { value: 'system', key: 'system', icon: Monitor },
]

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, organization } = useAuthStore()
  const { theme, setTheme, colorTheme, setColorTheme, language, setLanguage } = useSettingsStore()

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('pages.settings.title')}</h1>
        <p className="text-muted-foreground">{t('pages.settings.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('pages.settings.profile')}
              </CardTitle>
              <CardDescription>{t('pages.settings.profileDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>
              <Button>{t('common.saveChanges')}</Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('pages.settings.password')}
              </CardTitle>
              <CardDescription>{t('pages.settings.passwordDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">{t('pages.settings.currentPassword')}</Label>
                <Input
                  id="current"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">{t('pages.settings.newPassword')}</Label>
                <Input
                  id="new"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t('pages.settings.confirmPassword')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
              </div>
              <Button>{t('pages.settings.updatePassword')}</Button>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('pages.settings.organization')}
              </CardTitle>
              <CardDescription>{t('pages.settings.organizationDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('pages.settings.organizationName')}</Label>
                <Input value={organization?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>{t('pages.settings.plan')}</Label>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium">
                    {organization?.plan || 'Free'}
                  </span>
                  <Button variant="link" className="p-0 h-auto">
                    {t('pages.settings.upgrade')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('pages.settings.appearance')}
              </CardTitle>
              <CardDescription>{t('pages.settings.appearanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selection */}
              <div className="space-y-3">
                <Label>{t('pages.settings.mode')}</Label>
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        theme === option.value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                      <span>{t(`header.${option.key}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selection */}
              <div className="space-y-3">
                <Label>{t('pages.settings.colorTheme')}</Label>
                <div className="grid grid-cols-5 gap-2">
                  {colorThemes.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setColorTheme(ct.value)}
                      className="group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-muted"
                      title={ct.label}
                    >
                      <div
                        className={cn(
                          'relative h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all',
                          colorTheme === ct.value
                            ? 'ring-foreground scale-110'
                            : 'ring-transparent group-hover:ring-muted-foreground/30'
                        )}
                        style={{ backgroundColor: ct.color }}
                      >
                        {colorTheme === ct.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground">
                        {ct.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('pages.settings.language')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Combobox
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'th', label: 'ไทย' },
                ]}
                value={language}
                onValueChange={(v) => setLanguage(v as 'en' | 'th')}
                placeholder={t('pages.settings.selectLanguage')}
                searchPlaceholder={t('pages.settings.searchLanguage')}
              />
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('pages.settings.notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('pages.settings.emailNotifications')}</p>
                    <p className="text-sm text-muted-foreground">{t('pages.settings.orderUpdates')}</p>
                  </div>
                  <Button variant="outline" size="sm">{t('common.on')}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('pages.settings.lowStockAlerts')}</p>
                    <p className="text-sm text-muted-foreground">{t('pages.settings.inventoryWarnings')}</p>
                  </div>
                  <Button variant="outline" size="sm">{t('common.on')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
