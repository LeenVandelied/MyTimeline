import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BottomSheet, shouldDismissOnSwipe, DISMISS_THRESHOLD_PX } from './BottomSheet'
import {
  FakeVisualViewport,
  installVisualViewport,
  removeVisualViewport,
} from '@/__tests__/support/visualViewport'

/**
 * #87 — BottomSheet générique : rendu conditionnel (open), fermeture par tap
 * backdrop, bouton croix, Escape et swipe-down (> seuil). Le focus-trap réel
 * (`useFocusTrap`) est exercé — pas de mock — pour couvrir Escape.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

function setup(open = true) {
  const onClose = vi.fn()
  const utils = render(
    <BottomSheet open={open} onClose={onClose} title="Titre">
      <button type="button">contenu</button>
    </BottomSheet>,
  )
  return { onClose, ...utils }
}

describe('BottomSheet', () => {
  it('ne rend rien quand fermé', () => {
    setup(false)
    expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument()
  })

  it('rend le panneau modal avec titre + a11y quand ouvert', () => {
    setup(true)
    const panel = screen.getByTestId('bottom-sheet')
    expect(panel).toHaveAttribute('role', 'dialog')
    expect(panel).toHaveAttribute('aria-modal', 'true')
    expect(panel).toHaveAttribute('aria-labelledby', 'bottom-sheet-title')
    expect(screen.getByText('Titre')).toBeInTheDocument()
  })

  it('ferme au tap sur le backdrop', () => {
    const { onClose } = setup(true)
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ferme au clic sur le bouton croix', () => {
    const { onClose } = setup(true)
    fireEvent.click(screen.getByTestId('bottom-sheet-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ferme sur Escape (focus trap onEscape)', () => {
    const { onClose } = setup(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('expose la zone grabber (swipe-down) accessible au pointeur', () => {
    setup(true)
    expect(screen.getByTestId('bottom-sheet-grabber')).toBeInTheDocument()
  })

  // La décision swipe-down est testée en unitaire (pur) : React synthetic
  // pointer events ne propagent PAS `clientY` sous jsdom, donc on ne peut pas
  // simuler le glissement de bout en bout. Le câblage (grabber -> handler) est
  // couvert par la présence du grabber ci-dessus + Playwright (375px).
  it('shouldDismissOnSwipe : ferme au-delà du seuil, pas en-deçà', () => {
    expect(shouldDismissOnSwipe(DISMISS_THRESHOLD_PX + 1)).toBe(true)
    expect(shouldDismissOnSwipe(DISMISS_THRESHOLD_PX)).toBe(false)
    expect(shouldDismissOnSwipe(0)).toBe(false)
  })
})

/**
 * #79 — Évitement du clavier virtuel + pied optionnel.
 *
 * PROUVENT : le câblage (bornage inline de la hauteur, attributs d'état, callbacks
 * de transition, pied rendu hors de la zone défilante) et le NO-OP sans
 * `visualViewport` — l'état natif de jsdom, et celui d'un navigateur ancien.
 * NE PROUVENT PAS : le comportement d'un clavier réel (aucune mise en page en jsdom).
 */
describe('BottomSheet — #79 clavier virtuel & pied', () => {
  afterEach(() => {
    removeVisualViewport()
  })

  it('sans `visualViewport` : `data-keyboard="closed"`, aucune hauteur imposée', () => {
    setup(true)
    const panel = screen.getByTestId('bottom-sheet')
    expect(panel).toHaveAttribute('data-keyboard', 'closed')
    expect(panel).not.toHaveAttribute('data-compact')
    // La classe `max-h-[85vh]` reste seule maîtresse de la hauteur.
    expect(panel.style.maxHeight).toBe('')
    expect(panel.style.top).toBe('')
  })

  it('clavier ouvert : borne la hauteur, suit `offsetTop` et notifie les transitions', async () => {
    const vv = new FakeVisualViewport(844)
    installVisualViewport(vv)
    const onKeyboardShow = vi.fn()
    const onKeyboardHide = vi.fn()
    render(
      <BottomSheet
        open
        onClose={vi.fn()}
        title="Titre"
        onKeyboardShow={onKeyboardShow}
        onKeyboardHide={onKeyboardHide}
      >
        <input aria-label="champ" />
      </BottomSheet>,
    )
    const panel = screen.getByTestId('bottom-sheet')

    await act(async () => {
      vv.emit({ height: 494, offsetTop: 12 })
    })
    await waitFor(() => expect(panel).toHaveAttribute('data-keyboard', 'open'))
    // 494 - 12 : seul ce qui est RÉELLEMENT visible borne le panneau.
    expect(panel.style.maxHeight).toBe('482px')
    expect(panel.style.top).toBe('12px')
    expect(onKeyboardShow).toHaveBeenCalledTimes(1)

    await act(async () => {
      vv.emit({ height: 844, offsetTop: 0 })
    })
    await waitFor(() => expect(panel).toHaveAttribute('data-keyboard', 'closed'))
    expect(panel.style.maxHeight).toBe('')
    expect(onKeyboardHide).toHaveBeenCalledTimes(1)
  })

  it('pied : absent par défaut, rendu HORS du corps défilant quand fourni', () => {
    setup(true)
    expect(screen.queryByTestId('bottom-sheet-footer')).not.toBeInTheDocument()

    render(
      <BottomSheet
        open
        onClose={vi.fn()}
        title="Titre"
        testId="sheet-2"
        footer={<button type="button">valider</button>}
      >
        <input aria-label="champ" />
      </BottomSheet>,
    )
    const footer = screen.getByTestId('sheet-2-footer')
    expect(footer).toHaveTextContent('valider')
    // Le corps (`flex-1 overflow-auto`) ne doit PAS contenir le pied, sinon les
    // actions défileraient hors de l'écran clavier ouvert.
    expect(document.getElementById('sheet-2-body')).not.toContainElement(footer)
    expect(screen.getByTestId('sheet-2')).toContainElement(footer)
  })
})
