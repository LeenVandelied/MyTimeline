import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { GreetingHeader } from './GreetingHeader'
import { DensityRibbon } from './DensityRibbon'
import { WeekAgenda } from './WeekAgenda'
import { KpiMarginalia } from './KpiMarginalia'
import { ProductList } from './ProductList'
import { CompactAgenda } from './CompactAgenda'
import { ProductCarousel } from './ProductCarousel'

/**
 * #575 — Les titres de section du dashboard avaient été avalés par le style
 * eyebrow (`text-ink-faint text-2xs font-mono tracking-widest uppercase`) : 13px,
 * mono, capitales, dans le gris le plus pâle. On restaure de vrais titres (display
 * 600, sentence case, `--text-sm`, encre pleine), avec l'eyebrow AU-DESSUS là où
 * il porte une information (motif `GreetingHeader`).
 *
 * CE QUE CE FICHIER PROUVE : l'intention (classes posées, ordre DOM, hiérarchie
 * des tailles déclarées). CE QU'IL NE PROUVE PAS : le rendu — jsdom n'applique
 * aucune feuille, donc ni la police effective, ni la casse peinte, ni le
 * débordement allemand. Ces faits-là sont joués par
 * `e2e/sprint-84-section-titles.spec.ts`.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}))

const NOW = new Date(2026, 6, 15, 9, 0, 0)
const LOCALE = 'fr'

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

const product: Product = {
  id: 'p1',
  name: 'Produit p1',
  color: '#3E8BD6',
  category: { id: 'c1', name: 'Cat', color: '#4FA459' },
  events: [],
}

/** Classes qui font un titre de section — référence : `WeekAgenda`. */
const TITLE_CLASSES = ['text-ink', 'font-display', 'text-sm', 'font-semibold'] as const
/** Classes du style eyebrow qui avaient remplacé le titre. */
const EYEBROW_CLASSES = ['uppercase', 'font-mono', 'tracking-widest', 'text-ink-faint', 'text-2xs']

function expectSectionTitle(heading: HTMLElement, key: string) {
  expect(heading.tagName).toBe('H2')
  expect(heading).toHaveTextContent(key)
  const classes = heading.className.split(/\s+/)
  for (const cls of TITLE_CLASSES) expect(classes, `h2 « ${key} » sans ${cls}`).toContain(cls)
  for (const cls of EYEBROW_CLASSES)
    expect(classes, `h2 « ${key} » porte encore ${cls}`).not.toContain(cls)
}

describe('#575 — titres de section du dashboard', () => {
  const cases: { name: string; ui: () => ReactElement; key: string }[] = [
    {
      name: 'WeekAgenda',
      ui: () => <WeekAgenda events={[evt('e1', '2026-07-15')]} now={NOW} locale={LOCALE} />,
      key: 'dashboard.week.title',
    },
    {
      name: 'KpiMarginalia',
      ui: () => (
        <KpiMarginalia
          kpis={{ activeProducts: 1, eventsThisMonth: 2, currentStreak: 3 }}
          locale={LOCALE}
        />
      ),
      key: 'dashboard.kpi.title',
    },
    {
      name: 'ProductList',
      ui: () => <ProductList products={[product]} locale={LOCALE} now={NOW} />,
      key: 'dashboard.productList.title',
    },
    {
      name: 'CompactAgenda',
      ui: () => <CompactAgenda events={[evt('e1', '2026-07-15')]} now={NOW} />,
      key: 'dashboard.mobile.compactAgenda.title',
    },
    {
      name: 'ProductCarousel',
      ui: () => <ProductCarousel products={[product]} locale={LOCALE} now={NOW} />,
      key: 'dashboard.productList.title',
    },
    {
      name: 'DensityRibbon',
      ui: () => <DensityRibbon events={[evt('a', '2026-07-15')]} now={NOW} locale={LOCALE} />,
      key: 'dashboard.density.title',
    },
  ]

  it.each(cases)('$name rend un vrai titre h2, pas un eyebrow', ({ ui, key }) => {
    render(ui())
    expectSectionTitle(screen.getByRole('heading', { level: 2 }), key)
  })

  it('les états vides gardent le titre (WeekAgenda, ProductList, CompactAgenda, ProductCarousel)', () => {
    render(
      <>
        <WeekAgenda events={[]} now={NOW} locale={LOCALE} />
        <ProductList products={[]} locale={LOCALE} now={NOW} />
        <CompactAgenda events={[]} now={NOW} />
        <ProductCarousel products={[]} locale={LOCALE} now={NOW} />
      </>,
    )
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
  })

  it('CompactAgenda : les intertitres de groupe Aujourd’hui/Demain restent en mono capitales', () => {
    // Ce sont des en-têtes de GROUPE (usage que la charte réserve au mono
    // capitales) : ils ne devaient pas être emportés par le correctif.
    render(<CompactAgenda events={[evt('t', '2026-07-15'), evt('d', '2026-07-16')]} now={NOW} />)
    const today = screen.getByTestId('dashboard-compact-agenda-today').querySelector('span')
    expect(today?.textContent).toBe('dashboard.mobile.compactAgenda.today')
    expect(today?.className).toContain('uppercase')
    expect(today?.className).toContain('font-mono')
  })
})

describe('#575 — DensityRibbon : eyebrow informatif AU-DESSUS du titre (motif GreetingHeader)', () => {
  it('conserve l’eyebrow (fenêtre en jours) via `.mt-eyebrow`, placé avant le h2', () => {
    render(<DensityRibbon events={[evt('a', '2026-07-15')]} now={NOW} locale={LOCALE} />)
    const eyebrow = screen.getByTestId('dashboard-density-eyebrow')
    const title = screen.getByTestId('dashboard-density-title')
    expect(eyebrow).toHaveTextContent('dashboard.density.eyebrow')
    expect(eyebrow.className).toBe('mt-eyebrow')
    // Ordre DOM : eyebrow PUIS titre.
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(title).toBe(screen.getByRole('heading', { level: 2 }))
  })

  it('l’eyebrow ne porte aucune utilitaire de taille/couleur (`.mt-eyebrow` est HORS layer)', () => {
    render(<DensityRibbon events={[]} now={NOW} locale={LOCALE} scrollable />)
    const eyebrow = screen.getByTestId('dashboard-density-eyebrow')
    // Une utilitaire à côté serait battue en silence par la classe DS : la poser
    // ferait croire à un réglage qui ne s'applique pas (PIT-S53-003).
    expect(eyebrow.className).not.toMatch(/\btext-|\btracking-|\bfont-/)
  })
})

describe('#575 — hiérarchie h1 > h2 et GreetingHeader intact', () => {
  it('GreetingHeader garde son eyebrow et son h1 (motif de référence, NON converti)', () => {
    render(<GreetingHeader name="Alice" now={NOW} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('dashboard.greeting.morning')
    expect(screen.getByTestId('dashboard-greeting-eyebrow')).toHaveTextContent(
      'dashboard.greeting.eyebrow',
    )
  })

  it('le h1 déclare un palier d’échelle AU-DESSUS de celui des h2 (text-md 21px > text-sm 17px)', () => {
    render(
      <>
        <GreetingHeader name="Alice" now={NOW} />
        <WeekAgenda events={[]} now={NOW} locale={LOCALE} />
      </>,
    )
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-md')
    expect(screen.getByRole('heading', { level: 2 }).className).toContain('text-sm')
  })
})

/* ------------------------------------------------------------------------- */
/*  Garde statique : AUCUN titre du produit ne reprend le style eyebrow.      */
/* ------------------------------------------------------------------------- */

// Racine `frontend/` : vitest s'exécute depuis elle (cf. `AppShell.test.tsx`).
const FRONTEND = process.cwd()

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path))
    else if (/\.tsx$/.test(name) && !/\.(test|stories)\.tsx$/.test(name)) out.push(path)
  }
  return out
}

/**
 * `<h1..h6 …>` dont les attributs portent un marqueur du style eyebrow.
 * Limite connue : `[^>]*` s'arrête au premier `>` — un `className={cn(… => …)}`
 * serait tronqué (faux NÉGATIF possible, jamais faux positif).
 */
const EYEBROW_HEADING = /<h([1-6])\b([^>]*)>/g
const EYEBROW_MARKERS = /\b(uppercase|tracking-widest|font-mono)\b/

function eyebrowHeadings(source: string): string[] {
  const hits: string[] = []
  for (const m of source.matchAll(EYEBROW_HEADING)) {
    if (EYEBROW_MARKERS.test(m[2])) hits.push(`h${m[1]} ${m[2].replace(/\s+/g, ' ').trim()}`)
  }
  return hits
}

describe('#575 — garde statique : aucun titre en style eyebrow', () => {
  it('contrôle négatif : le motif fautif d’origine EST détecté (y compris sans font-mono)', () => {
    // Les deux formes relevées au S84 : dashboard (avec `font-mono`) et
    // `ProductDetailView` (SANS `font-mono` — ce qui avait fait rater ces deux-là
    // au grep de l'architecte).
    expect(
      eyebrowHeadings(
        '<h2 className="text-ink-faint text-2xs font-mono tracking-widest uppercase">{t(\'title\')}</h2>',
      ),
    ).toHaveLength(1)
    expect(
      eyebrowHeadings(
        '<h2\n  className="text-ink-faint text-2xs mb-2 tracking-widest uppercase"\n>x</h2>',
      ),
    ).toHaveLength(1)
    expect(eyebrowHeadings('<h2 className="text-ink font-display text-sm">x</h2>')).toEqual([])
  })

  it('aucun <h1..h6> de src/ ni app/ ne porte uppercase / tracking-widest / font-mono', () => {
    const offenders: string[] = []
    let scanned = 0
    let headings = 0
    for (const root of ['src', 'app']) {
      for (const file of tsxFiles(join(FRONTEND, root))) {
        const source = readFileSync(file, 'utf8')
        scanned += 1
        headings += [...source.matchAll(EYEBROW_HEADING)].length
        for (const hit of eyebrowHeadings(source))
          offenders.push(`${relative(FRONTEND, file)} : ${hit}`)
      }
    }
    // Anti-vacuité : un balayage qui ne lit rien rendrait aussi `[]`.
    expect(scanned).toBeGreaterThan(100)
    expect(headings).toBeGreaterThan(20)
    expect(offenders).toEqual([])
  })
})
