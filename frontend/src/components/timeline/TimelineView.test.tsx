import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { LANE_TRACK_OFFSET_PX, TimelineView } from './TimelineView'
import { CreateEventProvider } from '@/components/layout/CreateEventContext'

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

/**
 * #596 — rang (`aria-posinset`) → zébrée ?, par catégorie (liste `role="list"`).
 * Sans layout (jsdom), seule la PARITÉ posée par le composant est vérifiable ici ; la
 * couleur résolue et la stabilité sous virtualisation réelle vivent dans
 * `e2e/sprint-105-lane-zebra.spec.ts`.
 */
function zebraByCategory(container: HTMLElement, altClass: string) {
  const out: Record<string, Array<[number, boolean]>> = {}
  for (const list of Array.from(container.querySelectorAll('[data-testid="timeline-lane-list"]'))) {
    out[list.getAttribute('aria-label') ?? ''] = Array.from(
      list.querySelectorAll('[data-testid="timeline-resource-row"]'),
    ).map((row) => [Number(row.getAttribute('aria-posinset')), row.classList.contains(altClass)])
  }
  return out
}

describe('#595 TimelineView — série récurrente : ↻, fantômes et connecteur', () => {
  // e1 : durée mensuelle bornée au 10 sept. ; étendue = 10 juin → 19 août (fin max + 30 j).
  // Fantômes attendus : 10 août seulement (10 sept. est HORS étendue, jamais étirée).
  const SERIES: FullCalendarEvent[] = [
    {
      ...EVENTS[0],
      extendedProps: {
        ...EVENTS[0].extendedProps,
        isRecurring: true,
        recurrenceUnit: 'MONTH',
        recurrenceEndDate: '2026-09-10',
      },
    },
    EVENTS[1],
  ]
  const renderSeries = (events = SERIES) =>
    render(
      <TimelineView
        events={events}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )

  it('rend les marques NON interactives, avant la pastille, hors du compteur timeline-event', () => {
    const { container } = renderSeries()
    expect(screen.getAllByTestId('timeline-event')).toHaveLength(2)
    const ghosts = container.querySelectorAll('[data-recurrence-mark="ghost"]')
    expect([...ghosts].map((g) => g.getAttribute('data-occurrence-date'))).toEqual(['2026-08-10'])
    const connectors = container.querySelectorAll('[data-recurrence-mark="connector"]')
    expect(connectors).toHaveLength(1)
    for (const mark of [...ghosts, ...connectors]) {
      expect(mark).toHaveAttribute('aria-hidden', 'true')
      expect(mark).not.toHaveAttribute('data-testid')
      expect(mark).not.toHaveAttribute('tabindex')
    }
    expect(ghosts[0]).toHaveClass('mt-evt', 'mt-evt--draft', 'mt-tlv__ghost')
    expect(connectors[0]).toHaveClass('mt-evt-connector', 'mt-tlv__connector')
    // Ordre de peinture : les marques précèdent la pastille réelle dans la lane.
    const pill = screen.getAllByTestId('timeline-event')[0]
    expect(ghosts[0].compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      connectors[0].compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    // Glyphe ↻ décoratif sur la barre récurrente, absent du ponctuel non récurrent.
    expect(pill.querySelector('.mt-evt-recur')).toHaveAttribute('aria-hidden', 'true')
    expect(
      screen.getAllByTestId('timeline-event')[1].querySelector('.mt-evt-pin__recur'),
    ).toBeNull()
  })

  it('série archivée : ↻ conservé, aucun fantôme ni connecteur', () => {
    const archived = [
      { ...SERIES[0], extendedProps: { ...SERIES[0].extendedProps, archived: true } },
      EVENTS[1],
    ]
    const { container } = renderSeries(archived)
    expect(container.querySelectorAll('[data-recurrence-mark]')).toHaveLength(0)
    expect(screen.getAllByTestId('timeline-event')[0].querySelector('.mt-evt-recur')).not.toBeNull()
  })

  it('catégorie repliée : pas de fantôme dans le résumé', async () => {
    const { container } = renderSeries()
    const head = container.querySelector(
      '[data-testid="timeline-group-head"][data-category="Frais"]',
    )
    fireEvent.click(head as HTMLElement)
    await waitFor(() => expect(screen.getByTestId('timeline-group-summary')).toBeInTheDocument())
    expect(container.querySelectorAll('[data-recurrence-mark]')).toHaveLength(0)
  })
})

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
    // #597 — `F` recadre : viewport mesurable, sinon le recadrage est un no-op vacant.
    const scroll = screen.getByTestId('timeline-scroll')
    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 1000 })
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent

    // Cmd+F et Ctrl+F ne doivent PAS recadrer.
    await user.keyboard('{Meta>}f{/Meta}')
    await user.keyboard('{Control>}f{/Control}')
    expect(level.textContent).toBe(before)

    // "f" seul recadre bien.
    await user.keyboard('f')
    await waitFor(() => expect(level.textContent).not.toBe(before))
  })

  it('#395 — `aria-pressed` du bouton plein écran suit `fullscreenchange`, y compris une sortie hors bouton', async () => {
    const user = userEvent.setup()
    // jsdom n'implémente pas `document.fullscreenElement` : on le pilote via une
    // variable, et on ÉMET `fullscreenchange` comme le ferait un vrai navigateur.
    let active = false
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => (active ? document.documentElement : null),
    })
    Element.prototype.requestFullscreen = vi.fn().mockImplementation(() => {
      active = true
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    })
    setup()

    const btn = screen.getByTestId('timeline-fullscreen')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    // L'`aria-label` préexistant est CONSERVÉ (aria-pressed s'y ajoute).
    expect(btn.getAttribute('aria-label')).toBeTruthy()

    await user.click(btn)
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'))

    // Sortie SANS passer par le bouton (Échap natif, F11, menu du navigateur) :
    // un état basculé à la main dans `onClick` resterait bloqué sur `true` ici.
    active = false
    fireEvent(document, new Event('fullscreenchange'))
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'))
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

  // ==================== #81 — a11y ====================
  describe('#81 accessibilité (region landmark + roving + clavier + aria-live)', () => {
    it('expose la frise comme région landmark (role=region + aria-label + description)', () => {
      setup()
      const region = screen.getByTestId('timeline-view')
      expect(region.tagName).toBe('SECTION')
      expect(region).toHaveAttribute('role', 'region')
      expect(region).toHaveAttribute('aria-label', 'dashboard.timeline.region.label')
      expect(region).toHaveAttribute('aria-describedby', 'timeline-region-desc')
      expect(document.getElementById('timeline-region-desc')).toHaveTextContent(
        'dashboard.timeline.region.description',
      )
    })

    it('roving tabindex : UNE seule pastille focusable (tabIndex=0), les autres -1', () => {
      setup()
      const pills = screen.getAllByTestId('timeline-event')
      const focusables = pills.filter((p) => p.getAttribute('tabindex') === '0')
      expect(focusables).toHaveLength(1)
      expect(pills.filter((p) => p.getAttribute('tabindex') === '-1')).toHaveLength(
        pills.length - 1,
      )
    })

    it('↓ déplace le focus vers la lane suivante, ↑ revient (navigation clavier)', async () => {
      const user = userEvent.setup()
      setup()
      const pills = screen.getAllByTestId('timeline-event')
      // 2 lanes, 1 event chacune (e1 lane0, e2 lane1).
      pills[0].focus()
      await user.keyboard('{ArrowDown}')
      expect(pills[1]).toHaveFocus()
      await user.keyboard('{ArrowUp}')
      expect(pills[0]).toHaveFocus()
    })

    it('End va à la dernière pastille, Home à la première', async () => {
      const user = userEvent.setup()
      setup()
      const pills = screen.getAllByTestId('timeline-event')
      pills[0].focus()
      await user.keyboard('{End}')
      expect(pills[pills.length - 1]).toHaveFocus()
      await user.keyboard('{Home}')
      expect(pills[0]).toHaveFocus()
    })

    it('Entrée sur une pastille ouvre le drawer (activation native du bouton)', async () => {
      const user = userEvent.setup()
      setup()
      const pills = screen.getAllByTestId('timeline-event')
      pills[0].focus()
      await user.keyboard('{Enter}')
      expect(await screen.findByTestId('timeline-drawer')).toBeInTheDocument()
    })

    it('aria-live annonce le changement de zoom', async () => {
      const user = userEvent.setup()
      setup()
      const live = screen.getByTestId('timeline-live-region')
      expect(live).toHaveAttribute('aria-live', 'polite')
      expect(live.textContent).toBe('') // silencieux au montage (pas d'annonce parasite)
      await user.keyboard('+')
      await waitFor(() => expect(live.textContent).toContain('dashboard.timeline.live.zoom'))
    })

    it('aria-live annonce l’event sélectionné à l’ouverture du drawer', async () => {
      const user = userEvent.setup()
      setup()
      const live = screen.getByTestId('timeline-live-region')
      await user.click(screen.getAllByTestId('timeline-event')[0])
      await waitFor(() => expect(live.textContent).toContain('dashboard.timeline.live.selected'))
      expect(live.textContent).toContain('Péremption lait')
    })

    it('la pastille active reste focusable après collapse d’une catégorie (roving recalculé)', async () => {
      const user = userEvent.setup()
      setup()
      // Collapse la 1re catégorie → sa lane disparaît, le roving retombe sur la 1re
      // pastille visible restante (pas de crash, tabIndex=0 toujours unique).
      await user.click(screen.getAllByTestId('timeline-group-head')[0])
      await waitFor(() => {
        const pills = screen.getAllByTestId('timeline-event')
        expect(pills.filter((p) => p.getAttribute('tabindex') === '0')).toHaveLength(1)
      })
    })

    it('MAJEUR-2 : le roving suit la RESSOURCE (pas un index) quand une catégorie AU-DESSUS se collapse', async () => {
      // Régression MAJEUR-2 : `activeNav` était keyé par index de lane. Collapser
      // une catégorie AU-DESSUS de la lane active rétrécit `navLanes` → l'index
      // glissait vers une AUTRE ressource. Fixture : 3 catégories × 1 event.
      // On active la pastille de la 3e ressource (cat C, index 2), on collapse la
      // 1re catégorie (cat A) → les index remontent, MAIS le tabIndex=0 doit
      // rester sur l'event de la ressource C, PAS sauter sur celui de B.
      const events: FullCalendarEvent[] = [
        {
          id: 'ea',
          title: 'Event A',
          start: '2026-07-10',
          end: '2026-07-10',
          allDay: true,
          resourceId: 'pa',
          color: '#3B62D4',
          extendedProps: {
            productId: 'pa',
            productName: 'Prod A',
            category: 'Cat A',
            type: 'single',
          },
        },
        {
          id: 'eb',
          title: 'Event B',
          start: '2026-07-12',
          end: '2026-07-12',
          allDay: true,
          resourceId: 'pb',
          color: '#3B62D4',
          extendedProps: {
            productId: 'pb',
            productName: 'Prod B',
            category: 'Cat B',
            type: 'single',
          },
        },
        {
          id: 'ec',
          title: 'Event C',
          start: '2026-07-14',
          end: '2026-07-14',
          allDay: true,
          resourceId: 'pc',
          color: '#3B62D4',
          extendedProps: {
            productId: 'pc',
            productName: 'Prod C',
            category: 'Cat C',
            type: 'single',
          },
        },
      ]
      const resources: Resource[] = [
        { id: 'pa', title: 'Prod A', category: 'Cat A' },
        { id: 'pb', title: 'Prod B', category: 'Cat B' },
        { id: 'pc', title: 'Prod C', category: 'Cat C' },
      ]
      const user = userEvent.setup()
      render(
        <TimelineView
          events={events}
          resources={resources}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )

      const pillFor = (title: string) =>
        screen
          .getAllByTestId('timeline-event')
          .find((p) => p.getAttribute('data-event-title') === title)!

      // Active la pastille de la ressource C (la plus basse) via focus clavier.
      pillFor('Event A').focus()
      await user.keyboard('{ArrowDown}{ArrowDown}') // → lane B → lane C
      expect(pillFor('Event C')).toHaveFocus()
      expect(pillFor('Event C')).toHaveAttribute('tabindex', '0')

      // Collapse la catégorie A (au-dessus de la lane active) → glissement d'index.
      await user.click(screen.getAllByTestId('timeline-group-head')[0])

      await waitFor(() => {
        // Le tabIndex=0 DOIT rester sur l'event C (même ressource), pas sur B.
        expect(pillFor('Event C')).toHaveAttribute('tabindex', '0')
        expect(pillFor('Event B')).toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('#81 garde-fou contraste (libellé extérieur si < 4.5:1)', () => {
    it('rend un libellé EXTÉRIEUR pour un event dont la couleur n’atteint pas AA dedans', () => {
      render(
        <TimelineView
          events={[
            {
              id: 'e3',
              title: 'Contraste faible',
              start: '2026-07-12',
              end: '2026-07-12',
              allDay: true,
              resourceId: 'p3',
              // Échantillon NON CONFORME choisi exprès (4.47:1 max → libellé de
              // secours dehors). Ce n'est PAS la couleur par défaut de l'app :
              // `DEFAULT_COLOR` vaut `#3B62D4` (5.407:1) depuis #393 — ne pas
              // resynchroniser cette valeur sur le défaut, le test perdrait son objet.
              color: '#6366f1',
              // #594 — `duration` (était `single`) : le garde-fou de contraste ne
              // concerne plus que les BARRES ; un ponctuel est un pin dont le libellé
              // est toujours dehors, sans libellé de secours (test suivant).
              extendedProps: {
                productId: 'p3',
                productName: 'Prod3',
                category: 'Cat3',
                type: 'duration',
              },
            },
          ]}
          resources={[{ id: 'p3', title: 'Prod3', category: 'Cat3' }]}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.getByTestId('timeline-event-outside-label')).toHaveTextContent(
        'Contraste faible',
      )
    })

    it('ne rend PAS de libellé extérieur quand le contraste passe AA dedans', () => {
      setup() // events #3B62D4 (5.41) et #4FA459 → lisibles dedans
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })

    it('#594 — un ponctuel de même couleur faible est un PIN : un seul libellé, pas de secours', () => {
      render(
        <TimelineView
          events={[
            {
              id: 'e4',
              title: 'Pin contraste faible',
              start: '2026-07-12',
              end: '2026-07-12',
              allDay: true,
              resourceId: 'p4',
              color: '#6366f1',
              extendedProps: {
                productId: 'p4',
                productName: 'Prod4',
                category: 'Cat4',
                type: 'single',
              },
            },
          ]}
          resources={[{ id: 'p4', title: 'Prod4', category: 'Cat4' }]}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      const pin = screen.getByTestId('timeline-event')
      expect(pin).toHaveAttribute('data-event-kind', 'single')
      expect(screen.getAllByText('Pin contraste faible')).toHaveLength(1)
      expect(screen.queryByTestId('timeline-event-outside-label')).not.toBeInTheDocument()
    })
  })

  // ==================== #228 — couverture clavier §9 ====================
  // Compléments de couverture repérés en ux-patterns.md §9. Ces tests reflètent
  // le comportement clavier ACTUEL (garde-fou de non-régression avant #195) :
  //  1. ← / → navigation INTER-lanes (débordement en bord de lane) ;
  //  2. cyclage Tab/Shift+Tab dans le drawer + restauration du focus déclencheur ;
  //  3. raccourcis globaux T / [ / ] / -.
  describe('#228 couverture clavier §9', () => {
    it('← / → naviguent ENTRE les lanes (débordement en bord de lane)', async () => {
      const user = userEvent.setup()
      setup()
      const pills = screen.getAllByTestId('timeline-event')
      // 2 lanes, 1 pastille chacune (e1 lane0, e2 lane1). En bord de lane, → passe
      // à la 1re pastille de la lane suivante ; ← revient à la dernière précédente.
      pills[0].focus()
      await user.keyboard('{ArrowRight}')
      expect(pills[1]).toHaveFocus()
      await user.keyboard('{ArrowLeft}')
      expect(pills[0]).toHaveFocus()
    })

    it('drawer : Tab/Shift+Tab piègent le focus + restauration du focus déclencheur à la fermeture', async () => {
      const user = userEvent.setup()
      setup()
      const trigger = screen.getAllByTestId('timeline-event')[0]
      // Ouvre le drawer au clavier depuis la pastille (elle devient le déclencheur).
      trigger.focus()
      await user.keyboard('{Enter}')
      await screen.findByTestId('timeline-drawer')

      // Focus initial déplacé sur le 1er focusable du panneau (bouton fermer).
      const close = screen.getByTestId('timeline-drawer-close')
      expect(close).toHaveFocus()

      // Trap : le bouton fermer est le SEUL focusable du drawer → Tab et Shift+Tab
      // bouclent et gardent le focus dans le panneau (jamais sur la frise derrière).
      await user.keyboard('{Tab}')
      expect(close).toHaveFocus()
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(close).toHaveFocus()

      // Fermeture (Échap) → le focus revient sur la pastille déclencheuse.
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByTestId('timeline-drawer')).not.toBeInTheDocument())
      expect(trigger).toHaveFocus()
    })

    it('raccourci "-" dézoome (change le niveau affiché)', async () => {
      const user = userEvent.setup()
      setup()
      const level = screen.getByTestId('timeline-zoom-level')
      const before = level.textContent // niveau initial = "month"
      await user.keyboard('-')
      // ZOOM_OUT : month → quarter → le libellé de niveau change.
      await waitFor(() => expect(level.textContent).not.toBe(before))
    })

    it('raccourcis "[" / "]" décalent la fenêtre (période précédente / suivante)', async () => {
      setup()
      const scroll = screen.getByTestId('timeline-scroll')
      // ] = NEXT_PERIOD : offsetDays += 30 (niveau month) → scrollLeft = 30 × 12px = 360.
      fireEvent.keyDown(window, { key: ']' })
      await waitFor(() => expect(scroll.scrollLeft).toBe(360))
      // [ = PREV_PERIOD : offsetDays revient à 0 → scrollLeft = 0.
      fireEvent.keyDown(window, { key: '[' })
      await waitFor(() => expect(scroll.scrollLeft).toBe(0))
    })

    it('raccourci "T" recentre la fenêtre sur aujourd’hui', async () => {
      const user = userEvent.setup()
      setup()
      const scroll = screen.getByTestId('timeline-scroll')
      // On éloigne d'abord la vue (] → offset 30 → scrollLeft 360).
      fireEvent.keyDown(window, { key: ']' })
      await waitFor(() => expect(scroll.scrollLeft).toBe(360))
      // T = GO_TO_TODAY : offset = jours(rangeStart→today) = 35 → scrollLeft = 35 × 12 = 420.
      await user.keyboard('t')
      await waitFor(() => expect(scroll.scrollLeft).toBe(420))
    })
  })

  // ==================== #195 — accordéon collapse produit ====================
  // 2e niveau d'accordéon imbriqué dans le collapse catégorie. Critères
  // d'acceptation : collapse produit indépendant ; scroll conservé ; clavier/focus
  // cohérent avec le pattern accordéon catégorie déjà en place.
  describe('#195 accordéon collapse produit', () => {
    it('replie un produit indépendamment (masque ses events, sans toucher les autres produits ni la catégorie)', async () => {
      const user = userEvent.setup()
      setup() // p1 (cat Frais) + p2 (cat Boulangerie), 1 event chacun
      expect(screen.getAllByTestId('timeline-event')).toHaveLength(2)

      const heads = screen.getAllByTestId('timeline-resource-head')
      expect(heads).toHaveLength(2)
      // État initial : les deux produits sont dépliés.
      expect(heads[0]).toHaveAttribute('aria-expanded', 'true')
      expect(heads[1]).toHaveAttribute('aria-expanded', 'true')

      // Replie le 1er produit (p1 → event e1 masqué).
      await user.click(heads[0])
      await waitFor(() => expect(screen.getAllByTestId('timeline-event')).toHaveLength(1))

      // Le produit replié : aria-expanded=false, mais son label/toggle reste rendu.
      expect(screen.getAllByTestId('timeline-resource-head')[0]).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(screen.getAllByTestId('timeline-resource-row')).toHaveLength(2)
      // L'autre produit N'est PAS affecté (toujours déplié, son event visible).
      expect(screen.getAllByTestId('timeline-resource-head')[1]).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      const remaining = screen.getAllByTestId('timeline-event')
      expect(remaining[0]).toHaveAttribute('data-event-title', 'Livraison pain')
      // La catégorie parente reste dépliée (accordéon catégorie inchangé).
      screen
        .getAllByTestId('timeline-group-head')
        .forEach((h) => expect(h).toHaveAttribute('aria-expanded', 'true'))
    })

    it('conserve la position de scroll après un collapse produit (parité collapse catégorie)', async () => {
      const user = userEvent.setup()
      setup()
      const scroll = screen.getByTestId('timeline-scroll')
      // Simule un défilement horizontal utilisateur.
      scroll.scrollLeft = 360
      expect(scroll.scrollLeft).toBe(360)

      // Le collapse produit est un pur re-rendu (aucun reset de scroll, comme la
      // catégorie) → le conteneur scrollable garde sa position.
      await user.click(screen.getAllByTestId('timeline-resource-head')[0])
      await waitFor(() => expect(screen.getAllByTestId('timeline-event')).toHaveLength(1))
      expect(scroll.scrollLeft).toBe(360)
    })

    it('clavier/focus cohérent : la lane produit repliée est exclue de la nav, roving unique préservé', async () => {
      const user = userEvent.setup()
      setup()
      const pills = screen.getAllByTestId('timeline-event')
      // Active la pastille de la 2e lane (p2) au clavier → activeNav suit p2.
      pills[0].focus()
      await user.keyboard('{ArrowDown}')
      expect(pills[1]).toHaveFocus()

      // Replie le produit p2 (la lane active) : sa pastille disparaît → le roving
      // retombe sur la 1re pastille visible restante (e1), tabIndex=0 reste unique.
      await user.click(screen.getAllByTestId('timeline-resource-head')[1])
      await waitFor(() => {
        const visible = screen.getAllByTestId('timeline-event')
        expect(visible).toHaveLength(1)
        expect(visible[0]).toHaveAttribute('data-event-title', 'Péremption lait')
        expect(visible.filter((p) => p.getAttribute('tabindex') === '0')).toHaveLength(1)
      })

      // Nav clavier depuis la seule lane restante : ArrowDown ne cible PAS la lane
      // repliée (elle n'est plus focusable) → le focus reste sur e1.
      const only = screen.getAllByTestId('timeline-event')[0]
      only.focus()
      await user.keyboard('{ArrowDown}')
      expect(only).toHaveFocus()
    })
  })

  /**
   * #392 — GARDE DE DÉRIVE, pas une preuve du correctif.
   *
   * ⚠ Ce qu'un test jsdom ne peut PAS prouver ici : jsdom ne fait aucun
   * hit-testing et n'applique pas les feuilles du design system. Le
   * recouvrement de l'en-tête sticky et sa correction ne sont observables
   * qu'au navigateur — la preuve vit dans `e2e/timeline.spec.ts` (#392), et
   * tout test unitaire qui prétendrait la fournir serait un faux témoin (piège
   * déjà payé au S51 sur les tests de scroll).
   *
   * Ce que ce test VERROUILLE, en revanche : la duplication assumée du token
   * `--lane-header-w` côté JS. Le décalage de la piste est appliqué en CSS ;
   * `LANE_TRACK_OFFSET_PX` doit lui rester égal, sinon la largeur du rail, la
   * minimap et les bandes de virtualisation se désalignent silencieusement de
   * l'écart — sans qu'aucune assertion existante ne bronche.
   */
  describe('#392 — gouttière de piste', () => {
    it('LANE_TRACK_OFFSET_PX reste égal au token --lane-header-w du DS', () => {
      const spacing = readFileSync(resolve(__dirname, '../../styles/ds/tokens/spacing.css'), 'utf8')
      const match = spacing.match(/--lane-header-w:\s*(\d+(?:\.\d+)?)px/)
      expect(match, '--lane-header-w introuvable dans ds/tokens/spacing.css').not.toBeNull()
      expect(Number(match![1])).toBe(LANE_TRACK_OFFSET_PX)
    })

    /**
     * #429 — un repli `var(--lane-header-w, 160px)` recopiait une valeur du token
     * (fausse de 8 px, puis de 16 px après #674) : le token est défini sous `:root`,
     * le repli ne sert jamais et ne peut que diverger (PIT-S56-003). Aucun repli ne
     * doit réapparaître sur ce token, dans aucune feuille de la frise.
     */
    it('--lane-header-w ne porte aucun repli dupliquant sa valeur (#429)', () => {
      const css = readFileSync(
        resolve(__dirname, '../../styles/ds/components/timeline.css'),
        'utf8',
      )
      expect(css).toMatch(/\.mt-tlv__lane-label\{[^}]*width:var\(--lane-header-w\);/)
      expect(css).not.toMatch(/var\(--lane-header-w\s*,/)
    })
  })

  /**
   * #596 — ZÉBRURES au lieu de la grille verticale de jours. Verrouille (a) la
   * parité posée par le composant d'après `laneOrdinal` — rang STABLE dans la
   * catégorie, jamais la position DOM (faussée par la cale de virtualisation #69) —
   * et (b) la feuille du DS : aplat d'encre 2,6 %, cellule sticky relayée, plus
   * aucune grille en dégradé ni son recalage (`background-position-x`).
   */
  describe('#596 — zébrures de lanes', () => {
    it('une lane sur deux par catégorie porte `mt-tlv__lane--alt`', () => {
      const { container } = render(
        <TimelineView
          events={[]}
          resources={[
            { id: 'z1', title: 'Zèbre 1', category: 'Frais' },
            { id: 'z2', title: 'Zèbre 2', category: 'Frais' },
            { id: 'z3', title: 'Zèbre 3', category: 'Frais' },
            { id: 'z4', title: 'Zèbre 4', category: 'Boulangerie' },
            { id: 'z5', title: 'Zèbre 5', category: 'Boulangerie' },
          ]}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      const zebra = zebraByCategory(container, 'mt-tlv__lane--alt')
      expect(zebra).toEqual({
        Frais: [
          [1, false],
          [2, true],
          [3, false],
        ],
        // Remise à zéro par catégorie : la 1re lane sous l'en-tête est claire.
        Boulangerie: [
          [1, false],
          [2, true],
        ],
      })
      // Plus de trame de jours posée en ligne (`background-size:<dayWidth>px`).
      for (const row of screen.getAllByTestId('timeline-resource-row')) {
        expect(row.style.backgroundSize).toBe('')
      }
    })

    it('la feuille DS peint la zébrure en aplat et retire la grille de jours', () => {
      const css = readFileSync(
        resolve(__dirname, '../../styles/ds/components/timeline.css'),
        'utf8',
      )
      expect(css).toMatch(
        /\.mt-tlv__lane--alt,\n\.mt-tlm__lane--alt\{background-color:color-mix\(in srgb, var\(--color-ink\) 2\.6%, transparent\);\}/,
      )
      expect(css).toMatch(
        /\.mt-tlv__lane--alt > \.mt-tlv__lane-label\{background-color:color-mix\(in srgb, var\(--color-ink\) 2\.6%, var\(--color-surface\)\);\}/,
      )
      // Grille verticale RETIRÉE des trois familles de lanes, et son recalage avec.
      expect(css).not.toMatch(/linear-gradient\(90deg, var\(--color-rule\) 1px, transparent 1px\)/)
      expect(css).not.toMatch(/background-position-x:var\(--lane-header-w\)/)
      expect(css).not.toMatch(/--mt-grid-step/)
    })
  })

  /**
   * #592 — Sidebar de l'écran Timeline (layout `screen`) : filtres de catégorie
   * (`hiddenCats`), « tout plier / tout déplier » (`collapsed`), légende, pied
   * de raccourcis, panneau superposé < 1024 px.
   *
   * ⚠ Ce que jsdom ne prouve PAS : la disposition (grille, 248 px, panneau
   * superposé masqué en CSS) — aucune feuille n'est appliquée ici. Elle est
   * prouvée au navigateur par `e2e/sprint-85-timeline-sidebar.spec.ts`.
   */
  describe('#592 sidebar (layout screen)', () => {
    const mk = (id: string, resourceId: string, category: string, start: string) => ({
      id,
      title: `Event ${id}`,
      start,
      end: start,
      allDay: true,
      resourceId,
      color: '#3B62D4',
      extendedProps: { productId: resourceId, productName: resourceId, category, type: 'single' },
    })
    // 3 catégories × 1 produit ; Cat A porte 2 événements (compteur ≠ produits).
    const SB_EVENTS: FullCalendarEvent[] = [
      mk('a1', 'pa', 'Cat A', '2026-07-10'),
      mk('a2', 'pa', 'Cat A', '2026-07-11'),
      mk('b1', 'pb', 'Cat B', '2026-07-18'),
      mk('c1', 'pc', 'Cat C', '2026-07-26'),
    ]
    const SB_RESOURCES: Resource[] = [
      { id: 'pa', title: 'Prod A', category: 'Cat A', categoryColor: '#3E8BD6' },
      { id: 'pb', title: 'Prod B', category: 'Cat B', categoryColor: '#4FA459' },
      // Catégorie SANS couleur (DEC-S85-006) : contour neutre attendu.
      { id: 'pc', title: 'Prod C', category: 'Cat C', categoryColor: null },
    ]

    function setupScreen() {
      return render(
        <TimelineView
          events={SB_EVENTS}
          resources={SB_RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
          layout="screen"
        />,
      )
    }

    const filterFor = (category: string) =>
      screen
        .getAllByTestId('timeline-sidebar-filter')
        .find((b) => b.getAttribute('data-category') === category)!
    // #601 — l'en-tête porte désormais aussi le compteur : `textContent` n'est plus
    // le nom seul, on vise l'attribut dédié.
    const headFor = (category: string) =>
      screen
        .queryAllByTestId('timeline-group-head')
        .find((h) => h.getAttribute('data-category') === category)
    const laneTitles = () =>
      screen.queryAllByTestId('timeline-resource-title').map((el) => el.textContent)
    const pillFor = (id: string) =>
      screen
        .getAllByTestId('timeline-event')
        .find((p) => p.getAttribute('data-event-title') === `Event ${id}`)!

    it('layout par défaut (`embedded`) : AUCUNE sidebar, bulle `?` conservée', () => {
      render(
        <TimelineView
          events={SB_EVENTS}
          resources={SB_RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.queryByTestId('timeline-sidebar')).not.toBeInTheDocument()
      expect(screen.queryByTestId('timeline-sidebar-toggle')).not.toBeInTheDocument()
      expect(screen.getByTestId('timeline-help')).toBeInTheDocument()
      expect(screen.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'embedded')
    })

    it('layout `screen` : sidebar présente, bulle `?` retirée, raccourcis dans le pied', () => {
      setupScreen()
      const sidebar = screen.getByTestId('timeline-sidebar')
      expect(screen.queryByTestId('timeline-help')).not.toBeInTheDocument()
      // Le bouton « Filtres » pilote la sidebar (aria-controls → id réel).
      const toggle = screen.getByTestId('timeline-sidebar-toggle')
      expect(toggle).toHaveAttribute('aria-controls', sidebar.id)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      const keys = screen.getByTestId('timeline-sidebar-shortcuts')
      expect(keys).toHaveTextContent('dashboard.timeline.help.today')
      // #597 — `F` recadre ; le plein écran n'a plus de raccourci à annoncer.
      expect(keys).toHaveTextContent('dashboard.timeline.help.fit')
      expect(keys).not.toHaveTextContent('dashboard.timeline.help.fullscreen')
      // Une ligne de filtre par catégorie, dans l'ordre de la frise.
      expect(
        screen
          .getAllByTestId('timeline-sidebar-filter')
          .map((b) => b.getAttribute('data-category')),
      ).toEqual(['Cat A', 'Cat B', 'Cat C'])
    })

    it('le compteur d’un filtre = nombre d’ÉVÉNEMENTS de la catégorie', () => {
      setupScreen()
      expect(filterFor('Cat A')).toHaveTextContent('2')
      expect(filterFor('Cat B')).toHaveTextContent('1')
    })

    it('pastille : couleur de catégorie en aplat ; `null` → contour neutre sans style inline', () => {
      setupScreen()
      const swatchOf = (category: string) =>
        filterFor(category).querySelector('[data-testid="timeline-sidebar-swatch"]') as HTMLElement
      expect(swatchOf('Cat A')).toHaveAttribute('data-color', 'set')
      expect(swatchOf('Cat A').style.backgroundColor).toBe('rgb(62, 139, 214)')
      expect(swatchOf('Cat C')).toHaveAttribute('data-color', 'none')
      expect(swatchOf('Cat C').getAttribute('style')).toBeNull()
    })

    it('masquer une catégorie retire son EN-TÊTE, ses LANES et ses barres de minimap', async () => {
      const user = userEvent.setup()
      const { container } = setupScreen()
      const filledBars = () => container.querySelectorAll('.mt-minimap__bar--filled').length
      const barsBefore = filledBars()
      expect(filterFor('Cat A')).toHaveAttribute('aria-pressed', 'true')

      await user.click(filterFor('Cat A'))

      expect(filterFor('Cat A')).toHaveAttribute('aria-pressed', 'false')
      expect(headFor('Cat A')).toBeUndefined()
      expect(laneTitles()).not.toContain('Prod A')
      expect(laneTitles()).toEqual(['Prod B', 'Prod C'])
      // Les 2 événements de Cat A tombent dans des seaux distincts (dates voisines,
      // étendue de ~76 j sur 60 seaux) : la minimap perd des barres pleines.
      expect(filledBars()).toBeLessThan(barsBefore)
      // Le filtre reste listé (sinon impossible de réafficher) et garde son total.
      expect(filterFor('Cat A')).toHaveTextContent('2')

      await user.click(filterFor('Cat A'))
      expect(headFor('Cat A')).toBeDefined()
      expect(laneTitles()).toEqual(['Prod A', 'Prod B', 'Prod C'])
      expect(filledBars()).toBe(barsBefore)
    })

    it('masquer ≠ replier : réafficher rend la catégorie dans son état de repli', async () => {
      const user = userEvent.setup()
      setupScreen()
      // Repli de Cat A par son en-tête d'accordéon.
      await user.click(headFor('Cat A')!)
      expect(headFor('Cat A')).toHaveAttribute('aria-expanded', 'false')
      expect(laneTitles()).not.toContain('Prod A')

      // Masquer puis réafficher : l'en-tête revient REPLIÉ (état `collapsed` intact).
      await user.click(filterFor('Cat A'))
      expect(headFor('Cat A')).toBeUndefined()
      await user.click(filterFor('Cat A'))
      expect(headFor('Cat A')).toHaveAttribute('aria-expanded', 'false')
      expect(laneTitles()).not.toContain('Prod A')

      // Et réciproquement : replier n'a pas masqué (le filtre reste pressé).
      expect(filterFor('Cat A')).toHaveAttribute('aria-pressed', 'true')
    })

    it('« Tout plier » / « Tout déplier » agissent sur TOUTES les catégories', async () => {
      const user = userEvent.setup()
      setupScreen()
      await user.click(screen.getByTestId('timeline-sidebar-collapse-all'))
      for (const head of screen.getAllByTestId('timeline-group-head')) {
        expect(head).toHaveAttribute('aria-expanded', 'false')
      }
      expect(laneTitles()).toEqual([])

      await user.click(screen.getByTestId('timeline-sidebar-expand-all'))
      for (const head of screen.getAllByTestId('timeline-group-head')) {
        expect(head).toHaveAttribute('aria-expanded', 'true')
      }
      expect(laneTitles()).toEqual(['Prod A', 'Prod B', 'Prod C'])
      // Le pliage global n'a masqué aucune catégorie.
      for (const f of screen.getAllByTestId('timeline-sidebar-filter')) {
        expect(f).toHaveAttribute('aria-pressed', 'true')
      }
    })

    it('« Tout plier » vaut aussi pour une catégorie MASQUÉE (repliée à son retour)', async () => {
      const user = userEvent.setup()
      setupScreen()
      await user.click(filterFor('Cat B'))
      await user.click(screen.getByTestId('timeline-sidebar-collapse-all'))
      await user.click(filterFor('Cat B'))
      expect(headFor('Cat B')).toHaveAttribute('aria-expanded', 'false')
    })

    it('navigation clavier correcte APRÈS masquage d’une catégorie AU-DESSUS de la lane focalisée', async () => {
      const user = userEvent.setup()
      setupScreen()
      // Focus sur la lane C (dernière). #709 — a1 et a2 (ponctuels à 1 jour d'écart,
      // réservation 100 px > 12 px/j) sont EMPILÉS : la lane A a deux rangées, que ↓
      // parcourt avant de changer de lane : A(a1) ↓ A(a2) ↓ B ↓ C.
      pillFor('a1').focus()
      await user.keyboard('{ArrowDown}')
      expect(pillFor('a2')).toHaveFocus()
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(pillFor('c1')).toHaveFocus()

      // Masque Cat A (au-dessus) : `navLanes` rétrécit de 1.
      await user.click(filterFor('Cat A'))
      expect(screen.queryByText('Event a1')).not.toBeInTheDocument()
      await waitFor(() => {
        // L'arrêt de tabulation reste sur la même RESSOURCE (pas de glissement d'index).
        expect(pillFor('c1')).toHaveAttribute('tabindex', '0')
        expect(pillFor('b1')).toHaveAttribute('tabindex', '-1')
      })

      pillFor('c1').focus()
      await user.keyboard('{ArrowUp}')
      expect(pillFor('b1')).toHaveFocus()
      // Aucune lane fantôme au-dessus : ↑ depuis la 1re lane visible ne bouge pas.
      await user.keyboard('{ArrowUp}')
      expect(pillFor('b1')).toHaveFocus()
      await user.keyboard('{End}')
      expect(pillFor('c1')).toHaveFocus()
      await user.keyboard('{Home}')
      expect(pillFor('b1')).toHaveFocus()
    })

    it('bouton « Filtres » : ouvre le panneau (focus dedans), Échap le ferme et rend le focus', async () => {
      const user = userEvent.setup()
      setupScreen()
      const toggle = screen.getByTestId('timeline-sidebar-toggle')
      const sidebar = screen.getByTestId('timeline-sidebar')
      expect(sidebar).toHaveAttribute('data-open', 'false')

      await user.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(sidebar).toHaveAttribute('data-open', 'true')
      expect(screen.getByTestId('timeline-sidebar-expand-all')).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(sidebar).toHaveAttribute('data-open', 'false')
      expect(toggle).toHaveFocus()
    })

    it('panneau : un clic extérieur le ferme, un clic DEDANS le laisse ouvert', async () => {
      const user = userEvent.setup()
      setupScreen()
      const toggle = screen.getByTestId('timeline-sidebar-toggle')
      await user.click(toggle)
      await user.click(filterFor('Cat B'))
      expect(toggle).toHaveAttribute('aria-expanded', 'true')

      await user.click(screen.getByTestId('timeline-ruler'))
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('Échap sans panneau ouvert ferme toujours le drawer (priorité historique intacte)', async () => {
      const user = userEvent.setup()
      setupScreen()
      await user.click(pillFor('b1'))
      expect(await screen.findByTestId('timeline-drawer')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByTestId('timeline-drawer')).not.toBeInTheDocument())
    })
  })

  // ==================== #602 — boutons Aujourd'hui / Nouvel événement ====================
  // Câblage seulement. Libellés TRADUITS réels : `TimelineToolbarActions.test.tsx`
  // (PIT-S63-006). Visibilité par palier (`hidden md:inline-flex` ⇔ FAB `md:hidden`)
  // et drawer réel du shell : `e2e/sprint-85-timeline-toolbar.spec.ts` — jsdom
  // n'applique aucune feuille, ces classes n'y sont que des chaînes.
  describe('#602 barre d’outils (layout screen)', () => {
    function renderToolbar(
      opts: { layout?: 'embedded' | 'screen'; onOpenCreate?: (() => void) | null } = {},
    ) {
      const { layout = 'screen', onOpenCreate = vi.fn() } = opts
      const view = (
        <TimelineView
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
          layout={layout}
        />
      )
      return render(
        onOpenCreate ? (
          <CreateEventProvider onOpenCreate={onOpenCreate}>{view}</CreateEventProvider>
        ) : (
          view
        ),
      )
    }

    it('screen + shell : les deux boutons, dans l’ordre zoom → Aujourd’hui → … → Nouvel événement', () => {
      renderToolbar()
      const today = screen.getByTestId('timeline-today-button')
      const create = screen.getByTestId('timeline-new-event')
      expect(today).toHaveTextContent('common.buttons.today')
      expect(create).toHaveTextContent('shell.newEvent')
      // Ordre maquette §D : Aujourd'hui APRÈS le zoom ; Nouvel événement DERNIER.
      const toolbarButtons = Array.from(
        screen
          .getByTestId('timeline-zoom-in')
          .closest('.mt-tlv__toolbar')!
          .querySelectorAll('button'),
      )
      const ids = toolbarButtons.map((b) => b.getAttribute('data-testid'))
      expect(ids.indexOf('timeline-today-button')).toBe(ids.indexOf('timeline-zoom-in') + 1)
      expect(ids.at(-1)).toBe('timeline-new-event')
      // Le badge positionnel de la règle garde SON testid (ce n'est pas un bouton).
      expect(screen.getByTestId('timeline-today').tagName).toBe('SPAN')
    })

    it('« Aujourd’hui » a le même effet que la touche T', async () => {
      const user = userEvent.setup()
      renderToolbar()
      const scroll = screen.getByTestId('timeline-scroll')
      fireEvent.keyDown(window, { key: ']' })
      await waitFor(() => expect(scroll.scrollLeft).toBe(360))
      await user.click(screen.getByTestId('timeline-today-button'))
      // Même valeur que le test « raccourci T » (#228) : 35 jours × 12 px.
      await waitFor(() => expect(scroll.scrollLeft).toBe(420))
    })

    it('« Nouvel événement » appelle UNE fois l’ouverture du shell, et annonce un dialog', async () => {
      const user = userEvent.setup()
      const onOpenCreate = vi.fn()
      renderToolbar({ onOpenCreate })
      const create = screen.getByTestId('timeline-new-event')
      expect(create).toHaveAttribute('type', 'button')
      expect(create).toHaveAttribute('aria-haspopup', 'dialog')
      await user.click(create)
      expect(onOpenCreate).toHaveBeenCalledTimes(1)
      // Aucun drawer de création local : la surface est celle du shell.
      expect(screen.queryByTestId('shell-new-event-drawer')).not.toBeInTheDocument()
    })

    it('DEC-S85-003 : `hidden md:inline-flex` (jamais peint avec le FAB `md:hidden`) — chaîne, pas rendu', () => {
      renderToolbar()
      const classes = screen.getByTestId('timeline-new-event').className.split(/\s+/)
      expect(classes).toContain('hidden')
      expect(classes).toContain('md:inline-flex')
      // `tailwind-merge` doit avoir retiré le `inline-flex` NU du Button : présent,
      // il gagnerait sur `hidden` et peindrait le bouton sous 768 px.
      expect(classes).not.toContain('inline-flex')
      // Trio accent du CTA du shell (#578).
      expect(classes).toEqual(
        expect.arrayContaining(['bg-accent', 'hover:bg-accent-hover', 'text-accent-ink']),
      )
    })

    it('en plein écran, quitte le plein écran AVANT d’ouvrir (drawer du shell hors `rootRef`)', async () => {
      const user = userEvent.setup()
      const onOpenCreate = vi.fn()
      renderToolbar({ onOpenCreate })
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => screen.getByTestId('timeline-view'),
      })
      try {
        await user.click(screen.getByTestId('timeline-new-event'))
        expect(document.exitFullscreen).toHaveBeenCalledTimes(1)
        expect(onOpenCreate).toHaveBeenCalledTimes(1)
      } finally {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          get: () => null,
        })
      }
    })

    it('hors plein écran, n’appelle pas `exitFullscreen`', async () => {
      const user = userEvent.setup()
      renderToolbar()
      await user.click(screen.getByTestId('timeline-new-event'))
      expect(document.exitFullscreen).not.toHaveBeenCalled()
    })

    it('embedded (dashboard, fiche produit) : AUCUN des deux boutons, même sous le shell', () => {
      renderToolbar({ layout: 'embedded' })
      expect(screen.queryByTestId('timeline-today-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('timeline-new-event')).not.toBeInTheDocument()
    })

    it('screen HORS shell : « Aujourd’hui » seul, pas de « Nouvel événement » inerte', () => {
      renderToolbar({ onOpenCreate: null })
      expect(screen.getByTestId('timeline-today-button')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-new-event')).not.toBeInTheDocument()
    })
  })
})
