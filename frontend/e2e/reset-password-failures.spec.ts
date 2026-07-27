import { test, expect, type Page } from '@playwright/test'
// `registerOnly` : implémentation UNIQUE du formulaire d'inscription (revue S45).
// Le helper local dupliquait mot pour mot celui de `support/auth.ts` -> une dérive
// de `data-testid` serait passée inaperçue. `support/auth.ts` n'étant pas un fichier
// de spec, l'importer n'enregistre aucun test en double.
import { registerOnly } from './support/auth'
import { waitForResetToken } from './support/reset-token'

/**
 * #284 — Cas d'ÉCHEC du flux « mot de passe oublié ».
 *
 * Complément de `forgot-password.spec.ts` (#145), qui ne couvre QUE le cas nominal
 * (forgot -> token -> reset -> login avec le NOUVEAU mot de passe). Deux échecs
 * attendus sont testés ici, chacun sur son PROPRE compte :
 *
 *   1. « ancien mot de passe rejeté » — après un reset réussi, la connexion avec
 *      l'ANCIEN mot de passe doit échouer (401, BR-AUT-005) : preuve UI que le hash
 *      BCrypt a bien été réécrit (BR-AUT-002/BR-AUT-012).
 *   2. « token rejoué » — un token déjà consommé est REJETÉ au second usage (400,
 *      BR-AUT-012 : token à usage unique) et n'a AUCUN effet de bord (le mot de
 *      passe reste celui posé par le premier reset).
 *
 * ---------------------------------------------------------------------------
 * MAÎTRISE DU RATE-LIMITING (risque principal de l'issue) — trois garde-fous :
 *
 *  (a) UN COMPTE FRAIS PAR TEST. Les deux tests ne partagent ni compte, ni token,
 *      ni tentative : le throttle PAR TOKEN de `RateLimitingFilter` (#141,
 *      TOKEN_ATTEMPT_LIMIT = 5 tentatives/token/minute) ne peut pas déborder d'un
 *      test sur l'autre. Budget consommé par compte : 1 forgot, <=2 reset, 1 login
 *      — sous TOUTES les limites par IP (forgot 5/min, reset 5/min, login 10/min).
 *
 *  (b) ASSERTIONS SUR LE CODE HTTP RÉEL, pas seulement sur le message affiché.
 *      C'est le point décisif : l'UI rend le MÊME `data-testid` (`reset-error`,
 *      `login-error`) pour un rejet métier et pour un 429 de lockout. Un test qui
 *      n'assertait que la visibilité du message passerait AU VERT alors que le
 *      rate-limiting a mangé la requête — c'est-à-dire réussirait pour la MAUVAISE
 *      raison. On capture donc la réponse et on exige le statut exact attendu
 *      (400 rejet de token / 401 credentials) : un 429 fait échouer le test avec un
 *      diff explicite (`Expected 400, Received 429`), immédiatement diagnosticable.
 *
 *  (c) Le job CI `e2e` pose `RATE_LIMIT_ENABLED=false` (ci.yml, filtre entièrement
 *      bypassé) — le lockout ne devrait donc PAS se déclencher aujourd'hui. Ce
 *      point ne dispense de rien : (a) et (b) gardent la spec valide et
 *      diagnosticable si cette variable disparaît un jour.
 *
 * ---------------------------------------------------------------------------
 * CONTRAINTES (identiques à la spec nominale) :
 *   - sélecteurs `data-testid` UNIQUEMENT ;
 *   - routes préfixées `/fr/...` (next-intl `localePrefix: 'always'`) ;
 *   - mots de passe >= 6 + une MAJ + un chiffre (le form reset n'exige que >= 6,
 *     mais le form REGISTER est plus strict — on garde un jeu commun) ;
 *   - `reset-password` et `login` sont PUBLIQUES : la garde serveur #302
 *     (`middleware.ts`, ADR-004) ne les protège pas, aucune 307 attendue ici.
 *
 * PRÉREQUIS RUNTIME (levés par le job CI `e2e` uniquement) : backend Spring Boot
 * :8080 en `SPRING_PROFILES_ACTIVE=dev,e2e` (le profil `e2e` expose le canal de
 * capture du token, #283/ADR-005), Postgres migré, frontend :3000 avec le proxy
 * `/api/*` -> :8080 (`NEXT_PUBLIC_API_URL=/api`, appels same-origin).
 */

/** Mot de passe posé par le PREMIER reset (celui qui doit rester en vigueur). */
const NEW_PASSWORD = 'E2eReset789'

/**
 * Mot de passe soumis lors du REJEU du token. Doit rester DIFFÉRENT de
 * `NEW_PASSWORD` : c'est ce qui rend l'assertion finale probante (si le rejeu avait
 * été accepté, la connexion avec `NEW_PASSWORD` échouerait).
 */
const REPLAY_PASSWORD = 'E2eReplay321'

/**
 * Demande la réinitialisation depuis l'UI puis retourne le token capté par le canal
 * test-only (#283). `POST /forgot-password` répond 200 neutre AVANT l'INSERT
 * `@Async` du token : `waitForResetToken` poll jusqu'à obtention.
 */
async function requestResetToken(page: Page, email: string): Promise<string> {
  await page.goto('/fr/forgot-password')
  await expect(page.getByTestId('forgot-form')).toBeVisible()
  await page.getByTestId('forgot-email').fill(email)
  await page.getByTestId('forgot-submit').click()

  // BR-AUT-012 : réponse neutre systématique (aucune fuite d'existence du compte).
  await expect(page.getByTestId('forgot-neutral')).toBeVisible()

  const token = await waitForResetToken(page.request, email)
  expect(token).toMatch(/^[0-9a-f-]{36}$/i)
  return token
}

/**
 * Soumet le formulaire de réinitialisation pour `token` et retourne le STATUT HTTP
 * réel de `POST /api/auth/reset-password` (200 succès / 400 token rejeté,
 * BR-AUT-012 / 429 lockout #141 — cf. garde-fou (b) en tête de fichier).
 */
async function submitResetPassword(
  page: Page,
  token: string,
  newPassword: string,
): Promise<number> {
  await page.goto(`/fr/reset-password?token=${encodeURIComponent(token)}`)
  await expect(page.getByTestId('reset-form')).toBeVisible()
  await page.getByTestId('reset-password').fill(newPassword)
  await page.getByTestId('reset-confirm-password').fill(newPassword)

  // Écoute POSÉE AVANT le click (sinon la réponse peut arriver avant l'attente).
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/auth/reset-password' &&
      response.request().method() === 'POST',
  )
  await page.getByTestId('reset-submit').click()
  return (await responsePromise).status()
}

/**
 * Soumet le formulaire de connexion et retourne le STATUT HTTP réel de
 * `POST /api/auth/login` (200 succès / 401 mauvais credentials, BR-AUT-005 /
 * 429 throttle). Ne fait AUCUNE assertion de navigation : c'est à l'appelant.
 */
async function submitLogin(page: Page, username: string, password: string): Promise<number> {
  await page.goto('/fr/login')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await page.getByTestId('login-username').fill(username)
  await page.getByTestId('login-password').fill(password)

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/auth/login' &&
      response.request().method() === 'POST',
  )
  await page.getByTestId('login-submit').click()
  return (await responsePromise).status()
}

test.describe("Réinitialisation de mot de passe : cas d'échec", () => {
  test("l'ancien mot de passe est rejeté après un reset réussi", async ({ page }) => {
    // Compte DÉDIÉ à ce cas (aucun partage avec le test de rejeu -> pas de lockout croisé).
    const identity = await registerOnly(page, 'e2eold')

    const token = await requestResetToken(page, identity.email)

    // ---- Reset nominal : le hash BCrypt est réécrit, le token est consommé. ----
    expect(await submitResetPassword(page, token, NEW_PASSWORD)).toBe(200)
    await expect(page.getByTestId('reset-success')).toBeVisible()

    // ---- UNIQUE tentative de connexion, avec l'ANCIEN mot de passe. -----------
    // 401 attendu (BR-AUT-005, message générique). Un 429 signalerait un lockout,
    // donc un échec pour la mauvaise raison : le diff de statut le rendra explicite.
    expect(await submitLogin(page, identity.username, identity.password)).toBe(401)

    await expect(page.getByTestId('login-error')).toBeVisible()
    // Aucune session ouverte : on reste sur le formulaire, pas de dashboard.
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('dashboard')).toHaveCount(0)
  })

  test('un token de reset déjà consommé est rejeté au rejeu', async ({ page }) => {
    // Compte DÉDIÉ (cf. ci-dessus) : ce test consomme 2 tentatives sur SON token,
    // soit 2/5 du throttle par token (#141) — jamais mutualisé avec l'autre test.
    const identity = await registerOnly(page, 'e2erpl')

    const token = await requestResetToken(page, identity.email)

    // ---- 1er usage : succès, le token passe à l'état consommé (`used_at`). ----
    expect(await submitResetPassword(page, token, NEW_PASSWORD)).toBe(200)
    await expect(page.getByTestId('reset-success')).toBeVisible()

    // ---- 2e usage du MÊME token : rejet. -------------------------------------
    // BR-AUT-012 : token invalide/expiré/consommé/non-UUID -> 400 GÉNÉRIQUE unique
    // (anti-énumération). On n'attend donc aucun message distinctif du cas
    // « consommé » — seulement le 400 et l'erreur générique de l'écran.
    expect(await submitResetPassword(page, token, REPLAY_PASSWORD)).toBe(400)

    await expect(page.getByTestId('reset-error')).toBeVisible()
    await expect(page.getByTestId('reset-success')).toHaveCount(0)

    // ---- Le rejeu n'a produit AUCUN effet de bord. ---------------------------
    // Le mot de passe en vigueur reste celui du 1er reset : si le rejeu avait été
    // accepté, ce login (avec NEW_PASSWORD, pas REPLAY_PASSWORD) échouerait.
    expect(await submitLogin(page, identity.username, NEW_PASSWORD)).toBe(200)
    await expect(page.getByTestId('dashboard')).toBeVisible()
  })
})
