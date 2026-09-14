import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ProductsLoading from './loading'

/** #629 — Fallback de segment de `/products` (structure seulement, cf. jsdom). */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('ProductsLoading (#629)', () => {
  it('monte le squelette en lignes avec le libellé de chargement des produits', () => {
    render(<ProductsLoading />)
    const root = screen.getByTestId('products-loading-skeleton')
    expect(root).toHaveAttribute('role', 'status')
    expect(root).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('products.list.loading')).toBeInTheDocument()
    expect(screen.getAllByTestId('loading-skeleton-item')).toHaveLength(6)
  })

  it('reprend le titre réel de la liste et des onglets inertes', () => {
    render(<ProductsLoading />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('products.list.title')
    expect(screen.getByText('products.list.subtitle')).toBeInTheDocument()
    // Onglets décoratifs : aucun `tab` exposé, et pas le testid des vrais onglets.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('products-tabs')).not.toBeInTheDocument()
  })
})
