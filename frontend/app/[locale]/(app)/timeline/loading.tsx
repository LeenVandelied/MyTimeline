'use client'

import { useTranslations } from 'next-intl'
import { GanttChartSquare } from 'lucide-react'

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/**
 * #629 — Fallback de segment (Suspense) de l'écran frise `/timeline`.
 *
 * Reproduit l'ENVELOPPE de `page.tsx` (section `px-6 py-8 gap-6`, en-tête eyebrow +
 * `<h1>` avec leurs vrais libellés) pour que le remplacement par la page ne décale
 * pas l'en-tête, et monte la variante `timeline` (lanes `--lane-height`, gouttière
 * `--lane-header-w`, tokens définis sous `:root` dans `ds/tokens/spacing.css`) :
 * le handoff décrit le chargement de la frise comme des barres horizontales.
 *
 * Même squelette que la branche `isLoading` de la page (`timeline-data-loading`) :
 * la séquence fallback de segment → chargement des données → frise ne change pas
 * de forme. Testid DISTINCT (`timeline-loading-skeleton`) : les deux ne coexistent
 * jamais, mais un testid partagé brouillerait les specs (cf. DEC-S56-003, ancien
 * `timeline-loading` supprimé — ne pas le réintroduire).
 *
 * Client Component : `useTranslations`, le fallback est monté sous le
 * `NextIntlClientProvider` du layout `[locale]` (comme `dashboard/loading.tsx`).
 */
export default function TimelineLoading() {
  const t = useTranslations('shell.timeline')

  return (
    <section className="flex min-h-screen w-full flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        {/* #632 — `.mt-eyebrow` (DS, se détend en `de`) ; identique à `page.tsx` :
            pas de saut au chargement. */}
        <span className="mt-eyebrow">{t('eyebrow')}</span>
        <h1 className="text-ink flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <GanttChartSquare className="text-accent h-6 w-6" aria-hidden="true" />
          {t('title')}
        </h1>
      </header>

      <LoadingSkeleton
        variant="timeline"
        rows={6}
        label={t('loading')}
        className="min-w-0 flex-1"
        testId="timeline-loading-skeleton"
      />
    </section>
  )
}
