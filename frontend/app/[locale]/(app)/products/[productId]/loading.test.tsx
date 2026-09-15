import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ProductDetailLoading from './loading'

/** #629 — Fallback de segment de la fiche produit (structure seulement, cf. jsdom). */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('ProductDetailLoading (#629)', () => {
  it('monte le squelette en lanes avec le libellé de chargement de la fiche', () => {
    render(<ProductDetailLoading />)
    const root = screen.getByTestId('product-detail-loading-skeleton')
    expect(root).toHaveAttribute('role', 'status')
    expect(screen.getByText('products.detail.loading')).toBeInTheDocument()
    const lanes = screen.getAllByTestId('loading-skeleton-item')
    expect(lanes).toHaveLength(3)
    for (const lane of lanes) expect(lane.style.height).toBe('var(--lane-height)')
  })

  it('n’hérite pas du squelette de la liste produits', () => {
    render(<ProductDetailLoading />)
    expect(screen.queryByTestId('products-loading-skeleton')).not.toBeInTheDocument()
  })
})
