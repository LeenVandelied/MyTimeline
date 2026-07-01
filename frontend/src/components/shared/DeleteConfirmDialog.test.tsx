import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

/**
 * #65 — Tests DeleteConfirmDialog (3 variantes, réassignation obligatoire,
 * état deleting, erreurs inline 404/409).
 *
 * next-intl : mock renvoyant le chemin de clé (`namespace.key`) → on assert sur
 * les clés, pas sur les libellés FR (indépendant de la locale).
 * useCategories : mock contrôlé par test pour piloter les cibles de réassignation.
 */

const useCategoriesMock = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

const CATEGORIES: Category[] = [
  { id: 'cat-current', name: 'À supprimer', system: false },
  { id: 'cat-a', name: 'Cible A', system: false },
  { id: 'cat-b', name: 'Cible B', system: true },
]

function mockCategories(overrides: Partial<ReturnType<typeof baseQuery>> = {}) {
  useCategoriesMock.mockReturnValue({ ...baseQuery(), ...overrides })
}

function baseQuery() {
  return {
    data: CATEGORIES,
    isPending: false,
    isSuccess: true,
    isError: false,
  }
}

const noop = () => {}

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    mockCategories()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('variante event : affiche le titre event', () => {
    render(<DeleteConfirmDialog open variant="event" onOpenChange={noop} onConfirm={noop} />)
    expect(screen.getByText('deleteDialog.event.title')).toBeInTheDocument()
  })

  it('variante event : affiche le warning série si isRecurring', () => {
    render(
      <DeleteConfirmDialog open variant="event" isRecurring onOpenChange={noop} onConfirm={noop} />,
    )
    expect(screen.getByText('deleteDialog.event.recurringWarning')).toBeInTheDocument()
  })

  it('variante event : pas de warning série sans isRecurring', () => {
    render(<DeleteConfirmDialog open variant="event" onOpenChange={noop} onConfirm={noop} />)
    expect(screen.queryByText('deleteDialog.event.recurringWarning')).not.toBeInTheDocument()
  })

  it('variante product : affiche le titre product', () => {
    render(<DeleteConfirmDialog open variant="product" onOpenChange={noop} onConfirm={noop} />)
    expect(screen.getByText('deleteDialog.product.title')).toBeInTheDocument()
  })

  it('variante category sans produits liés : pas de select de réassignation', () => {
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={0}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={noop}
      />,
    )
    expect(screen.queryByText('deleteDialog.category.reassignLabel')).not.toBeInTheDocument()
  })

  it('variante category avec produits liés : bouton Supprimer désactivé sans réassignation', () => {
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={2}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={noop}
      />,
    )
    expect(screen.getByText('deleteDialog.category.reassignLabel')).toBeInTheDocument()
    const confirmBtn = screen.getByRole('button', { name: 'deleteDialog.confirm' })
    expect(confirmBtn).toBeDisabled()
  })

  it('variante category : après sélection de réassignation, le bouton s’active et onConfirm reçoit l’id', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={2}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Cible A'))

    const confirmBtn = screen.getByRole('button', { name: 'deleteDialog.confirm' })
    await waitFor(() => expect(confirmBtn).toBeEnabled())

    await user.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledWith('cat-a')
  })

  it('variante category : la catégorie en cours de suppression est exclue des cibles', async () => {
    const user = userEvent.setup()
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={2}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={noop}
      />,
    )
    await user.click(screen.getByRole('combobox'))
    expect(screen.queryByText('À supprimer')).not.toBeInTheDocument()
    expect(await screen.findByText('Cible A')).toBeInTheDocument()
  })

  it('variante category : une seule catégorie → message explicatif, pas de select', () => {
    mockCategories({ data: [{ id: 'cat-current', name: 'Seule', system: false }] })
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={2}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={noop}
      />,
    )
    expect(screen.getByText('deleteDialog.category.noOtherCategory')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'deleteDialog.confirm' })).toBeDisabled()
  })

  it('état deleting : bouton désactivé + spinner pendant la confirmation', async () => {
    const user = userEvent.setup()
    let resolveConfirm: () => void = () => {}
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (resolveConfirm = resolve)))
    const onOpenChange = vi.fn()
    render(
      <DeleteConfirmDialog
        open
        variant="product"
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'deleteDialog.confirm' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /deleteDialog.confirm/ })).toBeDisabled(),
    )
    expect(screen.getByText('deleteDialog.deleting')).toBeInTheDocument()

    // Résout la promesse et laisse React appliquer les mises à jour d'état
    // (deleting→false, onOpenChange) dans un cycle act() implicite via waitFor.
    resolveConfirm()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('erreur 404 : affiche le message notFound inline', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockRejectedValue({ response: { status: 404 } })
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={0}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={onConfirm}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'deleteDialog.confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('deleteDialog.errors.notFound')
  })

  it('erreur 409 : affiche le message conflict inline', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockRejectedValue({ response: { status: 409 } })
    render(
      <DeleteConfirmDialog
        open
        variant="category"
        linkedProductsCount={0}
        categoryId="cat-current"
        onOpenChange={noop}
        onConfirm={onConfirm}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'deleteDialog.confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('deleteDialog.errors.conflict')
  })

  it('succès : appelle onOpenChange(false) après confirmation', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <DeleteConfirmDialog
        open
        variant="product"
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'deleteDialog.confirm' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
