'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'

import { contrastInk } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { ProductDrawer } from './ProductDrawer'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { TimelineResponsive } from '@/components/timeline'
import type { Resource } from '@/components/timeline'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { useAuth } from '@/hooks/useAuth'
import { deleteProduct } from '@/services/productService'
import { mapToFullCalendarEvent, type FullCalendarEvent } from '@/types/event'

/**
 * #68 — Vue détail d'un produit.
 *
 * Sous-frise dédiée : on RÉUTILISE `TimelineResponsive`/`TimelineView` sans le
 * modifier (composant central du dashboard, risque de régression). Le filtrage
 * sur CE produit se fait EN AMONT (carte de réutilisation, approche imposée) : on
 * ne construit `events`/`resources` qu'à partir du produit sélectionné, jamais de
 * toute la liste. Aucun refetch dédié : on lit le cache `useProductsWithEvents`.
 *
 * #50 : les produits archivés sont invisibles côté backend → un produit absent de
 * la liste (archivé ou inexistant) affiche l'état « introuvable ».
 *
 * Actions : « Modifier » → `ProductDrawer` (edit) ; « Supprimer » →
 * `DeleteConfirmDialog` variant="product" (soft delete #50) puis retour liste.
 */

export interface ProductDetailViewProps {
  productId: string
}

export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const t = useTranslations('products.detail')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id

  const query = useProductsWithEvents(userId)
  const product = React.useMemo(
    () => (query.data ?? []).find((p) => p.id === productId) ?? null,
    [query.data, productId],
  )

  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  // Filtrage AMONT : events/resources restreints à CE produit uniquement.
  const events = React.useMemo<FullCalendarEvent[]>(() => {
    if (!product) return []
    return (product.events ?? [])
      .filter((event) => !event.archived)
      .map((event) =>
        mapToFullCalendarEvent(event, product.name, product.category?.name ?? '', product.id),
      )
  }, [product])

  const resources = React.useMemo<Resource[]>(() => {
    if (!product) return []
    return [{ id: product.id, title: product.name, category: product.category?.name ?? '' }]
  }, [product])

  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  )

  const goBack = React.useCallback(() => {
    router.push(`/${locale}/products`)
  }, [router, locale])

  const handleDeleteConfirm = async () => {
    if (!userId || !product) throw new Error('userId/produit manquant')
    await deleteProduct(userId, product.id)
    setDeleteOpen(false)
    goBack()
  }

  const backButton = (
    <Button
      type="button"
      variant="ghost"
      className="flex items-center gap-2"
      onClick={goBack}
      data-testid="product-detail-back"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t('back')}
    </Button>
  )

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="product-detail-view">
        {backButton}
        <p className="text-ink-muted text-sm" role="status" data-testid="product-detail-loading">
          {t('loading')}
        </p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col gap-4" data-testid="product-detail-view">
        {backButton}
        <p className="text-ink-muted text-sm" role="alert" data-testid="product-detail-not-found">
          {t('notFound')}
        </p>
      </div>
    )
  }

  const effectiveColor = product.color ?? product.category?.color ?? null
  const nonArchivedCount = (product.events ?? []).filter((e) => !e.archived).length

  const history = (product.events ?? [])
    .filter((e) => !e.archived)
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  return (
    <div className="flex flex-col gap-6" data-testid="product-detail-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setEditOpen(true)}
            data-testid="product-detail-edit"
          >
            <Pencil className="size-4" aria-hidden="true" />
            {t('edit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive flex items-center gap-2"
            onClick={() => setDeleteOpen(true)}
            data-testid="product-detail-delete"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t('delete')}
          </Button>
        </div>
      </div>

      {/* Fiche produit. */}
      <section
        className="bg-surface border-rule flex flex-col gap-4 rounded-lg border p-4"
        aria-label={product.name}
        data-testid="product-detail-card"
      >
        <div className="flex items-center gap-3">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ background: effectiveColor ?? 'var(--color-rule-strong)' }}
            aria-hidden="true"
          />
          <h1 className="text-ink text-xl font-semibold tracking-tight">{product.name}</h1>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-ink-faint text-2xs tracking-widest uppercase">
              {t('fields.category')}
            </dt>
            <dd className="mt-1">
              {product.category ? (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: effectiveColor ?? 'var(--color-rule-strong)',
                    color: contrastInk(effectiveColor),
                  }}
                  data-testid="product-detail-category"
                >
                  {product.category.name}
                </span>
              ) : (
                <span className="text-ink-faint text-sm">{t('fields.noCategory')}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint text-2xs tracking-widest uppercase">
              {t('fields.color')}
            </dt>
            <dd className="text-ink mt-1 font-mono text-sm">
              {effectiveColor ?? '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Sous-frise dédiée (filtrée en amont). */}
      <section
        className="bg-surface border-rule rounded-lg border p-3"
        aria-label={t('timelineTitle')}
        data-testid="product-detail-timeline"
      >
        <h2 className="text-ink-faint text-2xs mb-2 tracking-widest uppercase">
          {t('timelineTitle')}
        </h2>
        {events.length === 0 ? (
          <p className="text-ink-muted text-sm" data-testid="product-detail-timeline-empty">
            {t('timelineEmpty')}
          </p>
        ) : (
          <TimelineResponsive events={events} resources={resources} locale={locale} />
        )}
      </section>

      {/* Historique des événements. */}
      <section aria-label={t('historyTitle')} data-testid="product-detail-history">
        <h2 className="text-ink-faint text-2xs mb-2 tracking-widest uppercase">
          {t('historyTitle')} · {t('eventsCount', { count: nonArchivedCount })}
        </h2>
        {history.length === 0 ? (
          <p className="text-ink-muted text-sm" data-testid="product-detail-history-empty">
            {t('historyEmpty')}
          </p>
        ) : (
          <ul className="flex flex-col">
            {history.map((event) => (
              <li
                key={event.id}
                className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
                data-testid={`product-detail-history-row-${event.id}`}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: event.color ?? effectiveColor ?? 'var(--color-rule-strong)' }}
                  aria-hidden="true"
                />
                <span className="text-ink min-w-0 flex-1 truncate text-sm">{event.title}</span>
                <span className="text-ink-muted font-mono text-xs tabular-nums">
                  {dateFmt.format(new Date(event.startDate))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Édition — ProductDrawer réutilisé (#61). */}
      <ProductDrawer open={editOpen} onOpenChange={setEditOpen} mode="edit" product={product} />

      {/* Suppression — soft delete backend (#50), retour liste au succès. */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="product"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default ProductDetailView
