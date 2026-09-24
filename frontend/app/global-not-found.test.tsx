import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// #413 — `global-not-found.tsx` importe `globals.css` (il rend son propre
// document, aucun layout ne monte la feuille au-dessus de lui). Vitest tourne
// avec `css: true` : sans ce stub, jsdom tente de parser le CSS Tailwind 4
// compilé, échoue (`Could not parse CSS stylesheet`) et déverse ~5 500 lignes
// sur stderr — contraire à MEMO-007 (zéro stderr). Cf. `global-error.test.tsx`.
vi.mock('../src/styles/globals.css', () => ({}))

import GlobalNotFound, { metadata } from './global-not-found'
import deErrors from '../public/locales/de/errors.json'
import enErrors from '../public/locales/en/errors.json'
import esErrors from '../public/locales/es/errors.json'
import frErrors from '../public/locales/fr/errors.json'

/**
 * #413 (suite) — écran 404 des URL NON MATCHÉES, hors de tout layout.
 *
 * ⚠ CE QUE CE FICHIER NE PROUVE PAS. jsdom n'assemble pas un document Next :
 * il ne dit RIEN de la seule question qui a motivé ce composant, à savoir si
 * Next SERT bien ce fichier sur `/_not-found` (le contournement précédent,
 * `app/not-found.tsx`, prérendait correctement et n'était jamais servi). Cette
 * preuve-là est une mesure du HTML brut servi (statut 404 + `<html>` réel),
 * consignée dans le rapport d'issue et rejouée par `e2e/document-lang.spec.ts`.
 * Ici on verrouille seulement le CONTRAT du composant : document autonome,
 * `lang` aligné sur la locale de l'URL, libellés des 4 locales, lien préfixé.
 *
 * Idem pour `metadata` : ce fichier vérifie que le Server Component l'EXPORTE,
 * pas que Next l'injecte dans le `<head>` SERVI (jsdom n'assemble pas de
 * document Next). Cette preuve-là est le `<title>` lu sur le HTML brut,
 * consigné dans le rapport d'issue et rejoué par `e2e/document-lang.spec.ts`.
 *
 * Comme pour `global-error`, RTL monte le `<html>` rendu dans un `<div>` :
 * le `validateDOMNesting` de React est attendu et absorbé par le spy
 * `console.error`.
 */
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  // #627 — horloge factice (`Date` seul) : jeudi 24 septembre 2026, semaine ISO 39.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 24, 9, 0))
})

afterEach(() => {
  vi.useRealTimers()
  errorSpy.mockRestore()
  window.history.pushState({}, '', '/')
})

describe('GlobalNotFound', () => {
  it('rend son PROPRE document (html + body) et l’écran 404', () => {
    const { container } = render(<GlobalNotFound />)

    // Le défaut corrigé était l'absence de ces deux balises dans le document
    // servi (`NEXT_MISSING_ROOT_TAGS`) : elles sont l'objet même du composant.
    expect(container.querySelector('html')).not.toBeNull()
    expect(container.querySelector('html > body')).not.toBeNull()
    expect(screen.getByTestId('global-not-found-screen')).toBeInTheDocument()
    expect(screen.getByTestId('global-not-found-home-link')).toBeInTheDocument()
    // #627 — éphéméride : le code ne vit plus que dans le sur-titre.
    expect(screen.queryByTestId('state-screen-code')).not.toBeInTheDocument()
    expect(screen.getByTestId('state-screen-eyebrow')).toHaveTextContent('Erreur 404')
    expect(screen.getByTestId('ephemeris-leaf')).toBeInTheDocument()
  })

  // WCAG 3.1.1 — l'attribut suit la locale de l'URL, y compris sur cet écran
  // rendu hors du segment `[locale]`.
  it.each([
    ['/fr/nope', 'fr', "Cette page n'a pas de date dans l'almanach."],
    ['/en/nope', 'en', "This page isn't in the almanac."],
    ['/es/nope', 'es', 'Esta página no figura en el almanaque.'],
    ['/de/nope', 'de', 'Für diese Seite gibt es kein Kalenderblatt.'],
  ])('%s → <html lang="%s"> + titre localisé', (pathname, expectedLang, expectedTitle) => {
    window.history.pushState({}, '', pathname)
    const { container } = render(<GlobalNotFound />)

    expect(container.querySelector('html')).toHaveAttribute('lang', expectedLang)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(expectedTitle)
    expect(screen.getByTestId('global-not-found-home-link')).toHaveAttribute(
      'href',
      `/${expectedLang}`,
    )
  })

  it('segment inconnu → repli fr (lang ET libellés)', () => {
    window.history.pushState({}, '', '/zz/nope')
    const { container } = render(<GlobalNotFound />)

    expect(container.querySelector('html')).toHaveAttribute('lang', 'fr')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "Cette page n'a pas de date dans l'almanach.",
    )
    expect(screen.getByTestId('global-not-found-home-link')).toHaveAttribute('href', '/fr')
  })

  // #627 — le feuillet suit la locale POSÉE PAR L'EFFET (pas le défaut `fr` du
  // premier rendu) : jour de semaine, mois et libellé de semaine en allemand.
  it('/de/nope → feuillet daté du jour, en allemand', () => {
    window.history.pushState({}, '', '/de/nope')
    render(<GlobalNotFound />)

    expect(screen.getByTestId('ephemeris-leaf')).toHaveAttribute('data-ephemeris-ready', 'true')
    expect(screen.getByTestId('ephemeris-weekday').textContent).toBe('Donnerstag')
    expect(screen.getByTestId('ephemeris-day').textContent).toBe('24')
    expect(screen.getByTestId('ephemeris-month').textContent).toBe('September 2026')
    expect(screen.getByTestId('ephemeris-week').textContent).toBe('KW 39')
  })

  // Les messages sont INLINÉS dans `global-not-found-screen.tsx` (aucun provider
  // next-intl ici) : ce test échoue dès qu'ils divergent de `errors.json`.
  it.each([
    ['fr', frErrors.notFound],
    ['en', enErrors.notFound],
    ['es', esErrors.notFound],
    ['de', deErrors.notFound],
  ])('%s : libellés identiques à errors.json → notFound.*', (locale, messages) => {
    window.history.pushState({}, '', `/${locale}/nope`)
    render(<GlobalNotFound />)

    expect(screen.getByTestId('state-screen-eyebrow').textContent).toBe(messages.eyebrow)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(messages.title)
    expect(screen.getByText(messages.description)).toBeInTheDocument()
    expect(screen.getByTestId('global-not-found-home-link').textContent).toBe(messages.backHome)
    expect(screen.getByTestId('ephemeris-week').textContent).toBe(
      messages.week.replace('{week}', '39'),
    )
  })
})

/**
 * #413 (suite) — RÉGRESSION `<title>`. Retirer le layout racine de
 * `/_not-found` a emporté sa `metadata` : l'onglet n'avait plus de titre.
 * D'où la scission Server (ce module, porteur de `metadata`) / Client
 * (`global-not-found-screen.tsx`, porteur du `useEffect` de locale).
 */
describe('GlobalNotFound — metadata', () => {
  it('exporte un title non vide (le layout racine ne s’applique plus ici)', () => {
    expect(metadata.title).toBe('Ma Timeline')
  })

  it('exporte la description du layout racine', () => {
    expect(metadata.description).toBe('Application de gestion de temps et événements')
  })
})
