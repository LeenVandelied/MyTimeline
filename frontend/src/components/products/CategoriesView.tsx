'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PlusCircle, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { contrastInk } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { CategoryDrawer } from '@/components/categories/CategoryDrawer'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useCategories } from '@/hooks/useCategories'
import { useDeleteCategory } from '@/hooks/useDeleteCategory'
import type { Category } from '@/types/category'

/**
 * #68 — Vue catégories.
 *
 * BR touchées :
 *   - BR-CAT-007 : chargement dynamique des catégories (`useCategories`).
 *   - BR-CAT-001 : nom obligatoire (géré par `CategoryDrawer`, non ré-implémenté).
 *
 * Cards = palette (pastille couleur) + nom + compteurs de produits liés. #695 : les
 * compteurs viennent du BACKEND (`CategoryResponse.productCount` /
 * `archivedProductCount`, `GET /api/categories`), plus de `useProductsWithEvents`.
 * Pourquoi : le listing produits exclut les archivés (`@SQLRestriction`) alors qu'un
 * produit archivé occupe toujours sa catégorie (DEC-S89-001) — une catégorie ne portant
 * que des archivés affichait « aucun produit » puis refusait sa propre suppression.
 * Les deux populations restent SÉPARÉES à l'écran (badge coloré = actifs, mention
 * discrète = archivés) : un total unique ferait croire à des produits visibles dans les
 * listes. Actions :
 *   - « Nouvelle catégorie » → `CategoryDrawer` create (livré par #62, EMBARQUÉ).
 *   - Clic card → `CategoryDrawer` edit (catégorie système = lecture seule, géré
 *     par le drawer via `category.system`).
 *   - Supprimer → `DeleteConfirmDialog` variant="category". On passe
 *     `linkedProductsCount` = actifs + ARCHIVÉS (#695) + `categoryId` pour forcer le
 *     select de réassignation EN AMONT quand des produits sont liés — c'est bien le
 *     total, archivés compris, qui déclenche le 409 backend (`countByCategoryId`).
 *     Les catégories système ne sont pas supprimables (bouton masqué).
 */

export function CategoriesView() {
  const t = useTranslations('products.categories')

  const categoriesQuery = useCategories(true)
  const deleteMutation = useDeleteCategory()

  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  /**
   * #695 — total occupant la catégorie : actifs + archivés, tels que le backend les
   * compte. C'est ce total qui arme le select de réassignation (le 409 de suppression
   * se déclenche sur les archivés aussi). Les champs sont `.optional()` côté Zod (ils
   * n'existent que sur `GET /api/categories`) : `?? 0` est un repli de contrat, pas
   * une valeur métier — le repli `reassignRequiredByServer` de `DeleteConfirmDialog`
   * reste la défense si ce compteur est périmé (PAT-S89-001 : le refus serveur fait foi).
   */
  const linkedCountOf = (category: Category) =>
    (category.productCount ?? 0) + (category.archivedProductCount ?? 0)

  const [createOpen, setCreateOpen] = React.useState(false)
  // Review S90 — focus au retour du drawer de création ouvert depuis le CTA d'état vide
  // (même logique que `ProductsListView`) : CTA déjà démonté à la fermeture → bouton
  // permanent ; CTA encore monté → Radix lui rend le focus, et s'il se démonte ensuite
  // en le détenant (invalidation non attendue par la mutation), l'effet ci-dessous le
  // rend au bouton permanent.
  const newButtonRef = React.useRef<HTMLButtonElement>(null)
  const emptyCtaRef = React.useRef<HTMLButtonElement>(null)
  const createFromEmptyRef = React.useRef(false)
  const focusBackToEmptyCtaRef = React.useRef(false)
  const openCreate = (fromEmpty: boolean) => {
    createFromEmptyRef.current = fromEmpty
    focusBackToEmptyCtaRef.current = false
    setCreateOpen(true)
  }
  const handleCreateCloseAutoFocus = (event: Event) => {
    if (!createFromEmptyRef.current) return
    createFromEmptyRef.current = false
    if (emptyCtaRef.current?.isConnected) {
      focusBackToEmptyCtaRef.current = true
      return
    }
    event.preventDefault()
    newButtonRef.current?.focus()
  }
  const hasCategories = categories.length > 0
  React.useEffect(() => {
    if (!hasCategories || !focusBackToEmptyCtaRef.current) return
    focusBackToEmptyCtaRef.current = false
    const active = document.activeElement
    if (active === null || active === document.body) newButtonRef.current?.focus()
  }, [hasCategories])
  const [editCategory, setEditCategory] = React.useState<Category | null>(null)
  const [deleteCategoryState, setDeleteCategoryState] = React.useState<Category | null>(null)

  const handleDeleteConfirm = async (reassignToCategoryId?: string) => {
    if (!deleteCategoryState) throw new Error('catégorie manquante')
    // useMutation → invalide categories.all + products.all onSuccess (#245).
    // mutateAsync REJETTE en cas d'erreur pour l'affichage inline du dialog (#65).
    await deleteMutation.mutateAsync({ id: deleteCategoryState.id, reassignToCategoryId })
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
          ref={newButtonRef}
          onClick={() => openCreate(false)}
          data-testid="categories-new-button"
        >
          <PlusCircle size={16} aria-hidden="true" />
          <span>{t('newCategory')}</span>
        </Button>
      </div>

      {categoriesQuery.isLoading ? (
        // #629 — Variante `cards` : même grille 1/2/3 colonnes `gap-4` et cartes
        // `rounded-lg border p-4` que la liste réelle. Testid et libellé inchangés.
        <LoadingSkeleton
          variant="cards"
          rows={6}
          label={t('loading')}
          testId="categories-loading"
        />
      ) : categoriesQuery.isError ? (
        <p className="text-destructive text-sm" role="alert" data-testid="categories-error">
          {t('error')}
        </p>
      ) : categories.length === 0 ? (
        // #630 — État vide partagé + CTA : même handler que `categories-new-button`
        // (ouvre le `CategoryDrawer` de création). Aucune catégorie semée ni
        // suggérée ici (DEC-S82-004, suggestions = #638).
        <EmptyState
          title={t('empty')}
          action={
            <Button
              type="button"
              ref={emptyCtaRef}
              onClick={() => openCreate(true)}
              data-testid="categories-empty-cta"
            >
              {t('emptyCta')}
            </Button>
          }
          className="border-rule rounded-lg border px-4"
          testId="categories-empty"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* TODO(perf, follow-up sprint): virtualiser si > 50 items (react-virtual) — cf. audit S22. */}
          {categories.map((category) => {
            const activeCount = category.productCount ?? 0
            const archivedCount = category.archivedProductCount ?? 0
            // Badge coloré (actifs) masqué quand la catégorie ne porte QUE des archivés :
            // il dirait « aucun produit » à côté de la mention « N archivé(s) ». Il reste
            // affiché à 0/0, où « aucun produit » est vrai (revue Designer #695).
            const showActiveBadge = activeCount > 0 || archivedCount === 0
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
                    'bg-surface border-rule hover:bg-accent-soft group flex w-full flex-col gap-3 rounded-lg border p-4 text-left',
                    'cursor-pointer transition-colors',
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
                        className="bg-muted text-ink-muted text-2xs rounded-full px-2 py-0.5 font-medium"
                        data-testid={`categories-system-${category.id}`}
                      >
                        {t('system')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {showActiveBadge && (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: color ?? 'var(--color-rule-strong)',
                            color: contrastInk(color),
                          }}
                          data-testid={`categories-count-${category.id}`}
                        >
                          {t('productCount', { count: activeCount })}
                        </span>
                      )}

                      {/* #695 — nœud FRÈRE hors du badge coloré (revue Designer) : les
                          archivés ne sont pas des produits visibles, ils ne partagent
                          donc pas l'emphase du badge. Deux compteurs = conditionnel JSX,
                          l'ICU d'une seule clé ne peut pas exprimer la combinaison. */}
                      {archivedCount > 0 && (
                        <span
                          className="text-ink-muted text-2xs"
                          data-testid={`categories-archived-count-${category.id}`}
                        >
                          {t('archivedCount', { count: archivedCount })}
                        </span>
                      )}
                    </div>

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
      <CategoryDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onCloseAutoFocus={handleCreateCloseAutoFocus}
      />

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
          linkedProductsCount={linkedCountOf(editCategory)}
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
          linkedProductsCount={linkedCountOf(deleteCategoryState)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}

export default CategoriesView
