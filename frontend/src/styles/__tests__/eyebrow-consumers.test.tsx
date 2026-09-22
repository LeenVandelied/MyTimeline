import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { CompactAgenda } from '@/components/dashboard/CompactAgenda'
import { MobileDrawer } from '@/components/dashboard/MobileDrawer'
import TimelineLoading from '@/app/[locale]/(app)/timeline/loading'

/**
 * #632 — Filet d'élasticité allemande : les sur-titres mono capitales passent par
 * `.mt-eyebrow` (DS `ds/components/i18n.css` §2), qui détend l'interlettrage à .02em
 * en `de`. Les sur-titres « faits main » (`text-2xs font-mono tracking-widest
 * uppercase` = 13 px, .16em en dur) ne se détendaient jamais.
 *
 * CE QUE CE FICHIER PROUVE : la classe est posée, SEULE (une utilitaire `text-*` /
 * `tracking-*` à côté serait battue en silence par la règle DS hors layer —
 * PIT-S53-003), et plus aucun `.tsx` ne réintroduit le motif fait main.
 * CE QU'IL NE PROUVE PAS : le rendu (jsdom n'applique aucune feuille) — l'absence
 * de débordement en `de` se mesure au navigateur.
 */
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'fr',
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

const NOW = new Date(2026, 6, 15, 9, 0, 0)

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

/** `.mt-eyebrow` seule : pas d'utilitaire contradictoire empilée. */
function expectDsEyebrow(el: Element | null, label: string) {
  expect(el, `${label} introuvable`).not.toBeNull()
  expect(el?.className, `${label} n'est pas un .mt-eyebrow seul`).toBe('mt-eyebrow')
}

describe('#632 — les sur-titres conservés passent par `.mt-eyebrow`', () => {
  it('GreetingHeader : la ligne au-dessus du « Bonjour »', () => {
    render(<GreetingHeader name="Alice" now={NOW} />)
    const eyebrow = screen.getByTestId('dashboard-greeting-eyebrow')
    expect(eyebrow).toHaveTextContent('dashboard.greeting.eyebrow')
    expectDsEyebrow(eyebrow, 'eyebrow du GreetingHeader')
  })

  it('CompactAgenda : intertitres de groupe Aujourd’hui et Demain', () => {
    render(<CompactAgenda events={[evt('t', '2026-07-15'), evt('d', '2026-07-16')]} now={NOW} />)
    const today = screen.getByTestId('dashboard-compact-agenda-today').querySelector('span')
    const tomorrow = screen.getByTestId('dashboard-compact-agenda-tomorrow').querySelector('span')
    expect(today?.textContent).toBe('dashboard.mobile.compactAgenda.today')
    expect(tomorrow?.textContent).toBe('dashboard.mobile.compactAgenda.tomorrow')
    expectDsEyebrow(today, 'intertitre Aujourd’hui')
    expectDsEyebrow(tomorrow, 'intertitre Demain')
  })

  it('MobileDrawer : intitulés Langue et Thème', () => {
    render(<MobileDrawer open onClose={vi.fn()} onLogout={vi.fn()} />)
    const drawer = screen.getByTestId('dashboard-mobile-drawer')
    expectDsEyebrow(within(drawer).getByText('dashboard.mobile.drawer.language'), 'intitulé Langue')
    expectDsEyebrow(within(drawer).getByText('dashboard.mobile.drawer.theme'), 'intitulé Thème')
  })

  it('Frise, squelette de chargement : sur-titre au-dessus du h1', () => {
    render(<TimelineLoading />)
    expectDsEyebrow(screen.getByText('shell.timeline.eyebrow'), 'sur-titre du squelette Frise')
  })
})

/* ------------------------------------------------------------------------- */
/*  Gardes statiques (source)                                                 */
/* ------------------------------------------------------------------------- */

// Racine `frontend/` : vitest s'exécute depuis elle (cf. `section-titles.test.tsx`).
const FRONTEND = process.cwd()
const read = (path: string) => readFileSync(join(FRONTEND, path), 'utf8')

/** className littérale de l'élément qui rend `{t('eyebrow')}`. */
function eyebrowClass(source: string): string | undefined {
  return source.match(/className="([^"]+)"[^>]*>\s*\{t\('eyebrow'\)\}/)?.[1]
}

describe('#632 — Frise : page et squelette portent le MÊME sur-titre (pas de saut au chargement)', () => {
  it('page.tsx et loading.tsx posent `.mt-eyebrow` seule', () => {
    // La page exige auth + données (non rendue ici) : on lit sa source.
    const page = eyebrowClass(read('app/[locale]/(app)/timeline/page.tsx'))
    const loading = eyebrowClass(read('app/[locale]/(app)/timeline/loading.tsx'))
    expect(page).toBe('mt-eyebrow')
    expect(loading).toBe(page)
  })
})

describe('#632 — badge « archivé » de la fiche produit : se détend en `de`', () => {
  it('garde sa forme de badge ET porte la détente `:lang(de)` à .02em', () => {
    // Le badge n'est pas un sur-titre (pilule bordée, sans mono) : il n'est pas
    // converti, mais son `tracking-widest` (.16em) ne doit pas rester figé en `de`.
    const source = read('src/components/products/ProductDetailView.tsx')
    const cls = source.match(/className="([^"]+)"[^>]*>\s*\{t\('archivedBadge'\)\}/)?.[1]
    expect(cls).toBeDefined()
    const classes = cls!.split(/\s+/)
    expect(classes).toContain('tracking-widest')
    expect(classes).toContain('[&:lang(de)]:tracking-[.02em]')
  })
})

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
 * Lignes de CODE (commentaires exclus) qui reprennent le sur-titre fait main.
 * Par ligne et non par littéral : les apostrophes des commentaires FR
 * désapparieraient un balayage par guillemets (faux NÉGATIFS). Limite connue : une
 * chaîne de classes coupée sur plusieurs lignes échapperait (prettier ne le fait pas
 * sur un `className="…"`).
 */
const MARKERS = [
  /(^|[\s"'`])font-mono($|[\s"'`])/,
  /(^|[\s"'`])tracking-widest($|[\s"'`])/,
  /(^|[\s"'`])uppercase($|[\s"'`])/,
]
function handMadeEyebrows(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !/^(\/\/|\/\*|\*|\{\/\*)/.test(line))
    .filter((line) => MARKERS.every((re) => re.test(line)))
}

/**
 * Hors périmètre #632, non converti volontairement : la landing a sa propre
 * typographie marketing (sur-titres d'étape de `HowItWorksSection`, .16em maquette).
 */
const ALLOWED = new Set(['src/components/landing/HowItWorksSection.tsx'])

describe('#632 — garde statique : plus de sur-titre mono capitales fait main', () => {
  it('contrôle négatif : le motif d’origine EST détecté', () => {
    expect(
      handMadeEyebrows(
        '<span className="text-ink-muted text-2xs font-mono tracking-widest uppercase">',
      ),
    ).toHaveLength(1)
    expect(handMadeEyebrows('<span className="mt-eyebrow">')).toEqual([])
    // Badge sans mono : hors du motif (traité à part, ci-dessus).
    expect(handMadeEyebrows('<span className="text-2xs tracking-widest uppercase">')).toEqual([])
    // Commentaire qui CITE le motif (ex. javadoc de migration) : ignoré.
    expect(handMadeEyebrows(' * ancien `font-mono tracking-widest uppercase` retiré')).toEqual([])
  })

  it('aucun .tsx de src/ ni app/ (hors landing) ne pose font-mono + tracking-widest + uppercase', () => {
    const offenders: string[] = []
    let scanned = 0
    for (const root of ['src', 'app']) {
      for (const file of tsxFiles(join(FRONTEND, root))) {
        const rel = relative(FRONTEND, file)
        scanned += 1
        if (ALLOWED.has(rel)) continue
        for (const hit of handMadeEyebrows(readFileSync(file, 'utf8')))
          offenders.push(`${rel} : ${hit}`)
      }
    }
    // Anti-vacuité : un balayage qui ne lit rien rendrait aussi `[]`.
    expect(scanned).toBeGreaterThan(100)
    expect(offenders).toEqual([])
  })

  it('la liste blanche n’est pas morte : la landing porte encore le motif', () => {
    // Si ce test rougit, la landing a été convertie : retirer l'entrée d'ALLOWED.
    for (const path of ALLOWED) expect(handMadeEyebrows(read(path)).length).toBeGreaterThan(0)
  })
})
