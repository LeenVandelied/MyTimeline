import { test, expect } from '@playwright/test'

/**
 * #413 — WCAG 3.1.1 (Langue de la page) : `<html lang>` doit refléter la locale
 * de la route, sur les 4 langues.
 *
 * POURQUOI UN E2E ET PAS UN UNITAIRE. Le défaut corrigé ici était structurel,
 * pas local : le `<html>` était posé dans `app/layout.tsx`, RENDU AU-DESSUS du
 * segment `[locale]`, donc dans un composant auquel Next ne passe pas les
 * `params` de l'enfant. Aucun test de composant ne peut voir ça — il faut le
 * document réellement assemblé par le routeur.
 *
 * ET SURTOUT : les deux oracles ci-dessous ne sont PAS redondants.
 *  - `request.get()` lit le HTML **servi**, sans exécuter une ligne de JS. C'est
 *    le seul oracle qui disqualifie une rustine client (un
 *    `document.documentElement.lang = …` posé après hydratation laisse le HTML
 *    SSR faux, et un lecteur d'écran peut avoir déjà annoncé la page). Il est
 *    donc le critère de sortie de l'issue.
 *  - `page.goto()` + `document.documentElement.lang` vérifie qu'aucun code
 *    client (next-themes, providers) ne réécrit ensuite l'attribut.
 * Un oracle vert et l'autre rouge = régression réelle, pas un doublon.
 */

const CASES = [
  { path: '/fr/login', lang: 'fr' },
  { path: '/en/login', lang: 'en' },
  { path: '/es/login', lang: 'es' },
  { path: '/de/register', lang: 'de' },
] as const

test.describe('#413 — <html lang> localisé (WCAG 3.1.1)', () => {
  for (const { path, lang } of CASES) {
    test(`${path} → HTML SERVI porte lang="${lang}" (avant hydratation)`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status(), `${path} doit répondre 200`).toBe(200)

      const html = await response.text()
      const openingTag = html.match(/<html[^>]*>/)?.[0] ?? ''
      // Message en 2e argument d'`expect` : Vitest/Playwright tronquent la valeur
      // comparée dans le rapport CI (PIT-S57-002) — la balise brute doit rester
      // lisible dans le message, pas seulement en local.
      expect(openingTag, `balise <html> servie pour ${path}`).toMatch(
        new RegExp(`\\slang="${lang}"`),
      )
    })

    test(`${path} → document.documentElement.lang vaut "${lang}" après hydratation`, async ({ page }) => {
      await page.goto(path)
      // `document.documentElement` et pas `locator('html')` : c'est LA valeur
      // que consomment les technologies d'assistance, et celle mesurée dans le
      // constat d'origine de #413.
      await expect
        .poll(() => page.evaluate(() => document.documentElement.lang), {
          message: `document.documentElement.lang sur ${path}`,
        })
        .toBe(lang)
    })
  }
})

/**
 * #413 (suite) — RÉGRESSION 404 introduite par le correctif ci-dessus, puis
 * corrigée par `app/global-not-found.tsx` (`experimental.globalNotFound`).
 *
 * Descendre `<html>` / `<body>` sous `[locale]` a laissé le layout RACINE sans
 * document, or Next l'exige pour servir la route interne `/_not-found` : toute
 * URL non matchée répondait bien 404, mais avec un corps SANS `<html>` ni
 * `<body>` (`NEXT_MISSING_ROOT_TAGS`) — écran blanc.
 *
 * L'oracle est le HTML SERVI, pas le DOM hydraté : deux contournements écartés
 * PRÉRENDAIENT un document correct sans jamais être servis (`app/not-found.tsx`)
 * ou étaient bien atteints sans que `notFound()` y aboutisse (attrape-tout
 * `[...rest]`). Seule la lecture de la réponse brute les distingue.
 *
 * Le statut est asserté explicitement : un écran 404 renvoyé en 200 serait une
 * régression SEO, et passerait tous les autres oracles de ce fichier.
 */
const NOT_FOUND_PATHS = ['/fr/nope', '/en/nope', '/es/nope', '/de/nope'] as const

test.describe('#413 — 404 des URL non matchées (document complet)', () => {
  for (const path of NOT_FOUND_PATHS) {
    test(`${path} → 404 + document avec <html> et écran 404`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status(), `${path} doit répondre 404`).toBe(404)

      const html = await response.text()
      const openingTag = html.match(/<html[^>]*>/)?.[0] ?? ''
      expect(openingTag, `balise <html> servie pour ${path}`).toMatch(/^<html\s[^>]*lang="/)
      expect(html, `écran 404 servi pour ${path}`).toContain('data-testid="global-not-found-screen"')
    })
  }

  // Le HTML servi est PRÉRENDU au build (une seule page statique pour les 4
  // locales) : la locale de l'URL ne peut être posée qu'après hydratation.
  // Les deux états successifs doivent rester cohérents : `lang` ET le libellé.
  test('après hydratation, /de/nope s’aligne sur la locale de l’URL', async ({ page }) => {
    const response = await page.goto('/de/nope')
    expect(response?.status(), 'statut de /de/nope').toBe(404)

    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang), {
        message: 'document.documentElement.lang sur /de/nope',
      })
      .toBe('de')
    await expect(page.getByTestId('global-not-found-screen')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seite nicht gefunden')
    await expect(page.getByTestId('global-not-found-home-link')).toHaveAttribute('href', '/de')
  })
})
