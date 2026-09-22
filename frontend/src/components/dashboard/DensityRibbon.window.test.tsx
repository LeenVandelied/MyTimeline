import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { DensityRibbon, type DensityRibbonProps } from './DensityRibbon'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'

/**
 * #623 — Ruban des 30 PROCHAINS jours : règle graduée + viewport déplaçable
 * (DEC-S108-003, maquette `Dashboard.dc.html` § Hero). VRAIS messages des 4 locales +
 * collecteur `onError` (PIT-S63-006) : un libellé manquant ou un placeholder non
 * fourni rougit ici, pas seulement en prod.
 *
 * jsdom ne fait aucun layout : la largeur de la piste est simulée par un espion sur
 * `getBoundingClientRect` pour le glisser ; la géométrie réelle (hauteur de carte,
 * glisser à la souris) est prouvée par `e2e/sprint-108-density-ribbon.spec.ts`.
 */
/**
 * jsdom 25 n'expose pas `PointerEvent` : `fireEvent.pointerMove` retombe sur un
 * `Event` nu, sans `clientX` ni `pointerType`. Polyfill LOCAL à ce fichier (sur
 * `MouseEvent`, qui porte `clientX`/`button`), restauré après la suite.
 */
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
    this.pointerType = init.pointerType ?? ''
  }
}
const hadPointerEvent = 'PointerEvent' in window
beforeAll(() => {
  if (!hadPointerEvent) vi.stubGlobal('PointerEvent', TestPointerEvent)
})
afterAll(() => {
  vi.unstubAllGlobals()
})

const NOW = new Date(2026, 8, 22, 9, 0, 0) // mar. 22 sept. 2026, 9h
const MESSAGES = { fr: frDashboard, en: enDashboard, es: esDashboard, de: deDashboard } as const
type Locale = keyof typeof MESSAGES

const evt = (id: string, start: string): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end: start,
  allDay: true,
  resourceId: 'p1',
  color: '#3E8BD6',
  extendedProps: { productId: 'p1', productName: 'Produit A', category: 'Cat', type: 'single' },
})

const day = (n: number) => new Date(2026, 8, 22 + n)
const short = (locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
const range = (locale: string, a: number, b: number) => short(locale).formatRange(day(a), day(b))

function renderRibbon(props: Partial<DensityRibbonProps> = {}, locale: Locale = 'fr') {
  const errors: string[] = []
  const utils = render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={{ dashboard: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      <DensityRibbon events={[]} now={NOW} locale={locale} {...props} />
    </NextIntlClientProvider>,
  )
  return { ...utils, errors }
}

function stubTrackWidth(width: number) {
  const track = screen.getByTestId('dashboard-density-track')
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height: 74,
    right: width,
    bottom: 74,
    toJSON: () => ({}),
  })
}

describe('#623 — fenêtre FUTURE : aujourd’hui = bord gauche', () => {
  it('30 barres, la 1re est aujourd’hui ; un événement d’hier n’est plus compté', () => {
    const { container, errors } = renderRibbon({
      events: [evt('hier', '2026-09-21'), evt('j3', '2026-09-25'), evt('j29', '2026-10-21')],
    })
    expect(errors).toEqual([])
    const bars = container.querySelectorAll('[data-testid="dashboard-density-track"] [title]')
    expect(bars).toHaveLength(30)
    expect(bars[0]).toHaveAttribute('data-testid', 'dashboard-density-today')
    expect(bars[0].getAttribute('title')).toBe(`${short('fr').format(day(0))} · 0`)
    expect(bars[3].getAttribute('title')).toBe(`${short('fr').format(day(3))} · 1`)
    expect(bars[29].getAttribute('title')).toBe(`${short('fr').format(day(29))} · 1`)
    // Hier (J−1) sort de la fenêtre : total compté = 2.
    const total = Array.from(bars).reduce(
      (n, b) => n + Number((b.getAttribute('title') ?? '').split(' · ')[1]),
      0,
    )
    expect(total).toBe(2)
  })

  it('le trait TODAY est au bord gauche de la 1re barre (maquette `left:0; width:2px`)', () => {
    renderRibbon()
    const line = screen.getByTestId('dashboard-density-today').querySelector('.bg-accent')
    expect(line?.className).toContain('left-0')
    expect(line?.className).toContain('w-0.5')
    expect(line?.className).not.toContain('left-1/2')
  })

  it('sur-titre et libellé accessible parlent des PROCHAINS jours (fr)', () => {
    renderRibbon()
    expect(screen.getByTestId('dashboard-density-eyebrow')).toHaveTextContent('30 prochains jours')
    expect(screen.getByTestId('dashboard-density-ribbon')).toHaveAttribute(
      'aria-label',
      'Densité des événements sur les 30 prochains jours',
    )
  })
})

describe('#623 — règle graduée', () => {
  it('7 libellés : « Auj. » puis date courte Intl à J+5 … J+30', () => {
    renderRibbon()
    const ruler = screen.getByTestId('dashboard-density-ruler')
    const ticks = within(ruler).getAllByTestId('dashboard-density-tick')
    expect(ticks.map((t) => t.textContent)).toEqual([
      'Auj.',
      ...[5, 10, 15, 20, 25, 30].map((k) => short('fr').format(day(k))),
    ])
  })

  it('positions d/30 et ancrage gauche / centré / droite', () => {
    renderRibbon()
    const ticks = screen.getAllByTestId('dashboard-density-tick')
    expect(ticks.map((t) => t.style.left)).toEqual([
      '0%',
      `${(5 / 30) * 100}%`,
      `${(10 / 30) * 100}%`,
      '50%',
      `${(20 / 30) * 100}%`,
      `${(25 / 30) * 100}%`,
      '100%',
    ])
    expect(ticks[0].className).not.toMatch(/translate-x/)
    expect(ticks[3].className).toContain('-translate-x-1/2')
    expect(ticks[6].className).toContain('-translate-x-full')
  })

  it('style DS : `.mt-eyebrow` (mono 10 px `ink-muted`, capitales), aucune utilitaire de taille', () => {
    renderRibbon()
    for (const tick of screen.getAllByTestId('dashboard-density-tick')) {
      expect(tick.className).toContain('mt-eyebrow')
      expect(tick.className).not.toMatch(/\btext-(2xs|xs|sm|\[)/)
    }
    // Information visuelle : la plage est exposée par l'en-tête et le slider.
    expect(screen.getByTestId('dashboard-density-ruler')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(['en', 'es', 'de'] as const)('libellé du jour traduit, sans IntlError · %s', (locale) => {
    const { errors } = renderRibbon({}, locale)
    expect(errors).toEqual([])
    const expected = { en: 'Today', es: 'Hoy', de: 'Heute' }[locale]
    expect(screen.getAllByTestId('dashboard-density-tick')[0]).toHaveTextContent(expected)
    expect(screen.getAllByTestId('dashboard-density-tick')[1]).toHaveTextContent(
      short(locale).format(day(5)),
    )
  })
})

describe('#623 — viewport : slider accessible', () => {
  it('état initial : J0 → J+9, libellé d’en-tête « Fenêtre · … »', () => {
    const { errors } = renderRibbon()
    expect(errors).toEqual([])
    const vp = screen.getByRole('slider')
    expect(vp).toHaveAttribute('tabindex', '0')
    expect(vp).toHaveAttribute('aria-label', 'Fenêtre d’aperçu de 9 jours')
    expect(vp).toHaveAttribute('aria-valuemin', '0')
    expect(vp).toHaveAttribute('aria-valuemax', '21')
    expect(vp).toHaveAttribute('aria-valuenow', '0')
    expect(vp).toHaveAttribute('aria-valuetext', range('fr', 0, 9))
    expect(screen.getByTestId('dashboard-density-range').textContent).toBe(
      `Fenêtre · ${range('fr', 0, 9)}`,
    )
    expect(vp.style.left).toBe('0%')
    expect(vp.style.width).toBe('30%')
  })

  it('clavier : → +1, PageUp +7, End = 21, ← à 21 = 20, Home = 0, ← à 0 reste 0', () => {
    renderRibbon()
    const vp = screen.getByRole('slider')
    const label = screen.getByTestId('dashboard-density-range')
    fireEvent.keyDown(vp, { key: 'ArrowRight' })
    expect(vp).toHaveAttribute('aria-valuenow', '1')
    expect(label.textContent).toBe(`Fenêtre · ${range('fr', 1, 10)}`)
    fireEvent.keyDown(vp, { key: 'PageUp' })
    expect(vp).toHaveAttribute('aria-valuenow', '8')
    fireEvent.keyDown(vp, { key: 'End' })
    expect(vp).toHaveAttribute('aria-valuenow', '21')
    expect(vp).toHaveAttribute('aria-valuetext', range('fr', 21, 30))
    expect(vp.style.left).toBe('70%')
    fireEvent.keyDown(vp, { key: 'ArrowRight' })
    expect(vp).toHaveAttribute('aria-valuenow', '21')
    fireEvent.keyDown(vp, { key: 'ArrowLeft' })
    expect(vp).toHaveAttribute('aria-valuenow', '20')
    fireEvent.keyDown(vp, { key: 'Home' })
    expect(vp).toHaveAttribute('aria-valuenow', '0')
    fireEvent.keyDown(vp, { key: 'ArrowLeft' })
    expect(vp).toHaveAttribute('aria-valuenow', '0')
    expect(label.textContent).toBe(`Fenêtre · ${range('fr', 0, 9)}`)
  })

  it('une touche non gérée n’est pas consommée (Tab reste libre)', () => {
    renderRibbon()
    const vp = screen.getByRole('slider')
    const notPrevented = fireEvent.keyDown(vp, { key: 'Tab' })
    expect(notPrevented).toBe(true)
    expect(fireEvent.keyDown(vp, { key: 'ArrowRight' })).toBe(false)
  })

  it('glisser : 20 px = 1 jour sur 600 px, continu pendant, calé au jour au lâcher, borné', () => {
    renderRibbon()
    stubTrackWidth(600)
    const vp = screen.getByRole('slider')
    const label = screen.getByTestId('dashboard-density-range')

    fireEvent.pointerDown(vp, { pointerId: 1, clientX: 100, button: 0, pointerType: 'mouse' })
    expect(vp).toHaveAttribute('data-dragging', 'true')
    expect(vp.className).toContain('cursor-grabbing')

    fireEvent.pointerMove(vp, { pointerId: 1, clientX: 130, pointerType: 'mouse' })
    // 1,5 jour : position continue, libellé arrondi (J+2 → J+11).
    expect(parseFloat(vp.style.left)).toBeCloseTo(5, 5)
    expect(vp).toHaveAttribute('aria-valuenow', '2')
    expect(label.textContent).toBe(`Fenêtre · ${range('fr', 2, 11)}`)

    fireEvent.pointerMove(vp, { pointerId: 1, clientX: 100_000, pointerType: 'mouse' })
    expect(vp).toHaveAttribute('aria-valuenow', '21')
    expect(parseFloat(vp.style.left)).toBeCloseTo(70, 5)

    // 3,25 jours : continu avant le lâcher, calé sur J+3 après.
    fireEvent.pointerMove(vp, { pointerId: 1, clientX: 165, pointerType: 'mouse' })
    expect(parseFloat(vp.style.left)).toBeCloseTo((3.25 / 30) * 100, 5)
    fireEvent.pointerUp(vp, { pointerId: 1, clientX: 165, pointerType: 'mouse' })
    expect(vp).not.toHaveAttribute('data-dragging')
    expect(vp.className).toContain('cursor-grab')
    expect(vp).toHaveAttribute('aria-valuenow', '3')
    expect(parseFloat(vp.style.left)).toBeCloseTo(10, 5)

    // Après le lâcher, un mouvement ne déplace plus rien.
    fireEvent.pointerMove(vp, { pointerId: 1, clientX: 400, pointerType: 'mouse' })
    expect(vp).toHaveAttribute('aria-valuenow', '3')

    // Le glisser suivant repart de la position courante (J+3), pas de 0.
    fireEvent.pointerDown(vp, { pointerId: 2, clientX: 300, button: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(vp, { pointerId: 2, clientX: 260, pointerType: 'mouse' })
    expect(vp).toHaveAttribute('aria-valuenow', '1')
    fireEvent.pointerCancel(vp, { pointerId: 2, pointerType: 'mouse' })
    expect(vp).not.toHaveAttribute('data-dragging')
  })

  it('le toucher glisse aussi (pointerType touch), le clic droit ne saisit rien', () => {
    renderRibbon()
    stubTrackWidth(600)
    const vp = screen.getByRole('slider')
    fireEvent.pointerDown(vp, { pointerId: 1, clientX: 50, button: 2, pointerType: 'mouse' })
    fireEvent.pointerMove(vp, { pointerId: 1, clientX: 150, pointerType: 'mouse' })
    expect(vp).toHaveAttribute('aria-valuenow', '0')

    fireEvent.pointerDown(vp, { pointerId: 3, clientX: 50, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(vp, { pointerId: 3, clientX: 150, pointerType: 'touch' })
    expect(vp).toHaveAttribute('aria-valuenow', '5')
  })

  it('`touch-action:none` sur le viewport SEUL, pas sur la piste ni la carte', () => {
    renderRibbon()
    expect(screen.getByRole('slider').className).toContain('touch-none')
    expect(screen.getByTestId('dashboard-density-track').className).not.toContain('touch-none')
    expect(screen.getByTestId('dashboard-density-ribbon').className).not.toContain('touch-none')
  })

  it('le slider n’est pas enfoui dans le `role="img"` des barres (il y serait présentationnel)', () => {
    renderRibbon()
    const img = screen.getByRole('img')
    expect(img).not.toContainElement(screen.getByRole('slider'))
  })

  it('style maquette : bord 1,5 px accent, fond accent, déborde de 4 px', () => {
    renderRibbon()
    const cls = screen.getByRole('slider').className
    for (const c of ['border-accent', 'border-[1.5px]', 'bg-accent/9', '-top-1', '-bottom-1']) {
      expect(cls).toContain(c)
    }
    // Focus : contour DS global — aucune utilitaire ne doit l'éteindre.
    expect(cls).not.toMatch(/outline-(none|hidden)/)
  })
})

describe('#623 — mode scrollable (mobile) : défilement natif, pas de viewport', () => {
  it('aucun slider, libellé = fenêtre complète J0 → J+30', () => {
    const { errors } = renderRibbon({ scrollable: true })
    expect(errors).toEqual([])
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-density-range').textContent).toBe(
      `Fenêtre · ${range('fr', 0, 30)}`,
    )
  })

  it('la règle est DANS le rail scrollable : elle défile avec les barres', () => {
    renderRibbon({ scrollable: true })
    const rail = screen.getByTestId('dashboard-density-ribbon-scroll')
    expect(rail).toContainElement(screen.getByTestId('dashboard-density-ruler'))
    expect(rail).toContainElement(screen.getByTestId('dashboard-density-today'))
    expect(rail.className).toContain('overflow-x-auto')
    expect(rail.className).not.toContain('touch-none')
  })

  it('largeur du contenu = 30 barres de 12 px + 29 interstices de 1 px', () => {
    renderRibbon({ scrollable: true })
    const content = screen.getByTestId('dashboard-density-ruler').parentElement
    expect(content?.style.width).toBe(`${30 * 12 + 29}px`)
  })
})

describe('#623 — budget vertical inchangé (la carte ne grandit pas)', () => {
  it.each([false, true])('règle + barres logées dans l’ancien `h-24` · scrollable=%s', (s) => {
    renderRibbon({ scrollable: s })
    const box = s
      ? screen.getByTestId('dashboard-density-ribbon-scroll')
      : screen.getByTestId('dashboard-density-plot')
    expect(box.className).toMatch(/\bh-24\b/)
    // Plus aucune autre hauteur fixe de barres qui s'ajouterait au-dessous.
    const ribbon = screen.getByTestId('dashboard-density-ribbon')
    expect(ribbon.querySelectorAll('.h-24')).toHaveLength(1)
    expect(screen.getByTestId('dashboard-density-ruler').className).toContain('h-4.5')
  })
})

describe('#623 — compte vide : aucune régression', () => {
  it.each(['fr', 'en', 'es', 'de'] as const)(
    '30 filets neutres, règle, slider et libellé rendus sans IntlError · %s',
    (locale) => {
      const { container, errors } = renderRibbon({ events: [] }, locale)
      expect(errors).toEqual([])
      const bars = container.querySelectorAll('[data-testid="dashboard-density-track"] [title]')
      expect(bars).toHaveLength(30)
      expect(screen.getAllByTestId('dashboard-density-tick')).toHaveLength(7)
      expect(screen.getByRole('slider')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-density-range').textContent).toContain(
        range(locale, 0, 9),
      )
    },
  )
})
