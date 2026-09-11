import { createRef, type ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import frDashboard from '../../../public/locales/fr/dashboard.json'
import enDashboard from '../../../public/locales/en/dashboard.json'
import esDashboard from '../../../public/locales/es/dashboard.json'
import deDashboard from '../../../public/locales/de/dashboard.json'
import { TimelineSidebar, type TimelineSidebarCategory } from './TimelineSidebar'
import { categoryColorsOf, countEventsByCategory, type Resource } from './lib'
import type { FullCalendarEvent } from '@/types/event'

/**
 * #592 — Sidebar de la Vue Timeline rendue avec les VRAIS messages (PIT-S63-006) :
 * un mock `${ns}.${key}` rendrait un namespace ou une clé FAUX indiscernables d'un
 * juste. `onError` collecte toute `IntlError` (clé manquante, placeholder ICU
 * `{category}`/`{count}` non fourni) ; la liste doit rester vide.
 */

const MESSAGES = { fr: frDashboard, en: enDashboard, es: esDashboard, de: deDashboard }
type Locale = keyof typeof MESSAGES

const CATEGORIES: TimelineSidebarCategory[] = [
  { name: 'Véhicules', color: '#3E8BD6', eventCount: 3, hidden: false },
  { name: 'Santé', color: null, eventCount: 1, hidden: true },
]

function renderSidebar(
  locale: Locale = 'fr',
  props: Partial<ComponentProps<typeof TimelineSidebar>> = {},
) {
  const errors: string[] = []
  const utils = render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="Europe/Paris"
      messages={{ dashboard: MESSAGES[locale] }}
      onError={(error) => errors.push(error.message)}
    >
      <TimelineSidebar
        id="tl-side"
        open={false}
        categories={CATEGORIES}
        onToggleCategory={vi.fn()}
        onCollapseAll={vi.fn()}
        panelRef={createRef<HTMLElement>()}
        {...props}
      />
    </NextIntlClientProvider>,
  )
  return { ...utils, errors }
}

describe('TimelineSidebar — libellés réels (next-intl, 4 locales)', () => {
  it('fr : titres de bloc, segmenté, légende et raccourcis traduits', () => {
    const { errors } = renderSidebar('fr')
    expect(
      screen.getByRole('complementary', { name: 'Filtres et légende de la frise' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Accordéons' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Catégories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Légende' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout déplier' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout plier' })).toBeInTheDocument()
    expect(screen.getByTestId('timeline-sidebar-legend')).toHaveTextContent('Événement')
    const keys = screen.getByRole('list', { name: 'Raccourcis clavier' })
    expect(keys).toHaveTextContent('Aller à aujourd’hui')
    expect(keys).toHaveTextContent('Plein écran')
    expect(keys).toHaveTextContent('Échap')
    expect(errors).toEqual([])
  })

  it('fr : nom accessible du filtre = catégorie + « N événements » (pluriel ICU), état par aria-pressed', () => {
    const { errors } = renderSidebar('fr')
    const shown = screen.getByRole('button', { name: 'Véhicules, 3 événements' })
    expect(shown).toHaveAttribute('aria-pressed', 'true')
    const hidden = screen.getByRole('button', { name: 'Santé, 1 événement' })
    expect(hidden).toHaveAttribute('aria-pressed', 'false')
    expect(errors).toEqual([])
  })

  it.each([
    ['en', 'Véhicules, 3 events', 'Santé, 1 event', 'Esc'],
    ['es', 'Véhicules, 3 eventos', 'Santé, 1 evento', 'Esc'],
    ['de', 'Véhicules, 3 Ereignisse', 'Santé, 1 Ereignis', 'Esc'],
  ] as const)(
    '%s : aucune IntlError, pluriels et touche Échap localisés',
    (locale, many, one, esc) => {
      const { errors } = renderSidebar(locale)
      expect(screen.getByRole('button', { name: many })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: one })).toBeInTheDocument()
      expect(screen.getByTestId('timeline-sidebar-shortcuts')).toHaveTextContent(esc)
      expect(errors).toEqual([])
    },
  )

  it('les 4 locales exposent EXACTEMENT les mêmes clés `timeline.sidebar`', () => {
    const keysOf = (l: Locale) => Object.keys(MESSAGES[l].timeline.sidebar).sort()
    expect(keysOf('en')).toEqual(keysOf('fr'))
    expect(keysOf('es')).toEqual(keysOf('fr'))
    expect(keysOf('de')).toEqual(keysOf('fr'))
  })

  it('pastille masquée : contour de la couleur, sans aplat ; sans couleur : aucun style inline', () => {
    renderSidebar('fr', {
      categories: [
        { name: 'Véhicules', color: '#3E8BD6', eventCount: 3, hidden: true },
        { name: 'Santé', color: null, eventCount: 1, hidden: false },
      ],
    })
    const [colored, neutral] = screen.getAllByTestId('timeline-sidebar-swatch')
    expect(colored.style.borderColor).toBe('rgb(62, 139, 214)')
    expect(colored.style.backgroundColor).toBe('transparent')
    expect(neutral.getAttribute('style')).toBeNull()
  })

  it('les boutons rappellent leurs callbacks avec la catégorie / la valeur de repli', async () => {
    const user = userEvent.setup()
    const onToggleCategory = vi.fn()
    const onCollapseAll = vi.fn()
    renderSidebar('fr', { onToggleCategory, onCollapseAll })
    await user.click(screen.getByRole('button', { name: 'Santé, 1 événement' }))
    expect(onToggleCategory).toHaveBeenCalledWith('Santé')
    await user.click(screen.getByRole('button', { name: 'Tout plier' }))
    expect(onCollapseAll).toHaveBeenLastCalledWith(true)
    await user.click(screen.getByRole('button', { name: 'Tout déplier' }))
    expect(onCollapseAll).toHaveBeenLastCalledWith(false)
  })

  it('le libellé tronqué reste atteignable en entier (attribut `title`)', () => {
    renderSidebar('fr')
    expect(screen.getByTitle('Véhicules')).toHaveTextContent('Véhicules')
  })
})

describe('#592 — dérivations partagées (lib.ts)', () => {
  const resources: Resource[] = [
    { id: 'p1', title: 'P1', category: 'A', categoryColor: null },
    { id: 'p2', title: 'P2', category: 'A', categoryColor: '#112233' },
    { id: 'p3', title: 'P3', category: 'B' },
  ]
  const evt = (id: string, resourceId: string): FullCalendarEvent => ({
    id,
    title: id,
    start: '2026-07-10',
    end: '2026-07-10',
    allDay: true,
    resourceId,
    extendedProps: {
      productId: resourceId,
      productName: resourceId,
      category: '?',
      type: 'single',
    },
  })

  it('categoryColorsOf : 1re couleur non nulle de la catégorie, `null` sinon', () => {
    expect(categoryColorsOf(resources)).toEqual({ A: '#112233', B: null })
  })

  it('countEventsByCategory : compte par lane de rattachement, 0 pour une catégorie vide', () => {
    const counts = countEventsByCategory(
      [evt('e1', 'p1'), evt('e2', 'p2'), evt('e3', 'p2'), evt('orphan', 'inconnu')],
      resources,
    )
    expect(counts).toEqual({ A: 3, B: 0 })
  })
})
