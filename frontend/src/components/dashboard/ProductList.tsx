'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { Product } from '@/types/product'
import { parseLocalDate, toLocalIsoDate } from '@/lib/date-iso'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_BUTTON } from '@/lib/touchTarget'
import { EmptyState } from '@/components/shared/EmptyState'
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
  // #72 — Compteur = quantité → séparateur de milliers localisé (cf. ProductCarousel).
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dashboard-product-list"
      aria-label={t('label')}
    >
      {/* #575 — vrai titre de section (cf. `WeekAgenda`). */}
      <h2 className="text-ink font-display text-sm font-semibold">{t('title')}</h2>
      {products.length === 0 ? (
        // #57 — État vide partagé (remplace le <p> inline). testId préservé pour
        // les tests #80 existants (dashboard-product-list-empty).
        // #630 — CTA vers la liste produits : depuis #624 (retrait d'`AddProductButton`)
        // c'est le seul chemin visible du dashboard vers la création d'un produit.
        // Review S90 — simple lien vers `/products` (la création y demande un second
        // clic) : le libellé décrit la NAVIGATION (« Aller aux produits »), pas une
        // création. Pas de `?new=1` : la page ne lit aucun paramètre d'ouverture.
        <EmptyState
          compact
          title={t('empty')}
          action={
            <Button asChild variant="outline" size="sm" className={TOUCH_TARGET_BUTTON}>
              <Link href={`/${locale}/products`} data-testid="dashboard-product-list-empty-cta">
                {t('emptyCta')}
              </Link>
            </Button>
          }
          testId="dashboard-product-list-empty"
        />
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
                  <span className="text-ink-muted text-2xs hidden truncate sm:inline">
                    {next.title} ·{' '}
                    {/* #518 — `<time datetime>` (convention DS `i18n.css` §7) et
                        `.mt-date--long` en lieu et place de `font-mono` : elle pose la
                        même fonte, plus `tabular-nums` et l'isolation bidi. Sa
                        `font-size:13px` est EXACTEMENT le `text-2xs` du parent → aucun
                        delta de taille ici. */}
                    <time
                      className="mt-date--long"
                      dateTime={toLocalIsoDate(parseLocalDate(next.start)) ?? undefined}
                    >
                      {fmt.format(parseLocalDate(next.start))}
                    </time>
                  </span>
                ) : (
                  <span className="text-ink-muted text-2xs hidden sm:inline">
                    {t('noUpcoming')}
                  </span>
                )}
                {/* #72 — `.mt-num` (DS i18n.css §7) : mono + tabular-nums + isolation bidi. */}
                <span className="text-ink-muted mt-num text-2xs">{nf.format(count)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ProductList
