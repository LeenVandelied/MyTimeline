import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArchivedProduct } from '@/types/product'
import { ArchivedProductsView } from './ArchivedProductsView'
import frCommon from '../../../public/locales/fr/common.json'
import frProducts from '../../../public/locales/fr/products.json'
import enCommon from '../../../public/locales/en/common.json'
import enProducts from '../../../public/locales/en/products.json'
import deCommon from '../../../public/locales/de/common.json'
import deProducts from '../../../public/locales/de/products.json'
import esCommon from '../../../public/locales/es/common.json'
import esProducts from '../../../public/locales/es/products.json'

/**
 * #711 — Intégration next-intl RÉELLE de l'onglet « Archivés » et de son dialog, dans les
 * 4 locales. Les tests unitaires mockent `next-intl` (clé = texte) : une clé absente ou un
 * placeholder ICU `{name}` non fourni y seraient invisibles (cf. #441). Le collecteur
 * `onError` fait échouer toute `IntlError` (MISSING_MESSAGE, FORMATTING_ERROR).
 */
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
const useArchivedMock = vi.fn()
vi.mock('@/hooks/useArchivedProducts', () => ({
  useArchivedProducts: (...args: unknown[]) => useArchivedMock(...args),
}))
vi.mock('@/hooks/useRestoreProduct', () => ({
  useRestoreProduct: () => ({ mutateAsync: vi.fn() }),
}))

const LOCALES = [
  { locale: 'fr', common: frCommon, products: frProducts, restore: 'Désarchiver' },
  { locale: 'en', common: enCommon, products: enProducts, restore: 'Unarchive' },
  { locale: 'de', common: deCommon, products: deProducts, restore: 'Wiederherstellen' },
  { locale: 'es', common: esCommon, products: esProducts, restore: 'Desarchivar' },
] as const

const PRODUCT: ArchivedProduct = {
  id: 'p-1',
  name: 'Vélo',
  color: null,
  category: { id: 'c-1', name: 'Sport', color: null },
}

function renderIn(entry: (typeof LOCALES)[number]): string[] {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale={entry.locale}
      timeZone="Europe/Paris"
      messages={{ common: entry.common, products: entry.products }}
      onError={(error) => errors.push(error.message)}
    >
      <ArchivedProductsView />
    </NextIntlClientProvider>,
  )
  return errors
}

describe('ArchivedProductsView — next-intl réel, 4 locales (#711)', () => {
  beforeEach(() => {
    useArchivedMock.mockReset()
  })

  it.each(LOCALES)('$locale : état vide traduit, aucune IntlError', (entry) => {
    useArchivedMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    const errors = renderIn(entry)

    expect(screen.getByTestId('products-archived-empty')).toHaveTextContent(
      entry.products.archived.empty,
    )
    expect(errors).toEqual([])
  })

  it.each(LOCALES)(
    '$locale : bouton, nom accessible et dialog (placeholder {name}) traduits',
    async (entry) => {
      const user = userEvent.setup()
      useArchivedMock.mockReturnValue({ data: [PRODUCT], isLoading: false, isError: false })
      const errors = renderIn(entry)

      const button = screen.getByTestId('products-archived-restore-p-1')
      expect(button).toHaveTextContent(entry.restore)
      // Nom accessible = libellé visible + nom du produit (label-in-name).
      expect(button.getAttribute('aria-label')).toContain('Vélo')
      expect(button.getAttribute('aria-label')?.toLowerCase()).toContain(
        entry.restore.toLowerCase(),
      )

      await user.click(button)
      const dialog = await screen.findByTestId('product-restore-confirm')
      expect(dialog).toHaveTextContent(entry.products.restoreDialog.title)
      expect(dialog).toHaveTextContent('Vélo')
      expect(dialog.textContent).not.toContain('{name}')
      expect(screen.getByTestId('product-restore-confirm-button')).toHaveTextContent(
        entry.products.restoreDialog.confirm,
      )
      expect(errors).toEqual([])
    },
  )

  it('fr : la description de la variante produit de DeleteConfirmDialog dit où retrouver le produit', () => {
    expect(frCommon.deleteDialog.product.description).toContain('« Archivés »')
    expect(enCommon.deleteDialog.product.description).toContain('“Archived”')
    expect(deCommon.deleteDialog.product.description).toContain('„Archiviert“')
    expect(esCommon.deleteDialog.product.description).toContain('«Archivados»')
    for (const common of [frCommon, enCommon, deCommon, esCommon]) {
      expect(common.toast.productRestored).toBeTruthy()
    }
  })
})
