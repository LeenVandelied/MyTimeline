import { expect, test, type Page } from '@playwright/test'

/**
 * #625 — Écrans d'authentification en deux zones (panneau + carte de 380 px).
 *
 * Pages publiques : aucune session, aucun backend requis (le jeton de reset n'est
 * jamais soumis). Contrat de testids du gabarit : `auth-side-panel`, `auth-form-zone`,
 * `auth-form-card`. `md` de Tailwind = 768 px : on mesure à 767 et à 768.
 */
const LOCALE = 'fr'

const SCREENS = [
  { name: 'login', path: `/${LOCALE}/login`, submit: 'login-submit' },
  { name: 'register', path: `/${LOCALE}/register`, submit: 'register-submit' },
  { name: 'forgot-password', path: `/${LOCALE}/forgot-password`, submit: 'forgot-submit' },
  {
    name: 'reset-password',
    path: `/${LOCALE}/reset-password?token=e2e-split-layout-token`,
    submit: 'reset-submit',
  },
] as const

async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('domcontentloaded')
}

async function box(page: Page, testId: string) {
  const target = page.getByTestId(testId)
  await expect(target, `${testId} doit être affiché`).toBeVisible({ timeout: 5_000 })
  const b = await target.boundingBox()
  return b as { x: number; y: number; width: number; height: number }
}

test.describe('auth split layout (#625)', () => {
  test('form card is 380px wide on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const screen of SCREENS) {
      await test.step(screen.name, async () => {
        await open(page, screen.path)
        await expect(page.getByTestId(screen.submit)).toBeVisible()

        const card = await box(page, 'auth-form-card')
        const zone = await box(page, 'auth-form-zone')
        expect(card.width).toBe(380)
        expect(card.x + card.width / 2).toBeCloseTo(zone.x + zone.width / 2, 0)
      })
    }
  })

  test('side panel hidden below tablet breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 900 })
    await open(page, `/${LOCALE}/login`)
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('auth-side-panel')).toBeHidden()
    const card = await box(page, 'auth-form-card')
    expect(card.x + card.width / 2).toBeCloseTo(767 / 2, 0)

    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByTestId('auth-side-panel')).toBeVisible()
  })

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const screen of SCREENS) {
      await test.step(screen.name, async () => {
        await open(page, screen.path)
        const submit = page.getByTestId(screen.submit)
        await expect(submit).toBeVisible()

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(0)

        const card = await box(page, 'auth-form-card')
        expect(card.x).toBeGreaterThanOrEqual(0)
        expect(card.x + card.width).toBeLessThanOrEqual(390)

        await submit.scrollIntoViewIfNeeded()
        const s = await box(page, screen.submit)
        expect(s.x).toBeGreaterThanOrEqual(0)
        expect(s.x + s.width).toBeLessThanOrEqual(390)
      })
    }
  })
})
