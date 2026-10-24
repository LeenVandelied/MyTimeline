import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '@/types/product'
import { ProductList } from './ProductList'

/**
 * #825 — Partage de largeur d'une ligne « Tes produits » (tableau de bord desktop).
 *
 * CE QUE CE TEST PROUVE, ET CE QU'IL NE PROUVE PAS. jsdom ne calcule aucun layout :
 * aucune largeur n'est mesurée ici. Le test verrouille la STRUCTURE qui produit le
 * partage — quelle boîte est élastique, laquelle est plafonnée, laquelle rogne. La
 * preuve rendue (largeur du nom ≥ 40 % de la ligne à 1024 / 1280 px, fr + de) est la
 * spec `e2e/sprint-114-dashboard-product-name.spec.ts`.
 *
 * Le défaut : nom `flex-1` (base 0) contre secondaire `truncate` en base auto sans
 * plafond. Une base 0 ne rend rien quand l'espace libre est négatif : le secondaire
 * long prenait toute la ligne, le nom tombait à « K. » ou à 0 px (PIT-S85 #602, même
 * mécanique sur la minimap de la frise).
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const NOW = new Date(2026, 6, 15, 9, 0, 0)
const LONG_NAME = 'Kraftfahrzeughaftpflichtversicherung'

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  name: LONG_NAME,
  color: '#3E8BD6',
  category: { id: 'c1', name: 'Cat', color: '#4FA459' },
  events: [],
  ...overrides,
})

const withNext = (id: string): Product =>
  product(id, {
    events: [
      {
        id: `${id}-ev`,
        title: 'Nebenkostenabrechnung Jahresabschluss',
        type: 'single',
        startDate: '2026-09-25',
        endDate: '2026-09-25',
        productId: id,
        archived: false,
      },
    ],
  })

const classes = (el: Element) => el.className.split(/\s+/)

describe('ProductList — #825 partage de largeur nom / prochain événement', () => {
  it('le nom n’est PAS élastique : base auto, rogné, plafonné à 60 % dès sm', () => {
    render(<ProductList products={[withNext('p1')]} locale="de" now={NOW} />)
    const row = screen.getByTestId('dashboard-product-list-row-p1')
    const name = within(row).getByTestId('dashboard-product-list-name')
    expect(name).toHaveTextContent(LONG_NAME)
    const c = classes(name)
    // Base 0 (`flex-1`) = le défaut d'origine : le nom n'avait aucune part garantie.
    expect(c).not.toContain('flex-1')
    expect(c).toEqual(expect.arrayContaining(['min-w-0', 'truncate', 'sm:max-w-[60%]']))
  })

  it('le prochain événement absorbe le reste : élastique en base 0, rogné avec « … »', () => {
    render(<ProductList products={[withNext('p1')]} locale="de" now={NOW} />)
    const row = screen.getByTestId('dashboard-product-list-row-p1')
    const next = within(row).getByTestId('dashboard-product-list-next')
    expect(next).toHaveTextContent('Nebenkostenabrechnung Jahresabschluss')
    expect(next.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-25')
    expect(classes(next)).toEqual(
      expect.arrayContaining(['min-w-0', 'flex-1', 'truncate', 'hidden', 'sm:inline']),
    )
  })

  it('sans échéance : le libellé de repli suit la même règle que le prochain événement', () => {
    render(<ProductList products={[product('p2')]} locale="fr" now={NOW} />)
    const row = screen.getByTestId('dashboard-product-list-row-p2')
    const next = within(row).getByTestId('dashboard-product-list-next')
    expect(next).toHaveTextContent('dashboard.productList.noUpcoming')
    expect(classes(next)).toEqual(
      expect.arrayContaining(['min-w-0', 'flex-1', 'truncate', 'hidden', 'sm:inline']),
    )
  })

  it('le compteur reste en bout de ligne et ne rétrécit pas, même secondaire masqué (< sm)', () => {
    render(<ProductList products={[withNext('p1')]} locale="fr" now={NOW} />)
    const row = screen.getByTestId('dashboard-product-list-row-p1')
    // Ordre DOM : pastille, nom, secondaire, compteur — le compteur est le dernier enfant.
    const count = row.lastElementChild
    expect(count).not.toBeNull()
    if (!count) return
    expect(count).toHaveTextContent('1')
    expect(classes(count)).toEqual(expect.arrayContaining(['shrink-0', 'ms-auto']))
  })
})
