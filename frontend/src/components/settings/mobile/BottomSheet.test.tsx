import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet, shouldDismissOnSwipe, DISMISS_THRESHOLD_PX } from './BottomSheet'

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
