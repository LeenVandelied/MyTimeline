'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { AppFooter } from '@/components/ui/footer-app'
import { Tabs } from '@/components/ui/tabs'
import { ProductsListView } from '@/components/products/ProductsListView'
import { CategoriesView } from '@/components/products/CategoriesView'

/**
 * #68 — Route liste produits + catégories (`/{locale}/products`).
 *
 * Page client (interactive : recherche/tri locaux, drawers). Auth guard aligné
 * sur le dashboard (`useAuth`, redirection login si non connecté). Deux vues via
 * onglets (`Tabs` DS, tablist ARIA) : liste des produits et catégories — la vue
 * détail vit sur la route imbriquée `/products/[productId]`.
 */
export default function ProductsPage() {
  const t = useTranslations('products')
  // #210 — Garde d'auth factorisée (defense-in-depth : le shell garde aussi).
  const { user, loading } = useAuthGuard()

  const [tab, setTab] = useState<'products' | 'categories'>('products')

  const tabItems = useMemo(
    () => [
      { value: 'products', label: t('list.title') },
      { value: 'categories', label: t('categories.title') },
    ],
    [t],
  )

  if (loading) {
    return (
      <div
        className="bg-bg flex h-screen items-center justify-center"
        data-testid="products-page-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
        >
          <span className="sr-only">{t('list.loading')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="products-page">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs
          items={tabItems}
          value={tab}
          onValueChange={(v) => setTab(v as 'products' | 'categories')}
          aria-label={t('list.title')}
          className="mb-6"
          data-testid="products-tabs"
        />

        {tab === 'products' ? <ProductsListView /> : <CategoriesView />}
      </main>

      <AppFooter />
    </div>
  )
}
