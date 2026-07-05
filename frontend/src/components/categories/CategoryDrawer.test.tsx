import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import { CategoryDrawer } from './CategoryDrawer'

/**
 * #62 — Tests CategoryDrawer : création (POST name/color/description), édition
 * (pré-remplissage + PATCH), Zod nom vide (BR-CAT-001), 409 nom dupliqué inline
 * sous name (BR-CAT-004), palette swatches, bouton supprimer, masquage des actions
 * pour une catégorie système (ADR-002).
 *
 * next-intl mocké → assertions sur les clés (`namespace.key`), locale-agnostique.
 * `PopoverPicker` (react-colorful) mocké (canvas non déterministe en jsdom) : les
 * swatches suffisent à couvrir la logique couleur.
 */

const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const createState = { mutateAsync: createMutateAsync, isPending: false }
const updateState = { mutateAsync: updateMutateAsync, isPending: false }
const deleteCategoryMock = vi.fn()

vi.mock('@/hooks/useCreateCategory', () => ({
  useCreateCategory: () => createState,
}))
vi.mock('@/hooks/useUpdateCategory', () => ({
  useUpdateCategory: () => updateState,
}))
vi.mock('@/services/categoryService', () => ({
  deleteCategory: (...args: unknown[]) => deleteCategoryMock(...args),
}))
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))
vi.mock('@/components/ui/popoverPicker', () => ({
  PopoverPicker: ({ onChange }: { onChange: (c: string) => void }) => (
    <button type="button" data-testid="pick-color" onClick={() => onChange('#ff8800')}>
      pick
    </button>
  ),
}))
// DeleteConfirmDialog utilise useCategories (fetch) : on le mocke par un bouton
// « confirmer » qui appelle onConfirm() sans réassignation (chemin nominal).
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (id?: string) => void | Promise<void>
  }) =>
    open ? (
      <button type="button" data-testid="confirm-delete" onClick={() => onConfirm()}>
        confirm
      </button>
    ) : null,
}))

const SWATCH = '#3E63DD'

const editableCategory: Category = {
  id: 'cat-1',
  name: 'Véhicules',
  system: false,
  color: '#112233',
  description: 'Voitures et motos',
}

const systemCategory: Category = {
  id: 'cat-sys',
  name: 'Système',
  system: true,
  color: null,
  description: null,
}

const noop = () => {}

describe('CategoryDrawer', () => {
  beforeEach(() => {
    createState.isPending = false
    updateState.isPending = false
    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    deleteCategoryMock.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  it('mode création : POST avec name + color (swatch) + description', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<CategoryDrawer open onOpenChange={noop} mode="create" onSuccess={onSuccess} />)

    await user.type(screen.getByTestId('category-name-input'), 'Assurance')
    await user.click(screen.getByTestId(`category-swatch-${SWATCH}`))
    await user.type(screen.getByTestId('category-description-input'), 'Contrats')
    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: 'Assurance',
        color: SWATCH,
        description: 'Contrats',
      }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('mode création : sans couleur ni description -> color/description undefined', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockResolvedValue({})
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    await user.type(screen.getByTestId('category-name-input'), 'Vide')
    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: 'Vide',
        color: undefined,
        description: undefined,
      }),
    )
  })

  it('rejette un nom vide (Zod BR-CAT-001, pas de POST)', async () => {
    const user = userEvent.setup()
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() => expect(createMutateAsync).not.toHaveBeenCalled())
    expect(await screen.findByTestId('category-name-error')).toHaveTextContent(
      'categories.validation.nameRequired',
    )
  })

  it('mode édition : pré-remplit et PATCH le nom modifié', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    render(<CategoryDrawer open onOpenChange={noop} mode="edit" category={editableCategory} />)

    const nameInput = screen.getByTestId('category-name-input') as HTMLInputElement
    expect(nameInput.value).toBe('Véhicules')

    await user.clear(nameInput)
    await user.type(nameInput, 'Autos')
    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'cat-1',
        data: { name: 'Autos', color: '#112233', description: 'Voitures et motos' },
      }),
    )
  })

  it('409 nom dupliqué -> erreur inline sous name (BR-CAT-004), pas de throw', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockRejectedValue({ response: { status: 409 } })
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    await user.type(screen.getByTestId('category-name-input'), 'Doublon')
    await user.click(screen.getByTestId('category-submit'))

    expect(await screen.findByTestId('category-name-error')).toHaveTextContent(
      'categories.validation.nameConflict',
    )
  })

  it('mode édition : bouton supprimer ouvre le dialog puis appelle deleteCategory', async () => {
    // pointerEventsCheck désactivé : le Dialog Radix ouvert pose pointer-events:none
    // sur body, or le bouton confirmer mocké rend hors du DialogContent portal.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    deleteCategoryMock.mockResolvedValue(undefined)
    const onDeleted = vi.fn()
    render(
      <CategoryDrawer
        open
        onOpenChange={noop}
        mode="edit"
        category={editableCategory}
        onDeleted={onDeleted}
      />,
    )

    await user.click(screen.getByTestId('category-delete-button'))
    await user.click(screen.getByTestId('confirm-delete'))

    await waitFor(() => expect(deleteCategoryMock).toHaveBeenCalledWith('cat-1', undefined))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('catégorie système : actions modifier/supprimer masquées (ADR-002)', () => {
    render(<CategoryDrawer open onOpenChange={noop} mode="edit" category={systemCategory} />)

    expect(screen.queryByTestId('category-submit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('category-delete-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('category-name-input')).toBeDisabled()
  })

  it('aperçu live : le badge reflète le nom saisi', async () => {
    const user = userEvent.setup()
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    await user.type(screen.getByTestId('category-name-input'), 'Loisirs')
    expect(screen.getByTestId('category-preview-badge')).toHaveTextContent('Loisirs')
  })
})
