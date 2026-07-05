'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Product } from '@/types/product'

/**
 * #83 — Carousel produits swipeable (mobile portrait). CSS NATIF UNIQUEMENT :
 * `overflow-x:auto` + `scroll-snap-type:x mandatory` + `scrollbar-width:none`.
 * AUCUNE dépendance Swiper (absente du projet, ne pas l'ajouter — briefing).
 *
 * Chaque vignette : pastille couleur effective (`product.color ?? category.color`,
 * même règle que `ProductList` #80), nom, prochaine échéance, compteur d'events non
 * archivés. Filets DS Graphite (pas de `<Card>` shadcn à ombre). `scroll-snap-align`
 * center pour un arrêt net par vignette. `data-testid` contractuels (E2E #85).
 *
 * On NE réutilise pas `ProductList` (liste verticale filet) : la présentation
 * carousel (vignettes côte à côte, snap) est structurellement différente. La LOGIQUE
 * partagée (couleur effective, prochain event, compteur) est dupliquée a minima ;
 * une extraction ultérieure vers `lib` reste possible si un 3e usage apparaît.
 */
export interface ProductCarouselProps {
  products: Product[]
  locale: string
  now?: Date
}

/** Prochain event (début >= now) le plus proche, non archivé. */
function nextEvent(product: Product, now: Date): { title: string; start: string } | null {
  const upcoming = (product.events ?? [])
    .filter((e) => !e.archived && new Date(e.startDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const first = upcoming[0]
  return first ? { title: first.title, start: first.startDate } : null
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  locale,
  now = new Date(),
}) => {
  const t = useTranslations('dashboard.productList')
  const tm = useTranslations('dashboard.mobile.carousel')
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale],
  )

  return (
    <section className="flex flex-col gap-3" data-testid="dashboard-product-carousel-section">
      <h2 className="text-ink-faint font-mono text-2xs tracking-widest uppercase">{t('title')}</h2>
      {products.length === 0 ? (
        <p className="text-ink-muted text-xs" data-testid="dashboard-product-carousel-empty">
          {t('empty')}
        </p>
      ) : (
        <ul
          className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
          data-testid="dashboard-product-carousel"
          aria-label={tm('label')}
        >
          {products.map((product) => {
            const next = nextEvent(product, now)
            const color = product.color ?? product.category.color ?? 'var(--color-rule-strong)'
            const count = (product.events ?? []).filter((e) => !e.archived).length
            return (
              <li
                key={product.id}
                className="bg-surface border-rule flex w-40 shrink-0 snap-center flex-col gap-2 rounded-lg border p-3"
                data-testid={`dashboard-product-carousel-card-${product.id}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <span className="text-ink min-w-0 flex-1 truncate text-xs font-medium">
                    {product.name}
                  </span>
                </div>
                {next ? (
                  <span className="text-ink-muted truncate text-2xs">
                    {next.title} · <span className="font-mono">{fmt.format(new Date(next.start))}</span>
                  </span>
                ) : (
                  <span className="text-ink-faint text-2xs">{t('noUpcoming')}</span>
                )}
                <span className="text-ink-faint mt-auto font-mono text-2xs tabular-nums">{count}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ProductCarousel
