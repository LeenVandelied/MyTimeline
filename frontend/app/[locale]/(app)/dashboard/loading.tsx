'use client'

import { useTranslations } from 'next-intl'

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { cn } from '@/lib/utils'

/**
 * #57 — Fallback de segment (Suspense) affiché pendant le rendu du dashboard.
 * Client Component : `useTranslations` (le fallback est monté dans le
 * `NextIntlClientProvider` du layout). Libellé accessible via `common.spinner.loading`.
 * Clair + sombre via tokens Graphite.
 *
 * #698 — l'enveloppe était `max-w-3xl px-6 py-8` autour d'une simple liste : plus
 * étroite que la page réelle, elle faisait SAUTER la mise en page à l'arrivée des
 * données. Elle reprend désormais la branche DESKTOP de `page.tsx` (celle rendue au
 * 1er rendu, `useMediaQuery` valant `false` côté SSR) :
 *   - enveloppe `mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8` ;
 *   - salutation (`GreetingHeader` : eyebrow + titre + sous-titre, filet bas `pb-4`) ;
 *   - ruban de densité (`DensityRibbon` : carte `border p-4`, en-tête + bloc `h-24` =
 *     règle `h-4.5` + barres, #623) ;
 *   - grille `lg:grid-cols-[minmax(0,1fr)_280px]` : agenda de la semaine | marge
 *     (KPI + liste produits).
 * Largeur MESURÉE contre la page réelle par `e2e/sprint-106-product-detail.spec.ts`.
 *
 * Une SEULE région `role="status"` (celle de `LoadingSkeleton`, sur l'agenda, qui
 * garde son testid `dashboard-loading-skeleton`) : les autres blocs sont
 * `aria-hidden` — plusieurs régions annonceraient le même chargement plusieurs fois.
 */
function Block({ className }: { className: string }) {
  return (
    <div className={cn('bg-surface-2 animate-pulse rounded-md', className)} aria-hidden="true" />
  )
}

export default function DashboardLoading() {
  const t = useTranslations('common')

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <div
        className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        data-testid="dashboard-loading-layout"
      >
        {/* Salutation — `GreetingHeader` (variant `full`). */}
        <div
          className="border-rule flex flex-col gap-1 border-b pb-4"
          aria-hidden="true"
          data-testid="dashboard-loading-greeting"
        >
          {/* Hauteurs calées sur le rendu mesuré (eyebrow 14 · titre 28 · sous-titre 20 px) :
              le ruban qui suit démarre à la même ordonnée que sur la page réelle. */}
          <Block className="h-3.5 w-28" />
          <Block className="h-7 w-64 max-w-full" />
          <Block className="h-5 w-80 max-w-full" />
        </div>

        {/* Ruban de densité — `DensityRibbon`. */}
        <div
          className="bg-surface border-rule flex flex-col gap-2 rounded-lg border p-4"
          aria-hidden="true"
          data-testid="dashboard-loading-ribbon"
        >
          <Block className="h-3 w-24" />
          <Block className="h-4 w-48 max-w-full" />
          {/* #623 — même budget `h-24` que le ruban réel : règle (18 px) + 4 px + barres. */}
          <div className="flex h-24 flex-col gap-1">
            <Block className="h-4.5 w-full shrink-0" />
            <Block className="min-h-0 w-full flex-1" />
          </div>
        </div>

        {/* Agenda de la semaine | marge (KPI + produits). */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <LoadingSkeleton
            variant="list"
            rows={5}
            label={t('spinner.loading')}
            testId="dashboard-loading-skeleton"
          />
          <div className="flex flex-col gap-6" aria-hidden="true">
            <Block className="h-24 w-full" />
            <Block className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
