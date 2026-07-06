'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Pencil, Archive, PlusCircle, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { contrastInk } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductDrawer } from './ProductDrawer'
import { ProductSparkline } from './ProductSparkline'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { useAuth } from '@/hooks/useAuth'
import { deleteProduct } from '@/services/productService'
import type { Product } from '@/types/product'

/**
 * #68 — Vue liste des produits.
 *
 * BR touchées :
 *   - BR-PRO-006 : le listing n'affiche QUE les produits du user connecté
 *     (`useProductsWithEvents(userId)` → `GET /users/{userId}/products`).
 *   - #50 : les produits archivés sont déjà exclus côté backend
 *     (`@SQLRestriction("archived=false")`) — aucun filtre archived côté client.
 *
 * Recherche et tri sont LOCAUX (client, aucun refetch réseau — critère d'accept.).
 * Le tableau réutilise `ProductSparkline` (fenêtre 90 j bornée) par ligne et une
 * pastille catégorie colorée (couleur effective `product.color ?? category.color`).
 *
 * Actions :
 *   - « Nouveau produit » → `ProductDrawer` (mode create), réutilisé tel quel (#61).
 *   - Éditer → `ProductDrawer` (mode edit) préfilé.
 *   - Archiver → `DeleteConfirmDialog` variant="product" (le DELETE backend est un
 *     soft delete #50) qui appelle `deleteProduct`.
 *   - Clic/Entrée/Espace sur une ligne → navigation vers le détail produit.
 */

type SortKey =
  | 'nameAsc'
  | 'nameDesc'
  | 'categoryAsc'
  | 'lastActivityDesc'
  | 'lastActivityAsc'

const SORT_KEYS: SortKey[] = [
  'lastActivityDesc',
  'lastActivityAsc',
  'nameAsc',
  'nameDesc',
  'categoryAsc',
]

/** Timestamp du dernier événement (non archivé) d'un produit, ou null. */
function lastActivityMs(product: Product): number | null {
  let max: number | null = null
  for (const event of product.events ?? []) {
    if (event.archived) continue
    const ms = new Date(event.startDate).getTime()
    if (Number.isNaN(ms)) continue
    if (max === null || ms > max) max = ms
  }
  return max
}

export function ProductsListView() {
  const t = useTranslations('products.list')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id

  const query = useProductsWithEvents(userId)
  const products = React.useMemo(() => query.data ?? [], [query.data])

  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState<SortKey>('lastActivityDesc')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editProduct, setEditProduct] = React.useState<Product | null>(null)
  const [archiveProduct, setArchiveProduct] = React.useState<Product | null>(null)

  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  )

  const visible = React.useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = needle
      ? products.filter((p) => p.name.toLowerCase().includes(needle))
      : products.slice()

    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, locale)
    filtered.sort((a, b) => {
      switch (sort) {
        case 'nameAsc':
          return byName(a, b)
        case 'nameDesc':
          return byName(b, a)
        case 'categoryAsc': {
          const c = (a.category?.name ?? '').localeCompare(b.category?.name ?? '', locale)
          return c !== 0 ? c : byName(a, b)
        }
        case 'lastActivityAsc':
        case 'lastActivityDesc': {
          const la = lastActivityMs(a)
          const lb = lastActivityMs(b)
          // Produits sans activité repoussés en fin de liste dans les deux sens.
          if (la === null && lb === null) return byName(a, b)
          if (la === null) return 1
          if (lb === null) return -1
          return sort === 'lastActivityDesc' ? lb - la : la - lb
        }
        default:
          return 0
      }
    })
    return filtered
  }, [products, search, sort, locale])

  const goToDetail = React.useCallback(
    (productId: string) => {
      router.push(`/${locale}/products/${productId}`)
    },
    [router, locale],
  )

  const handleArchiveConfirm = async () => {
    if (!userId || !archiveProduct) throw new Error('userId/produit manquant')
    await deleteProduct(userId, archiveProduct.id)
    setArchiveProduct(null)
  }

  return (
    <div className="flex flex-col gap-6" data-testid="products-list-view">
      {/* En-tête : titre + « Nouveau produit ». */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-ink-muted text-sm">{t('subtitle')}</p>
        </div>
        <Button
          variant="outline"
          className="bg-accent hover:bg-accent-hover text-accent-ink flex items-center gap-2 border-none"
          onClick={() => setCreateOpen(true)}
          data-testid="products-new-button"
        >
          <PlusCircle size={16} aria-hidden="true" />
          <span>{t('newProduct')}</span>
        </Button>
      </div>

      {/* Barre recherche + tri (locaux). */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="pl-9"
            data-testid="products-search-input"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger
            className="w-[220px]"
            aria-label={t('sortBy')}
            data-testid="products-sort-trigger"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key} data-testid={`products-sort-option-${key}`}>
                {t(`sort.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* États : chargement / erreur / vide / tableau. */}
      {query.isLoading ? (
        <p className="text-ink-muted text-sm" role="status" data-testid="products-loading">
          {t('loading')}
        </p>
      ) : query.isError ? (
        <p className="text-destructive text-sm" role="alert" data-testid="products-error">
          {t('error')}
        </p>
      ) : products.length === 0 ? (
        <p className="text-ink-muted text-sm" data-testid="products-empty">
          {t('empty')}
        </p>
      ) : visible.length === 0 ? (
        <p className="text-ink-muted text-sm" data-testid="products-empty-search">
          {t('emptySearch')}
        </p>
      ) : (
        <div className="border-rule overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-left text-sm" data-testid="products-table">
            <thead>
              <tr className="border-rule text-ink-muted border-b text-xs">
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('columns.name')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('columns.category')}
                </th>
                <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">
                  {t('columns.activity')}
                </th>
                <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">
                  {t('columns.lastActivity')}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* TODO(perf, follow-up sprint): virtualiser si > 50 items (react-virtual) — cf. audit S22. */}
              {visible.map((product) => {
                const effectiveColor =
                  product.color ?? product.category?.color ?? null
                const lastMs = lastActivityMs(product)
                const categoryName = product.category?.name ?? t('noCategory')
                return (
                  <tr
                    key={product.id}
                    role="link"
                    tabIndex={0}
                    aria-label={t('actions.openDetail')}
                    onClick={() => goToDetail(product.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        goToDetail(product.id)
                      }
                    }}
                    className={cn(
                      'border-rule hover:bg-accent-soft focus:ring-ring border-b last:border-b-0',
                      'cursor-pointer transition-colors focus:ring-2 focus:outline-none',
                    )}
                    data-testid={`products-row-${product.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: effectiveColor ?? 'var(--color-rule-strong)' }}
                          aria-hidden="true"
                        />
                        <span className="text-ink truncate font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.category ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: effectiveColor ?? 'var(--color-rule-strong)',
                            color: contrastInk(effectiveColor),
                          }}
                          data-testid={`products-row-category-${product.id}`}
                        >
                          {categoryName}
                        </span>
                      ) : (
                        <span className="text-ink-faint text-xs">{t('noCategory')}</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <ProductSparkline
                        dates={(product.events ?? []).map((e) => e.startDate)}
                        color={effectiveColor}
                        label={t('sparklineLabel', { name: product.name })}
                      />
                    </td>
                    <td className="text-ink-muted hidden px-4 py-3 font-mono text-xs md:table-cell">
                      {lastMs !== null ? dateFmt.format(new Date(lastMs)) : t('noActivity')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={t('actions.edit')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditProduct(product)
                          }}
                          data-testid={`products-edit-${product.id}`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          aria-label={t('actions.archive')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setArchiveProduct(product)
                          }}
                          data-testid={`products-archive-${product.id}`}
                        >
                          <Archive className="size-4" aria-hidden="true" />
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

      {/* Création — ProductDrawer réutilisé (#61). */}
      <ProductDrawer open={createOpen} onOpenChange={setCreateOpen} mode="create" />

      {/* Édition — même drawer préfilé. `key` force un remount propre au switch. */}
      {editProduct && (
        <ProductDrawer
          key={editProduct.id}
          open={Boolean(editProduct)}
          onOpenChange={(next) => {
            if (!next) setEditProduct(null)
          }}
          mode="edit"
          product={editProduct}
        />
      )}

      {/* Archivage — soft delete backend (#50) via DeleteConfirmDialog variant produit. */}
      {archiveProduct && (
        <DeleteConfirmDialog
          open={Boolean(archiveProduct)}
          onOpenChange={(next) => {
            if (!next) setArchiveProduct(null)
          }}
          variant="product"
          onConfirm={handleArchiveConfirm}
        />
      )}

    </div>
  )
}

export default ProductsListView
