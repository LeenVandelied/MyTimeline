import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import { KpiMarginalia } from './KpiMarginalia'
import { ProductList } from './ProductList'
import { ProductCarousel } from './ProductCarousel'
import { DensityRibbon } from './DensityRibbon'
import { WeekAgenda } from './WeekAgenda'
import { StateScreen } from '@/components/shared/StateScreen'

/**
 * #72 — Formats localisés (Intl) sur les 4 locales du projet.
 *
 * Ce fichier assert UNIQUEMENT du CONTENU TEXTUEL et la présence des classes du
 * DS (`.mt-num`, `.mt-date--long`). Il ne prétend RIEN vérifier de la mise en
 * page : sous jsdom, aucune feuille de style du DS n'est appliquée — largeur,
 * alignement, `font-size` et `text-transform` n'y sont pas observables. La tenue
 * visuelle de ces classes relève d'un E2E / d'une vérification navigateur.
 *
 * Les séparateurs de milliers diffèrent : fr = espace fine insécable (U+202F),
 * en = virgule, es/de = point. On normalise donc les espaces avant comparaison
 * (`\s` couvre U+202F, catégorie Zs) plutôt que de coller un littéral fragile.
 */
vi.mock('next-intl', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}))

const LOCALES = ['fr', 'en', 'es', 'de'] as const

/** Séparateur de milliers attendu pour 12345, par locale (ICU Node full-icu). */
const EXPECTED_12345: Record<(typeof LOCALES)[number], RegExp> = {
  fr: /^12\s345$/u, // espace fine insécable
  en: /^12,345$/u,
  es: /^12\.345$/u,
  de: /^12\.345$/u,
}

const norm = (el: HTMLElement) => el.textContent ?? ''

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

/** Produit à `count` événements non archivés — sert à franchir le seuil des milliers. */
const productWith = (count: number): Product => ({
  id: 'p1',
  name: 'Produit A',
  color: '#3E8BD6',
  category: { id: 'c1', name: 'Cat', color: '#4FA459' },
  events: Array.from({ length: count }, (_, i) => ({
    id: `e${i}`,
    title: `Event ${i}`,
    startDate: '2026-07-15',
    archived: false,
    productId: 'p1',
  })) as Product['events'],
})

afterEach(cleanup)

describe('#72 — Intl.NumberFormat sur les 4 locales', () => {
  it.each(LOCALES)('KpiMarginalia groupe les milliers en %s', (locale) => {
    render(
      <KpiMarginalia
        kpis={{ activeProducts: 12345, eventsThisMonth: 12345, currentStreak: 12345 }}
        locale={locale}
      />,
    )
    for (const testid of [
      'dashboard-kpi-active-products',
      'dashboard-kpi-events-month',
      'dashboard-kpi-streak',
    ]) {
      expect(norm(screen.getByTestId(testid))).toMatch(EXPECTED_12345[locale])
    }
  })

  it.each(LOCALES)('ProductList groupe le compteur d’événements en %s', (locale) => {
    const { container } = render(
      <ProductList products={[productWith(12345)]} locale={locale} now={NOW} />,
    )
    const counter = container.querySelector('.mt-num')
    expect(counter).not.toBeNull()
    expect(counter?.textContent ?? '').toMatch(EXPECTED_12345[locale])
  })

  it.each(LOCALES)('ProductCarousel groupe le compteur d’événements en %s', (locale) => {
    const { container } = render(
      <ProductCarousel products={[productWith(12345)]} locale={locale} now={NOW} />,
    )
    const counter = container.querySelector('.mt-num')
    expect(counter).not.toBeNull()
    expect(counter?.textContent ?? '').toMatch(EXPECTED_12345[locale])
  })

  it('les 4 locales ne produisent pas toutes le même rendu (le formatage agit)', () => {
    const rendered = LOCALES.map((locale) => new Intl.NumberFormat(locale).format(12345))
    expect(new Set(rendered).size).toBeGreaterThan(1)
  })

  it.each(LOCALES)('DensityRibbon localise le compteur du title en %s', (locale) => {
    const events = Array.from({ length: 3 }, (_, i) => evt(`a${i}`, '2026-07-15'))
    const { container } = render(
      <DensityRibbon events={events} locale={locale} now={NOW} rangeDays={30} />,
    )
    const today = container.querySelector('[data-testid="dashboard-density-today"]')
    // Le title reste « <date> · <compteur> » ; on vérifie que le compteur passe
    // bien par Intl (ici 3 → identique partout, donc on compare au formateur).
    expect(today?.getAttribute('title')).toContain(new Intl.NumberFormat(locale).format(3))
  })
})

describe('#72 — classes DS i18n appliquées', () => {
  it.each(LOCALES)('WeekAgenda pose `.mt-date--long` sur le <time> en %s', (locale) => {
    const { container } = render(
      <WeekAgenda events={[evt('a', '2026-07-15')]} locale={locale} now={NOW} />,
    )
    const time = container.querySelector('time')
    expect(time).not.toBeNull()
    expect(time?.className).toContain('mt-date--long')
    // Convention DS : le <time> porte un datetime machine-lisible.
    expect(time?.getAttribute('datetime')).toBeTruthy()
    // Le libellé visible vient bien d'Intl.DateTimeFormat, donc varie par locale.
    expect((time?.textContent ?? '').length).toBeGreaterThan(0)
  })

  it('WeekAgenda rend un libellé de jour différent selon la locale', () => {
    const labels = LOCALES.map((locale) => {
      const { container, unmount } = render(
        <WeekAgenda events={[evt('a', '2026-07-15')]} locale={locale} now={NOW} />,
      )
      const text = container.querySelector('time')?.textContent ?? ''
      unmount()
      return text
    })
    expect(new Set(labels).size).toBeGreaterThan(1)
  })

  it('StateScreen porte `.mt-num` mais n’applique PAS Intl au code (identifiant)', () => {
    render(<StateScreen code="404" title="Introuvable" testId="sc" />)
    const code = screen.getByTestId('state-screen-code')
    expect(code.className).toContain('mt-num')
    expect(code).toHaveTextContent('404')
  })

  it('StateScreen laisse un code à 4 chiffres INTACT (pas de séparateur de milliers)', () => {
    render(<StateScreen code="1000" title="Erreur" testId="sc" />)
    // Régression volontaire : `1 000` / `1,000` / `1.000` seraient FAUX pour un code.
    expect(screen.getByTestId('state-screen-code').textContent).toBe('1000')
  })
})
