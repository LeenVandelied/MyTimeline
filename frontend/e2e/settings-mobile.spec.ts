import { test, expect } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { SHARED } from './support/accounts'

/**
 * #87 — E2E Réglages MOBILE (375px, iPhone 14 ~390 / Android réf ~360) :
 * drill-down (index -> détail -> retour) + bottom sheet de suppression de compte
 * (2 étapes). Piloté par `data-testid`, i18n `/fr/...` (localePrefix always).
 *
 * PRÉREQUIS RUNTIME (job CI `e2e`) : backend Spring Boot (:8080) + Postgres,
 * frontend Next (:3000). Auth via `storageState` (compte fixe, projet `setup`) ->
 * ZÉRO register par test (anti rate-limit register 5/min/IP). On NE confirme PAS la
 * suppression (le compte partagé ne doit pas être détruit) : on vérifie l'ouverture
 * du sheet + le passage à l'étape confirmation, puis la fermeture par backdrop.
 */
test.use({ viewport: { width: 375, height: 812 }, storageState: SHARED.storageState })

test.describe('Réglages mobile : drill-down + bottom sheet suppression', () => {
  test('index -> détail -> retour, puis bottom sheet suppression compte', async ({ page }) => {
    // Auth restaurée depuis le cookie (storageState) sur le dashboard.
    await ensureAuthenticated(page)

    // ---- Accès Réglages : index mobile visible (drill-down) ---------------
    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('settings-index')).toBeVisible()
    // La coquille desktop (tablist) ne doit PAS être montée en mobile.
    await expect(page.getByTestId('settings-tablist')).toHaveCount(0)

    // ---- Drill-down : Profil -> retour ------------------------------------
    await page.getByTestId('settings-index-profile').click()
    await expect(page.getByTestId('mobile-settings-detail-profile')).toBeVisible()
    await expect(page.getByTestId('profile-username')).toHaveValue(SHARED.username)
    await page.getByTestId('mobile-settings-back').click()
    await expect(page.getByTestId('settings-index')).toBeVisible()

    // ---- Chapitre Compte -> bottom sheet suppression (2 étapes) -----------
    await page.getByTestId('settings-index-account').click()
    await expect(page.getByTestId('mobile-settings-detail-account')).toBeVisible()
    await page.getByTestId('delete-account-open').click()

    const sheet = page.getByTestId('delete-account-sheet')
    await expect(sheet).toBeVisible()
    // Étape 1 (avertissement) -> étape 2 (confirmation par username).
    await page.getByTestId('delete-account-continue').click()
    await expect(page.getByTestId('delete-account-form')).toBeVisible()
    await expect(page.getByTestId('delete-account-username')).toBeVisible()

    // ---- Fermeture par tap backdrop ---------------------------------------
    await page.getByTestId('delete-account-sheet-backdrop').click()
    await expect(sheet).toHaveCount(0)
  })

  /**
   * #633 — cible tactile du bouton retour (WCAG 2.5.5 « Target Size (Minimum) »).
   *
   * Le bouton était en `h-9 w-9` (36px) SANS zone d'expansion, seule exception du
   * produit au seuil de 44px du handoff (token `--space-11`). Il est passé à
   * `h-11 w-11`. Cette spec MESURE la boîte rendue : c'est le seul oracle: la valeur
   * lue dans la classe Tailwind est DÉCLARÉE, pas mesurée, et un test de géométrie
   * sous jsdom ne prouverait rien (jsdom ne met pas en page).
   *
   * Le viewport 375px et la session viennent du `test.use` en tête de fichier.
   */
  test('bouton retour : cible tactile >= 44x44 et en-tête sans débordement', async ({ page }) => {
    await ensureAuthenticated(page)
    await page.goto('/fr/settings', { waitUntil: 'domcontentloaded' })

    // Le bouton retour n'existe que sur un écran DÉTAIL (l'index n'en a pas).
    await expect(page.getByTestId('settings-index')).toBeVisible()
    await page.getByTestId('settings-index-preferences').click()
    await expect(page.getByTestId('mobile-settings-detail-preferences')).toBeVisible()

    // ---- Critère 1 : 44x44 de cible effective -----------------------------
    const back = page.getByTestId('mobile-settings-back')
    await expect(back).toBeVisible()
    const box = await back.boundingBox()
    expect(box, 'le bouton retour doit avoir une boîte rendue').not.toBeNull()
    // `!` sûr : l'assertion ci-dessus a déjà échoué si la boîte est nulle.
    expect.soft(box!.width, 'largeur de la cible tactile').toBeGreaterThanOrEqual(44)
    expect.soft(box!.height, 'hauteur de la cible tactile').toBeGreaterThanOrEqual(44)

    // ---- Critère 2 : l'en-tête absorbe l'agrandissement -------------------
    // Le titre du chapitre reste visible et n'est pas poussé hors du viewport
    // par les 8px gagnés en largeur par le bouton.
    // Locator STRUCTUREL (le `<span>` frère du bouton dans l'en-tête) et non
    // `getByText('Préférences')` : la section elle-même porte ce même libellé,
    // un locator textuel apparierait plusieurs noeuds.
    const title = back.locator('xpath=following-sibling::span')
    await expect(title).toBeVisible()
    await expect(title).toHaveText('Préférences')
    const titleBox = await title.boundingBox()
    expect(titleBox, 'le titre du chapitre doit avoir une boîte rendue').not.toBeNull()
    expect.soft(titleBox!.x + titleBox!.width, 'bord droit du titre').toBeLessThanOrEqual(375)

    // Aucun débordement horizontal du document au viewport mobile.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect.soft(overflow, 'débordement horizontal du document (px)').toBeLessThanOrEqual(0)

    // ---- Le bouton reste FONCTIONNEL après l'agrandissement ---------------
    await back.click()
    await expect(page.getByTestId('settings-index')).toBeVisible()
  })
})
