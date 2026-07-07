'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Compass } from 'lucide-react'

import { StateScreen, stateActionPrimary } from '@/components/shared/StateScreen'

/**
 * #57 — Écran 404 custom du segment `[locale]` (remplace la 404 Next par
 * défaut). Rendu par le boundary `notFound()` : lorsqu'une page enfant appelle
 * `notFound()` (ou sur URL inconnue sous une locale valide), ce fichier est monté
 * À L'INTÉRIEUR du `NextIntlClientProvider` de `[locale]/layout.tsx` → `useLocale`
 * et `useTranslations` résolvent. Client Component pour lire la locale courante
 * de façon fiable (pas de `params` fournis à `not-found.tsx`).
 *
 * Lien de retour préfixé locale (`/${locale}/home`) : `localePrefix: 'always'`
 * casse tout chemin non préfixé. Clair + sombre via tokens Graphite (StateScreen).
 */
export default function LocaleNotFound() {
  const locale = useLocale()
  const t = useTranslations('errors.notFound')

  return (
    <StateScreen
      testId="not-found-screen"
      code="404"
      icon={<Compass />}
      title={t('title')}
      description={t('description')}
      actions={
        <Link href={`/${locale}/home`} className={stateActionPrimary} data-testid="not-found-home-link">
          {t('backHome')}
        </Link>
      }
    />
  )
}
