'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import toast from 'react-hot-toast'
import { Archive, ArchiveRestore, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { parseLocalDate } from '@/lib/date-iso'
import { useAuth } from '@/hooks/useAuth'
import { useRestoreProduct } from '@/hooks/useRestoreProduct'
import type { ArchivedProductDetail } from '@/types/product'
import { RestoreProductDialog } from './RestoreProductDialog'

/**
 * #718 — Fiche en lecture seule d'un produit archivé (BR-PRO-011), montée par
 * `ProductDetailView` quand le produit est absent des actifs mais présent parmi les archivés.
 *
 * Volontairement sobre : bandeau « archivé », nom, catégorie, liste simple des événements
 * (actifs et archivés, non cliquables) et deux boutons seulement, retour liste et Désarchiver.
 * Ni frise, ni édition, ni archivage, ni création d'événement. Désarchiver passe par
 * `RestoreProductDialog` puis mène à la fiche active `/<locale>/products/{id}`.
 */
export interface ArchivedProductDetailViewProps {
  product: ArchivedProductDetail
}

export function ArchivedProductDetailView({ product }: ArchivedProductDetailViewProps) {
  const t = useTranslations('products.archivedDetail')
  const tDetail = useTranslations('products.detail')
  const tToast = useTranslations('common.toast')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()
  const restoreMutation = useRestoreProduct(user?.id)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  )

  const events = React.useMemo(
    () =>
      product.events
        .slice()
        .sort(
          (a, b) => parseLocalDate(b.startDate).getTime() - parseLocalDate(a.startDate).getTime(),
        ),
    [product.events],
  )

  const handleRestoreConfirm = async () => {
    await restoreMutation.mutateAsync({ productId: product.id })
    toast.success(tToast('productRestored'))
    router.push(`/${locale}/products/${product.id}`)
  }

  const effectiveColor = product.color ?? product.category.color ?? null

  return (
    <div className="flex flex-col gap-6" data-testid="archived-product-detail-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => router.push(`/${locale}/products`)}
          data-testid="product-detail-back"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tDetail('back')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setDialogOpen(true)}
          data-testid="archived-product-detail-restore"
        >
          <ArchiveRestore className="size-4" aria-hidden="true" />
          {t('restore')}
        </Button>
      </div>

      <p
        className="border-rule text-ink-muted flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
        role="status"
        data-testid="archived-product-detail-banner"
      >
        <Archive className="size-4 shrink-0" aria-hidden="true" />
        {t('banner')}
      </p>

      <div className="flex min-w-0 items-start gap-2">
        <span
          className="mt-2 size-2.5 shrink-0 rounded-full"
          style={{ background: effectiveColor ?? 'var(--color-rule-strong)' }}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-col">
          <h1
            className="text-ink text-xl font-semibold tracking-tight"
            data-testid="archived-product-detail-name"
          >
            {product.name}
          </h1>
          <span
            className="text-ink-muted font-mono text-xs"
            data-testid="archived-product-detail-category"
          >
            {product.category.name}
          </span>
        </div>
      </div>

      <section aria-label={t('eventsTitle')}>
        <h2 className="text-ink font-display text-sm font-semibold">{t('eventsTitle')}</h2>
        {events.length === 0 ? (
          <p className="text-ink-muted text-sm">{t('eventsEmpty')}</p>
        ) : (
          <ul className="mt-2 flex flex-col" data-testid="archived-product-detail-events">
            {events.map((event) => (
              <li
                key={event.id}
                className="border-rule flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-b-0"
                data-testid={`archived-product-detail-event-${event.id}`}
              >
                <span className="text-ink min-w-0 truncate">
                  {event.title}
                  {event.archived && (
                    <span className="text-ink-muted ml-2 text-xs">{t('eventArchived')}</span>
                  )}
                </span>
                <span className="text-ink-muted shrink-0 text-xs">
                  {dateFmt.format(parseLocalDate(event.startDate))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RestoreProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productName={product.name}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  )
}

export default ArchivedProductDetailView
