'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useDensity } from '@/hooks/useDensity'
import {
  DENSITY_OPTIONS,
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  type DensityOption,
  type LocaleOption,
  type ThemeOption,
} from '@/types/settings'

/**
 * #86 — Chapitre Préférences : langue (fr/en/es/de), thème (clair/sombre/système),
 * densité (compact/normal/confortable).
 *
 * - Thème : `next-themes` -> applique immédiatement sans rechargement (critère).
 * - Densité : `useDensity` -> `data-density` sur <html> + localStorage, immédiat.
 * - Langue : next-intl `localePrefix: 'always'` -> navigation vers `/<locale>/...`.
 */
export function PreferencesSection() {
  const t = useTranslations('settings')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const { theme, setTheme } = useTheme()
  const { density, setDensity } = useDensity()

  // next-themes hydrate `theme` uniquement côté client -> éviter le mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const changeLocale = (next: LocaleOption) => {
    if (next === locale) return
    const rest = pathname.replace(new RegExp(`^/${locale}`), '')
    router.push(`/${next}${rest || ''}`)
  }

  return (
    <section aria-labelledby="preferences-heading" className="max-w-md space-y-6">
      <div>
        <h2 id="preferences-heading" className="text-lg font-semibold">
          {t('preferences.title')}
        </h2>
        <p className="text-ink-muted text-sm">{t('preferences.subtitle')}</p>
      </div>

      {/* Langue */}
      <div className="space-y-2">
        <Label htmlFor="pref-language">{t('preferences.language.label')}</Label>
        <Select value={locale} onValueChange={(v) => changeLocale(v as LocaleOption)}>
          <SelectTrigger id="pref-language" data-testid="pref-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALE_OPTIONS.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`preferences.language.options.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Thème */}
      <div className="space-y-2">
        <Label htmlFor="pref-theme">{t('preferences.theme.label')}</Label>
        <Select
          value={mounted ? ((theme as ThemeOption) ?? 'system') : 'system'}
          onValueChange={(v) => setTheme(v as ThemeOption)}
        >
          <SelectTrigger id="pref-theme" data-testid="pref-theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`preferences.theme.options.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Densité */}
      <div className="space-y-2">
        <Label htmlFor="pref-density">{t('preferences.density.label')}</Label>
        <Select value={density} onValueChange={(v) => setDensity(v as DensityOption)}>
          <SelectTrigger id="pref-density" data-testid="pref-density">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DENSITY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`preferences.density.options.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
