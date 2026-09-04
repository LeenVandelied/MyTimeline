import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import { CategoryDrawer, CATEGORY_SWATCHES } from './CategoryDrawer'
import {
  contrastRatio,
  swatchGlyphInk,
  SWATCH_GLYPH_DARK,
  SWATCH_GLYPH_LIGHT,
  WCAG_AA_NON_TEXT,
} from '@/lib/color'

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
const deleteMutateAsync = vi.fn()
const createState = { mutateAsync: createMutateAsync, isPending: false }
const updateState = { mutateAsync: updateMutateAsync, isPending: false }
const deleteState = { mutateAsync: deleteMutateAsync, isPending: false }

vi.mock('@/hooks/useCreateCategory', () => ({
  useCreateCategory: () => createState,
}))
vi.mock('@/hooks/useUpdateCategory', () => ({
  useUpdateCategory: () => updateState,
}))
// #245 : la suppression passe par useDeleteCategory (useMutation + invalidation).
vi.mock('@/hooks/useDeleteCategory', () => ({
  useDeleteCategory: () => deleteState,
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
// On EXPOSE `linkedProductsCount` reçu (data-attr) pour vérifier le threading de
// la prop depuis le drawer (review PR#217 : sinon 409 sans select de réassignation).
vi.mock('@/components/shared/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
    linkedProductsCount,
  }: {
    open: boolean
    onConfirm: (id?: string) => void | Promise<void>
    linkedProductsCount?: number
  }) =>
    open ? (
      <button
        type="button"
        data-testid="confirm-delete"
        data-linked-count={linkedProductsCount}
        onClick={() => onConfirm()}
      >
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
    deleteMutateAsync.mockReset()
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

  it('mode édition : bouton supprimer ouvre le dialog puis déclenche la mutation', async () => {
    // pointerEventsCheck désactivé : le Dialog Radix ouvert pose pointer-events:none
    // sur body, or le bouton confirmer mocké rend hors du DialogContent portal.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    deleteMutateAsync.mockResolvedValue(undefined)
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

    // #245 : passe par la mutation (qui invalide categories.all + products.all).
    await waitFor(() =>
      expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 'cat-1', reassignToCategoryId: undefined }),
    )
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('mode édition avec produits liés : linkedProductsCount threadé au DeleteConfirmDialog (force la réassignation, review PR#217)', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(
      <CategoryDrawer
        open
        onOpenChange={noop}
        mode="edit"
        category={editableCategory}
        linkedProductsCount={2}
      />,
    )

    await user.click(screen.getByTestId('category-delete-button'))
    // Le drawer doit transmettre le compteur (>0) → needsReassign true côté dialog.
    expect(screen.getByTestId('confirm-delete')).toHaveAttribute('data-linked-count', '2')
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

// ─────────────────────────────────────────────────────────────────────────────
// #416 — GLYPHE DE COCHE sur la pastille sélectionnée.
//
// ⚠ CE QUE CES TESTS NE PROUVENT PAS : jsdom ne peint rien et ne calcule aucun
// contraste rendu ([[PIT-S70-003]]). Le critère « ≥ 3:1 contre le remplissage »
// est couvert par le CALCUL PUR ci-dessous (arithmétique WCAG sur les 12 hex
// réels de la constante), pas par le rendu RTL. Le rendu RTL prouve seulement
// le CÂBLAGE : glyphe monté sur la bonne pastille, encre issue du bon token.
// ─────────────────────────────────────────────────────────────────────────────
describe('#416 — coche de la pastille sélectionnée', () => {
  it('les 12 couleurs tiennent ≥ 3:1 contre leur glyphe (clair ET sombre)', () => {
    // Identique dans les deux thèmes PAR CONSTRUCTION : le remplissage est un
    // hex inline et le glyphe un token de palette brut — aucun des deux n'est
    // redéfini par `.dark` (verrou dans `lib/color.test.ts` §#416).
    expect(CATEGORY_SWATCHES).toHaveLength(12)
    const table = CATEGORY_SWATCHES.map((hex) => {
      const ink = swatchGlyphInk(hex)
      return [hex, ink === SWATCH_GLYPH_DARK ? 'sombre' : 'clair', +contrastRatio(hex, ink).toFixed(2)]
    })
    // Table figée : un ratio qui bouge signale un hex modifié, pas un test à
    // « remettre au vert ». Min = 4.54 (rouge), seuil WCAG 1.4.11 = 3.
    expect(table).toEqual([
      ['#E5484D', 'sombre', 4.54],
      ['#E5691E', 'sombre', 5.39],
      ['#F2A900', 'sombre', 8.84],
      ['#A7B83A', 'sombre', 8.08],
      ['#46A758', 'sombre', 5.86],
      ['#12A594', 'sombre', 5.78],
      ['#0091C2', 'sombre', 4.93],
      ['#3E63DD', 'clair', 5.21],
      ['#6E56CF', 'clair', 5.39],
      ['#AB4ABA', 'clair', 4.75],
      ['#E93D82', 'sombre', 4.61],
      ['#8B8D98', 'sombre', 5.38],
    ])
    for (const [, , ratio] of table) {
      expect(ratio as number).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
    }
  })

  it('aucun hex de la palette ne tombe dans la bande où le seuil est sous-optimal', () => {
    // Entre SWATCH_GLYPH_THRESHOLD (0.179) et le point d'égalisation réel des
    // deux encres (≈ 0.1992), le seuil choisit l'encre sombre là où la claire
    // contrasterait mieux. Test qui rend cet écart VISIBLE si un hex bouge.
    for (const hex of CATEGORY_SWATCHES) {
      const chosen = swatchGlyphInk(hex)
      const other = chosen === SWATCH_GLYPH_DARK ? SWATCH_GLYPH_LIGHT : SWATCH_GLYPH_DARK
      expect(contrastRatio(hex, chosen), hex).toBeGreaterThanOrEqual(contrastRatio(hex, other))
    }
  })

  it('le glyphe est monté sur la pastille sélectionnée, et sur elle seule', async () => {
    const user = userEvent.setup()
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    const target = screen.getByTestId(`category-swatch-${SWATCH}`)
    const other = screen.getByTestId('category-swatch-#F2A900')
    expect(target.querySelector('svg')).toBeNull()

    await user.click(target)

    expect(target).toHaveAttribute('aria-checked', 'true')
    const glyph = target.querySelector('svg')
    expect(glyph).not.toBeNull()
    // Décoratif : l'état reste porté par `aria-checked`.
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    // Encre = token de PALETTE brut (pas `--color-ink`, qui s'inverse en sombre).
    expect(glyph).toHaveStyle({ color: 'var(--gray-0)' })
    // Pas de glyphe fantôme monté-mais-caché sur les 11 autres.
    expect(other.querySelector('svg')).toBeNull()
    expect(document.querySelectorAll('[data-testid^="category-swatch-"] svg')).toHaveLength(1)
  })

  it('édition d’une catégorie ambre : glyphe en encre sombre', () => {
    render(
      <CategoryDrawer
        open
        onOpenChange={noop}
        mode="edit"
        category={{ ...editableCategory, color: '#F2A900' }}
      />,
    )
    const glyph = screen.getByTestId('category-swatch-#F2A900').querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph).toHaveStyle({ color: 'var(--gray-900)' })
  })
})
