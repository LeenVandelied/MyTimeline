import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CompactRail } from './CompactRail'

/**
 * #85 — Tests du rail de navigation paysage (jsdom). next-intl mocké →
 * assertions locale-agnostiques (clés `ns.key`). Couvre : présence rail +
 * 3 items minimum (accueil / produits / déconnexion), a11y OBLIGATOIRE des
 * icônes sans label (aria-label + title), câblage des handlers, item actif
 * (aria-current + classe accent). Contrats `data-testid` pour l'E2E paysage.
 */
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

describe('CompactRail (paysage)', () => {
  const handlers = () => ({
    onHome: vi.fn(),
    onProducts: vi.fn(),
    onLogout: vi.fn(),
  })

  it('rend le rail avec les 3 items minimum : accueil, produits, déconnexion', () => {
    render(<CompactRail {...handlers()} />)
    expect(screen.getByTestId('dashboard-rail')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-rail-item-home')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-rail-item-products')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-rail-item-logout')).toBeInTheDocument()
  })

  it('chaque item icône porte aria-label + title (a11y icône sans label)', () => {
    render(<CompactRail {...handlers()} />)
    for (const id of ['home', 'products', 'logout']) {
      const btn = screen.getByTestId(`dashboard-rail-item-${id}`)
      expect(btn).toHaveAttribute('aria-label')
      expect(btn.getAttribute('aria-label')).toBeTruthy()
      expect(btn).toHaveAttribute('title', btn.getAttribute('aria-label'))
    }
  })

  it('câble les handlers accueil / produits / déconnexion', () => {
    const h = handlers()
    render(<CompactRail {...h} />)
    fireEvent.click(screen.getByTestId('dashboard-rail-item-home'))
    fireEvent.click(screen.getByTestId('dashboard-rail-item-products'))
    fireEvent.click(screen.getByTestId('dashboard-rail-item-logout'))
    expect(h.onHome).toHaveBeenCalledTimes(1)
    expect(h.onProducts).toHaveBeenCalledTimes(1)
    expect(h.onLogout).toHaveBeenCalledTimes(1)
  })

  it('marque l’item actif via aria-current + classe accent', () => {
    render(<CompactRail {...handlers()} activeId="products" />)
    const active = screen.getByTestId('dashboard-rail-item-products')
    const inactive = screen.getByTestId('dashboard-rail-item-home')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className).toContain('text-accent')
    expect(inactive).not.toHaveAttribute('aria-current')
    expect(inactive.className).toContain('text-ink-muted')
  })

  it('utilise <nav> avec un aria-label (repère de navigation)', () => {
    render(<CompactRail {...handlers()} />)
    const rail = screen.getByTestId('dashboard-rail')
    expect(rail.tagName).toBe('NAV')
    expect(rail).toHaveAttribute('aria-label')
  })
})
