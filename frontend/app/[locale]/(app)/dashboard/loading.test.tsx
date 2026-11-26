import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import DashboardLoading from './loading'

/**
 * #698 — Fallback de segment du dashboard. Structure seulement (jsdom ne calcule aucun
 * layout) : la LARGEUR contre la page réelle est mesurée au navigateur par
 * `e2e/sprint-106-product-detail.spec.ts`.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}))

describe('DashboardLoading (#698)', () => {
  it('reprend l’enveloppe de la page réelle (max-w-7xl + paddings), plus max-w-3xl', () => {
    render(<DashboardLoading />)
    const layout = screen.getByTestId('dashboard-loading-layout')
    for (const cls of ['max-w-7xl', 'mx-auto', 'w-full', 'px-4', 'py-6', 'sm:px-6', 'lg:px-8']) {
      expect(layout).toHaveClass(cls)
    }
    expect(layout.className).not.toContain('max-w-3xl')
  })

  it('compose salutation, ruban puis grille agenda | marge', () => {
    render(<DashboardLoading />)
    const layout = screen.getByTestId('dashboard-loading-layout')
    const [greeting, ribbon, grid] = Array.from(layout.children)
    expect(greeting).toBe(screen.getByTestId('dashboard-loading-greeting'))
    expect(ribbon).toBe(screen.getByTestId('dashboard-loading-ribbon'))
    expect(grid).toHaveClass('lg:grid-cols-[minmax(0,1fr)_280px]')
    expect(grid).toContainElement(screen.getByTestId('dashboard-loading-skeleton'))
  })

  it('#623 — ruban : règle + barres dans un seul bloc `h-24`, comme le ruban réel', () => {
    render(<DashboardLoading />)
    const ribbon = screen.getByTestId('dashboard-loading-ribbon')
    const plots = ribbon.querySelectorAll('.h-24')
    expect(plots).toHaveLength(1)
    const [ruler, bars] = Array.from(plots[0].children)
    expect(ruler).toHaveClass('h-4.5')
    expect(bars).toHaveClass('flex-1')
  })

  it('une SEULE région status, avec le libellé accessible', () => {
    render(<DashboardLoading />)
    const statuses = screen.getAllByRole('status')
    expect(statuses).toHaveLength(1)
    expect(statuses[0]).toHaveAttribute('data-testid', 'dashboard-loading-skeleton')
    expect(screen.getByText('common.spinner.loading')).toHaveClass('sr-only')
  })
})

/**
 * #811 — Le squelette suit les trois mises en page de `page.tsx` : bureau (#698, ci-dessus),
 * portrait et paysage. Structure seulement : jsdom n'évalue aucune requête média ni aucune
 * cascade CSS, la visibilité réelle par largeur est prouvée au navigateur par
 * `e2e/dashboard-loading-skeleton.spec.ts`.
 */
function mustFind(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  expect(el, `mise en page absente du squelette : data-testid="${id}"`).not.toBeNull()
  return el as HTMLElement
}

const classesOfEl = (el: Element) => el.className.split(/\s+/).filter(Boolean)

/** Sépare `variante:utilitaire` (variante arbitraire `[@media(...)]:` comprise). */
function splitClass(cls: string): { variant: string; util: string } {
  const bracket = cls.startsWith('[') ? cls.indexOf(']:') : -1
  const idx = bracket >= 0 ? bracket + 1 : cls.startsWith('[') ? -1 : cls.lastIndexOf(':')
  if (idx < 0) return { variant: '', util: cls }
  return { variant: cls.slice(0, idx), util: cls.slice(idx + 1) }
}

/** Nombre de pistes d'un `grid-cols-*` (`grid-cols-2`, `grid-cols-[a_b]`), sinon null. */
function trackCount(util: string): number | null {
  const plain = /^grid-cols-(\d+)$/.exec(util)
  if (plain) return Number(plain[1])
  const arbitrary = /^grid-cols-\[(.+)\]$/.exec(util)
  if (!arbitrary) return null
  let depth = 0
  let tracks = 1
  for (const ch of arbitrary[1]) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === '_' && depth === 0) tracks++
  }
  return tracks
}

/** Empilement vertical réel : ni `flex-row`, ni grille à plusieurs pistes, ni `flex` sans `flex-col`. */
function isVerticalStack(el: Element): boolean {
  const utils = classesOfEl(el).map((c) => splitClass(c).util)
  if (utils.includes('flex-row') || utils.includes('flex-row-reverse')) return false
  if (utils.includes('grid-flow-col')) return false
  const tracks = utils.map(trackCount).filter((n): n is number => n !== null)
  if (tracks.some((n) => n > 1)) return false
  if (utils.includes('flex') || utils.includes('inline-flex')) return utils.includes('flex-col')
  return true // flux bloc (`space-y-*`) ou grille à une piste
}

describe('DashboardLoading portrait et paysage (#811)', () => {
  it('renders portrait skeleton with compact greeting, scrollable ribbon, compact agenda and product carousel in one column', () => {
    render(<DashboardLoading />)
    const portrait = mustFind('dashboard-loading-portrait')

    // Une seule colonne : empilement vertical réel, quatre blocs dans l'ordre de la page
    // réelle (salutation, ruban, agenda, carrousel).
    expect(isVerticalStack(portrait), `classes : ${portrait.className}`).toBe(true)
    expect(portrait.querySelectorAll('[class*="grid-cols-"]')).toHaveLength(0)
    const ids = Array.from(portrait.children).map((c) => c.getAttribute('data-testid'))
    expect(ids).toEqual([
      'dashboard-loading-portrait-greeting',
      'dashboard-loading-portrait-ribbon',
      'dashboard-loading-portrait-agenda',
      'dashboard-loading-portrait-carousel',
    ])

    // Salutation compacte : eyebrow + titre, sans sous-titre (`GreetingHeader` compact).
    const greeting = screen.getByTestId('dashboard-loading-portrait-greeting')
    expect(greeting.children).toHaveLength(2)

    // Ruban défilant : piste à défilement horizontal (`DensityRibbon scrollable`).
    const ribbon = screen.getByTestId('dashboard-loading-portrait-ribbon')
    expect(ribbon.querySelector('.overflow-x-auto')).not.toBeNull()

    // Agenda compact (`CompactAgenda`) : intertitre puis deux groupes, aujourd'hui et demain,
    // chacun avec son eyebrow et au moins une rangée. L'agenda bureau est une liste de
    // lignes (`LoadingSkeleton`), sans ces groupes : il ne doit pas être réutilisé ici.
    const agenda = screen.getByTestId('dashboard-loading-portrait-agenda')
    for (const day of ['today', 'tomorrow']) {
      const group = agenda.querySelector(`[data-testid="dashboard-loading-portrait-agenda-${day}"]`)
      expect(group, `groupe ${day} de l'agenda compact`).not.toBeNull()
      expect((group as Element).children.length).toBeGreaterThanOrEqual(2)
    }
    expect(agenda.querySelector('[data-testid="dashboard-loading-skeleton"]')).toBeNull()

    // Carrousel (`ProductCarousel`) : rangée horizontale défilante de cartes.
    const carousel = screen.getByTestId('dashboard-loading-portrait-carousel')
    const track = carousel.querySelector('.overflow-x-auto')
    expect(track, 'piste du carrousel (overflow-x-auto)').not.toBeNull()
    expect(track).toHaveClass('flex')
    expect((track as HTMLElement).children.length).toBeGreaterThanOrEqual(2)
  })

  it('renders landscape skeleton with a 64px rail and two columns', () => {
    render(<DashboardLoading />)
    const landscape = mustFind('dashboard-loading-landscape')

    // Conteneur horizontal, comme `dashboard-landscape` de `page.tsx` (`flex`, sans `flex-col`) :
    // c'est lui qui place le rail à gauche du contenu. Les sens inversés sont exclus : avec
    // `flex-row-reverse` le rail serait à droite.
    const landscapeUtils = classesOfEl(landscape).map((c) => splitClass(c).util)
    expect(landscapeUtils, `classes : ${landscape.className}`).not.toContain('flex-row-reverse')
    expect(landscapeUtils, `classes : ${landscape.className}`).not.toContain('flex-col-reverse')
    expect(
      landscapeUtils.includes('flex-row') ||
        (landscapeUtils.includes('flex') && !landscapeUtils.includes('flex-col')),
      `conteneur paysage non horizontal, classes : ${landscape.className}`,
    ).toBe(true)

    // Rail vertical à gauche (`w-16` = 64 px, comme `CompactRail`), premier enfant, puis le contenu.
    expect(landscape.children).toHaveLength(2)
    const [rail, content] = Array.from(landscape.children)
    expect(rail).toBe(screen.getByTestId('dashboard-loading-rail'))
    expect(rail.className).toMatch(/(^|\s)(w-16|w-\[64px\])(\s|$)/)
    expect(rail).toHaveClass('shrink-0')
    expect(rail).toHaveClass('flex-col')

    // Deux colonnes, sur le modèle de `page.tsx` (`grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`) :
    // `grid-cols-2` ou une valeur arbitraire à deux pistes, avec la classe `grid` et SANS préfixe
    // de variante (`page.tsx` pose ses deux colonnes d'emblée). `md:grid-cols-2`, `flex grid-cols-2`
    // et une seule piste sont refusés.
    const contentRules = classesOfEl(content).map(splitClass)
    const unprefixed = contentRules.filter((r) => r.variant === '').map((r) => r.util)
    expect(unprefixed, `classes : ${content.className}`).toContain('grid')
    const counts = unprefixed.map(trackCount).filter((n): n is number => n !== null)
    expect(counts, `classes : ${content.className}`).toEqual([2])
    expect(unprefixed).not.toContain('grid-cols-1')

    // Agenda compact d'un côté, ruban puis carrousel de l'autre.
    expect(content.children).toHaveLength(2)
    const [left, right] = Array.from(content.children)
    expect(left).toBe(screen.getByTestId('dashboard-loading-landscape-agenda'))
    expect(right).toBe(screen.getByTestId('dashboard-loading-landscape-products'))
    const rightIds = Array.from(right.children).map((c) => c.getAttribute('data-testid'))
    expect(rightIds).toEqual([
      'dashboard-loading-landscape-ribbon',
      'dashboard-loading-landscape-carousel',
    ])
    // Ruban défilant (`DensityRibbon scrollable`).
    expect(
      screen.getByTestId('dashboard-loading-landscape-ribbon').querySelector('.overflow-x-auto'),
    ).not.toBeNull()

    // Agenda compact (`CompactAgenda`), mêmes repères que le portrait : groupes aujourd'hui et
    // demain avec chacun un eyebrow et au moins une rangée, sans l'agenda bureau (`LoadingSkeleton`).
    const dayGroups = ['today', 'tomorrow'].map((day) => {
      const group = left.querySelector(`[data-testid="dashboard-loading-landscape-agenda-${day}"]`)
      expect(group, `groupe ${day} de l'agenda compact paysage`).not.toBeNull()
      expect((group as Element).children.length).toBeGreaterThanOrEqual(2)
      return group as Element
    })
    // Aujourd'hui avant demain, comme `CompactAgenda`.
    expect(
      dayGroups[0].compareDocumentPosition(dayGroups[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
      'aujourd’hui doit précéder demain',
    ).toBeTruthy()
    expect(left.querySelector('[data-testid="dashboard-loading-skeleton"]')).toBeNull()

    // Carrousel (`ProductCarousel`) : piste `flex overflow-x-auto` d'au moins deux cartes.
    const track = screen
      .getByTestId('dashboard-loading-landscape-carousel')
      .querySelector('.overflow-x-auto')
    expect(track, 'piste du carrousel paysage (overflow-x-auto)').not.toBeNull()
    expect(track).toHaveClass('flex')
    // Rangée horizontale : ni `flex-col`, ni `flex-col-reverse`, ni grille à plusieurs pistes.
    expect(isVerticalStack(track as Element), `classes : ${(track as Element).className}`).toBe(
      false,
    )
    expect(classesOfEl(track as Element).map((c) => splitClass(c).util)).not.toContain(
      'flex-col-reverse',
    )
    expect((track as HTMLElement).children.length).toBeGreaterThanOrEqual(2)
  })

  it('each layout carries the visibility classes matching the page breakpoints', () => {
    // Les deux requêtes sont LUES dans `page.tsx` (aucun seuil inventé). #643 les centralisera.
    const pageSource = readFileSync(resolve(__dirname, 'page.tsx'), 'utf8')
    const queries = Array.from(pageSource.matchAll(/useMediaQuery\('([^']+)'\)/g)).map((m) => m[1])
    const landscapeQuery = queries.find((q) => q.includes('orientation'))
    const portraitQuery = queries.find((q) => q.startsWith('(max-width'))
    expect(landscapeQuery, 'requête paysage de page.tsx').toBeDefined()
    expect(portraitQuery, 'requête portrait de page.tsx').toBeDefined()

    // Une classe Tailwind écrit ses espaces en `_` : on compare sans espaces ni `_`.
    const squash = (s: string) => s.replace(/[\s_]+/g, '')
    const landscapeVariant = `[@media${squash(landscapeQuery as string)}]`
    const portraitVariant = `[@media${squash(portraitQuery as string)}]`
    const portraitMaxPx = Number(/max-width:\s*(\d+)px/.exec(portraitQuery as string)?.[1])
    expect(Number.isFinite(portraitMaxPx), 'largeur max portrait lue dans page.tsx').toBe(true)
    const desktopMinVariant = `[@media(min-width:${portraitMaxPx + 1}px)]`

    // `md:` / `max-md:` ne sont admis que si le `md` de Tailwind (768 px par défaut, aucun
    // palier redéfini dans le dépôt) coïncide avec le seuil lu : 767 px + 1 = 768 px.
    const TAILWIND_MD_PX = 768
    const mdMatchesPage = portraitMaxPx + 1 === TAILWIND_MD_PX
    const belowVariants = [portraitVariant, ...(mdMatchesPage ? ['max-md'] : [])]
    const fromVariants = [desktopMinVariant, ...(mdMatchesPage ? ['md'] : [])]

    const { container } = render(<DashboardLoading />)
    const root = container.firstElementChild as HTMLElement
    // Règles du bloc et de ses ancêtres (jusqu'à la racine commune, exclue) : l'affichage
    // peut être posé sur un enveloppeur.
    const rulesOf = (el: HTMLElement) => {
      const rules: { variant: string; util: string }[] = []
      for (let n: HTMLElement | null = el; n && n !== root; n = n.parentElement) {
        rules.push(...classesOfEl(n).map((c) => splitClass(squash(c))))
      }
      return rules
    }
    const isDisplay = (u: string) => /^(block|flex|grid)$/.test(u)
    const at = (rules: { variant: string; util: string }[], variants: string[]) =>
      rules.filter((r) => variants.includes(r.variant)).map((r) => r.util)
    const base = (rules: { variant: string; util: string }[]) => at(rules, [''])

    const desktop = rulesOf(mustFind('dashboard-loading-layout'))
    const portrait = rulesOf(mustFind('dashboard-loading-portrait'))
    const landscape = rulesOf(mustFind('dashboard-loading-landscape'))
    const dump = (r: { variant: string; util: string }[]) =>
      r.map((x) => (x.variant ? `${x.variant}:${x.util}` : x.util)).join(' ')

    // Paysage : caché par défaut, affiché par la requête paysage lue, sans condition de largeur.
    expect(base(landscape), dump(landscape)).toContain('hidden')
    expect(at(landscape, [landscapeVariant]).some(isDisplay), dump(landscape)).toBe(true)
    expect(
      landscape.filter((r) => r.variant !== '' && r.variant !== landscapeVariant),
      dump(landscape),
    ).toEqual([])

    // Priorité du paysage : portrait et bureau portent la classe qui les masque sous la
    // requête paysage lue. jsdom ne calcule pas la cascade : que cette règle l'emporte
    // réellement est prouvé par `e2e/dashboard-loading-skeleton.spec.ts` (T6, 740 × 360).
    expect(at(portrait, [landscapeVariant]), dump(portrait)).toContain('hidden')
    expect(at(desktop, [landscapeVariant]), dump(desktop)).toContain('hidden')

    // Portrait : visible sous le seuil lu, masqué au-dessus.
    const portraitShownBelow =
      (!base(portrait).includes('hidden') && at(portrait, fromVariants).includes('hidden')) ||
      (base(portrait).includes('hidden') && at(portrait, belowVariants).some(isDisplay))
    expect(portraitShownBelow, dump(portrait)).toBe(true)

    // Bureau : masqué sous le seuil lu, visible au-dessus.
    const desktopHiddenBelow =
      at(desktop, belowVariants).includes('hidden') ||
      (base(desktop).includes('hidden') && at(desktop, fromVariants).some(isDisplay))
    expect(desktopHiddenBelow, dump(desktop)).toBe(true)
  })
})
