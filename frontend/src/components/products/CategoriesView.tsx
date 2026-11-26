'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PlusCircle, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { contrastInk } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_BUTTON, TOUCH_TARGET_HITBOX } from '@/lib/touchTarget'
import { CategoryDrawer } from '@/components/categories/CategoryDrawer'
import { CategorySuggestions } from '@/components/categories/CategorySuggestions'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useCategories } from '@/hooks/useCategories'
import { useDeleteCategory } from '@/hooks/useDeleteCategory'
import { useAuth } from '@/hooks/useAuth'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { useAssignProductCategory } from '@/hooks/useAssignProductCategory'
import { HANDLES_FORBIDDEN_INLINE } from '@/services/inlineErrorHandling'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'

/**
 * #68 — Vue catégories.
 *
 * BR touchées :
 *   - BR-CAT-007 : chargement dynamique des catégories (`useCategories`).
 *   - BR-CAT-001 : nom obligatoire (géré par `CategoryDrawer`, non ré-implémenté).
 *
 * Cards = palette (pastille couleur) + nom + puces des produits ACTIFS (#604) + compteurs
 * de produits liés. #695 : les compteurs viennent du BACKEND (`CategoryResponse.productCount` /
 * `archivedProductCount`, `GET /api/categories`), pas de la liste produits : celle-ci ne
 * sert qu'aux puces.
 * #604 — chaque puce porte un `<select>` natif de catégorie (`useAssignProductCategory` :
 * mise à jour optimiste, retour arrière si le serveur refuse, alerte locale). Les archivés ne
 * sont jamais des puces (le listing les exclut déjà, le filtre `archived` est une garde).
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

export interface CategoriesViewProps {
  /** #719 — le compteur d'archivés d'une catégorie ouvre l'onglet Archivés filtré sur elle. */
  onShowArchived?: (categoryId: string) => void
}

export function CategoriesView({ onShowArchived }: CategoriesViewProps = {}) {
  const t = useTranslations('products.categories')

  const categoriesQuery = useCategories(true)
  const { user } = useAuth()
  const productsQuery = useProductsWithEvents(user?.id)
  // #604 — le 403 est rendu par l'alerte locale ci-dessous : la requête se retire du toast
  // global pour lui. 404 et 409 n'ont pas de toast ; 400/401/500, timeout et réseau sont déjà
  // signalés par l'intercepteur (alerte locale limitée à 403/404/409 : un seul signalement).
  const assignMutation = useAssignProductCategory(user?.id, HANDLES_FORBIDDEN_INLINE)
  const assignStatus = (assignMutation.error as { response?: { status?: number } } | null)?.response
    ?.status
  const showAssignError =
    assignMutation.isError && (assignStatus === 403 || assignStatus === 404 || assignStatus === 409)
  // #766 — `handleDeleteConfirm` relance l'erreur et `DeleteConfirmDialog` affiche `errors.forbidden`
  // sur un 403 : la requête se retire du toast global (sinon double signalement).
  const deleteMutation = useDeleteCategory(HANDLES_FORBIDDEN_INLINE)

  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])

  // #604 — puces : produits actifs seulement, regroupés par catégorie. `archived` n'est pas
  // dans le contrat `Product` (le listing exclut les archivés) : lecture défensive.
  const chipsByCategory = React.useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const product of productsQuery.data ?? []) {
      if ((product as { archived?: boolean }).archived === true) continue
      const list = map.get(product.category.id) ?? []
      list.push(product)
      map.set(product.category.id, list)
    }
    return map
  }, [productsQuery.data])

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
  // Review S90, #700 — focus au retour du drawer de création (même logique et même
  // raison que `ProductsListView`) : sans `Dialog.Trigger`, Radix ne rend le focus à
  // RIEN (il tombait sur `body`), on le place donc toujours nous-mêmes. Ouvert depuis
  // le bouton permanent → bouton permanent ; depuis le CTA encore monté → CTA, et s'il
  // se démonte ensuite en le détenant (invalidation non attendue par la mutation),
  // l'effet ci-dessous le rend au bouton permanent ; CTA déjà démonté → bouton permanent.
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
    // #700 — TOUJOURS intercepté : sans `Dialog.Trigger`, Radix ne rend le focus à rien.
    event.preventDefault()
    const fromEmpty = createFromEmptyRef.current
    createFromEmptyRef.current = false
    const emptyCta = emptyCtaRef.current
    if (fromEmpty && emptyCta?.isConnected) {
      focusBackToEmptyCtaRef.current = true
      emptyCta.focus()
      return
    }
    newButtonRef.current?.focus()
  }
  // #638 — un choix de suggestion (clavier compris) démonte les boutons quand la liste
  // arrive : le focus tombait sur `body`. Même rattrapage que le CTA, au même effet.
  const focusBackFromSuggestionRef = React.useRef(false)
  const handleSuggestionChoose = () => {
    focusBackFromSuggestionRef.current = true
  }
  const hasCategories = categories.length > 0
  React.useEffect(() => {
    if (!hasCategories) return
    if (!focusBackToEmptyCtaRef.current && !focusBackFromSuggestionRef.current) return
    focusBackToEmptyCtaRef.current = false
    focusBackFromSuggestionRef.current = false
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

      {showAssignError && (
        <p className="text-destructive text-sm" role="alert" data-testid="categories-assign-error">
          {t('assignError')}
        </p>
      )}

      {/* #604 — la liste produits ne sert qu'aux puces : son échec ne touche pas les compteurs
          (serveur, #695), il masque seulement les puces, on le dit sans alerte. */}
      {productsQuery.isError && (
        <p className="text-ink-muted text-xs" role="status" data-testid="categories-products-error">
          {t('productsError')}
        </p>
      )}

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
        // (ouvre le `CategoryDrawer` de création). Aucune catégorie semée (DEC-S82-004) :
        // #638 propose les sept catégories types, créées seulement au clic.
        <EmptyState
          title={t('empty')}
          action={
            <div className="flex flex-col items-center gap-4">
              <CategorySuggestions onChoose={handleSuggestionChoose} />
              <Button
                type="button"
                ref={emptyCtaRef}
                onClick={() => openCreate(true)}
                // #767 — mesuré 182×36 à 375 px (cva `h-9`) : 44 px sous 768 px.
                className={TOUCH_TARGET_BUTTON}
                data-testid="categories-empty-cta"
              >
                {t('emptyCta')}
              </Button>
            </div>
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
            const chips = chipsByCategory.get(category.id) ?? []
            return (
              <li key={category.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={t('openEdit', { name: category.name })}
                  onClick={() => setEditCategory(category)}
                  onKeyDown={(e) => {
                    // #836 — Entrée/Espace sur la corbeille remontaient jusqu'ici :
                    // `preventDefault` annulait la suppression et ouvrait l'ÉDITION.
                    if (e.target !== e.currentTarget) return
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

                  {chips.length > 0 && (
                    // #604 — la zone des puces n'ouvre pas l'édition de la carte (le `select`
                    // natif est un contrôle à part entière).
                    <div
                      className="flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`categories-chips-${category.id}`}
                    >
                      {chips.map((product) => (
                        <div
                          key={product.id}
                          className="border-rule bg-surface flex min-w-0 items-center gap-2 rounded-full border py-1 pr-1 pl-3 max-md:w-full max-md:flex-col max-md:items-stretch max-md:rounded-lg max-md:p-2"
                          data-testid={`categories-chip-${product.id}`}
                        >
                          <span className="text-ink min-w-0 text-sm break-words">
                            {product.name}
                          </span>
                          {/* Natif à dessein : un contrôle DANS une carte cliquable, sans portail
                              (un Radix Select porterait son contenu hors de la carte, et ses
                              clics remonteraient à l'ouverture de l'édition). Désactivé pendant
                              un envoi : pas d'envoi concurrent, le retour arrière par instantané
                              reste exact. Focus clavier : le contour `:focus-visible` du DS (@layer base)
                              s'applique seul, aucune utilitaire locale (DEC-S58-001). */}
                          <select
                            value={product.category.id}
                            disabled={assignMutation.isPending}
                            aria-label={t('assignLabel', { name: product.name })}
                            onChange={(e) =>
                              assignMutation.mutate({
                                productId: product.id,
                                categoryId: e.target.value,
                              })
                            }
                            className={cn(
                              'border-rule bg-surface text-ink h-8 min-w-0 rounded-full border px-2 text-xs',
                              'disabled:cursor-wait disabled:opacity-60',
                              'max-md:h-11 max-md:w-full max-md:rounded-md max-md:text-sm',
                            )}
                            data-testid={`categories-assign-${product.id}`}
                          >
                            {categories.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

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
                          l'ICU d'une seule clé ne peut pas exprimer la combinaison.
                          #719 — c'est un bouton natif DANS une carte cliquable : le clic
                          ne remonte pas à l'ouverture de l'édition. */}
                      {archivedCount > 0 && (
                        <button
                          type="button"
                          className={cn(
                            'text-ink-muted hover:text-ink text-2xs underline-offset-2 hover:underline',
                            TOUCH_TARGET_HITBOX,
                          )}
                          // WCAG 2.5.3 : le nom accessible reprend le texte visible.
                          aria-label={`${t('archivedCount', { count: archivedCount })}, ${t('showArchivedLabel', { name: category.name })}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onShowArchived?.(category.id)
                          }}
                          data-testid={`categories-archived-count-${category.id}`}
                        >
                          {t('archivedCount', { count: archivedCount })}
                        </button>
                      )}
                    </div>

                    {/* Suppression réservée aux catégories NON système (ADR-002). */}
                    {!category.system && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn('text-destructive', TOUCH_TARGET_HITBOX)}
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
