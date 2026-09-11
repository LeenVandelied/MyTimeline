import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types/category'
import { CategoryDrawer } from './CategoryDrawer'
import {
  contrastInk,
  contrastRatio,
  swatchGlyphInk,
  SWATCH_GLYPH_DARK,
  SWATCH_GLYPH_LIGHT,
  WCAG_AA_NON_TEXT,
  WCAG_AA_NORMAL,
} from '@/lib/color'
import { EVENT_PALETTE } from '@/lib/event-palette'

/**
 * #62 — Tests CategoryDrawer : création (POST name/color/description), édition
 * (pré-remplissage + PATCH), Zod nom vide (BR-CAT-001), 409 nom dupliqué inline
 * sous name (BR-CAT-004), palette swatches, bouton supprimer, masquage des actions
 * pour une catégorie système (ADR-002).
 *
 * next-intl mocké → assertions sur les clés (`namespace.key`), locale-agnostique.
 * `PopoverPicker` (react-colorful) mocké (canvas non déterministe en jsdom) : les
 * swatches suffisent à couvrir la logique couleur. #577 — le mock REND son
 * déclencheur (`children`, le bouton « Personnalisé » de `PaletteColorPicker`),
 * sans quoi l'état « Personnalisé actif » serait invérifiable ici.
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
  PopoverPicker: ({
    onChange,
    children,
  }: {
    onChange: (c: string) => void
    children?: React.ReactNode
  }) => (
    <>
      {children}
      <button type="button" data-testid="pick-color" onClick={() => onChange('#ff8800')}>
        pick
      </button>
    </>
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

/** Cobalt — `DEFAULT_COLOR` des événements, encre de glyphe CLAIRE. */
const SWATCH = '#3B62D4'

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
      expect(deleteMutateAsync).toHaveBeenCalledWith({
        id: 'cat-1',
        reassignToCategoryId: undefined,
      }),
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
    // token `--evt-*` défini sur `:root` seul et le glyphe un token de palette
    // brut — aucun des deux n'est redéfini par `.dark` (verrous dans
    // `lib/event-palette.test.ts` et `lib/color.test.ts` §#416).
    const table = EVENT_PALETTE.map(({ role, hex }) => {
      const ink = swatchGlyphInk(hex)
      return [
        role,
        ink === SWATCH_GLYPH_DARK ? 'sombre' : 'clair',
        +contrastRatio(hex, ink).toFixed(2),
      ]
    })
    // Table figée (#577, palette du handoff ; orchidée = valeur ajustée
    // DEC-S84-003) : un ratio qui bouge signale un hex modifié, pas un test à
    // « remettre au vert ». Min = 4.52 (orchidée), seuil WCAG 1.4.11 = 3.
    // Orchidée est en encre CLAIRE depuis #577 (cf. `swatchGlyphInk`).
    expect(table).toEqual([
      ['red', 'sombre', 4.54],
      ['orange', 'sombre', 6.35],
      ['amber', 'sombre', 8.37],
      ['citron', 'sombre', 8.08],
      ['grass', 'sombre', 5.74],
      ['teal', 'sombre', 6.06],
      ['sky', 'sombre', 4.96],
      ['cobalt', 'clair', 5.41],
      ['periwinkle', 'sombre', 4.69],
      ['orchid', 'clair', 4.52],
      ['rose', 'sombre', 5.12],
      ['graphite', 'clair', 4.83],
    ])
    for (const [, , ratio] of table) {
      expect(ratio as number).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
    }
  })

  it('chaque couleur prend l’encre qui contraste le MIEUX (aucune bande sous-optimale)', () => {
    // Avant #577, un seuil fixe (L > 0.179) laissait une bande où l'encre choisie
    // n'était pas la meilleure ; ce test la rendait visible. Orchidée y est tombée
    // avec la palette du handoff — la règle est désormais le maximum des deux.
    for (const { hex } of EVENT_PALETTE) {
      const chosen = swatchGlyphInk(hex)
      const other = chosen === SWATCH_GLYPH_DARK ? SWATCH_GLYPH_LIGHT : SWATCH_GLYPH_DARK
      expect(contrastRatio(hex, chosen), hex).toBeGreaterThanOrEqual(contrastRatio(hex, other))
    }
  })

  it('le glyphe est monté sur la pastille sélectionnée, et sur elle seule', async () => {
    const user = userEvent.setup()
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    const target = screen.getByTestId(`category-swatch-${SWATCH}`)
    const other = screen.getByTestId('category-swatch-#E3A82B')
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
        category={{ ...editableCategory, color: '#E3A82B' }}
      />,
    )
    const glyph = screen.getByTestId('category-swatch-#E3A82B').querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph).toHaveStyle({ color: 'var(--gray-900)' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DEC-S84-003 — orchidée ajustée `#B056A8` → `#AE55A6` pour tenir AA texte
// (4.5:1). Avant l'ajustement, orchidée était la seule couleur de la palette à
// déclencher `category-contrast-warning` (aperçu badge) : ce test protège le
// sens correct — plus AUCUNE des 12 ne doit déclencher l'avertissement.
// ─────────────────────────────────────────────────────────────────────────────
describe('DEC-S84-003 — avertissement de contraste (aperçu badge)', () => {
  it('toutes les couleurs de la palette tiennent AA 4.5:1 (calcul pur)', () => {
    for (const { hex } of EVENT_PALETTE) {
      expect(contrastRatio(hex, contrastInk(hex)), hex).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    }
  })

  it('aucune des 12 pastilles ne déclenche l’avertissement « contraste faible »', async () => {
    const user = userEvent.setup()
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)
    for (const { hex } of EVENT_PALETTE) {
      await user.click(screen.getByTestId(`category-swatch-${hex}`))
      expect(screen.queryByTestId('category-contrast-warning'), hex).toBeNull()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// #577 — Palette unique (tokens `--evt-*`) et NON-RÉÉCRITURE des couleurs hors
// palette (DEC-S84-001). Le second bloc est LE risque de régression de l'issue.
// ─────────────────────────────────────────────────────────────────────────────
describe('#577 — palette du handoff dans CategoryDrawer', () => {
  it('rend les 12 pastilles du handoff, dans l’ordre, peintes par leur token', () => {
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('data-testid'))).toEqual(
      EVENT_PALETTE.map((e) => `category-swatch-${e.hex}`),
    )
    radios.forEach((radio, i) => {
      // Le hex n'est PAS dans le style : c'est le token qui est peint.
      expect(radio.getAttribute('style')).toContain(`var(${EVENT_PALETTE[i].token})`)
      // Nom accessible = rôle traduit, jamais le hex.
      expect(radio).toHaveAccessibleName(`categories.palette.roles.${EVENT_PALETTE[i].role}`)
    })
    expect(screen.getByRole('radiogroup')).toHaveAccessibleName('categories.drawer.fields.color')
  })

  it('aucune des 10 anciennes valeurs de CATEGORY_SWATCHES n’est proposée', () => {
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)
    for (const legacy of [
      '#E5691E',
      '#F2A900',
      '#46A758',
      '#12A594',
      '#0091C2',
      '#3E63DD',
      '#6E56CF',
      '#AB4ABA',
      '#E93D82',
      '#8B8D98',
    ]) {
      expect(screen.queryByTestId(`category-swatch-${legacy}`), legacy).not.toBeInTheDocument()
    }
  })

  it('le picker libre (« Personnalisé ») pose une couleur hors palette', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockResolvedValue({})
    render(<CategoryDrawer open onOpenChange={noop} mode="create" />)

    await user.type(screen.getByTestId('category-name-input'), 'Libre')
    await user.click(screen.getByTestId('pick-color'))
    expect(screen.getByTestId('category-color-custom')).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: 'Libre',
        color: '#ff8800',
        description: undefined,
      }),
    )
  })
})

describe('#577 / DEC-S84-001 — une couleur stockée hors palette n’est JAMAIS réécrite', () => {
  /** Ancien orange de `CATEGORY_SWATCHES` : valide en base, hors palette du handoff. */
  const LEGACY_ORANGE = '#E5691E'
  const legacyCategory: Category = { ...editableCategory, color: LEGACY_ORANGE }

  it('à l’ouverture : aucune pastille cochée, « Personnalisé » actif', () => {
    render(<CategoryDrawer open onOpenChange={noop} mode="edit" category={legacyCategory} />)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio, radio.getAttribute('data-testid') ?? '').toHaveAttribute(
        'aria-checked',
        'false',
      )
    }
    expect(screen.getByTestId('category-color-custom')).toHaveAttribute('aria-pressed', 'true')
    // Aucune écriture au montage : le composant n'a rien émis.
    expect(updateMutateAsync).not.toHaveBeenCalled()
  })

  it('enregistrer SANS toucher la couleur renvoie la valeur stockée à l’identique', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    render(<CategoryDrawer open onOpenChange={noop} mode="edit" category={legacyCategory} />)

    const nameInput = screen.getByTestId('category-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renommée')
    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'cat-1',
        data: { name: 'Renommée', color: LEGACY_ORANGE, description: 'Voitures et motos' },
      }),
    )
  })

  it('la casse stockée est préservée même quand la couleur EST dans la palette', async () => {
    // `#e5484d` = rouge de la palette : la pastille est cochée (comparaison
    // insensible à la casse) mais la valeur n'est pas normalisée en `#E5484D`.
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    render(
      <CategoryDrawer
        open
        onOpenChange={noop}
        mode="edit"
        category={{ ...editableCategory, color: '#e5484d' }}
      />,
    )
    expect(screen.getByTestId('category-swatch-#E5484D')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('category-color-custom')).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByTestId('category-submit'))
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'cat-1',
        data: { name: 'Véhicules', color: '#e5484d', description: 'Voitures et motos' },
      }),
    )
  })

  it('choisir une pastille remplace la couleur hors palette (action explicite)', async () => {
    const user = userEvent.setup()
    updateMutateAsync.mockResolvedValue({})
    render(<CategoryDrawer open onOpenChange={noop} mode="edit" category={legacyCategory} />)

    await user.click(screen.getByTestId('category-swatch-#EE7B30'))
    expect(screen.getByTestId('category-color-custom')).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByTestId('category-submit'))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'cat-1',
        data: { name: 'Véhicules', color: '#EE7B30', description: 'Voitures et motos' },
      }),
    )
  })
})
