'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useCategories } from '@/hooks/useCategories'
import { AppFooter } from '@/components/ui/footer-app'
import { Tabs } from '@/components/ui/tabs'
import { ProductsListView } from '@/components/products/ProductsListView'
import { CategoriesView } from '@/components/products/CategoriesView'
import { ArchivedProductsView } from '@/components/products/ArchivedProductsView'

type ProductsTab = 'products' | 'categories' | 'archived'

function isProductsTab(value: string): value is ProductsTab {
  return value === 'products' || value === 'categories' || value === 'archived'
}

/**
 * #68 — Route liste produits + catégories (`/{locale}/products`).
 *
 * Page client (interactive : recherche/tri locaux, drawers). Auth guard aligné
 * sur le dashboard (`useAuth`, redirection login si non connecté). Trois vues via
 * onglets (`Tabs` DS, tablist ARIA) : liste des produits, catégories et, depuis #711,
 * produits archivés (désarchivage) — la vue détail vit sur la route imbriquée
 * `/products/[productId]`. Onglet en état LOCAL (pas de route `/products/archived`,
 * arbitrage #711) : chaque vue est montée à la sélection, donc relit ses requêtes
 * invalidées (un produit archivé ou restauré apparaît dans l'autre onglet sans rechargement).
 */
export default function ProductsPage() {
  const t = useTranslations('products')
  // #210 — Garde d'auth factorisée (defense-in-depth : le shell garde aussi).
  const { user } = useAuthGuard()

  const [tab, setTab] = useState<ProductsTab>('products')
  // #719 — filtre des archivés par catégorie. Il vit ICI : les vues sont remontées à chaque
  // changement d'onglet, un état local à la vue serait perdu.
  const [archivedCategoryId, setArchivedCategoryId] = useState<string | undefined>()

  // #719 — le compteur d'une carte démonte la vue Catégories : le focus tombait sur `body`.
  // Il va à l'onglet Archivés (scopé à CETTE tablist), posé après le rendu du nouvel onglet.
  const tabsRef = useRef<HTMLDivElement>(null)
  const focusArchivedTabRef = useRef(false)
  useEffect(() => {
    if (tab !== 'archived' || !focusArchivedTabRef.current) return
    focusArchivedTabRef.current = false
    tabsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
  }, [tab])

  // Même requête que `CategoriesView` (cache partagé) : le nom du filtre survit à la
  // restauration du dernier archivé de la catégorie.
  const categoriesQuery = useCategories(true)
  const archivedCategoryName = categoriesQuery.data?.find(
    (category) => category.id === archivedCategoryId,
  )?.name

  const tabItems = useMemo(
    () => [
      { value: 'products', label: t('list.title') },
      { value: 'categories', label: t('categories.title') },
      { value: 'archived', label: t('archived.title') },
    ],
    [t],
  )

  // #697 — PAS de branche `loading` ici (même motif que #391 / DEC-S56-003 sur
  // `/timeline`). `AppShell` ne rend `children` qu'une fois `loading` retombé ET `user`
  // présent (`app-shell-loading` = SEUL testid du chargement de session), et `loading`
  // ne repasse à `true` que dans `login`/`register`, appelés hors du groupe `(app)`.
  // L'ancien `products-page-loading` était donc inatteignable. `if (!user) return null`
  // reste : filet defense-in-depth sans UI. Chargement des DONNÉES = `products-loading`
  // (`ProductsListView`), lui atteignable.
  if (!user) return null

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="products-page">
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs
          ref={tabsRef}
          items={tabItems}
          value={tab}
          onValueChange={(v) => {
            if (!isProductsTab(v)) return
            // Un clic direct sur un onglet (Archivés compris) retire le filtre.
            setArchivedCategoryId(undefined)
            setTab(v)
          }}
          aria-label={t('list.title')}
          className="mb-6"
          data-testid="products-tabs"
        />

        {tab === 'products' && <ProductsListView />}
        {tab === 'categories' && (
          <CategoriesView
            onShowArchived={(categoryId) => {
              setArchivedCategoryId(categoryId)
              focusArchivedTabRef.current = true
              setTab('archived')
            }}
          />
        )}
        {tab === 'archived' && (
          <ArchivedProductsView
            categoryId={archivedCategoryId}
            categoryName={archivedCategoryName}
            onClearCategoryFilter={() => setArchivedCategoryId(undefined)}
          />
        )}
      </div>

      <AppFooter />
    </div>
  )
}
