import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'
import frCommon from '../../../public/locales/fr/common.json'
import enCommon from '../../../public/locales/en/common.json'
import esCommon from '../../../public/locales/es/common.json'
import deCommon from '../../../public/locales/de/common.json'
import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'
import { TimelineView } from './TimelineView'
import { TimelineMobilePortrait } from './TimelineMobilePortrait'
import { TimelineMobileLandscape } from './TimelineMobileLandscape'
import { DEFAULT_METRICS, buildVerticalModel } from './virtualization'

/**
 * #601 — En-tête de catégorie de la frise : pastille, compteur de PRODUITS
 * (DEC-S85-001), résumé compact à l'état plié (maquette §B/§C).
 *
 * Rendu avec les VRAIS messages des 4 locales (PIT-S63-006) : un mock
 * `${ns}.${key}` rendrait une clé ou un placeholder ICU faux indiscernables d'un
 * juste. `onError` collecte toute `IntlError` ; la liste doit rester vide.
 *
 * Ce que jsdom NE voit PAS (couvert par `e2e/sprint-85-timeline-group-head.spec.ts`) :
 * le glissement de la cellule sticky à `scrollLeft > 0`, l'alignement PIXEL des
 * traits sur les pastilles, la hauteur rendue (40 px) — jsdom ne fait pas de mise
 * en page. Ici : structure, contenu, nom accessible, fenêtrage non borné (jsdom →
 * `UNBOUNDED_BAND` → tous les traits) et coordonnées posées en style.
 */

const MESSAGES = {
  fr: { dashboard: frDashboard, common: frCommon },
  en: { dashboard: enDashboard, common: enCommon },
  es: { dashboard: esDashboard, common: esCommon },
  de: { dashboard: deDashboard, common: deCommon },
}
type Locale = keyof typeof MESSAGES

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
})

const mk = (
  id: string,
  resourceId: string,
  category: string,
  start: string,
  end: string,
  color?: string,
): FullCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  end,
  allDay: true,
  resourceId,
  color,
  extendedProps: { productId: resourceId, productName: resourceId, category, type: 'duration' },
})

// Cat A : 2 PRODUITS, 3 ÉVÉNEMENTS (compteur ≠ nombre d'événements).
// Cat B : 1 produit (singulier). Cat C : sans couleur (DEC-S85-006).
const EVENTS: FullCalendarEvent[] = [
  mk('a1', 'pa1', 'Cat A', '2026-07-10', '2026-07-14', '#3B62D4'),
  mk('a2', 'pa1', 'Cat A', '2026-07-20', '2026-07-20', '#E3A82B'),
  // Sans couleur d'événement → repli `accent`, comme la pastille.
  mk('a3', 'pa2', 'Cat A', '2026-07-12', '2026-07-13'),
  mk('b1', 'pb', 'Cat B', '2026-07-18', '2026-07-19', '#4FA459'),
  mk('c1', 'pc', 'Cat C', '2026-07-26', '2026-07-26', '#B056A8'),
]
const RESOURCES: Resource[] = [
  { id: 'pa1', title: 'Prod A1', category: 'Cat A', categoryColor: '#3E8BD6' },
  { id: 'pa2', title: 'Prod A2', category: 'Cat A', categoryColor: '#3E8BD6' },
  { id: 'pb', title: 'Prod B', category: 'Cat B', categoryColor: '#4FA459' },
  { id: 'pc', title: 'Prod C', category: 'Cat C', categoryColor: null },
]

function renderWithIntl(ui: ReactElement, locale: Locale = 'fr') {
  const errors: string[] = []
  const utils = render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={MESSAGES[locale]}
      onError={(error) => errors.push(error.message)}
    >
      {ui}
    </NextIntlClientProvider>,
  )
  return { ...utils, errors }
}

function renderView(locale: Locale = 'fr', layout: 'embedded' | 'screen' = 'embedded') {
  return renderWithIntl(
    <TimelineView
      events={EVENTS}
      resources={RESOURCES}
      locale="fr-FR"
      today={new Date(2026, 6, 15)}
      layout={layout}
    />,
    locale,
  )
}

const headFor = (category: string) =>
  screen
    .getAllByTestId('timeline-group-head')
    .find((h) => h.getAttribute('data-category') === category)!

describe('#601 — en-tête de catégorie (frise desktop)', () => {
  it('chaque en-tête porte chevron, pastille, libellé et compteur, dans la cellule sticky', () => {
    const { errors } = renderView()
    const heads = screen.getAllByTestId('timeline-group-head')
    expect(heads.map((h) => h.getAttribute('data-category'))).toEqual(['Cat A', 'Cat B', 'Cat C'])
    for (const head of heads) {
      const cell = within(head).getByTestId('timeline-group-cell')
      expect(within(cell).getByTestId('timeline-group-swatch')).toBeInTheDocument()
      expect(within(cell).getByTestId('timeline-group-count')).toBeInTheDocument()
      expect(cell.querySelector('svg.mt-tlv__chev')).not.toBeNull()
    }
    expect(errors).toEqual([])
  })

  it('pastille = couleur de la catégorie ; SANS couleur → aucun style inline (contour neutre CSS)', () => {
    renderView()
    const colored = within(headFor('Cat A')).getByTestId('timeline-group-swatch')
    expect(colored).toHaveAttribute('data-color', 'set')
    expect(colored).toHaveAttribute('aria-hidden', 'true')
    expect(colored.style.backgroundColor).toBe('rgb(62, 139, 214)')
    expect(colored.style.borderColor).toBe('rgb(62, 139, 214)')

    const neutral = within(headFor('Cat C')).getByTestId('timeline-group-swatch')
    expect(neutral).toHaveAttribute('data-color', 'none')
    expect(neutral.getAttribute('style')).toBeNull()
  })

  it('compteur = nombre de PRODUITS de la catégorie, pas d’événements (DEC-S85-001)', () => {
    renderView()
    // Cat A : 2 produits, 3 événements.
    expect(within(headFor('Cat A')).getByTestId('timeline-group-count')).toHaveTextContent(/^2$/)
    expect(within(headFor('Cat B')).getByTestId('timeline-group-count')).toHaveTextContent(/^1$/)
    // Le chiffre visible est décoratif : l'information passe par le nom.
    expect(within(headFor('Cat A')).getByTestId('timeline-group-count')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it.each<[Locale, string, string]>([
    ['fr', 'Cat A, 2 produits', 'Cat B, 1 produit'],
    ['en', 'Cat A, 2 products', 'Cat B, 1 product'],
    ['es', 'Cat A, 2 productos', 'Cat B, 1 producto'],
    ['de', 'Cat A, 2 Produkte', 'Cat B, 1 Produkt'],
  ])('%s : nom accessible « catégorie, N produits » (pluriel ICU)', (locale, plural, singular) => {
    const { errors } = renderView(locale)
    expect(screen.getByRole('button', { name: plural })).toBe(headFor('Cat A'))
    expect(screen.getByRole('button', { name: singular })).toBe(headFor('Cat B'))
    expect(errors).toEqual([])
  })

  it('la tête reste un <button> natif `aria-expanded`, sans élément interactif dedans', async () => {
    const user = userEvent.setup()
    renderView()
    const head = headFor('Cat A')
    expect(head.tagName).toBe('BUTTON')
    expect(head).toHaveAttribute('type', 'button')
    expect(head).toHaveAttribute('aria-expanded', 'true')
    const interactive = 'button, a, input, select, textarea, [tabindex]'
    expect(head.querySelectorAll(interactive)).toHaveLength(0)

    await user.click(head)
    expect(headFor('Cat A')).toHaveAttribute('aria-expanded', 'false')
    expect(headFor('Cat A').querySelectorAll(interactive)).toHaveLength(0)
  })

  it('déplié : aucun résumé ; replié : un trait par événement de la catégorie, tous produits', async () => {
    const user = userEvent.setup()
    renderView()
    expect(screen.queryByTestId('timeline-group-summary')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('timeline-group-summary-bar')).toHaveLength(0)

    await user.click(headFor('Cat A'))
    const summary = within(headFor('Cat A')).getByTestId('timeline-group-summary')
    expect(summary).toHaveAttribute('aria-hidden', 'true')
    const bars = within(summary).getAllByTestId('timeline-group-summary-bar')
    // 3 événements sur 2 produits → 3 traits (le compteur, lui, dit 2).
    expect(bars.map((b) => b.getAttribute('data-event-id')).sort()).toEqual(['a1', 'a2', 'a3'])
    // Les autres catégories, dépliées, n'ont pas de résumé.
    expect(within(headFor('Cat B')).queryByTestId('timeline-group-summary')).toBeNull()

    // Redéplier retire le résumé et remonte les lanes.
    await user.click(headFor('Cat A'))
    expect(screen.queryByTestId('timeline-group-summary')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('timeline-resource-title').map((el) => el.textContent)).toEqual([
      'Prod A1',
      'Prod A2',
      'Prod B',
      'Prod C',
    ])
  })

  it('le résumé reprend EXACTEMENT les coordonnées et la couleur des pastilles', async () => {
    const user = userEvent.setup()
    renderView()
    const pills = new Map(
      screen
        .getAllByTestId('timeline-event')
        .map((p) => [p.getAttribute('data-event-title'), p] as const),
    )
    const before = ['a1', 'a2', 'a3'].map((id) => {
      const pill = pills.get(`Event ${id}`)!
      return { id, left: pill.style.left, width: pill.style.width }
    })

    await user.click(headFor('Cat A'))
    const bars = new Map(
      screen
        .getAllByTestId('timeline-group-summary-bar')
        .map((b) => [b.getAttribute('data-event-id'), b] as const),
    )
    for (const { id, left, width } of before) {
      expect(bars.get(id)!.style.left, `left du trait ${id}`).toBe(left)
      expect(bars.get(id)!.style.width, `width du trait ${id}`).toBe(width)
    }
    expect(bars.get('a1')!.style.backgroundColor).toBe('rgb(59, 98, 212)')
    // Sans couleur d'événement → même repli que `EventPill`.
    expect(bars.get('a3')!.style.backgroundColor).toBe('var(--color-accent)')
  })

  it('le résumé suit le zoom : largeurs/positions re-projetées à la nouvelle échelle', async () => {
    const user = userEvent.setup()
    renderView()
    await user.click(headFor('Cat A'))
    const barOf = (id: string) =>
      screen
        .getAllByTestId('timeline-group-summary-bar')
        .find((b) => b.getAttribute('data-event-id') === id)!
    const leftBefore = parseFloat(barOf('a1').style.left)
    const widthBefore = parseFloat(barOf('a1').style.width)

    await user.click(screen.getByTestId('timeline-zoom-in'))
    const leftAfter = parseFloat(barOf('a1').style.left)
    const widthAfter = parseFloat(barOf('a1').style.width)
    expect(widthAfter).toBeGreaterThan(widthBefore)
    // Même rapport d'échelle pour la position et la largeur (a1 dure 4 jours,
    // aucun plancher de largeur en jeu).
    expect(leftAfter / leftBefore).toBeCloseTo(widthAfter / widthBefore, 5)
  })

  it('même structure pliée et dépliée : la hauteur mesurée ne peut pas sauter (#69)', async () => {
    const user = userEvent.setup()
    renderView()
    const head = headFor('Cat B')
    const shape = (el: HTMLElement) => ({
      tag: el.tagName,
      className: el.className,
      testid: el.getAttribute('data-testid'),
      cell: el.querySelector('.mt-tlv__group-cell')?.className,
      // Seul enfant EN FLUX : la cellule. Le résumé est absolu (hors flux).
      flowChildren: Array.from(el.children).filter(
        (c) => !c.classList.contains('mt-tlv__group-summary'),
      ).length,
    })
    const expanded = shape(head)
    await user.click(head)
    expect(shape(headFor('Cat B'))).toEqual(expanded)
    expect(expanded.flowChildren).toBe(1)
  })

  it('catégorie MASQUÉE (#592) : ni en-tête, ni résumé', async () => {
    const user = userEvent.setup()
    renderView('fr', 'screen')
    await user.click(headFor('Cat B'))
    expect(within(headFor('Cat B')).getByTestId('timeline-group-summary')).toBeInTheDocument()
    const filter = screen
      .getAllByTestId('timeline-sidebar-filter')
      .find((b) => b.getAttribute('data-category') === 'Cat B')!
    await user.click(filter)
    expect(
      screen.queryAllByTestId('timeline-group-head').map((h) => h.getAttribute('data-category')),
    ).toEqual(['Cat A', 'Cat C'])
    expect(screen.queryAllByTestId('timeline-group-summary-bar')).toHaveLength(0)
  })
})

describe('#601 — hauteur d’en-tête : CSS ↔ défaut de la virtualisation', () => {
  /**
   * `DEFAULT_METRICS.headHeight` sert le 1er rendu (avant mesure) et DOIT valoir
   * la hauteur fixée en CSS, sinon le modèle vertical du premier rendu diverge
   * du DOM. La hauteur est fixe, filet compris (`box-sizing:border-box`) : c'est
   * ce qui la rend identique pliée et dépliée.
   */
  it('`.mt-tlv__group-head` fixe `height:40px` en border-box = DEFAULT_METRICS.headHeight', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/ds/components/timeline.css'), 'utf8')
    const rule = css.match(/\.mt-tlv__group-head\{([^}]*)\}/)
    expect(rule, 'règle .mt-tlv__group-head introuvable').not.toBeNull()
    expect(rule![1]).toContain('box-sizing:border-box')
    const height = rule![1].match(/(?:^|;)\s*height:(\d+)px/)
    expect(height, 'hauteur fixe absente').not.toBeNull()
    expect(Number(height![1])).toBe(DEFAULT_METRICS.headHeight)
    // Le bouton n'est plus sticky : c'est la cellule qui l'est (signal #592).
    expect(rule![1]).not.toMatch(/position:sticky/)
    expect(css).toMatch(/\.mt-tlv__group-cell\{[^}]*position:sticky; left:0;/)
  })

  it('replier ne retire QUE les lanes : les en-têtes suivants remontent de N lanes exactement', () => {
    const groups: Array<[string, Resource[]]> = [
      ['A', RESOURCES.slice(0, 2)],
      ['B', RESOURCES.slice(2, 3)],
    ]
    const { headHeight: H, laneHeight: L, rulerHeight: R } = DEFAULT_METRICS
    const open = buildVerticalModel(groups, {}, DEFAULT_METRICS)
    const folded = buildVerticalModel(groups, { A: true }, DEFAULT_METRICS)
    expect(open.listTops.B).toBe(R + H + 2 * L + H)
    expect(folded.listTops.B).toBe(open.listTops.B - 2 * L)
    expect(folded.totalHeight).toBe(open.totalHeight - 2 * L)
  })
})

describe('#601 — en-tête de catégorie mobile (pastille + compteur, pas de repli)', () => {
  it.each([
    ['portrait', TimelineMobilePortrait],
    ['paysage', TimelineMobileLandscape],
  ] as const)('%s : pastille, compteur de produits et nom lu traduit', (_label, Component) => {
    const { errors } = renderWithIntl(
      <Component
        events={EVENTS}
        resources={RESOURCES}
        locale="fr-FR"
        today={new Date(2026, 6, 15)}
      />,
    )
    const heads = screen.getAllByTestId('timeline-group-head')
    const headA = heads.find((h) => h.getAttribute('data-category') === 'Cat A')!
    const headC = heads.find((h) => h.getAttribute('data-category') === 'Cat C')!
    expect(within(headA).getByTestId('timeline-group-count')).toHaveTextContent(/^2$/)
    expect(within(headA).getByTestId('timeline-group-swatch').style.backgroundColor).toBe(
      'rgb(62, 139, 214)',
    )
    expect(within(headC).getByTestId('timeline-group-swatch')).toHaveAttribute('data-color', 'none')
    // Texte lu par le lecteur d'écran (sr-only) ; le visible est `aria-hidden`.
    expect(within(headA).getByText('Cat A, 2 produits')).toHaveClass('sr-only')
    // Pas de repli de catégorie en mobile → jamais de résumé.
    expect(screen.queryByTestId('timeline-group-summary')).not.toBeInTheDocument()
    expect(errors).toEqual([])
  })
})
