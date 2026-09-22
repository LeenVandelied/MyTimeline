import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'
import { revealSeededLane } from './support/timeline-lanes'

/**
 * SPRINT 94 — COUCHES DU SHELL vs FRISE EN PLEIN ÉCRAN (#712) et RACCOURCIS SOUS
 * UNE COUCHE MODALE (#672). Deux issues, une seule surface : `TimelineView` et les
 * couches que le SHELL monte HORS d'elle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LE VRAI PLEIN ÉCRAN, ET PAS LE STUB DE `timeline.spec.ts`
 * ─────────────────────────────────────────────────────────────────────────────
 * `timeline.spec.ts` (#330) stube l'API Fullscreen au niveau page, au motif qu'elle
 * n'offrirait « aucune garantie de support en Chromium headless ». MESURÉ ICI (sonde
 * jetable, Playwright 1.61 / Chromium headless de ce dépôt) : `requestFullscreen` ET
 * `exitFullscreen` fonctionnent, avec ou sans geste utilisateur, et
 * `document.fullscreenElement` reflète bien l'élément.
 *
 * Le stub serait ici PLUS FAIBLE que le réel, et pas seulement moins fidèle : le
 * défaut de #712 tient à ce que `exitFullscreen()` est ASYNCHRONE. Un stub qui rend
 * `Promise.resolve()` supprime la course qu'on veut voir. On exerce donc l'API du
 * navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORACLE, ET CE QU'IL N'EST PAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Le symptôme utilisateur de #712 est un défaut de PEINTURE : le navigateur ne peint
 * que l'élément passé à `requestFullscreen`, donc le drawer du shell et le toaster
 * global, montés ailleurs, restent hors champ. Playwright ne mesure PAS la peinture :
 * `toBeVisible()` regarde la boîte et le CSS, et il serait VERT sur le bug
 * ([[PIT-S62-001]] dit la même chose d'`elementsFromPoint`).
 *
 * L'oracle retenu est donc l'INVARIANT qui produit la peinture, et qui est, lui,
 * observable : **tant qu'une couche du shell est ouverte, `document.fullscreenElement`
 * doit valoir `null`**. Avant le correctif il vaut la `<section class="mt-tlv">`.
 * S'y ajoutent le focus (il doit être DANS la couche) et le toast de #621.
 *
 * CE QUE CETTE SPEC NE PROUVE PAS : que les pixels du drawer sont effectivement
 * peints (aucune capture n'est comparée), ni le comportement hors Chromium.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** L'élément en plein écran, décrit par son `data-testid` (ou `null`). */
function fullscreenTestId(page: Page): Promise<string | null> {
  return page.evaluate(() => document.fullscreenElement?.getAttribute('data-testid') ?? null)
}

/** Le `data-testid` de l'ancêtre le plus proche de `document.activeElement` qui en porte un. */
function activeElementTestId(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.activeElement?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
  )
}

async function gotoTimeline(page: Page) {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('timeline-screen')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
}

test.describe('#712 — couches du shell ouvertes depuis la frise en plein écran', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('« Éditer » depuis la frise en plein écran : sortie du plein écran, drawer saisi, toast visible', async ({
    page,
  }) => {
    test.setTimeout(150_000)

    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('712 Cat'))
    const product = await seedProduct(page, {
      userId,
      name: unique('712 Prod'),
      categoryId: cat.id,
    })

    // Titre RÉEL de la pastille lu depuis l'API : ne pas le déduire du nom du produit.
    const listed = await page.request.get(`/api/users/${userId}/products/${product.id}/events`)
    expect(listed.ok(), `GET events doit réussir (obtenu ${listed.status()})`).toBeTruthy()
    const [seeded] = (await listed.json()) as Array<{ id: string; title: string }>
    expect(seeded?.id, 'événement seedé requis').toBeTruthy()

    await gotoTimeline(page)

    // Plein écran RÉEL, par le bouton de la barre d'outils (le clic est le geste
    // utilisateur que l'API exige).
    await page.getByTestId('timeline-fullscreen').click({ timeout: CLICK_BUDGET })
    await expect
      .poll(() => fullscreenTestId(page), {
        message: 'la frise doit être passée en plein écran RÉEL',
        timeout: CLICK_BUDGET,
      })
      .toBe('timeline-view')

    // Après le clic sur la barre d'outils SEULEMENT : tout contrôle cliqué plus haut
    // dans la page re-sort la lane de la bande de rendu (cf. `revealSeededLane`).
    await revealSeededLane(page, { category: cat.name, product: product.name })
    await page
      .locator(`[data-testid="timeline-event"][data-event-title="${seeded.title}"]`)
      .first()
      .click({ timeout: CLICK_BUDGET })

    // `EventDrawer` est DANS `rootRef` : il est peint en plein écran, rien à quitter.
    await expect(page.getByTestId('timeline-drawer')).toBeVisible({ timeout: CLICK_BUDGET })
    expect(
      await fullscreenTestId(page),
      'le drawer de détail vit DANS la frise : ouvrir ne doit PAS quitter le plein écran',
    ).toBe('timeline-view')

    await page.getByTestId('event-drawer-edit').click({ timeout: CLICK_BUDGET })

    const dialog = page.getByTestId('timeline-edit-dialog')
    await expect(dialog).toBeVisible({ timeout: CLICK_BUDGET })

    // LE DÉFAUT DE #712. Sans le correctif, la valeur lue ici est `timeline-view` :
    // le drawer d'édition est monté hors de l'élément peint, donc invisible.
    await expect
      .poll(() => fullscreenTestId(page), {
        message:
          "LE DÉFAUT DE #712 : le drawer d'édition est monté hors de la frise ; " +
          'le plein écran doit être quitté AVANT son ouverture',
        timeout: CLICK_BUDGET,
      })
      .toBeNull()

    // Focus non piégé hors champ : il est DANS le drawer d'édition, lui-même hors
    // plein écran (assertion précédente) — donc dans une zone peinte.
    expect(
      await page.evaluate(() => {
        const host = document.querySelector('[data-testid="timeline-edit-dialog"]')
        return Boolean(host && document.activeElement && host.contains(document.activeElement))
      }),
      'le focus doit être DANS le drawer d’édition',
    ).toBe(true)

    // Toast de confirmation (#621) : lui aussi hors `rootRef` (toaster du layout).
    const newTitle = unique('712 Edited')
    await page.getByTestId('event-form-title-input').fill(newTitle)
    const patched = page.waitForResponse(
      (r) => /\/api\/events\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
    )
    await page.getByTestId('event-form-submit').click({ timeout: CLICK_BUDGET })
    expect((await patched).status(), 'PATCH /api/events/{id} doit réussir').toBe(200)
    await expect(dialog).toBeHidden({ timeout: CLICK_BUDGET })

    const toast = page
      .locator('#_rht_toaster')
      .getByRole('status')
      .filter({ hasText: 'Événement modifié' })
    await expect(toast).toBeVisible({ timeout: CLICK_BUDGET })
    expect(
      await fullscreenTestId(page),
      'le toaster est global au layout : il doit être annoncé hors plein écran',
    ).toBeNull()
  })

  test('« Nouvel événement » depuis la frise en plein écran : sortie du plein écran, panneau saisi', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('712 New Cat'))
    await seedProduct(page, { userId, name: unique('712 New Prod'), categoryId: cat.id })
    await gotoTimeline(page)

    await page.getByTestId('timeline-fullscreen').click({ timeout: CLICK_BUDGET })
    await expect.poll(() => fullscreenTestId(page), { timeout: CLICK_BUDGET }).toBe('timeline-view')

    await page.getByTestId('timeline-new-event').click({ timeout: CLICK_BUDGET })
    await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible({ timeout: CLICK_BUDGET })

    // #602 posait déjà la garde, mais SANS attendre la promesse d'`exitFullscreen`.
    // C'est cette attente (#712) que le `poll` ci-dessous ne suffirait pas à prouver
    // seul — d'où l'assertion de focus qui suit, prise dans la foulée.
    await expect.poll(() => fullscreenTestId(page), { timeout: CLICK_BUDGET }).toBeNull()
    expect(await activeElementTestId(page)).toBe('shell-new-event-drawer-close')
  })
})
