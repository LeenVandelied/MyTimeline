import { test, expect } from '@playwright/test'
import { SHARED } from './support/accounts'
// Import RELATIF (et non l'alias `@/`) : ce module est chargé par le transpileur
// Playwright, qui n'a pas la même résolution que le bundler Next. `locales.ts` est
// pur (aucun import Node/Next), il se charge donc tel quel. Source de vérité #235.
import { SUPPORTED_LOCALES } from '../src/i18n/locales'
import { SIGNATURE_VERIFICATION_CONFIGURED } from './support/rs256'

/**
 * #302 — Garde SERVEUR des routes connectées (`middleware.ts`, cf. ADR-004).
 *
 * Ce que ce fichier prouve, et que les tests unitaires ne peuvent pas prouver :
 * que Next applique RÉELLEMENT le middleware sur ces URLs (matcher, route group
 * `(app)` invisible dans l'URL, composition avec next-intl) et qu'un anonyme
 * n'obtient AUCUN octet du shell applicatif.
 *
 * MÉTHODE — l'assertion centrale passe par `page.request` avec `maxRedirects: 0` :
 * on observe la réponse HTTP BRUTE (307 + `location`), sans exécuter une ligne de
 * JavaScript. C'est la seule façon de distinguer une redirection SERVEUR (#302)
 * de l'ancienne redirection CLIENT (`useAuthGuard`, #210), qui produisait un 200
 * + HTML complet puis un `router.push`. Un simple `page.goto()` suivi d'un
 * `expect(url)` passerait dans les DEUX cas et ne testerait rien de neuf.
 *
 * Sélecteurs `data-testid` UNIQUEMENT, routes `/fr/...` (localePrefix: 'always').
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring (:8080) + Postgres, front :3000.
 */

/** Segments protégés — miroir de `src/lib/auth-guard-paths.ts` (ADR-004 §Limites). */
const PROTECTED_PATHS = ['/fr/dashboard', '/fr/timeline', '/fr/products', '/fr/settings']

/**
 * Routes publiques : doivent rester accessibles à un anonyme (aucune boucle).
 *
 * ⚠ La landing est `/fr` et NON `/fr/home` depuis l'ADR-006 : `/fr/home` répond
 * désormais 308 vers `/fr`, ce qui ferait échouer l'assertion `status === 200`
 * ci-dessous (les requêtes sont émises avec `maxRedirects: 0`).
 */
const PUBLIC_PATHS = ['/fr/login', '/fr/register', '/fr/forgot-password', '/fr']

test.describe('Garde serveur — visiteur anonyme', () => {
  // Contexte SANS cookie : on n'hérite d'aucun storageState du projet `setup`.
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const path of PROTECTED_PATHS) {
    test(`${path} répond 307 vers /fr/login sans rendre la page`, async ({ page }) => {
      const response = await page.request.get(path, { maxRedirects: 0 })

      // 1. Redirection SERVEUR (et non 200 + redirect JS).
      expect(response.status()).toBe(307)

      // 2. Cible localisée : un `/login` nu serait re-redirigé par next-intl.
      const location = response.headers()['location']
      expect(location).toBeDefined()
      expect(new URL(location, 'http://localhost').pathname).toBe('/fr/login')

      // 3. AUCUN octet de page protégée : le corps d'un 307 ne contient pas le
      //    shell. On l'affirme explicitement — c'est l'objet même de #302.
      const body = await response.text()
      expect(body).not.toContain('data-testid="dashboard"')
      expect(body).not.toContain('data-testid="app-shell"')
    })
  }

  test('la navigation UI atterrit sur le formulaire de connexion', async ({ page }) => {
    await page.goto('/fr/dashboard')

    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page).toHaveURL(/\/fr\/login$/)
    // Le shell protégé ne doit à aucun moment être monté.
    await expect(page.getByTestId('dashboard')).toHaveCount(0)
  })

  test('une sous-route protégée est gardée elle aussi', async ({ page }) => {
    const response = await page.request.get('/fr/products/9f4c1e2a-0000-4000-8000-000000000000', {
      maxRedirects: 0,
    })

    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toContain('/fr/login')
  })

  /**
   * ANCRAGE RÉEL DU MATCHER (revue S45) — seul niveau où le matcher de
   * `middleware.ts` est évalué par Next lui-même. `middleware.test.ts` compile les
   * entrées avec le path-to-regexp embarqué de Next, ce qui est déjà bien plus
   * fidèle qu'une regex reconstruite à la main, mais reste une SIMULATION : rien
   * n'y prouve que Next applique ces entrées au moment où il route la requête.
   *
   * Le contournement corrigé : une locale percent-encodée (`%66r` → `fr`) COMBINÉE
   * à une extension d'asset échappait aux DEUX entrées du matcher. Le middleware
   * n'était jamais invoqué, le shell `(app)` était servi à un anonyme, et le
   * routeur Next décodait ensuite `%66r` en `fr`. Aucun correctif à l'intérieur du
   * middleware ne pouvait rattraper ça — on n'y entrait pas.
   *
   * ⚠ Si ce test se met à répondre 200, la garde serveur est RE-CONTOURNÉE : ne
   * pas « réparer » l'assertion, corriger `config.matcher`.
   */
  for (const path of [
    '/%66r/products/x.png', // locale encodée + extension d'asset
    '/%66r/dashboard/logo.svg',
    '/%66r/settings/x.css',
    '/%66r/timeline', // locale encodée sans extension (déjà couvert, ancré ici aussi)
  ]) {
    test(`${path} (locale percent-encodée) reste gardé par le middleware`, async ({ page }) => {
      const response = await page.request.get(path, { maxRedirects: 0 })

      expect(response.status(), `${path} doit être intercepté par le middleware, pas servi`).toBe(
        307,
      )

      const location = response.headers()['location']
      expect(location).toBeDefined()
      expect(new URL(location, 'http://localhost').pathname).toBe('/fr/login')

      // Aucun octet du shell protégé.
      const body = await response.text()
      expect(body).not.toContain('data-testid="dashboard"')
      expect(body).not.toContain('data-testid="app-shell"')
    })
  }

  /**
   * #322 — un en-tête d'hôte falsifié ne doit JAMAIS déplacer la cible de la
   * redirection hors de l'origine servie.
   *
   * Ce que ce test ancre, et que `middleware.test.ts` ne peut pas ancrer : le
   * comportement du RUNTIME Next complet (construction d'`initURL`, puis
   * relativisation du `Location` par `resolve-routes.js`), pas celui d'une
   * `NextRequest` fabriquée à la main.
   *
   * ⚠ Il PASSE aussi bien dans le mode dégradé (`APP_CANONICAL_HOST` absente —
   * le cas de la CI) qu'avec la variable configurée : dans les deux cas la cible
   * doit rester l'origine servie. Il vire au rouge si un futur changement rend
   * `request.nextUrl` dépendant des en-têtes (p. ex. `trustHostHeader`) SANS
   * origine canonique configurée. Ne pas « réparer » l'assertion dans ce cas :
   * c'est l'open-redirect d'ADR-004 §Limites qui serait rouvert.
   *
   * `x-forwarded-host` est utilisé plutôt que `Host` : c'est l'en-tête que Next
   * consulte en priorité, et le seul dont on soit certain qu'un client HTTP le
   * transmette sans le réécrire.
   */
  const SPOOFED_HEADERS: Record<string, string>[] = [
    { 'x-forwarded-host': 'evil.example' },
    { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'http' },
  ]

  for (const headers of SPOOFED_HEADERS) {
    test(`un hôte falsifié (${Object.keys(headers).join('+')}) ne déplace pas la cible`, async ({
      page,
      baseURL,
    }) => {
      const response = await page.request.get('/fr/dashboard', { maxRedirects: 0, headers })

      expect(response.status()).toBe(307)

      const location = response.headers()['location']
      expect(location).toBeDefined()

      const target = new URL(location, baseURL)
      expect(target.pathname).toBe('/fr/login')
      expect(target.host, 'la cible ne doit pas partir sur l’hôte injecté').toBe(
        new URL(baseURL!).host,
      )
      expect(location).not.toContain('evil.example')
    })
  }

  test('DÉGRADÉ : un cookie jwt bidon suffit à passer la garde (ADR-004)', async ({
    page,
    context,
    baseURL,
  }) => {
    // ⚠ MISE À JOUR #323 (sprint 50) — ce test décrit désormais le mode DÉGRADÉ,
    // pas le comportement nominal. Depuis #323, le middleware VÉRIFIE la signature
    // RS256 du cookie quand `AUTH_JWT_PUBLIC_KEY` est configurée, et un cookie
    // bidon est alors redirigé (307). L'environnement e2e ne pose PAS cette
    // variable : le backend du job CI signe avec une paire ÉPHÉMÈRE (aucune clé
    // privée n'est committable dans un dépôt PUBLIC), donc aucune clé publique
    // stable n'est publiable au frontend. Le chemin dégradé reste donc le chemin
    // exercé ici, et il doit continuer de fonctionner.
    //
    // La vérification de signature elle-même est couverte en UNITAIRE :
    // `frontend/middleware.test.ts` (§ signature RS256) et
    // `frontend/src/lib/auth-token-verify.test.ts`, et désormais en E2E par
    // `e2e/auth-signature.spec.ts` sur une stack appairée (audit de couverture S50).
    //
    // ⚠ LES DEUX MODES SONT MUTUELLEMENT EXCLUSIFS sur une même instance Next : la
    // variable est lue au RUNTIME par le middleware, une instance est donc soit
    // dégradée, soit vérifiante. Ce cas ne peut pas rester inconditionnel — lancé
    // contre une stack appairée, il échouait (200 attendu, 307 reçu) alors que le
    // code se comportait CORRECTEMENT. On le conditionne donc à la configuration
    // observable, plutôt que de le figer sur un seul des deux mondes :
    //   - clé absente (config CI historique)  -> ce cas s'exécute (contrat #302) ;
    //   - clé présente (stack appairée)       -> `auth-signature.spec.ts` prend le
    //     relais et affirme la 307 sur ce même cookie bidon.
    // Ne pas « réparer » ce test en durcissant l'assertion : ce serait supprimer la
    // couverture du dégradé, qui reste le mode réellement déployé en CI.
    test.skip(
      SIGNATURE_VERIFICATION_CONFIGURED,
      'AUTH_JWT_PUBLIC_KEY configurée : le middleware VÉRIFIE la signature, le cookie bidon ' +
        'est donc rejeté (307). Cas couvert par e2e/auth-signature.spec.ts.',
    )

    // ⚠ `baseURL`, PAS `http://localhost:3000` en dur — REVUE S64. Le cookie doit
    // être posé sur l'origine que la passe interroge RÉELLEMENT. Depuis #462 la CI
    // lève DEUX serveurs (:3000 dégradé, :3001 vérifiant) : une URL figée poserait
    // le cookie sur la mauvaise origine, `page.request.get` partirait sans cookie
    // et le test échouerait sur une 307 inexplicable au lieu de la 200 attendue.
    // Même convention que `auth-signature.spec.ts` (`url: baseURL!`).
    await context.addCookies([{ name: 'jwt', value: 'ceci-n-est-pas-un-jwt', url: baseURL! }])

    const response = await page.request.get('/fr/dashboard', { maxRedirects: 0 })
    expect(response.status()).toBe(200)

    // Le backend refuse (401) et la garde CLIENT prend le relais -> /fr/login.
    await page.goto('/fr/dashboard')
    await expect(page.getByTestId('login-form')).toBeVisible()
  })

  for (const path of PUBLIC_PATHS) {
    test(`${path} reste accessible (pas de boucle de redirection)`, async ({ page }) => {
      const response = await page.request.get(path, { maxRedirects: 0 })
      expect(response.status()).toBe(200)
    })
  }
})

test.describe('Garde serveur — utilisateur authentifié', () => {
  // Compte partagé fixe provisionné par le projet `setup` (cookie JWT HttpOnly
  // réel). ZÉRO register ici : anti rate-limit (5/min/IP). Ce fichier ne MUTE
  // aucun état backend -> pas de `serial` nécessaire.
  test.use({ storageState: SHARED.storageState })

  test('/fr/dashboard est rendu normalement (aucune redirection)', async ({ page }) => {
    const response = await page.request.get('/fr/dashboard', { maxRedirects: 0 })
    expect(response.status()).toBe(200)

    await page.goto('/fr/dashboard')
    await expect(page.getByTestId('dashboard')).toBeVisible()
    await expect(page).toHaveURL(/\/fr\/dashboard$/)
  })

  test('les autres routes protégées ne sont pas redirigées', async ({ page }) => {
    for (const path of ['/fr/timeline', '/fr/products', '/fr/settings']) {
      const response = await page.request.get(path, { maxRedirects: 0 })
      expect(response.status(), `${path} ne doit pas être redirigé`).toBe(200)
    }
  })

  test('non-régression i18n : toutes les locales servent la page connectée', async ({ page }) => {
    // #235 — la composition avec next-intl ne doit pas restreindre les locales.
    // Itère la SOURCE DE VÉRITÉ : une liste en dur raterait une locale ajoutée.
    for (const locale of SUPPORTED_LOCALES) {
      const response = await page.request.get(`/${locale}/dashboard`, { maxRedirects: 0 })
      expect(response.status(), `/${locale}/dashboard doit être servi`).toBe(200)
    }
  })
})
