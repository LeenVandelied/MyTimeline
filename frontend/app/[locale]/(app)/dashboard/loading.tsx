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
 * #811 — le squelette suit aussi les mises en page MOBILES de `page.tsx` : portrait
 * (`dashboard-loading-portrait`) et paysage (`dashboard-loading-landscape`). Le fallback
 * est rendu avant que la taille d'écran soit connue : la bascule est donc purement CSS,
 * sur les seuils de `page.tsx` tirés de `@/lib/breakpoints` (#643) — paysage de faible
 * hauteur d'abord (variante `dashboard-landscape:`, construite depuis
 * `DASHBOARD_LANDSCAPE_QUERY`), puis portrait sous 768 px (variantes `max-md:` / `md:` du
 * thème, sans trou entre 767 et 768 px), puis bureau. Aucun crochet de média.
 * Les trois mises en page n'ont aucun `display` en conflit sauf le paysage (`hidden` puis
 * `flex`) : les autres ne font qu'ajouter `hidden` sous une requête.
 *
 * Une SEULE région `role="status"` (celle de `LoadingSkeleton`, sur l'agenda, qui
 * garde son testid `dashboard-loading-skeleton`) : les autres blocs sont
 * `aria-hidden` — plusieurs régions annonceraient le même chargement plusieurs fois.
 * Cette région est dans la mise en page bureau, en `display:none` sous 768 px et en
 * paysage bas : un lecteur d'écran n'y entendrait rien. Un relais `aria-live="polite"`
 * (sans rôle `status`), visible seulement là où le bureau est masqué, annonce alors
 * `common.loading.default`. À chaque taille d'écran, une seule annonce est active.
 */
function Block({ className }: { className: string }) {
  return (
    <div className={cn('bg-surface-2 animate-pulse rounded-md', className)} aria-hidden="true" />
  )
}

/** Ruban défilant — `DensityRibbon scrollable` : carte + rail `overflow-x-auto` à largeur fixe. */
function ScrollableRibbonSkeleton({ testId }: { testId: string }) {
  return (
    <div
      className="bg-surface border-rule flex flex-col gap-2 rounded-lg border p-4"
      data-testid={testId}
    >
      <Block className="h-3 w-24" />
      <Block className="h-4 w-48 max-w-full" />
      <div className="relative">
        <div className="flex h-24 scrollbar-none overflow-x-auto pr-6">
          <Block className="h-full w-[720px] shrink-0" />
        </div>
        {/* Indice de défilement — ligne `scrollHint` sous le rail. */}
        <div className="mt-1 flex justify-end">
          <Block className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}

/** Rangée d'agenda — `AgendaRow` de `CompactAgenda`. */
function AgendaRowSkeleton() {
  return (
    <div className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0">
      <Block className="h-6 w-0.5 shrink-0" />
      <Block className="h-3 min-w-0 flex-1" />
      <Block className="h-3 w-12 shrink-0" />
    </div>
  )
}

/** Agenda compact — `CompactAgenda` : intertitre, puis groupes aujourd'hui et demain. */
function CompactAgendaSkeleton({ testId, className }: { testId: string; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3', className)} data-testid={testId}>
      <Block className="h-4 w-32" />
      {(['today', 'tomorrow'] as const).map((day) => (
        <div key={day} className="flex flex-col gap-1" data-testid={`${testId}-${day}`}>
          <Block className="h-2 w-20" />
          <div className="flex flex-col">
            <AgendaRowSkeleton />
            <AgendaRowSkeleton />
          </div>
        </div>
      ))}
    </section>
  )
}

/** Carrousel produits — `ProductCarousel` : piste `flex overflow-x-auto`, cartes `w-40 shrink-0`. */
function ProductCarouselSkeleton({ testId }: { testId: string }) {
  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <Block className="h-4 w-32" />
      <div className="-mx-4 flex scrollbar-none gap-3 overflow-x-auto px-4 pb-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface border-rule flex w-40 shrink-0 flex-col gap-2 rounded-lg border p-3"
          >
            <Block className="h-3 w-24" />
            <Block className="h-2 w-28" />
            <Block className="h-2 w-8" />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function DashboardLoading() {
  const t = useTranslations('common')

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      {/* Relais d'annonce des tailles où la région `status` bureau est masquée. */}
      <p aria-live="polite" className="dashboard-landscape:block sr-only hidden max-md:block">
        {t('loading.default')}
      </p>
      {/* Bascule des mises en page : requêtes de `page.tsx` (`isLandscape`, `isMobile`) en
          variantes Tailwind, classes LITTÉRALES (Tailwind ne génère que les chaînes qu'il lit). */}
      <div
        className={cn(
          'mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8',
          'max-md:hidden',
          'dashboard-landscape:hidden',
        )}
        data-testid="dashboard-loading-layout"
      >
        {/* Salutation — `GreetingHeader` (variant `full`). */}
        <div
          className="border-rule flex flex-col gap-1 border-b pb-4"
          aria-hidden="true"
          data-testid="dashboard-loading-greeting"
        >
          {/* Hauteurs calées sur le rendu mesuré : le ruban qui suit démarre à la même
              ordonnée que sur la page réelle (`sprint-106-product-detail`, tolérance 6 px).
              #632 (S109) — l'eyebrow passe sur `.mt-eyebrow` (10 px × 1,3 = 13 px au lieu de
              13 px × 1,5 = 19,5 px) : la salutation réelle perd 6,3 px, le bloc aussi
              (14 → 8 px). Les blocs ne reproduisent pas chaque ligne, seulement le total. */}
          <Block className="h-2 w-28" />
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

      {/* Portrait (< 768 px) — `dashboard-mobile-portrait` : une colonne. */}
      <div
        className={cn(
          'mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6',
          'md:hidden',
          'dashboard-landscape:hidden',
        )}
        aria-hidden="true"
        data-testid="dashboard-loading-portrait"
      >
        {/* `GreetingHeader` compact : eyebrow + titre, sans sous-titre. */}
        <div
          className="border-rule flex flex-col gap-1 border-b pb-4"
          data-testid="dashboard-loading-portrait-greeting"
        >
          <Block className="h-2 w-28" />
          <Block className="h-7 w-48 max-w-full" />
        </div>
        <ScrollableRibbonSkeleton testId="dashboard-loading-portrait-ribbon" />
        <CompactAgendaSkeleton testId="dashboard-loading-portrait-agenda" />
        <ProductCarouselSkeleton testId="dashboard-loading-portrait-carousel" />
      </div>

      {/* Paysage de faible hauteur — `dashboard-landscape` : rail 64 px + deux colonnes. */}
      <div
        className={cn('hidden flex-1 overflow-hidden', 'dashboard-landscape:flex')}
        aria-hidden="true"
        data-testid="dashboard-loading-landscape"
      >
        {/* `CompactRail`. */}
        <div
          className="bg-surface border-rule flex w-16 shrink-0 flex-col items-center gap-2 border-r py-3"
          data-testid="dashboard-loading-rail"
        >
          <div className="flex flex-1 flex-col items-center gap-2">
            <Block className="h-12 w-12" />
            <Block className="h-12 w-12" />
          </div>
          <Block className="h-12 w-12" />
        </div>
        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 overflow-y-auto px-4 py-4">
          <CompactAgendaSkeleton testId="dashboard-loading-landscape-agenda" className="min-w-0" />
          <div
            className="flex min-w-0 flex-col gap-4"
            data-testid="dashboard-loading-landscape-products"
          >
            <ScrollableRibbonSkeleton testId="dashboard-loading-landscape-ribbon" />
            <ProductCarouselSkeleton testId="dashboard-loading-landscape-carousel" />
          </div>
        </div>
      </div>
    </div>
  )
}
