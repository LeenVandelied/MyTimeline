import { expect, type Page } from '@playwright/test'

/**
 * Helper d'auth E2E factorisé (register UI -> login UI -> cookie JWT HttpOnly).
 *
 * Reprend le pattern EXACT des specs existantes (golden-path, settings-*) :
 *  - identité UNIQUE par run (`Date.now()` + aléatoire) -> retry CI safe, aucune
 *    collision username/email ;
 *  - routes localisées `/fr/...` (next-intl `localePrefix: 'always'`) ;
 *  - sélecteurs `data-testid` UNIQUEMENT ;
 *  - password respectant `createRegisterFormSchema` (>= 6 + une MAJ + un chiffre),
 *    faute de quoi RHF bloque le submit (pas de POST /auth/register).
 *
 * Après cette fonction, `page` porte le cookie de session : `page.request.*`
 * partage ce cookie (same-origin via le proxy Next `/api`).
 */

export interface E2eIdentity {
  username: string
  name: string
  email: string
  password: string
  suffix: string
}

/** Identité unique par run (évite les collisions username/email au retry CI). */
export function uniqueIdentity(prefix = 'e2e'): E2eIdentity {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  return {
    // username & name bornés 3..20 (BR-AUT-003 + schéma register name.max=20).
    username: `${prefix}${suffix}`.slice(0, 20),
    name: `${prefix}${suffix}`.slice(0, 20),
    email: `${prefix}_${suffix}@example.com`,
    password: 'E2ePass123',
    suffix,
  }
}

/**
 * Inscrit puis connecte un nouvel utilisateur, laissant `page` sur le dashboard
 * avec un cookie JWT valide. Retourne l'identité pour les assertions suivantes.
 */
export async function registerAndLogin(page: Page, prefix = 'e2e'): Promise<E2eIdentity> {
  const identity = uniqueIdentity(prefix)

  // ---- Inscription -------------------------------------------------------
  await page.goto('/fr/register')
  await expect(page.getByTestId('register-form')).toBeVisible()
  await page.getByTestId('register-email').fill(identity.email)
  await page.getByTestId('register-name').fill(identity.name)
  await page.getByTestId('register-username').fill(identity.username)
  await page.getByTestId('register-password').fill(identity.password)
  await page.getByTestId('register-confirm-password').fill(identity.password)
  await page.getByTestId('register-submit').click()

  // Register OK -> redirection vers /fr/login (router.push après succès).
  await expect(page.getByTestId('login-form')).toBeVisible()

  // ---- Connexion ---------------------------------------------------------
  await page.getByTestId('login-username').fill(identity.username)
  await page.getByTestId('login-password').fill(identity.password)
  await page.getByTestId('login-submit').click()

  // Login OK -> cookie JWT HttpOnly posé, AuthContext restaure, redirection dashboard.
  await expect(page.getByTestId('dashboard')).toBeVisible()

  return identity
}

/**
 * Attend que la session (cookie storageState) soit RESTAURÉE côté client avant de
 * naviguer vers une route protégée. Avec `storageState`, la page démarre anonyme :
 * `AuthProvider` re-fetch `GET /api/auth/me` au montage, et tant que ce fetch n'a
 * pas abouti une route protégée peut redirect vers /fr/login (redirection
 * concurrente -> `net::ERR_ABORTED` sur un `goto` lancé trop tôt).
 *
 * On stabilise donc l'auth sur le DASHBOARD (route protégée simple) : une fois
 * `dashboard` visible, le cookie est validé et l'état auth est restauré ; les
 * navigations suivantes (`/fr/settings`) ne redirigent plus vers login.
 */
export async function ensureAuthenticated(page: Page): Promise<void> {
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('dashboard')).toBeVisible()
}

/**
 * Ouvre les Réglages (desktop) via navigation directe et se place sur le
 * chapitre désiré (tablist WAI-ARIA). Suppose une viewport >= 768px.
 *
 * Fiabilisation (BUG navigation `ERR_ABORTED`) :
 *  - on s'assure d'abord que l'auth est restaurée (`ensureAuthenticated`) pour
 *    éviter une redirection concurrente vers /fr/login pendant le `goto` ;
 *  - `waitUntil: 'domcontentloaded'` (ne bloque pas sur les requêtes réseau
 *    tardives, ex. image d'avatar) puis attente explicite de `settings-page` ;
 *  - petit retry de navigation si la page settings n'apparaît pas (redirection
 *    résiduelle rare au tout premier rendu).
 */
export async function openSettingsChapter(
  page: Page,
  chapter: 'profile' | 'security' | 'preferences' | 'account',
): Promise<void> {
  await ensureAuthenticated(page)

  await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
  try {
    await expect(page.getByTestId('settings-page')).toBeVisible({ timeout: 10_000 })
  } catch {
    // Redirection résiduelle (retour sur login le temps de la restauration) : on
    // re-stabilise l'auth et on retente une fois la navigation vers les réglages.
    await ensureAuthenticated(page)
    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-page')).toBeVisible()
  }

  await expect(page.getByTestId('settings-tablist')).toBeVisible()
  await page.getByTestId(`settings-tab-${chapter}`).click()
  await expect(page.getByTestId(`settings-tab-${chapter}`)).toHaveAttribute(
    'aria-selected',
    'true',
  )
}

/**
 * Buffer d'un PNG 1×1 VALIDE (en-tête + IHDR + IDAT + IEND). `Image().onload` se
 * déclenche dessus -> le cropper d'avatar peut produire un blob PNG à confirmer.
 * (Un buffer bidon ne chargerait pas -> pas de <canvas> -> confirmCrop no-op.)
 */
export function minimalPngBuffer(): Buffer {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  return Buffer.from(base64, 'base64')
}
