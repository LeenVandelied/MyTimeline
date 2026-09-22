import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import { TimelineResponsive } from './TimelineResponsive'
import { MOBILE_LANE_TRACK_OFFSET_PX } from './useTimelineMobileState'

/**
 * #63 — Tests vue mobile portrait (jsdom).
 * next-intl mocké → assertions locale-agnostiques sur les clés. Couvre :
 * rendu frise/lanes/règle, tap → bottom sheet, fermeture Escape/close/overlay,
 * bouton ⋯ → action sheet, long-press → action sheet, pinch-zoom (niveau change),
 * data-testid E2E préservés (#163). + non-régression du switch responsive
 * (TimelineResponsive rend le desktop par défaut sous jsdom matchMedia:false).
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const EVENTS: FullCalendarEvent[] = [
  {
    id: 'e1',
    title: 'Péremption lait longue durée à tronquer',
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

function renderPortrait(props: Partial<React.ComponentProps<typeof TimelineMobilePortrait>> = {}) {
  return render(
    <TimelineMobilePortrait
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
      {...props}
    />,
  )
}

describe('TimelineMobilePortrait', () => {
  it('rend la frise, la règle, la minimap et les events', () => {
    renderPortrait()
    expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-ruler')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-minimap')).toBeInTheDocument()
    const events = screen.getAllByTestId('timeline-event')
    expect(events).toHaveLength(2)
  })

  it('préserve data-testid + data-event-title sur les blocs (dépendance E2E #163)', () => {
    renderPortrait()
    const events = screen.getAllByTestId('timeline-event')
    expect(events[0]).toHaveAttribute('data-event-title', 'Péremption lait longue durée à tronquer')
    // Le titre complet reste dans le DOM (tronqué visuellement en CSS, lisible au tap).
    expect(events[0]).toHaveTextContent('Péremption lait longue durée à tronquer')
  })

  // #230 — le grisage d'un archivé doit exister sur les TROIS surfaces de frise, pas
  // seulement sur `EventPill` (desktop). On le prouve par un RENDU, pas par un grep
  // du nom de classe dans la source (PIT-S54-002).
  it('#230 — un event archivé est rendu GRISÉ (BR-EVE-011/013), pas masqué', () => {
    renderPortrait({
      events: [
        {
          ...EVENTS[0],
          extendedProps: { ...EVENTS[0].extendedProps, archived: true },
        },
        EVENTS[1],
      ],
    })
    const events = screen.getAllByTestId('timeline-event')
    // Toujours 2 blocs : l'archivage ne fait pas disparaître l'event de la frise.
    expect(events).toHaveLength(2)
    expect(events[0]).toHaveAttribute('data-archived', 'true')
    expect(events[0]).toHaveClass('mt-tlm__evt--archived')
    // Opacité cantonnée au décoratif : la barre (qui porte le titre) ne l'a pas.
    expect(events[0]).not.toHaveClass('mt-evt--archived')
    expect(events[1]).not.toHaveAttribute('data-archived')
  })

  it('#595 — ponctuel hebdomadaire non borné : « ↻ » + carrés fantômes coupés à l’étendue', () => {
    const { container } = renderPortrait({
      events: [
        EVENTS[0],
        {
          ...EVENTS[1],
          extendedProps: { ...EVENTS[1].extendedProps, isRecurring: true, recurrenceUnit: 'WEEK' },
        },
      ],
    })
    // Deux occurrences réelles seulement : les marques ne sont pas des `timeline-event`.
    const [, pin] = screen.getAllByTestId('timeline-event')
    expect(screen.getAllByTestId('timeline-event')).toHaveLength(2)
    expect(pin.querySelector('.mt-evt-pin__recur')).toHaveAttribute('aria-hidden', 'true')
    expect(pin.querySelector('.mt-evt-pin__label')).toHaveTextContent('↻ Livraison pain')
    // Étendue : 10 juin → 19 août. Hebdo depuis le 20 juil. : 27/07, 03/08, 10/08, 17/08.
    const ghosts = [...container.querySelectorAll('[data-recurrence-mark="ghost"]')]
    expect(ghosts.map((g) => g.getAttribute('data-occurrence-date'))).toEqual([
      '2026-07-27',
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
    ])
    expect(ghosts[0]).toHaveClass('mt-evt-pin--ghost', 'mt-tlm__ghost-pin')
    expect(ghosts[0]).toHaveAttribute('aria-hidden', 'true')
    // 27 juil. = +47 j × 12 px = 564 → carré de 8 px centré : 560.
    expect((ghosts[0] as HTMLElement).style.left).toBe('560px')
    expect(container.querySelectorAll('[data-recurrence-mark="connector"]')).toHaveLength(1)
    // La barre non récurrente n'a pas de glyphe.
    expect(screen.getAllByTestId('timeline-event')[0].querySelector('.mt-evt-recur')).toBeNull()
  })

  it('#594 — le ponctuel est un PIN centré sur sa date ; la durée reste une barre', () => {
    renderPortrait()
    const [bar, pin] = screen.getAllByTestId('timeline-event')
    expect(bar).toHaveAttribute('data-event-kind', 'duration')
    expect(bar.querySelector('.mt-evt-pin')).toBeNull()
    expect(bar.style.width).not.toBe('')

    expect(pin).toHaveAttribute('data-event-kind', 'single')
    expect(pin).toHaveClass('mt-tlm__evt--pin')
    // Ni largeur ni fond posés : le pin ne s'étire pas, le libellé n'est pas peint
    // sur la couleur de l'événement (encre de page, CSS).
    expect(pin.style.width).toBe('')
    expect(pin.style.background).toBe('')
    expect(pin.style.getPropertyValue('--mt-evt')).toBe('#4FA459')
    expect(pin.querySelector('.mt-evt-pin')).toHaveAttribute('aria-hidden', 'true')
    expect(pin.querySelector('.mt-evt-pin__label')).toHaveTextContent('Livraison pain')
    // Centré : rangeStart = 10 juil − 30 j = 10 juin ; 20 juil = +40 j × 12 px = 480 → 475.
    expect((pin.closest('.mt-tlm__evt-wrap') as HTMLElement).style.left).toBe('475px')
    // Le `⋯` voisin n'hérite pas de l'encre calculée sur la couleur de l'événement.
    const wrap = pin.closest('.mt-tlm__evt-wrap') as HTMLElement
    expect(
      (wrap.querySelector('[data-testid="timeline-event-more"]') as HTMLElement).style.color,
    ).toBe('')
  })

  it('le `⋯` d’une BARRE de durée n’a aucune encre inline (fond de lane, pas la barre)', () => {
    renderPortrait()
    const [bar] = screen.getAllByTestId('timeline-event')
    // La barre garde son encre calculée sur sa couleur…
    expect(bar.style.color).not.toBe('')
    // …mais pas le `⋯` voisin, posé sur la lane : encre de page via le DS.
    const more = (bar.closest('.mt-tlm__evt-wrap') as HTMLElement).querySelector(
      '[data-testid="timeline-event-more"]',
    ) as HTMLElement
    expect(more.style.color).toBe('')
    expect(more.getAttribute('style')).toBeNull()
  })

  it('affiche le nom du produit dans chaque lane', () => {
    renderPortrait()
    const titles = screen.getAllByTestId('timeline-resource-title').map((el) => el.textContent)
    expect(titles).toContain('Lait bio')
    expect(titles).toContain('Pain')
  })

  it('ouvre le bottom sheet au tap sur un bloc, puis ferme via le bouton close', async () => {
    const user = userEvent.setup()
    renderPortrait()
    expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    const sheet = await screen.findByTestId('timeline-sheet')
    expect(sheet).toHaveAttribute('role', 'dialog')
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(sheet).toHaveTextContent('Lait bio')
    await user.click(screen.getByTestId('timeline-sheet-close'))
    await waitFor(() => expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument())
  })

  it('ferme le bottom sheet via Escape', async () => {
    const user = userEvent.setup()
    renderPortrait()
    await user.click(screen.getAllByTestId('timeline-event')[0])
    await screen.findByTestId('timeline-sheet')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument())
  })

  it('le bouton ⋯ ouvre l’action sheet (modifier/supprimer)', async () => {
    const user = userEvent.setup()
    renderPortrait()
    await user.click(screen.getAllByTestId('timeline-event-more')[0])
    const sheet = await screen.findByTestId('timeline-actionsheet')
    expect(sheet).toHaveAttribute('role', 'dialog')
    expect(screen.getByTestId('timeline-actionsheet-edit')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-actionsheet-delete')).toBeInTheDocument()
    // Le tap sur ⋯ n'ouvre PAS le bottom sheet détail.
    expect(screen.queryByTestId('timeline-sheet')).not.toBeInTheDocument()
  })

  it('câble onEdit/onDelete de l’action sheet', async () => {
    const user = userEvent.setup()
    const onEditEvent = vi.fn()
    const onDeleteEvent = vi.fn()
    renderPortrait({ onEditEvent, onDeleteEvent })
    await user.click(screen.getAllByTestId('timeline-event-more')[0])
    await screen.findByTestId('timeline-actionsheet')
    await user.click(screen.getByTestId('timeline-actionsheet-edit'))
    expect(onEditEvent).toHaveBeenCalledOnce()
    expect(onEditEvent.mock.calls[0][0].id).toBe('e1')
  })

  it('le long-press ouvre le MÊME action sheet que ⋯', async () => {
    vi.useFakeTimers()
    try {
      renderPortrait()
      const evt = screen.getAllByTestId('timeline-event')[0]
      act(() => {
        fireEvent.pointerDown(evt, { clientX: 10, clientY: 10 })
      })
      // Avant le seuil : pas d'action sheet.
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.queryByTestId('timeline-actionsheet')).not.toBeInTheDocument()
      // Après le seuil (500ms) : l'action sheet s'ouvre.
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(screen.getByTestId('timeline-actionsheet')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('le pinch-zoom (2 pointeurs qui s’écartent) change le niveau de zoom', () => {
    renderPortrait()
    const scroll = screen.getByTestId('timeline-scroll')
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    // jsdom : `PointerEvent` absent + fireEvent ne conserve pas pointerId → on
    // dispatche des Events dont on force pointerId/clientX (lus par le handler).
    const dispatch = (type: string, pointerId: number, clientX: number) => {
      const ev = new Event(type, { bubbles: true })
      Object.assign(ev, { pointerId, clientX, clientY: 100 })
      scroll.dispatchEvent(ev)
    }
    act(() => {
      dispatch('pointerdown', 1, 100)
      dispatch('pointerdown', 2, 150)
      // Écartement 50 → 120 (> +22%) → ZOOM_IN.
      dispatch('pointermove', 2, 220)
    })
    expect(level.textContent).not.toBe(before)
  })

  it('les boutons +/- changent le niveau de zoom (alternative accessible au pinch)', async () => {
    const user = userEvent.setup()
    renderPortrait()
    const level = screen.getByTestId('timeline-zoom-level')
    const before = level.textContent
    await user.click(screen.getByTestId('timeline-zoom-in'))
    expect(level.textContent).not.toBe(before)
  })
})

describe('TimelineResponsive (switch)', () => {
  it('rend la vue desktop par défaut sous jsdom (matchMedia:false) — non-régression', () => {
    render(
      <TimelineResponsive
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )
    // matchMedia mock → matches:false → variante desktop.
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
    expect(screen.queryByTestId('timeline-mobile-portrait')).not.toBeInTheDocument()
  })

  it('bascule sur la vue mobile portrait quand la media query portrait matche', () => {
    const original = window.matchMedia
    // #64 : le switch distingue désormais portrait / paysage. On ne matche QUE
    // la query portrait (matcher ciblé) — un `matches:true` global rendrait la
    // variante paysage (priorité dans TimelineResponsive).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('portrait'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    try {
      render(
        <TimelineResponsive
          events={EVENTS}
          resources={RESOURCES}
          locale="fr-FR"
          today={new Date(2026, 6, 15)}
        />,
      )
      expect(screen.getByTestId('timeline-mobile-portrait')).toBeInTheDocument()
      expect(screen.queryByTestId('timeline-view')).not.toBeInTheDocument()
    } finally {
      window.matchMedia = original
    }
  })
})

/**
 * #706 — GOUTTIÈRE DE PISTE MOBILE.
 *
 * ⚠ CE QUE CE FICHIER NE PEUT PAS PROUVER. jsdom ne fait aucun layout : ni la
 * colonne `position:sticky`, ni le recouvrement d'un événement par cette
 * colonne, ni sa correction ne s'y observent. Un test qui prétendrait le faire
 * serait un faux témoin (piège déjà payé au S51 sur les tests de scroll). La
 * preuve visuelle vit dans `e2e/sprint-94-mobile-lane-gutter.spec.ts`.
 *
 * Ce que ces deux cas VERROUILLENT, en revanche : la duplication assumée du
 * token `--lane-header-w-m` côté JS (le décalage est appliqué en CSS, le JS doit
 * lui rester égal, sinon largeur du rail, minimap et bandes de virtualisation se
 * désalignent silencieusement de l'écart) — et le fait que la feuille du DS
 * applique bien ce décalage aux quatre familles d'éléments positionnés.
 */
describe('#706 — gouttière de piste mobile', () => {
  it('MOBILE_LANE_TRACK_OFFSET_PX reste égal au token --lane-header-w-m du DS', () => {
    const spacing = readFileSync(resolve(__dirname, '../../styles/ds/tokens/spacing.css'), 'utf8')
    const match = spacing.match(/--lane-header-w-m:\s*(\d+(?:\.\d+)?)px/)
    expect(match, '--lane-header-w-m introuvable dans ds/tokens/spacing.css').not.toBeNull()
    expect(Number(match![1])).toBe(MOBILE_LANE_TRACK_OFFSET_PX)
  })

  it("la feuille DS décale la piste mobile ET fixe la largeur de l'en-tête de lane", () => {
    const css = readFileSync(resolve(__dirname, '../../styles/ds/components/timeline.css'), 'utf8')
    // L'en-tête REMPLIT la gouttière (largeur fixe), sinon un nom court y laisse
    // un vide et la colonne cesse d'être continue.
    expect(css).toMatch(/\.mt-tlm__lane-label\{[^}]*width:var\(--lane-header-w-m\)/)
    expect(css).not.toMatch(/\.mt-tlm__lane-label\{[^}]*max-width:120px/)
    // Les familles d'éléments positionnés du rail subissent TOUTES le MÊME
    // décalage — c'est ce qui garde règle et piste alignées. `__ghost-pin` est
    // listée à part de `__ghost` : le sélecteur de cette dernière en est un
    // préfixe, donc `toContain` seul ne la couvrirait pas (review S94).
    for (const selector of [
      '.mt-tlm__ruler > .mt-tlm__tick',
      '.mt-tlm__rail > .mt-tlm__weekend',
      '.mt-tlm__rail > .mt-tlm__today',
      '.mt-tlm__lane > .mt-tlm__evt-wrap',
      '.mt-tlm__lane > .mt-tlm__ghost',
      '.mt-tlm__lane > .mt-tlm__ghost-pin',
      '.mt-tlm__lane > .mt-tlm__connector',
    ]) {
      expect(css, `${selector} doit porter la gouttière`).toContain(selector)
    }
    expect(css).toMatch(
      /\.mt-tlm__lane > \.mt-tlm__connector\{margin-left:var\(--lane-header-w-m\)/,
    )
    // Coin haut-gauche de la règle : masque la gouttière, sinon une graduation à
    // offset négatif flotte au-dessus de la colonne produit.
    expect(css).toMatch(/\.mt-tlm__ruler::before\{[^}]*width:var\(--lane-header-w-m\)/)
  })
})

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

describe('#596 — zébrures de lanes (portrait)', () => {
  it('une lane sur deux par catégorie porte `mt-tlm__lane--alt`', () => {
    const { container } = render(
      <TimelineMobilePortrait
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
    const zebra = zebraByCategory(container, 'mt-tlm__lane--alt')
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
  })
})
