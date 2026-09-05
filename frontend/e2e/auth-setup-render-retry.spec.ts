import { test, expect } from '@playwright/test'
import { ensureRegisterForm } from './support/register-page'

/**
 * #329 — Exerce le retry de RENDU de `/fr/register` utilisé par le projet `setup`
 * (`auth.setup.ts`).
 *
 * POURQUOI UNE SPEC DÉDIÉE — le critère d'acceptation n°3 (« un run avec un 500
 * transitoire simulé se rétablit après retry ») ne peut pas être démontré depuis
 * `auth.setup.ts` : c'est un projet `setup`, dont dépendent TOUTES les specs ; y
 * câbler un `page.route()` qui renvoie un 500 casserait le provisioning réel. La
 * logique de retry a donc été extraite dans `support/register-page.ts`, et c'est
 * ELLE qui est exercée ici, avec exactement le même code qu'en production.
 *
 * Contexte ANONYME (aucun storageState) : `/fr/register` est public.
 */
test.use({ storageState: { cookies: [], origins: [] } })

/** Corps servi à la place du rendu Next quand on simule la panne du serveur de dev. */
const DEV_SERVER_500 = '<html><body>Internal Server Error</body></html>'

test.describe('#329 retry de rendu de /fr/register', () => {
  test('un 500 TRANSITOIRE au premier rendu est rattrapé par page.reload()', async ({ page }) => {
    let served = 0
    // Seule la 1re requête du document est mise en échec ; les suivantes passent
    // au vrai serveur -> reproduit fidèlement le 500 transitoire du Sprint 47.
    await page.route('**/fr/register', async (route) => {
      served += 1
      if (served === 1) {
        await route.fulfill({ status: 500, contentType: 'text/html', body: DEV_SERVER_500 })
        return
      }
      await route.continue()
    })

    await ensureRegisterForm(page, { label: 'e2e-500-transitoire', retryDelayMs: 200 })

    // Le formulaire est bien là APRÈS avoir mangé un 500 -> le run n'est pas tué.
    await expect(page.getByTestId('register-form')).toBeVisible()
    expect(served).toBeGreaterThanOrEqual(2)
  })

  test('un 500 PERSISTANT échoue avec un message qui accuse le rendu, pas le rate-limit', async ({
    page,
  }) => {
    let served = 0
    await page.route('**/fr/register', async (route) => {
      served += 1
      await route.fulfill({ status: 500, contentType: 'text/html', body: DEV_SERVER_500 })
    })

    const failure = await ensureRegisterForm(page, {
      label: 'e2e-500-persistant',
      visibleTimeoutMs: 1_000,
      retryDelayMs: 100,
    }).then(
      () => null,
      (err: unknown) => err,
    )

    // Le retry NE DOIT PAS rendre l'échec silencieux : il échoue, et il diagnostique.
    expect(failure).toBeInstanceOf(Error)
    const message = failure instanceof Error ? failure.message : ''
    expect(message).toContain('ÉCHEC DE RENDU')
    expect(message).toContain('3 tentative') // nombre de tentatives listé
    expect(message).toContain('page.reload()')
    expect(message).toContain('dernier statut HTTP: 500') // nature de la dernière erreur
    expect(message).toContain("PAS un rate-limit register 429")
    expect(served).toBe(3) // 1 goto + 2 reload, puis abandon
  })
})
