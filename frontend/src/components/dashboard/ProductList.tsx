'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Product } from '@/types/product'
import { nextEvent } from './lib'

/**
 * #80 — Liste produits compacte (spec Designer §3). Filets (pas de `<Card>`
 * shadcn) : pastille couleur effective (`product.color ?? category.color`) + nom
 * + prochain événement + compteur d'events non archivés. Largeur fluide (#83/#85).
 */
export interface ProductListProps {
  products: Product[]
  locale: string
  now?: Date
}

export const ProductList: React.FC<ProductListProps> = ({ products, locale, now = new Date() }) => {
  const t = useTranslations('dashboard.productList')
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale],
  )

  return (
    <section className="flex flex-col gap-3" data-testid="dashboard-product-list" aria-label={t('label')}>
      <h2 className="text-ink-faint font-mono text-2xs tracking-widest uppercase">{t('title')}</h2>
      {products.length === 0 ? (
        <p className="text-ink-muted text-xs" data-testid="dashboard-product-list-empty">
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {products.map((product) => {
            const next = nextEvent(product, now)
            const color = product.color ?? product.category.color ?? 'var(--color-rule-strong)'
            const count = (product.events ?? []).filter((e) => !e.archived).length
            return (
              <li
                key={product.id}
                className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
                data-testid={`dashboard-product-list-row-${product.id}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <span className="text-ink min-w-0 flex-1 truncate text-xs font-medium">
                  {product.name}
                </span>
                {next ? (
                  <span className="text-ink-muted hidden truncate text-2xs sm:inline">
                    {next.title} · <span className="font-mono">{fmt.format(new Date(next.start))}</span>
                  </span>
                ) : (
                  <span className="text-ink-faint hidden text-2xs sm:inline">{t('noUpcoming')}</span>
                )}
                <span className="text-ink-faint font-mono text-2xs tabular-nums">{count}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ProductList
