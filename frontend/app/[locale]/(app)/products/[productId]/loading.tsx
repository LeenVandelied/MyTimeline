'use client'

import { useTranslations } from 'next-intl'

import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/**
 * #629 — Fallback de segment (Suspense) de la fiche produit.
 *
 * Existe d'abord pour une raison de STRUCTURE : un `loading.tsx` enveloppe son
 * segment ET tous ses enfants. Sans ce fichier, `products/loading.tsx` (onglets +
 * recherche + tableau) serait aussi le fallback de `/products/[productId]` — un
 * squelette de liste pendant l'ouverture d'une fiche.
 *
 * Enveloppe de `page.tsx` (`max-w-7xl`, mêmes paddings). En tête, l'emplacement du
 * bouton retour (`product-detail-back`, `Button` ghost `h-9`) que la fiche rend dans
 * tous ses états. Variante `timeline` : la fiche embarque la frise du produit.
 * Libellé `products.detail.loading`, celui de la branche de chargement de
 * `ProductDetailView`.
 */
export default function ProductDetailLoading() {
  const t = useTranslations('products')

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="bg-surface-2 h-9 w-28 animate-pulse rounded-md" aria-hidden="true" />
          <LoadingSkeleton
            variant="timeline"
            rows={3}
            label={t('detail.loading')}
            testId="product-detail-loading-skeleton"
          />
        </div>
      </div>
    </div>
  )
}
