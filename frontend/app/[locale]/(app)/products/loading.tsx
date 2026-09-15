'use client'

import { useTranslations } from 'next-intl'

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/**
 * #629 — Fallback de segment (Suspense) de la liste produits `/products`.
 *
 * Reproduit l'enveloppe de `page.tsx` (`max-w-7xl`, paddings, onglets `mb-6`) puis
 * celle de `ProductsListView` (onglet par défaut) : en-tête titre + sous-titre avec
 * leurs VRAIS libellés, bouton `h-9`, barre recherche `h-9` + tri `w-[220px]`,
 * `gap-6`. Les onglets reprennent les classes DS `.mt-tabs` / `.mt-tab` (même
 * hauteur de texte, même padding, même filet) en version inerte `aria-hidden`.
 *
 * Variante `list` dans le cadre bordé du tableau : `products-table` est une liste
 * de lignes, et c'est la forme que prend aussi la branche `isLoading` de
 * `ProductsListView` (`products-loading`).
 *
 * `[productId]/loading.tsx` existe pour que CE fallback ne soit pas hérité par la
 * fiche produit (un `loading.tsx` enveloppe aussi les segments enfants).
 */
export default function ProductsLoading() {
  const t = useTranslations('products')

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mt-tabs mb-6" aria-hidden="true">
          <span className="mt-tab">{t('list.title')}</span>
          <span className="mt-tab">{t('categories.title')}</span>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-ink text-xl font-semibold tracking-tight">{t('list.title')}</h1>
              <p className="text-ink-muted text-sm">{t('list.subtitle')}</p>
            </div>
            <div className="bg-surface-2 h-9 w-36 animate-pulse rounded-md" aria-hidden="true" />
          </div>

          <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
            <div className="bg-surface-2 h-9 min-w-0 flex-1 animate-pulse rounded-md" />
            <div className="bg-surface-2 h-9 w-[220px] animate-pulse rounded-md" />
          </div>

          <LoadingSkeleton
            variant="list"
            rows={6}
            label={t('list.loading')}
            className="border-rule rounded-lg border px-4"
            testId="products-loading-skeleton"
          />
        </div>
      </div>
    </div>
  )
}
