'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PlusCircle, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { contrastInk } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { CategoryDrawer } from '@/components/categories/CategoryDrawer'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { useCategories } from '@/hooks/useCategories'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { useAuth } from '@/hooks/useAuth'
import { deleteCategory } from '@/services/categoryService'
import type { Category } from '@/types/category'

/**
 * #68 — Vue catégories.
 *
 * BR touchées :
 *   - BR-CAT-007 : chargement dynamique des catégories (`useCategories`).
 *   - BR-CAT-001 : nom obligatoire (géré par `CategoryDrawer`, non ré-implémenté).
 *
 * Cards = palette (pastille couleur) + nom + compteur de produits liés (dérivé
 * localement de `useProductsWithEvents`, aucun endpoint compteur dédié). Actions :
 *   - « Nouvelle catégorie » → `CategoryDrawer` create (livré par #62, EMBARQUÉ).
 *   - Clic card → `CategoryDrawer` edit (catégorie système = lecture seule, géré
 *     par le drawer via `category.system`).
 *   - Supprimer → `DeleteConfirmDialog` variant="category". On passe
 *     `linkedProductsCount` (connu localement) + `categoryId` pour forcer le select
 *     de réassignation EN AMONT quand des produits sont liés (sinon 409 backend).
 *     Les catégories système ne sont pas supprimables (bouton masqué).
 */

export function CategoriesView() {
  const t = useTranslations('products.categories')
  const { user } = useAuth()
  const userId = user?.id

  const categoriesQuery = useCategories(true)
  const productsQuery = useProductsWithEvents(userId)

  const categories = React.useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )

  // Compteur de produits par catégorie (produits archivés déjà exclus API #50).
  const countByCategory = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const product of productsQuery.data ?? []) {
      const id = product.category?.id
      if (!id) continue
      map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [productsQuery.data])

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editCategory, setEditCategory] = React.useState<Category | null>(null)
  const [deleteCategoryState, setDeleteCategoryState] = React.useState<Category | null>(null)

  const handleDeleteConfirm = async (reassignToCategoryId?: string) => {
    if (!deleteCategoryState) throw new Error('catégorie manquante')
    await deleteCategory(deleteCategoryState.id, reassignToCategoryId)
    setDeleteCategoryState(null)
  }

  return (
    <div className="flex flex-col gap-6" data-testid="categories-view">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-ink-muted text-sm">{t('subtitle')}</p>
        </div>
        <Button
          variant="outline"
          className="bg-accent hover:bg-accent-hover text-accent-ink flex items-center gap-2 border-none"
          onClick={() => setCreateOpen(true)}
          data-testid="categories-new-button"
        >
          <PlusCircle size={16} aria-hidden="true" />
          <span>{t('newCategory')}</span>
        </Button>
      </div>

      {categoriesQuery.isLoading ? (
        <p className="text-ink-muted text-sm" role="status" data-testid="categories-loading">
          {t('loading')}
        </p>
      ) : categoriesQuery.isError ? (
        <p className="text-destructive text-sm" role="alert" data-testid="categories-error">
          {t('error')}
        </p>
      ) : categories.length === 0 ? (
        <p className="text-ink-muted text-sm" data-testid="categories-empty">
          {t('empty')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const count = countByCategory.get(category.id) ?? 0
            const color = category.color ?? null
            return (
              <li key={category.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={t('openEdit', { name: category.name })}
                  onClick={() => setEditCategory(category)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setEditCategory(category)
                    }
                  }}
                  className={cn(
                    'bg-surface border-rule hover:bg-accent-soft focus:ring-ring group flex w-full flex-col gap-3 rounded-lg border p-4 text-left',
                    'cursor-pointer transition-colors focus:ring-2 focus:outline-none',
                  )}
                  data-testid={`categories-card-${category.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-4 shrink-0 rounded-full"
                        style={{ background: color ?? 'var(--color-rule-strong)' }}
                        aria-hidden="true"
                      />
                      <span className="text-ink truncate font-medium">{category.name}</span>
                    </div>
                    {category.system && (
                      <span
                        className="bg-muted text-ink-muted rounded-full px-2 py-0.5 text-2xs font-medium"
                        data-testid={`categories-system-${category.id}`}
                      >
                        {t('system')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: color ?? 'var(--color-rule-strong)',
                        color: contrastInk(color),
                      }}
                      data-testid={`categories-count-${category.id}`}
                    >
                      {t('productCount', { count })}
                    </span>

                    {/* Suppression réservée aux catégories NON système (ADR-002). */}
                    {!category.system && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        aria-label={t('delete')}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteCategoryState(category)
                        }}
                        data-testid={`categories-delete-${category.id}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Création — CategoryDrawer livré par #62 (EMBARQUÉ, non réécrit). */}
      <CategoryDrawer open={createOpen} onOpenChange={setCreateOpen} mode="create" />

      {/* Édition — même drawer préfilé (`key` = remount propre au switch). */}
      {editCategory && (
        <CategoryDrawer
          key={editCategory.id}
          open={Boolean(editCategory)}
          onOpenChange={(next) => {
            if (!next) setEditCategory(null)
          }}
          mode="edit"
          category={editCategory}
        />
      )}

      {/* Suppression — réassignation forcée en amont si produits liés. */}
      {deleteCategoryState && (
        <DeleteConfirmDialog
          open={Boolean(deleteCategoryState)}
          onOpenChange={(next) => {
            if (!next) setDeleteCategoryState(null)
          }}
          variant="category"
          categoryId={deleteCategoryState.id}
          linkedProductsCount={countByCategory.get(deleteCategoryState.id) ?? 0}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}

export default CategoriesView
