import { expect, test } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #326 (Sprint 70) — APERÇU ÉPINGLÉ EN HAUT DU DRAWER DE CRÉATION (handoff §6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * Les tests unitaires (`NewEventDrawer.test.tsx`, `EventEditForm.test.tsx`)
 * prouvent la STRUCTURE : le bloc d'aperçu est portalisé hors de
 * `.mt-drawer__body`. Ils ne peuvent RIEN prouver de l'effet observable — jsdom
 * ne met rien en page, n'a pas de zone de défilement et rend un `scrollTop`
 * qu'il ne clampe pas ([[jsdom-scroll-tests-prove-nothing]]). Seul un moteur de
 * rendu peut établir que l'aperçu NE BOUGE PAS quand le formulaire défile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. le corps du drawer DÉBORDE réellement (précondition assertée : sans
 *      débordement, « l'aperçu n'a pas bougé » serait vrai *vacuellement*) ;
 *   2. le corps a RÉELLEMENT défilé (`scrollTop > 0` après la commande) ;
 *   3. l'aperçu conserve la MÊME ordonnée à l'écran, et reste dans le tiers
 *      haut du panneau ;
 *   4. TÉMOIN — un champ resté en flux (`event-form-color-input`) a, lui,
 *      remonté. Sans ce témoin, un défilement silencieusement inopérant ferait
 *      passer le test alors que rien n'est épinglé.
 *
 * CE QU'ELLE NE PROUVE PAS : le rendu visuel de la mini-frise elle-même
 * (couleurs, lisibilité clair/sombre) — périmètre de l'issue #325.
 *
 * PÉRIMÈTRE : variante DRAWER (>= lg) uniquement. La bottom sheet garde
 * volontairement l'aperçu en flux (#79 : la hauteur visible y est rare).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api`.
 */

/** Desktop volontairement COURT : garantit que le formulaire déborde du corps. */
const DESKTOP_SHORT = { width: 1280, height: 700 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** Tolérance de mesure (sous-pixel du moteur de rendu). */
const EPSILON = 1.5

test.describe('#326 — aperçu épinglé en haut du drawer de création', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP_SHORT })

  test('l’aperçu reste à sa place pendant que le formulaire défile', async ({ page }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)

    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })

    // BR-EVE-002 : sans produit, le drawer ne rend aucun formulaire.
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('326 Preview Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('326 Preview Prod'),
      categoryId: cat.id,
    })
    await ensureAuthenticated(page)

    await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })

    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
    // Oracle de CHEMIN : sans `.mt-drawer--form` on mesurerait la bottom sheet,
    // qui n'épingle rien — le test passerait pour la mauvaise raison.
    await expect(panel).toHaveClass(/(^|\s)mt-drawer--form(\s|$)/)

    await page
      .getByTestId('shell-new-event-drawer-product-trigger')
      .click({ timeout: CLICK_BUDGET })
    await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('event-form')).toBeVisible()

    const host = page.getByTestId('shell-new-event-drawer-preview')
    await expect(host).toBeVisible()
    await expect(
      host.getByTestId('event-form-preview'),
      'la mini-frise doit être PORTALISÉE dans le bandeau (un seul exemplaire)',
    ).toHaveCount(1)
    await expect(page.getByTestId('event-form-preview')).toHaveCount(1)

    const body = page.locator('.mt-drawer__body')
    const witness = page.getByTestId('event-form-color-input')
    await expect(witness).toBeVisible()

    // ── (1) PRÉCONDITION : le corps déborde vraiment ─────────────────────────
    const overflow = await body.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(
      overflow,
      'le corps du drawer doit DÉBORDER, sinon « l’aperçu n’a pas bougé » ne prouve rien',
    ).toBeGreaterThan(80)

    const beforeHost = await host.boundingBox()
    const beforeWitness = await witness.boundingBox()
    expect(beforeHost, 'le bandeau d’aperçu doit avoir une boîte').not.toBeNull()
    expect(beforeWitness, 'le témoin doit avoir une boîte').not.toBeNull()

    // ── (2) DÉFILEMENT RÉEL ──────────────────────────────────────────────────
    // Affectation directe (pas de `mouse.wheel`) : `.mt-drawer__body` ne porte
    // aucun `scroll-behavior:smooth`, la valeur est donc posée sans animation —
    // mais on la RELIT quand même plutôt que de la supposer ([[PIT-S63-015]]).
    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await expect
      .poll(async () => body.evaluate((el) => el.scrollTop), {
        message: 'le corps doit avoir RÉELLEMENT défilé (sinon le test est vacuellement vert)',
        timeout: 5_000,
      })
      .toBeGreaterThan(0)

    const afterHost = await host.boundingBox()
    const afterWitness = await witness.boundingBox()
    expect(afterHost).not.toBeNull()
    expect(afterWitness).not.toBeNull()

    // ── (4) TÉMOIN : le contenu en flux, lui, a bougé ────────────────────────
    expect(
      beforeWitness!.y - afterWitness!.y,
      'un champ resté en flux DOIT être remonté par le défilement — sans quoi le ' +
        'défilement n’a rien fait et l’immobilité de l’aperçu ne prouve rien',
    ).toBeGreaterThan(20)

    // ── (3) L'APERÇU N'A PAS BOUGÉ ───────────────────────────────────────────
    expect(
      Math.abs(afterHost!.y - beforeHost!.y),
      'LE DÉFAUT DE L’ISSUE : avant #326 l’aperçu vivait dans le flux du ' +
        'formulaire, sous le champ Couleur — il défilait donc avec lui',
    ).toBeLessThanOrEqual(EPSILON)
    await expect(host).toBeVisible()

    // …et il est bien EN HAUT : collé sous l'en-tête, dans le tiers haut du panneau.
    const panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    expect(
      afterHost!.y - panelBox!.y,
      'l’aperçu doit rester dans le tiers HAUT du drawer (handoff §6)',
    ).toBeLessThan(panelBox!.height / 3)
  })
})
