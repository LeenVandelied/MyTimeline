import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #672 — L'E2E manquant de la vague 1 du sprint 94 (l'exclusivité Playwright était
 * alors détenue par une autre issue ; l'issue n'avait été livrée qu'avec des tests
 * unitaires, `TimelineView.modal-shortcuts.test.tsx`).
 *
 * LE CORRECTIF RELU DANS LE CODE LIVRÉ (`1be053a9`), pas dans l'énoncé de l'issue :
 * `isOverlayLayerOpen()` est posé en tête du gestionnaire clavier global de
 * `TimelineView`. Toute couche `[role=dialog]` / `[role=alertdialog]` montée HORS de
 * `rootRef` suspend `F`/`T`/`+`/`-`/`[`/`]` ET `Échap`. Les couches montées DANS
 * `rootRef` (le drawer de détail de la frise, les sheets mobiles) sont exclues : les
 * raccourcis y restent actifs.
 *
 * NON-VACUITÉ. Les frappes partent de l'élément FOCALISÉ — le bouton de fermeture
 * saisi par le focus-trap du panneau — jamais d'un champ de saisie : la garde
 * `typing` préexistante couvrait déjà les `<input>`, un test qui en viserait un
 * serait VACUOUS ([[PIT-S82-001]]).
 *
 * CONTREPARTIE OBLIGATOIRE. La seconde moitié du test rejoue les mêmes touches une
 * fois le panneau FERMÉ et exige qu'elles agissent. Sans elle, une frise entièrement
 * inerte (raccourcis cassés partout) rendrait la première moitié verte
 * ([[PIT-S85-005]]).
 *
 * CE QUE CETTE SPEC NE PROUVE PAS : le comportement sous les autres couches du shell
 * (édition, confirmations Radix), couvert unitairement ; ni hors Chromium.
 *
 * #597 (S105) — `F` RECADRE désormais la frise (il ne passe plus en plein écran : seul
 * le bouton `timeline-fullscreen` le fait). La moitié « panneau ouvert » le couvrait
 * déjà par ses relevés de zoom et de défilement ; la contrepartie exige maintenant que
 * `F` DÉPLACE la vue, et entre en plein écran par le bouton pour garder la sortie par
 * Échap sous test.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

const DESKTOP = { width: 1280, height: 900 }
const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000
/** Nombre de niveaux de zoom (`ZOOM_LEVELS`) : autant de `=` atteignent la borne `day`. */
const ZOOM_LEVEL_COUNT = 5

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
test.describe('#672 — raccourcis de la frise sous le panneau de création du shell', () => {
  test.use({ storageState: PROD.storageState, viewport: DESKTOP })

  test('panneau ouvert : F/T/+/] sans effet ; panneau fermé : les mêmes touches agissent', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('672 Cat'))
    await seedProduct(page, { userId, name: unique('672 Prod'), categoryId: cat.id })
    await gotoTimeline(page)

    const zoomLevel = page.getByTestId('timeline-zoom-level')
    const scrollLeft = () =>
      page.getByTestId('timeline-scroll').evaluate((el) => Math.round(el.scrollLeft))

    await page.getByTestId('timeline-new-event').click({ timeout: CLICK_BUDGET })
    const panel = page.getByTestId('shell-new-event-drawer')
    await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })

    // Non-vacuité : le focus-trap saisit un BOUTON, pas un champ de saisie.
    expect(
      await activeElementTestId(page),
      'le focus-trap doit saisir le bouton de fermeture (sinon la garde `typing` suffirait)',
    ).toBe('shell-new-event-drawer-close')

    const levelBefore = await zoomLevel.textContent()
    const scrollBefore = await scrollLeft()

    // `=` plutôt que `+` : `keyboard.press` traite `+` comme séparateur de modificateur.
    // Le gestionnaire les traite à l'identique (`case '+': case '=':`).
    for (const key of ['f', 'F', 't', 'T', '=', '-', ']', '[']) {
      await page.keyboard.press(key)
    }

    await expect(panel, 'le panneau doit rester ouvert').toBeVisible()
    expect(await zoomLevel.textContent(), 'le zoom ne doit pas bouger').toBe(levelBefore)
    expect(await scrollLeft(), 'la fenêtre temporelle ne doit pas bouger').toBe(scrollBefore)
    expect(await fullscreenTestId(page), 'F ne doit pas passer la frise en plein écran').toBeNull()

    // Échap est traité par la couche elle-même — elle se ferme, la frise ne bouge pas.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden({ timeout: CLICK_BUDGET })
    expect(await fullscreenTestId(page)).toBeNull()

    // ── CONTREPARTIE : les raccourcis reviennent une fois la couche démontée ──
    // Aucun clic de « reprise » : le focus-trap rend le focus au bouton d'ouverture,
    // et les frappes partent donc du même genre d'élément qu'au-dessus (un BUTTON).
    await page.keyboard.press(']')
    await expect
      .poll(scrollLeft, {
        message: '] doit déplacer la fenêtre temporelle une fois le panneau fermé',
        timeout: CLICK_BUDGET,
      })
      .not.toBe(scrollBefore)

    await page.keyboard.press('=')
    await expect(zoomLevel, '= doit changer le niveau de zoom').not.toHaveText(levelBefore ?? '', {
      timeout: CLICK_BUDGET,
    })

    // #597 — F RECADRE. Point de départ où tout cadrage DÉPLACE la vue : zoom `day`
    // (borne fine) et défilement au bord droit. Le produit semé porte un événement
    // (aujourd'hui) : `rangeEnd` ≥ dernier événement + 30 j, donc le cadrage — centré
    // ou aligné à gauche — vise un `scrollLeft` < maximum, à tout niveau.
    for (let i = 0; i < ZOOM_LEVEL_COUNT; i += 1) await page.keyboard.press('=')
    await expect(page.getByTestId('timeline-zoom-in')).toBeDisabled({ timeout: CLICK_BUDGET })
    const atRightEdge = await page.getByTestId('timeline-scroll').evaluate((el) => {
      el.scrollTo({ left: el.scrollWidth, behavior: 'instant' })
      return Math.round(el.scrollLeft)
    })
    const viewBefore = { level: await zoomLevel.textContent(), scroll: atRightEdge }
    await page.keyboard.press('f')
    await expect
      .poll(async () => ({ level: await zoomLevel.textContent(), scroll: await scrollLeft() }), {
        message: 'F doit recadrer la frise une fois le panneau fermé',
        timeout: CLICK_BUDGET,
      })
      .not.toEqual(viewBefore)
    expect(await fullscreenTestId(page), 'F ne passe plus en plein écran (#597)').toBeNull()

    // Le plein écran reste accessible par son bouton, et Échap le quitte toujours.
    await page.getByTestId('timeline-fullscreen').click({ timeout: CLICK_BUDGET })
    await expect
      .poll(() => fullscreenTestId(page), {
        message: 'le bouton doit passer la frise en plein écran',
        timeout: CLICK_BUDGET,
      })
      .toBe('timeline-view')

    // Rendre la page à son état normal (le contexte est réutilisé par le teardown).
    await page.keyboard.press('Escape')
    await expect.poll(() => fullscreenTestId(page), { timeout: CLICK_BUDGET }).toBeNull()
  })
})
