import { expect, test } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #495 (Sprint 71) — APERÇU ÉPINGLÉ SUR LA SURFACE D'ÉDITION (handoff §6, qui dit
 * « création / édition » ; le S70 n'avait livré que la création, cf. #326).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * Les 3 tests unitaires ajoutés à `TimelineEditHost.test.tsx` prouvent l'ARBRE DOM
 * (l'aperçu est portalisé dans le nœud d'en-tête) et la CLASSE du libellé. Ils ne
 * prouvent RIEN de l'effet observable : jsdom ne met pas en page, n'applique pas
 * `position:sticky` et ne clampe pas `scrollTop`
 * ([[jsdom-scroll-tests-prove-nothing]]). Seul un moteur de rendu peut établir que
 * l'aperçu NE BOUGE PAS quand le formulaire défile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DIFFÉRENCE STRUCTURELLE AVEC #326 — ce que cette spec mesure vraiment
 * ─────────────────────────────────────────────────────────────────────────────
 * Sur le drawer de CRÉATION, l'épinglage est STRUCTUREL : le nœud hôte est un
 * FRÈRE de `.mt-drawer__body`, hors de la zone défilante (PAT-S70-001).
 * Ici, la zone défilante EST `DialogContent` lui-même (`overflow-y-auto`) : il
 * n'existe aucun frère où se placer. L'aperçu est donc hébergé DANS le bloc
 * d'en-tête déjà `sticky top-0 z-10` — l'immobilité repose sur `position:sticky`,
 * que jsdom n'évalue pas du tout. **Cette spec est donc la SEULE preuve du
 * comportement livré**, pas un complément de confort.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC PROUVE
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. le dialog DÉBORDE réellement (sans débordement, « l'aperçu n'a pas bougé »
 *      serait vrai *vacuellement*) ;
 *   2. le dialog a RÉELLEMENT défilé (`scrollTop > 0` relu, pas supposé) ;
 *   3. l'aperçu conserve la même ordonnée à l'écran et reste dans le tiers haut ;
 *   4. TÉMOIN — un champ resté en flux (`event-form-color-input`) a, lui, remonté.
 *      Sans ce témoin, un défilement inopérant rendrait le test vert à tort.
 *
 * CE QU'ELLE NE PROUVE PAS : le rendu visuel de la mini-frise (couleurs, contraste
 * clair/sombre) — couvert par `sprint-70-preview-visual.spec.ts` sur la surface de
 * création, NON re-mesuré ici sur la surface d'édition.
 *
 * PÉRIMÈTRE : variante PANNEAU LATÉRAL (>= 640px) uniquement. Sous 640px le dialog
 * est une bottom sheet `max-h-[92vh]` où l'aperçu reste volontairement EN FLUX
 * (même arbitrage que #326 pour la sheet de création).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

/** Desktop volontairement COURT : garantit que le formulaire déborde du dialog. */
const DESKTOP_SHORT = { width: 1280, height: 700 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** Tolérance de mesure (sous-pixel du moteur de rendu). */
const EPSILON = 1.5

test.describe('#495 — aperçu épinglé sur la surface d’édition', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP_SHORT })

  test('l’aperçu reste à sa place pendant que le formulaire d’édition défile', async ({ page }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)

    await ensureAuthenticated(page)

    // `seedProduct` couple un premier événement au produit : c'est lui qu'on éditera.
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('495 Edit Preview Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('495 Edit Preview Prod'),
      categoryId: cat.id,
    })

    // Chemin DESKTOP d'ouverture de l'édition (#absorb gap A) : frise du détail
    // produit -> `EventDrawer` (détail, LECTURE SEULE) -> bouton « Éditer ».
    await page.goto(`/fr/products/${product.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: FIRST_NAV_BUDGET,
    })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('product-detail-timeline')).toBeVisible()

    await page.getByTestId('timeline-event').first().click({ timeout: CLICK_BUDGET })
    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    const dialog = page.getByTestId('timeline-edit-dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('event-form')).toBeVisible()

    const host = page.getByTestId('timeline-edit-dialog-preview')
    await expect(host).toBeVisible()
    await expect(
      host.getByTestId('event-form-preview'),
      'la mini-frise doit être PORTALISÉE dans l’en-tête (un seul exemplaire)',
    ).toHaveCount(1)
    // Un second exemplaire casserait les sélecteurs des specs existantes.
    await expect(page.getByTestId('event-form-preview')).toHaveCount(1)

    const witness = page.getByTestId('event-form-color-input')
    await expect(witness).toBeVisible()

    // ── (1) PRÉCONDITION : le dialog déborde vraiment ────────────────────────
    const overflow = await dialog.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(
      overflow,
      'le dialog d’édition doit DÉBORDER, sinon « l’aperçu n’a pas bougé » ne prouve rien',
    ).toBeGreaterThan(80)

    const beforeHost = await host.boundingBox()
    const beforeWitness = await witness.boundingBox()
    expect(beforeHost, 'le bandeau d’aperçu doit avoir une boîte').not.toBeNull()
    expect(beforeWitness, 'le témoin doit avoir une boîte').not.toBeNull()

    // ── (2) DÉFILEMENT RÉEL ──────────────────────────────────────────────────
    // On RELIT `scrollTop` au lieu de le supposer ([[PIT-S63-015]]).
    await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await expect
      .poll(async () => dialog.evaluate((el) => el.scrollTop), {
        message: 'le dialog doit avoir RÉELLEMENT défilé (sinon le test est vacuellement vert)',
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
      'LE DÉFAUT DE L’ISSUE : avant #495 l’aperçu de l’ÉDITION vivait dans le flux ' +
        'du formulaire, sous le champ Couleur — il défilait donc avec lui',
    ).toBeLessThanOrEqual(EPSILON)
    await expect(host).toBeVisible()

    // …et il est bien EN HAUT : collé sous le titre, dans le tiers haut du dialog.
    const dialogBox = await dialog.boundingBox()
    expect(dialogBox).not.toBeNull()
    expect(
      afterHost!.y - dialogBox!.y,
      'l’aperçu doit rester dans le tiers HAUT du dialog d’édition (handoff §6)',
    ).toBeLessThan(dialogBox!.height / 3)
  })
})
