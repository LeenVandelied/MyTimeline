import { test, expect, type Page } from '@playwright/test'
import { uniqueIdentity, type E2eIdentity } from './support/auth'
import { waitForResetToken } from './support/reset-token'

/**
 * #145 — E2E Playwright du flux "mot de passe oublié" (premier E2E cross-system
 * de l'authentification, follow-up Sprint 8).
 *
 * Parcours complet full-stack, piloté 100% par l'UI sur les `data-testid` #53 :
 *   1. Inscription d'un utilisateur frais (écran register) → login.
 *   2. Demande de réinitialisation (écran forgot-password) → message neutre 200
 *      (BR-AUT-005 : réponse indistincte email connu/inconnu).
 *   3. Capture du token de reset (endpoint test-only du backend, cf. support/reset-token.ts :
 *      aucun autre canal n'existe — email NO-OP en test, token jamais loggé).
 *   4. Réinitialisation (écran reset-password?token=…) → succès.
 *   5. Connexion avec le NOUVEAU mot de passe → dashboard (prouve le changement
 *      de hash côté backend, BR-AUT-002/BR-AUT-012).
 *
 * CONTRAINTES respectées :
 *   - Sélecteurs `data-testid` UNIQUEMENT (jamais texte / classe CSS).
 *   - i18n `localePrefix: 'always'` → routes préfixées `/fr/...`.
 *   - Password (ancien ET nouveau) respectant `createRegisterFormSchema` /
 *     `createResetPasswordFormSchema` (≥6 + une MAJ + un chiffre), sinon RHF bloque
 *     le submit (aucune requête backend).
 *   - Parcours NOMINAL = 1 SEUL login réussi (aucune tentative échouée) → ne
 *     déclenche PAS le lockout ajouté par #141 (rate-limit/verrou reset).
 *
 * PRÉREQUIS RUNTIME (levés par le job CI `e2e`) : backend Spring Boot :8080 démarré avec
 * `SPRING_PROFILES_ACTIVE=dev,e2e` (le profil `e2e` expose l'endpoint de capture du token,
 * #283/ADR-004), Postgres migré Flyway V1..Vn, frontend Next.js :3000 avec le proxy
 * `/api/*` -> :8080. Plus AUCUN accès direct à la base depuis la suite E2E. Cf. ci.yml.
 */

/** Nouveau mot de passe distinct de l'initial (createResetPasswordFormSchema : ≥6 + MAJ + chiffre). */
const NEW_PASSWORD = 'E2eReset456'

/**
 * Inscrit un utilisateur frais puis revient sur /fr/login (register redirige vers
 * login après succès). Laisse `page` ANONYME (pas de login) : le parcours de reset
 * teste précisément la (re)connexion. Retourne l'identité pour les étapes suivantes.
 */
async function registerFreshUser(page: Page): Promise<E2eIdentity> {
  const identity = uniqueIdentity('e2ereset')

  await page.goto('/fr/register')
  await expect(page.getByTestId('register-form')).toBeVisible()
  await page.getByTestId('register-email').fill(identity.email)
  await page.getByTestId('register-name').fill(identity.name)
  await page.getByTestId('register-username').fill(identity.username)
  await page.getByTestId('register-password').fill(identity.password)
  await page.getByTestId('register-confirm-password').fill(identity.password)
  await page.getByTestId('register-submit').click()

  // Register OK → redirection vers /fr/login (router.push après succès).
  await expect(page.getByTestId('login-form')).toBeVisible()
  return identity
}

test.describe('Mot de passe oublié : forgot → lien tokenisé → reset → login', () => {
  test('parcours complet full-stack', async ({ page }) => {
    const identity = await registerFreshUser(page)

    // ---- 1. DEMANDE DE RÉINITIALISATION -----------------------------------
    await page.goto('/fr/forgot-password')
    await expect(page.getByTestId('forgot-form')).toBeVisible()
    await page.getByTestId('forgot-email').fill(identity.email)
    await page.getByTestId('forgot-submit').click()

    // BR-AUT-005 : message neutre systématique (200), pas de fuite d'existence.
    await expect(page.getByTestId('forgot-neutral')).toBeVisible()

    // ---- 2. CAPTURE DU TOKEN (endpoint test-only, cf. support/reset-token.ts) ----
    // L'INSERT du token est @Async : on POLL l'endpoint jusqu'à ce qu'il le rende (404
    // tant qu'il n'est pas écrit). `page.request` porte le baseURL -> appel same-origin.
    const token = await waitForResetToken(page.request, identity.email)
    expect(token).toMatch(/^[0-9a-f-]{36}$/i)

    // ---- 3. RÉINITIALISATION (lien tokenisé) ------------------------------
    await page.goto(`/fr/reset-password?token=${encodeURIComponent(token)}`)
    await expect(page.getByTestId('reset-form')).toBeVisible()
    await page.getByTestId('reset-password').fill(NEW_PASSWORD)
    await page.getByTestId('reset-confirm-password').fill(NEW_PASSWORD)
    await page.getByTestId('reset-submit').click()

    // Succès du reset (token consommé côté backend, hash BCrypt réécrit).
    await expect(page.getByTestId('reset-success')).toBeVisible()

    // ---- 4. CONNEXION AVEC LE NOUVEAU MOT DE PASSE ------------------------
    // Unique login du parcours (nominal → pas de lockout #141). Prouve que le
    // hash a bien changé : l'ancien mot de passe n'aurait pas ouvert la session.
    await page.goto('/fr/login')
    await expect(page.getByTestId('login-form')).toBeVisible()
    await page.getByTestId('login-username').fill(identity.username)
    await page.getByTestId('login-password').fill(NEW_PASSWORD)
    await page.getByTestId('login-submit').click()

    // Login OK → cookie JWT HttpOnly posé, AuthContext restaure, dashboard visible.
    await expect(page.getByTestId('dashboard')).toBeVisible()
  })
})
