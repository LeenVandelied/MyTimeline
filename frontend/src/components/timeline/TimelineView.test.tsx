import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineView } from './TimelineView'

/**
 * #55 — Tests d'intégration TimelineView (jsdom).
 * next-intl mocké → assertions locale-agnostiques sur les clés. On vérifie :
 * rendu de la frise/lanes, ouverture du drawer au clic, fermeture Échap,
 * raccourci zoom (+/-), accordéon catégorie. Le zoom NE fait AUCUN fetch (aucun
 * hook réseau monté — le composant ne consomme que ses props).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

// jsdom n'implémente pas l'API Fullscreen ni scroll — stubs neutres.
beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait',
    start: '2026-07-10',
    end: '2026-07-14',
    allDay: true,
    resourceId: 'p1',
    color: '#3B62D4',
    extendedProps: {
      productId: 'p1',
      productName: 'Lait bio',
      category: 'Frais',
      type: 'duration',
    },
  },
  {
    id: 'e2',
    title: 'Livraison pain',
    start: '2026-07-20',
    end: '2026-07-20',
    allDay: true,
    resourceId: 'p2',
    color: '#4FA459',
    extendedProps: {
      productId: 'p2',
      productName: 'Pain',
      category: 'Boulangerie',
      type: 'single',
    },
  },
]

const RESOURCES: Resource[] = [
  { id: 'p1', title: 'Lait bio', category: 'Frais' },
  { id: 'p2', title: 'Pain', category: 'Boulangerie' },
]

function setup() {
  return render(
    <TimelineView
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
    />,
  )
}

describe('TimelineView', () => {
  it('rend la frise, la règle et les events', () => {
    setup()
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-ruler')).toBeInTheDocument()
    const events = screen.getAllByTestId('timeline-event')
    expect(events).toHaveLength(2)
    expect(events[0]).toHaveAttribute('data-event-title', 'Péremption lait')
  })

  it('affiche le nom du produit (resource.title) dans chaque lane via timeline-resource-title', () => {
    // Garde-fou anti-régression (#55) : l'e2e golden-path assert que le nom du
    // produit créé figure dans un `timeline-resource-title`. Le test ne vérifiait
    // que le NOMBRE de lanes → il a laissé passer la perte du label produit.
    setup()
    const titles = screen.getAllByTestId('timeline-resource-title')
    expect(titles).toHaveLength(RESOURCES.length)
    const rendered = titles.map((el) => el.textContent)
    expect(rendered).toContain('Lait bio')
    expect(rendered).toContain('Pain')
  })

  it('affiche l’indicateur TODAY et la minimap', () => {
    setup()
    expect(screen.getByTestId('timeline-today')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-minimap')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-minimap-viewport')).toBeInTheDocument()
  })

  it('ouvre le drawer au clic sur un event puis le ferme avec Échap', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.queryByTestId('timeline-drawer')).not.toBeInTheDocument()

    await user.click(screen.getAllByTestId('timeline-event')[0])
    expect(await screen.findByTestId('timeline-drawer')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByTestId('timeline-drawer')).not.toBeInTheDocument())
  })

  it('ferme le drawer via le bouton fermer', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    await screen.findByTestId('timeline-drawer')
    await user.click(screen.getByTestId('timeline-drawer-close'))
    await waitFor(() => expect(screen.queryByTestId('timeline-drawer')).not.toBeInTheDocument())
  })

  it('le raccourci "+" zoome (change le niveau affiché)', async () => {
    const user = userEvent.setup()
    setup()
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    await user.keyboard('+')
    await waitFor(() => expect(level.textContent).not.toBe(before))
  })

  it('les boutons de zoom changent le niveau', async () => {
    const user = userEvent.setup()
    setup()
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    await user.click(screen.getByTestId('timeline-zoom-in'))
    expect(level.textContent).not.toBe(before)
  })

  it('l’accordéon de catégorie masque ses lanes au collapse', async () => {
    const user = userEvent.setup()
    setup()
    const rowsBefore = screen.getAllByTestId('timeline-resource-row').length
    expect(rowsBefore).toBe(2)
    // Collapse la première catégorie.
    const heads = screen.getAllByTestId('timeline-group-head')
    await user.click(heads[0])
    await waitFor(() =>
      expect(screen.getAllByTestId('timeline-resource-row').length).toBeLessThan(rowsBefore),
    )
  })

  it('le zoom (in/out) ne déclenche AUCUN appel réseau (BR-EVE-001, client-only)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null))
    const user = userEvent.setup()
    setup()
    const level = screen.getByTestId('timeline-zoom-level')

    const before = level.textContent
    await user.keyboard('+')
    await waitFor(() => expect(level.textContent).not.toBe(before))
    await user.keyboard('-')
    await user.keyboard('-')
    await user.click(screen.getByTestId('timeline-zoom-in'))
    await user.click(screen.getByTestId('timeline-zoom-out'))

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('le raccourci "F" ne hijacke pas Cmd/Ctrl+F (recherche navigateur)', async () => {
    const user = userEvent.setup()
    setup()
    const fsSpy = Element.prototype.requestFullscreen as ReturnType<typeof vi.fn>

    // Cmd+F et Ctrl+F ne doivent PAS déclencher le plein écran.
    await user.keyboard('{Meta>}f{/Meta}')
    await user.keyboard('{Control>}f{/Control}')
    expect(fsSpy).not.toHaveBeenCalled()

    // "f" seul déclenche bien le plein écran.
    await user.keyboard('f')
    await waitFor(() => expect(fsSpy).toHaveBeenCalled())
  })

  it('le bloc event expose un aria-label riche (titre + statut + dates + produit)', () => {
    setup()
    const first = screen.getAllByTestId('timeline-event')[0]
    const label = first.getAttribute('aria-label') || ''
    expect(label).toContain('Péremption lait')
    expect(label).toContain('dashboard.timeline.status.')
    expect(label).toContain('Lait bio')
  })

  it('le drawer expose les métadonnées de l’event', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    const drawer = await screen.findByTestId('timeline-drawer')
    expect(drawer).toHaveTextContent('Lait bio')
    expect(drawer).toHaveTextContent('Frais')
  })
})
