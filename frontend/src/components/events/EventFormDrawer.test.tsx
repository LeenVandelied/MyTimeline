import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EventFormDrawer } from './EventFormDrawer'

/**
 * Revue S86 (MAJEUR) — la coque `EventFormDrawer` est MODALE au sens complet.
 *
 * #618 a remplacé en édition un `Dialog` Radix par cette coque maison. Le `Dialog`
 * apportait deux acquis implicites que la coque doit reporter explicitement, dans
 * les DEUX variantes (drawer >= lg, bottom sheet < lg) :
 *   1. verrou de défilement de la page (`RemoveScroll`, observable ici par l'attribut
 *      `data-scroll-locked` que `react-remove-scroll-bar` pose sur `body`) ;
 *   2. fond inerte (`hideOthers` : `aria-hidden="true"` sur les frères du portail).
 *
 * ⚠ jsdom ne prouve RIEN sur le défilement réel : ces tests vérifient que le verrou
 * est POSÉ et LEVÉ. Le blocage effectif (molette sur le scrim, corps qui défile
 * encore, `Select` utilisable) est prouvé par `e2e/sprint-86-form-drawer-modal.spec.ts`.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

let mockIsCompact = false
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => mockIsCompact,
  default: () => mockIsCompact,
}))

const TEST_ID = 'form-shell'
const SCROLL_LOCK_ATTRIBUTE = 'data-scroll-locked'

let outside: HTMLDivElement

const renderShell = (open: boolean) => {
  const ui = (isOpen: boolean) => (
    <EventFormDrawer open={isOpen} onClose={() => {}} title="Titre" testId={TEST_ID} hasForm>
      {() => <button type="button">champ</button>}
    </EventFormDrawer>
  )
  const utils = render(ui(open))
  return { ...utils, setOpen: (isOpen: boolean) => utils.rerender(ui(isOpen)) }
}

beforeEach(() => {
  mockIsCompact = false
  // Frère du portail : représente le reste de l'application (shell, frise…).
  outside = document.createElement('div')
  outside.setAttribute('data-testid', 'outside')
  document.body.appendChild(outside)
})

afterEach(() => {
  outside.remove()
})

describe.each([
  { variant: 'drawer (>= lg)', compact: false },
  { variant: 'bottom sheet (< lg)', compact: true },
])('EventFormDrawer — modale complète · $variant', ({ compact }) => {
  beforeEach(() => {
    mockIsCompact = compact
  })

  it("à l'ouverture : fond aria-hidden, page verrouillée, panneau jamais masqué", async () => {
    renderShell(true)
    const panel = screen.getByTestId(TEST_ID)

    await waitFor(() => expect(outside).toHaveAttribute('aria-hidden', 'true'))
    await waitFor(() => expect(document.body).toHaveAttribute(SCROLL_LOCK_ATTRIBUTE))
    expect(panel.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('à la fermeture : aria-hidden et verrou sont levés', async () => {
    const { setOpen } = renderShell(true)
    await waitFor(() => expect(outside).toHaveAttribute('aria-hidden', 'true'))
    await waitFor(() => expect(document.body).toHaveAttribute(SCROLL_LOCK_ATTRIBUTE))

    setOpen(false)

    await waitFor(() => expect(outside).not.toHaveAttribute('aria-hidden'))
    await waitFor(() => expect(document.body).not.toHaveAttribute(SCROLL_LOCK_ATTRIBUTE))
  })

  it('au démontage (ouverte) : aria-hidden et verrou sont levés', async () => {
    const { unmount } = renderShell(true)
    await waitFor(() => expect(outside).toHaveAttribute('aria-hidden', 'true'))
    await waitFor(() => expect(document.body).toHaveAttribute(SCROLL_LOCK_ATTRIBUTE))

    unmount()

    await waitFor(() => expect(outside).not.toHaveAttribute('aria-hidden'))
    await waitFor(() => expect(document.body).not.toHaveAttribute(SCROLL_LOCK_ATTRIBUTE))
  })

  it('un portail ouvert APRÈS le panneau (liste de Select, confirmation) reste accessible', async () => {
    renderShell(true)
    await waitFor(() => expect(outside).toHaveAttribute('aria-hidden', 'true'))

    // Radix portalise ses listes et dialogs dans `body` au moment où ils s'ouvrent.
    const laterPortal = document.createElement('div')
    document.body.appendChild(laterPortal)
    try {
      expect(laterPortal).not.toHaveAttribute('aria-hidden')
    } finally {
      laterPortal.remove()
    }
  })
})
