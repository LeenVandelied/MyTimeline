'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { ArchiveRestore } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TOUCH_TARGET_HITBOX } from '@/lib/touchTarget'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { useArchivedProducts } from '@/hooks/useArchivedProducts'
import { useRestoreProduct } from '@/hooks/useRestoreProduct'
import type { ArchivedProduct } from '@/types/product'
import { RestoreProductDialog } from './RestoreProductDialog'

/**
 * #711 — Onglet « Archivés » de `/products` : produits archivés + « Désarchiver ».
 *
 * BR : BR-PRO-007 (l'archivage n'est plus définitif), BR-PRO-011 (lecture native scopée au
 * user, restauration anti-IDOR, 404 uniforme). Pas de filtre « a des événements » : un
 * archivé sans événement reste restaurable.
 *
 * Revue Designer S93 : structure du tableau de `ProductsListView`, colonnes réduites à
 * Produit (pastille + nom + catégorie en mention) et Actions ; bouton `outline` `sm` +
 * `ArchiveRestore` (calque du désarchivage d'événement de `ProductDetailView`) ; état vide
 * `EmptyState` sans CTA ni frise. Les lignes ne sont PAS des liens : le détail d'un produit
 * archivé est introuvable (404) tant qu'il n'est pas restauré.
 *
 * Désarchiver → `RestoreProductDialog` (confirmation non destructive) → `useRestoreProduct`
 * (ligne retirée EN PLACE, listes produits/catégories invalidées) → toast au succès seulement ;
 * un rejet reste inline dans le dialog.
 */
export function ArchivedProductsView() {
  const t = useTranslations('products.archived')
  const tToast = useTranslations('common.toast')
  const { user } = useAuth()
  const userId = user?.id

  const query = useArchivedProducts(userId)
  const restoreMutation = useRestoreProduct(userId)

  // Cible conservée après fermeture : le nom reste affiché pendant l'animation de sortie.
  const [target, setTarget] = React.useState<ArchivedProduct | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const openRestore = (product: ArchivedProduct) => {
    setTarget(product)
    setDialogOpen(true)
  }

  const handleRestoreConfirm = async () => {
    if (!target) throw new Error('produit à désarchiver manquant')
    await restoreMutation.mutateAsync({ productId: target.id })
    toast.success(tToast('productRestored'))
  }

  const products = query.data ?? []

  return (
    <div className="flex flex-col gap-6" data-testid="products-archived-view">
      <div>
        <h1 className="text-ink text-xl font-semibold tracking-tight">{t('tableLabel')}</h1>
        <p className="text-ink-muted text-sm">{t('emptyDescription')}</p>
      </div>

      {query.isLoading ? (
        <LoadingSkeleton
          variant="list"
          rows={3}
          label={t('loading')}
          className="border-rule rounded-lg border px-4"
          testId="products-archived-loading"
        />
      ) : query.isError ? (
        <p className="text-destructive text-sm" role="alert" data-testid="products-archived-error">
          {t('error')}
        </p>
      ) : products.length === 0 ? (
        <EmptyState
          title={t('empty')}
          className="border-rule rounded-lg border px-4"
          testId="products-archived-empty"
        />
      ) : (
        <div className="border-rule overflow-x-auto rounded-lg border">
          <table
            className="w-full border-collapse text-left text-sm"
            aria-label={t('tableLabel')}
            data-testid="products-archived-table"
          >
            <thead>
              <tr className="border-rule text-ink-muted border-b text-xs">
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('columns.product')}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const effectiveColor = product.color ?? product.category.color ?? null
                return (
                  <tr
                    key={product.id}
                    className="border-rule border-b last:border-b-0"
                    data-testid={`products-archived-row-${product.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full"
                          style={{ background: effectiveColor ?? 'var(--color-rule-strong)' }}
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-ink truncate font-medium">{product.name}</span>
                          <span
                            className="text-ink-muted truncate font-mono text-xs"
                            data-testid={`products-archived-row-category-${product.id}`}
                          >
                            {product.category.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn('flex shrink-0 items-center gap-2', TOUCH_TARGET_HITBOX)}
                          aria-label={t('restoreLabel', { name: product.name })}
                          onClick={() => openRestore(product)}
                          data-testid={`products-archived-restore-${product.id}`}
                        >
                          <ArchiveRestore className="size-4" aria-hidden="true" />
                          {t('restore')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <RestoreProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productName={target?.name ?? ''}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  )
}

export default ArchivedProductsView
