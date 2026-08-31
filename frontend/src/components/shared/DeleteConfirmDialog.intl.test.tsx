import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import commonMessages from '../../../public/locales/fr/common.json'

/**
 * #441 — Intégration next-intl RÉELLE de `DeleteConfirmDialog`.
 *
 * POURQUOI CE FICHIER EXISTE, alors que `DeleteConfirmDialog.test.tsx` couvre
 * déjà le comportement : ce dernier mocke `next-intl` en `` `${namespace}.${key}` ``.
 * Un namespace FAUX y rend exactement le même texte qu'un namespace juste — le
 * défaut de #441 (`useTranslations('deleteDialog')` au lieu de
 * `'common.deleteDialog'`) y était donc INDÉTECTABLE PAR CONSTRUCTION, et
 * l'utilisateur voyait « deleteDialog.product.title » en toutes lettres.
 *
 * Ici : VRAI `NextIntlClientProvider`, VRAIS messages `fr`, assertions sur le
 * LIBELLÉ TRADUIT — patron déjà en place au dépôt (`DensityRibbon.intl.test.tsx`,
 * `timeline/fixtures.tsx`). Le collecteur `onError` transforme en échec toute
 * `IntlError` (MISSING_MESSAGE, FORMATTING_ERROR), y compris celles que next-intl
 * ne fait que journaliser.
 *
 * COUVERTURE VISÉE EN PRIORITÉ : les clés DYNAMIQUES `t(`${variant}.title`)` et
 * `t(`${variant}.description`)`, qu'aucune analyse statique ne peut vérifier —
 * d'où un cas par variante.
 */

const useCategoriesMock = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))

const CATEGORIES: Category[] = [
  { id: 'cat-current', name: 'À supprimer', system: false },
  { id: 'cat-a', name: 'Cible A', system: false },
]

const noop = () => {}

/**
 * Rend le dialog sous les VRAIS messages et renvoie les `IntlError` collectées.
 * `messages` reproduit l'indexation de `i18n.ts` (namespace = nom de fichier) :
 * `common.json` sous la clé `common`, jamais aplati.
 */
function renderWithRealIntl(
  props: Partial<React.ComponentProps<typeof DeleteConfirmDialog>> = {},
): string[] {
  const errors: string[] = []
  render(
    <NextIntlClientProvider
      locale="fr"
      timeZone="Europe/Paris"
      messages={{ common: commonMessages }}
      onError={(error) => errors.push(error.message)}
    >
      <DeleteConfirmDialog
        open
        variant="event"
        onOpenChange={noop}
        onConfirm={noop}
        {...props}
      />
    </NextIntlClientProvider>,
  )
  return errors
}

describe('DeleteConfirmDialog — intégration next-intl réelle (#441)', () => {
  beforeEach(() => {
    useCategoriesMock.mockReturnValue({
      data: CATEGORIES,
      isPending: false,
      isSuccess: true,
      isError: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('variante event : titre et description TRADUITS, aucune IntlError', () => {
    const errors = renderWithRealIntl({ variant: 'event' })
    expect(screen.getByText('Supprimer cet événement ?')).toBeInTheDocument()
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument()
    expect(errors).toEqual([])
  })

  it('variante product : titre et description TRADUITS, aucune IntlError', () => {
    const errors = renderWithRealIntl({ variant: 'product' })
    expect(screen.getByText('Supprimer ce produit ?')).toBeInTheDocument()
    expect(
      screen.getByText("Le produit sera archivé et n'apparaîtra plus dans vos listes."),
    ).toBeInTheDocument()
    expect(errors).toEqual([])
  })

  it('variante category avec réassignation : libellés du select TRADUITS', () => {
    const errors = renderWithRealIntl({
      variant: 'category',
      linkedProductsCount: 2,
      categoryId: 'cat-current',
    })
    expect(screen.getByText('Supprimer cette catégorie ?')).toBeInTheDocument()
    expect(screen.getByTestId('delete-reassign-label')).toHaveTextContent(
      'Déplacer les produits vers…',
    )
    expect(screen.getByText('Choisissez une catégorie de destination')).toBeInTheDocument()
    expect(errors).toEqual([])
  })

  it('variante event récurrente : avertissement de série TRADUIT', () => {
    const errors = renderWithRealIntl({ variant: 'event', isRecurring: true })
    expect(
      screen.getByText('Cette action supprime uniquement cet événement, pas la série.'),
    ).toBeInTheDocument()
    expect(errors).toEqual([])
  })

  it('boutons : « Annuler » / « Supprimer » TRADUITS (jamais le chemin de clé)', () => {
    const errors = renderWithRealIntl({ variant: 'event' })
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByTestId('delete-confirm-button')).toHaveTextContent('Supprimer')
    // Assertion frontale du symptôme utilisateur : aucun chemin de clé à l'écran.
    expect(document.body.textContent).not.toMatch(/deleteDialog\./)
    expect(errors).toEqual([])
  })

  it('erreur 404 : message inline TRADUIT (branche `errors.*`)', async () => {
    const reject404 = () => Promise.reject({ response: { status: 404 } })
    const errors = renderWithRealIntl({ variant: 'category', onConfirm: reject404 })

    screen.getByTestId('delete-confirm-button').click()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent("Cette catégorie n'existe plus."),
    )
    expect(errors).toEqual([])
  })
})
