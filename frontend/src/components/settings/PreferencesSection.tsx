'use client'

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
import { isThemeChoice, useThemeChoice } from '@/hooks/useThemeChoice'
import {
  DENSITY_OPTIONS,
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  type DensityOption,
  type LocaleOption,
} from '@/types/settings'

/**
 * #86 — Chapitre Préférences : langue (fr/en/es/de), thème (clair/sombre/système),
 * densité (compact/normal/confortable).
 *
 * - Thème : `useThemeChoice` (#655, seul point d'écriture du thème, sur next-themes)
 *   -> applique immédiatement sans rechargement (critère).
 * - Densité : `useDensity` -> `data-density` sur <html> + localStorage, immédiat.
 * - Langue : next-intl `localePrefix: 'always'` -> navigation vers `/<locale>/...`.
 */
export function PreferencesSection() {
  const t = useTranslations('settings')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname() ?? ''
  // next-themes ne résout `theme` que côté client : `theme` vaut `undefined`
  // avant montage (garde du hook) -> 'system' au rendu serveur, sans mismatch.
  const { theme, setThemeChoice } = useThemeChoice()
  const { density, setDensity } = useDensity()

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
              <SelectItem key={code} value={code} data-testid={`pref-language-option-${code}`}>
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
          value={theme ?? 'system'}
          onValueChange={(v) => {
            if (isThemeChoice(v)) setThemeChoice(v)
          }}
        >
          <SelectTrigger id="pref-theme" data-testid="pref-theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((option) => (
              <SelectItem key={option} value={option} data-testid={`pref-theme-option-${option}`}>
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
              <SelectItem key={option} value={option} data-testid={`pref-density-option-${option}`}>
                {t(`preferences.density.options.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
