import { act, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'react-hot-toast'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// #413 — `global-not-found.tsx` importe `globals.css` (il rend son propre
// document, aucun layout ne monte la feuille au-dessus de lui). Vitest tourne
// avec `css: true` : sans ce stub, jsdom tente de parser le CSS Tailwind 4
// compilé, échoue (`Could not parse CSS stylesheet`) et déverse ~5 500 lignes
// sur stderr — contraire à MEMO-007 (zéro stderr). Cf. `global-error.test.tsx`.
vi.mock('../src/styles/globals.css', () => ({}))

import GlobalNotFound, { metadata } from './global-not-found'
import apiClient from '../src/services/apiClient'
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
 * ⚠ #892 — comme pour `global-error` : depuis React 19, `<html>` / `<body>` sont des
 * singletons fusionnés avec ceux du document, pas imbriqués dans le `container` de RTL.
 * `lang` se lit sur `document.documentElement` (remis à zéro avant chaque test) et la
 * présence des balises se prouve sur `renderToStaticMarkup`.
 */
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  document.documentElement.removeAttribute('lang')
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
    render(<GlobalNotFound />)

    // Le défaut corrigé était l'absence de ces deux balises dans le document
    // servi (`NEXT_MISSING_ROOT_TAGS`) : elles sont l'objet même du composant.
    expect(renderToStaticMarkup(<GlobalNotFound />)).toMatch(
      /^<html[^>]*>[\s\S]*<body[^>]*>[\s\S]*<\/body><\/html>$/,
    )
    expect(document.documentElement).toHaveAttribute('lang', 'fr')
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
    render(<GlobalNotFound />)

    expect(document.documentElement).toHaveAttribute('lang', expectedLang)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(expectedTitle)
    expect(screen.getByTestId('global-not-found-home-link')).toHaveAttribute(
      'href',
      `/${expectedLang}`,
    )
  })

  it('segment inconnu → repli fr (lang ET libellés)', () => {
    window.history.pushState({}, '', '/zz/nope')
    render(<GlobalNotFound />)

    expect(document.documentElement).toHaveAttribute('lang', 'fr')
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

/**
 * #828 — « Revenir à aujourd'hui » pour une personne connectée.
 *
 * L'écran n'a ni provider ni `AuthContext` : une sonde `GET /api/auth/me` part après
 * montage. Le premier rendu reste ANONYME (serveur comme client), la bascule n'a lieu
 * que si la sonde confirme une session. Ces tests simulent la réponse au niveau du
 * RÉSEAU (`fetch` global ET adaptateur axios de `apiClient`) pour ne pas dépendre du
 * client HTTP que le composant choisira. Seule la requête `/auth/me` est interceptée.
 */
type Probe = 'authenticated' | 'unauthenticated' | 'network-error'

const SIGNED_IN_USER = {
  id: '018f3a2b-0000-7000-8000-000000000001',
  name: 'Alice Liddell',
  username: 'alice',
  email: 'alice@example.com',
  role: 'ROLE_USER',
  avatarUrl: null,
  themePreference: null,
}

const BACK_TO_TODAY_FR = "Revenir à aujourd'hui"
const BACK_HOME_FR = "Retour à l'accueil"

const isProbeUrl = (url: string): boolean => /\/auth\/me(\?.*)?$/.test(url)

describe('GlobalNotFound — sonde de session (#828)', () => {
  let probeCalls: number
  let originalAdapter: typeof apiClient.defaults.adapter
  let toastErrorSpy: ReturnType<typeof vi.spyOn>

  function simulateProbe(outcome: Probe): void {
    probeCalls = 0

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (!isProbeUrl(url)) return new Response('{}', { status: 404 })
        probeCalls += 1
        if (outcome === 'network-error') throw new TypeError('Failed to fetch')
        if (outcome === 'unauthenticated') return new Response('{}', { status: 401 })
        return new Response(JSON.stringify(SIGNED_IN_USER), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }),
    )

    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const url = `${config.baseURL ?? ''}${config.url ?? ''}`
      if (!isProbeUrl(url)) throw new AxiosError('not found', 'ERR_BAD_REQUEST', config)
      probeCalls += 1
      if (outcome === 'network-error') throw new AxiosError('Network Error', 'ERR_NETWORK', config)
      const response = {
        data: outcome === 'authenticated' ? SIGNED_IN_USER : {},
        status: outcome === 'authenticated' ? 200 : 401,
        statusText: outcome === 'authenticated' ? 'OK' : 'Unauthorized',
        headers: {},
        config,
      }
      if (outcome === 'unauthenticated') {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response)
      }
      return response
    }
  }

  /** Attend que la sonde soit partie, puis laisse sa réponse se résoudre. */
  async function settleProbe(): Promise<void> {
    await waitFor(() => expect(probeCalls).toBeGreaterThan(0))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
  }

  beforeEach(() => {
    originalAdapter = apiClient.defaults.adapter
    toastErrorSpy = vi.spyOn(toast, 'error').mockImplementation(() => '')
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.unstubAllGlobals()
    toastErrorSpy.mockRestore()
  })

  it('switches to the dashboard link and back-to-today label once the session probe confirms a signed-in user', async () => {
    simulateProbe('authenticated')
    window.history.pushState({}, '', '/fr/nope')
    render(<GlobalNotFound />)

    const link = screen.getByTestId('global-not-found-home-link')
    await waitFor(() => expect(link).toHaveTextContent(BACK_TO_TODAY_FR))
    expect(link).toHaveAttribute('href', '/fr/dashboard')
    expect(link.tagName).toBe('A')
  })

  it('keeps the home link and back-to-home label when the session probe answers unauthenticated', async () => {
    simulateProbe('unauthenticated')
    window.history.pushState({}, '', '/fr/nope')
    render(<GlobalNotFound />)

    await settleProbe()

    const link = screen.getByTestId('global-not-found-home-link')
    expect(link).toHaveTextContent(BACK_HOME_FR)
    expect(link).toHaveAttribute('href', '/fr')
  })

  it('server markup always renders the anonymous label and link regardless of session', () => {
    // Session confirmée côté réseau : le rendu serveur ne doit PAS en tenir compte.
    simulateProbe('authenticated')
    window.history.pushState({}, '', '/fr/nope')

    const html = renderToStaticMarkup(<GlobalNotFound />)

    expect(html).toContain('href="/fr"')
    expect(html).toMatch(/Retour à l(&#x27;|')accueil/)
    expect(html).not.toContain('/dashboard')
    expect(html).not.toContain('Revenir')
    expect(probeCalls).toBe(0)
  })

  // Le libellé connecté est INLINÉ (aucun provider next-intl) : ce test échoue dès
  // qu'il diverge de `errors.json` → `notFound.backToToday`.
  it.each([
    ['fr', frErrors.notFound],
    ['en', enErrors.notFound],
    ['es', esErrors.notFound],
    ['de', deErrors.notFound],
  ])(
    '%s : connected label and dashboard href match the translation file for each of the 4 locales',
    async (locale, messages) => {
      const expected = (messages as Record<string, string>).backToToday
      expect(expected, `errors.json (${locale}) → notFound.backToToday`).toEqual(expect.any(String))

      simulateProbe('authenticated')
      window.history.pushState({}, '', `/${locale}/nope`)
      render(<GlobalNotFound />)

      const link = screen.getByTestId('global-not-found-home-link')
      await waitFor(() => expect(link.textContent).toBe(expected))
      expect(link).toHaveAttribute('href', `/${locale}/dashboard`)
    },
  )

  it('stays on the anonymous link when the session probe fails with a network error', async () => {
    simulateProbe('network-error')
    window.history.pushState({}, '', '/fr/nope')
    render(<GlobalNotFound />)

    await settleProbe()

    const link = screen.getByTestId('global-not-found-home-link')
    expect(link).toHaveTextContent(BACK_HOME_FR)
    expect(link).toHaveAttribute('href', '/fr')
    // Ni message d'erreur, ni redirection.
    expect(toastErrorSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/fr/nope')
  })
})
