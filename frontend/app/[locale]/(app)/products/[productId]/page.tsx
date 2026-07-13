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

  if (loading) {
    return (
      <div
        className="bg-bg flex h-screen items-center justify-center"
        data-testid="product-detail-page-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
        >
          <span className="sr-only">{t('detail.loading')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="product-detail-page">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {productId ? (
          <ProductDetailView productId={productId} />
        ) : (
          <p className="text-ink-muted text-sm" role="alert">
            {t('detail.notFound')}
          </p>
        )}
      </main>

      <AppFooter />
    </div>
  )
}
