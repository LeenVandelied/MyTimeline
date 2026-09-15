'use client'

import { useTranslations } from 'next-intl'

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/**
 * #57 — Fallback de segment (Suspense) affiché pendant le rendu du dashboard.
 * Skeleton calé sur le layout liste réel (`ProductList`) pour limiter le layout
 * shift à l'arrivée des données. Client Component : `useTranslations` (le
 * fallback est monté dans le `NextIntlClientProvider` du layout). Libellé
 * accessible via `common.spinner.loading`. Clair + sombre via tokens Graphite.
 */
export default function DashboardLoading() {
  const t = useTranslations('common')

  return (
    <div className="bg-bg min-h-[100dvh] px-6 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="bg-surface-2 h-7 w-40 animate-pulse rounded-md" aria-hidden="true" />
        <LoadingSkeleton
          variant="list"
          rows={5}
          label={t('spinner.loading')}
          testId="dashboard-loading-skeleton"
        />
      </div>
    </div>
  )
}
