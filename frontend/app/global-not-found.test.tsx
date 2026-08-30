import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// #413 — `global-not-found.tsx` importe `globals.css` (il rend son propre
// document, aucun layout ne monte la feuille au-dessus de lui). Vitest tourne
// avec `css: true` : sans ce stub, jsdom tente de parser le CSS Tailwind 4
// compilé, échoue (`Could not parse CSS stylesheet`) et déverse ~5 500 lignes
// sur stderr — contraire à MEMO-007 (zéro stderr). Cf. `global-error.test.tsx`.
vi.mock('../src/styles/globals.css', () => ({}))

import GlobalNotFound from './global-not-found'

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
 * Comme pour `global-error`, RTL monte le `<html>` rendu dans un `<div>` :
 * le `validateDOMNesting` de React est attendu et absorbé par le spy
 * `console.error`.
 */
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
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
    expect(screen.getByTestId('state-screen-code')).toHaveTextContent('404')
    expect(screen.getByTestId('global-not-found-home-link')).toBeInTheDocument()
  })

  // WCAG 3.1.1 — l'attribut suit la locale de l'URL, y compris sur cet écran
  // rendu hors du segment `[locale]`.
  it.each([
    ['/fr/nope', 'fr', 'Page introuvable'],
    ['/en/nope', 'en', 'Page not found'],
    ['/es/nope', 'es', 'Página no encontrada'],
    ['/de/nope', 'de', 'Seite nicht gefunden'],
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page introuvable')
    expect(screen.getByTestId('global-not-found-home-link')).toHaveAttribute('href', '/fr')
  })
})
