'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

import { useAuth } from '@/hooks/useAuth'
import { AppFooter } from '@/components/ui/footer-app'
import { ProductDetailView } from '@/components/products/ProductDetailView'

/**
 * #68 — Route détail produit (`/{locale}/products/{productId}`).
 *
 * Page client : auth guard aligné dashboard, `productId` lu via `useParams`
 * (résolu synchrone côté client, React 18). Le rendu délègue à `ProductDetailView`
 * (sous-frise filtrée + fiche + édition/suppression).
 */
export default function ProductDetailPage() {
  const t = useTranslations('products')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams<{ productId: string }>()
  const productId = params?.productId
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  // #697 — PAS de branche `loading` ici (même motif que #391 / DEC-S56-003 sur
  // `/timeline`). `AppShell` ne rend `children` qu'une fois `loading` retombé ET `user`
  // présent (`app-shell-loading` = SEUL testid du chargement de session), et `loading`
  // ne repasse à `true` que dans `login`/`register`, appelés hors du groupe `(app)`.
  // L'ancien `product-detail-page-loading` était donc inatteignable. `loading` reste lu
  // par la garde ci-dessus ; `if (!user) return null` reste : filet defense-in-depth
  // sans UI. Chargement des DONNÉES = `product-detail-loading` (`ProductDetailView`).
  if (!user) return null

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="product-detail-page">
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {productId ? (
          <ProductDetailView productId={productId} />
        ) : (
          <p className="text-ink-muted text-sm" role="alert">
            {t('detail.notFound')}
          </p>
        )}
      </div>

      <AppFooter />
    </div>
  )
}
