import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { LANE_TRACK_OFFSET_PX, TimelineView } from './TimelineView'

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
      expect(pills.filter((p) => p.getAttribute('tabindex') === '-1')).toHaveLength(pills.length - 1)
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
      await waitFor(() =>
        expect(live.textContent).toContain('dashboard.timeline.live.selected'),
      )
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
          extendedProps: { productId: 'pa', productName: 'Prod A', category: 'Cat A', type: 'single' },
        },
        {
          id: 'eb',
          title: 'Event B',
          start: '2026-07-12',
          end: '2026-07-12',
          allDay: true,
          resourceId: 'pb',
          color: '#3B62D4',
          extendedProps: { productId: 'pb', productName: 'Prod B', category: 'Cat B', type: 'single' },
        },
        {
          id: 'ec',
          title: 'Event C',
          start: '2026-07-14',
          end: '2026-07-14',
          allDay: true,
          resourceId: 'pc',
          color: '#3B62D4',
          extendedProps: { productId: 'pc', productName: 'Prod C', category: 'Cat C', type: 'single' },
        },
      ]
      const resources: Resource[] = [
        { id: 'pa', title: 'Prod A', category: 'Cat A' },
        { id: 'pb', title: 'Prod B', category: 'Cat B' },
        { id: 'pc', title: 'Prod C', category: 'Cat C' },
      ]
      const user = userEvent.setup()
      render(
        <TimelineView events={events} resources={resources} locale="fr-FR" today={new Date(2026, 6, 15)} />,
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
              extendedProps: {
                productId: 'p3',
                productName: 'Prod3',
                category: 'Cat3',
                type: 'single',
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
      const spacing = readFileSync(
        resolve(__dirname, '../../styles/ds/tokens/spacing.css'),
        'utf8',
      )
      const match = spacing.match(/--lane-header-w:\s*(\d+(?:\.\d+)?)px/)
      expect(match, '--lane-header-w introuvable dans ds/tokens/spacing.css').not.toBeNull()
      expect(Number(match![1])).toBe(LANE_TRACK_OFFSET_PX)
    })
  })
})
