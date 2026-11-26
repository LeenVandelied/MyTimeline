import { test, expect, type Locator, type Page } from '@playwright/test'
import { ensureAuthenticated, openSettingsChapter } from './support/auth'
import { SHARED } from './support/accounts'
import { sessionState } from './support/session'

/**
 * #734 — Deux comportements d'erreur livrés au Sprint 95, prouvés dans un vrai
 * navigateur (ils ne l'étaient qu'en jsdom).
 *
 * T1 : un 400 de changement de mot de passe n'est signalé qu'UNE fois, sous le champ
 *      (opt-out `INLINE_VALIDATION_ENDPOINTS` de `apiClient.ts`, #713).
 * T2 : en `en`, un 500 sur un appel de données lève un toast en anglais, ce qui prouve
 *      que `ApiErrorTranslatorBridge` est bien monté par le vrai layout `[locale]`.
 *
 * Les deux tests ne modifient aucune donnée : SHARED, session par `storageState`.
 *
 * ⚠ T2 n'asserte RIEN sur la bannière hors ligne : un 500 alimente aussi le bus réseau
 * (`reportServerError`), la bannière peut donc apparaître ou non selon la course avec les
 * autres requêtes de la page.
 */
test.use({ storageState: sessionState(SHARED) })

/** Les cartes de toast, cherchées dans l'hôte unique (`#_rht_toaster`, cf. `toaster.tsx`). */
function toasts(page: Page): Locator {
  return page.locator('#_rht_toaster').locator('[data-testid="app-toast"]')
}

/**
 * Compteur d'apparitions de toast, tenu côté page par un MutationObserver : un toast qui
 * apparaît puis disparaît entre deux lectures n'échappe pas au test (un `toHaveCount(0)`
 * instantané, lui, passerait avant même que la réponse n'arrive).
 */
async function watchToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __toastsSeen?: number }
    w.__toastsSeen = 0
    const count = (node: Node): number =>
      node instanceof Element
        ? (node.matches('[data-testid="app-toast"]') ? 1 : 0) +
          node.querySelectorAll('[data-testid="app-toast"]').length
        : 0
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of Array.from(record.addedNodes)) w.__toastsSeen! += count(node)
    }).observe(document.body, { childList: true, subtree: true })
  })
}

async function toastsSeen(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __toastsSeen?: number }).__toastsSeen ?? -1)
}

test.describe('Erreurs réseau : refus inline et traduction', () => {
  test('wrong old password shows inline field error and no toast', async ({ page }) => {
    await openSettingsChapter(page, 'security')
    await watchToasts(page)
    // Le témoin vaut 0 avant l'action : l'observateur est armé et rien ne l'a alimenté.
    expect(await toastsSeen(page)).toBe(0)

    const wrongNew = 'AnotherPass456'
    await page.getByTestId('password-old').fill('MauvaisMdp999')
    await page.getByTestId('password-new').fill(wrongNew)
    await page.getByTestId('password-confirm').fill(wrongNew)

    // Vrai appel au vrai backend : sans ce 400, « pas de toast » ne prouverait rien.
    const refused = page.waitForResponse(
      (r) => r.url().includes('/me/change-password') && r.request().method() === 'POST',
    )
    await page.getByTestId('password-submit').click()
    expect((await refused).status(), 'le backend doit refuser l’ancien mot de passe en 400').toBe(
      400,
    )

    // Le refus est signalé sous le champ (FormControl pose aria-invalid quand le champ a
    // une erreur de formulaire, posée par `setError('oldPassword')`).
    await expect(page.getByTestId('password-old')).toHaveAttribute('aria-invalid', 'true')

    // Fenêtre d'absence : un toast d'erreur vit 4 s, l'intercepteur le lève dès la
    // réponse. 2,5 s après le 400 couvre largement son apparition.
    await page.waitForTimeout(2_500)
    expect(await toastsSeen(page), 'aucun toast ne doit être apparu depuis le 400').toBe(0)
    await expect(toasts(page)).toHaveCount(0)
  })

  // TÉMOIN de T1 : il garantit que le détecteur de toast de T1 (même sélecteur, même
  // observateur) n'est pas vide. Un 403 fabriqué sur le même POST n'a pas d'opt-out
  // (toast « accès refusé », #733) : le détecteur doit le voir. Rien ne part au backend,
  // et la soumission par Entrée évite un second clic sur `password-submit` (budget E2E).
  test('witness: the toast detector sees a 403 toast on the same form', async ({ page }) => {
    await openSettingsChapter(page, 'security')
    await watchToasts(page)
    expect(await toastsSeen(page)).toBe(0)

    await page.route('**/api/me/change-password', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'refus simulé (#734, témoin)' }),
      }),
    )
    const wrongNew = 'AnotherPass456'
    await page.getByTestId('password-old').fill('MauvaisMdp999')
    await page.getByTestId('password-new').fill(wrongNew)
    await page.getByTestId('password-confirm').fill(wrongNew)
    await page.getByTestId('password-confirm').press('Enter')

    await expect(
      toasts(page).first(),
      'le sélecteur doit détecter un toast quand il y en a un',
    ).toBeVisible()
    expect(await toastsSeen(page)).toBeGreaterThan(0)
  })

  test('english locale server error toast is in english', async ({ page }) => {
    await ensureAuthenticated(page)

    // 500 sur le GET de la liste seulement : toute autre méthode passe intacte.
    const served = page.waitForResponse(
      (r) => /\/api\/users\/[^/]+\/products$/.test(r.url()) && r.request().method() === 'GET',
    )
    await page.route('**/api/users/*/products', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'erreur interne simulée (#734)' }),
      })
    })

    await page.goto('/en/products', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect((await served).status(), 'la liste des produits doit répondre 500').toBe(500)

    // Texte de `public/locales/en/errors.json` (server.error).
    const english = toasts(page).filter({ hasText: 'Server error. Please try again later' })
    await expect(english.first()).toBeVisible()

    // Aucun toast ne doit porter le repli français (`FR_FALLBACK`, pont non alimenté).
    const texts = await toasts(page).allTextContents()
    expect(texts.filter((text) => /Erreur serveur/i.test(text))).toEqual([])
  })
})
