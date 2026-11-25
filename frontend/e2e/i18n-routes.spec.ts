import fs from 'node:fs'
import path from 'node:path'

import { test, expect } from './support/fixtures'
import { type Page, type Route } from '@playwright/test'
import { PROD } from './support/accounts'
import { sessionState } from './support/session'

/**
 * #278 — Routes localisées, formats de nombres et repli de langue (fr, en, es, de).
 *
 * Ce que ces cas ajoutent aux specs voisines : `document-lang.spec.ts` ne lit que le
 * statut et `<html lang>`, `sprint-109-section-counts.spec.ts` (T3 du ticket) couvre les
 * dates fr/de. Restent le TEXTE servi par langue, les nombres, et le choix de langue
 * quand l'adresse n'en porte pas.
 *
 * Oracles de titre : lus dans `public/locales/<lang>/common.json`, jamais recopiés.
 * Oracle des nombres : `Intl.NumberFormat` de la langue, calculé DANS LE NAVIGATEUR
 * (même mise en forme que le `#` ICU de next-intl, motif de `sprint-109`).
 *
 * Données : T4 stube le listing produits (motif `sprint-109-section-counts.spec.ts`),
 * PROD ne porte jamais 1 000 événements. Compte fixe via `storageState`, aucune
 * inscription, rien n'est soumis. Les autres cas sont publics.
 */

const LOCALES = ['fr', 'en', 'es', 'de'] as const
type Locale = (typeof LOCALES)[number]

/** Lit une clé pointée d'un namespace de `public/locales/<locale>/<namespace>.json`. */
function translation(locale: Locale, namespace: string, key: string): string {
  const file = path.join(__dirname, '..', 'public', 'locales', locale, `${namespace}.json`)
  const messages: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      messages,
    )
  if (typeof value !== 'string' || value === '') {
    throw new Error(`clé absente ou vide : ${locale}/${namespace}.json → ${key}`)
  }
  return value
}

/* ------------------------------------------------------------------ T1, T2 */

test.describe('#278 — pages publiques localisées', () => {
  for (const locale of LOCALES) {
    test(`accueil /${locale} : répond 200 avec le titre en ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}`)
      expect(response?.status(), `statut de /${locale}`).toBe(200)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        translation(locale, 'common', 'landing.hero.title'),
      )
    })

    test(`connexion /${locale}/login : affiche le titre en ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/login`)

      await expect(page.getByRole('heading', { level: 2 })).toHaveText(
        translation(locale, 'common', 'login.title'),
      )
    })
  }
})

/* ----------------------------------------------------------------------- T4 */

test.describe('#278 — nombres du tableau de bord', () => {
  test.use({ storageState: sessionState(PROD), timezoneId: 'Europe/Paris' })

  const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/
  const PRODUCT_ID = '00000000-0000-7000-8000-000000278001'
  const EVENT_COUNT = 1234

  /** Suffixe du pluriel (« other ») des 2 langues jouées, comme `sprint-109`. */
  const EVENTS_SUFFIX = { fr: 'événements', de: 'Ereignisse' } as const

  /** Un produit portant `EVENT_COUNT` événements, tous datés d'aujourd'hui (donc « cette semaine »). */
  async function stubThousandEvents(page: Page): Promise<void> {
    await page.goto('about:blank')
    const today = await page.evaluate(() => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })
    const events = Array.from({ length: EVENT_COUNT }, (_, i) => ({
      id: `00000000-0000-7000-8000-${String(278100 + i).padStart(12, '0')}`,
      title: `S278 event ${i}`,
      type: 'single',
      startDate: today,
      endDate: today,
      productId: PRODUCT_ID,
      archived: false,
      isRecurring: false,
      recurrenceUnit: null,
      recurrenceEndDate: null,
      color: null,
    }))
    const category = { id: '00000000-0000-7000-8000-000000278101', name: 'S278 Cat', color: null }
    const items = [{ id: PRODUCT_ID, name: 'S278 produit', color: null, category, events }]
    await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(items),
      })
    })
  }

  for (const locale of ['fr', 'de'] as const) {
    test(`plus de mille événements : séparateur de milliers en ${locale}`, async ({ page }) => {
      await stubThousandEvents(page)
      await page.goto(`/${locale}/dashboard`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 })

      const formatted = await page.evaluate(([loc, n]) => new Intl.NumberFormat(loc).format(n), [
        locale,
        EVENT_COUNT,
      ] as const)
      // Garde-fou : l'oracle doit porter un séparateur, sinon il ne prouverait rien.
      expect(formatted, `oracle navigateur en ${locale}`).not.toBe(String(EVENT_COUNT))

      await expect(page.getByTestId('dashboard-week-count')).toHaveText(
        `${formatted} ${EVENTS_SUFFIX[locale]}`,
      )
    })
  }
})

/* ------------------------------------------------------------------- T5, T6 */

test.describe('#278 — adresse sans langue, langue du navigateur', () => {
  test.describe('navigateur en anglais', () => {
    test.use({ locale: 'en-US' })

    test('/ redirige vers la version anglaise', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL(/\/en\/?$/)
    })
  })

  test.describe('navigateur en japonais (langue non prise en charge)', () => {
    test.use({ locale: 'ja-JP' })

    test('/ redirige vers la version française', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL(/\/fr\/?$/)
    })
  })
})

/* ----------------------------------------------------------------------- T7 */

test.describe('#278 — langue inconnue dans l’adresse', () => {
  test('/xx/login donne la page introuvable, jamais un contenu dans une autre langue', async ({
    page,
  }) => {
    const response = await page.goto('/xx/login')
    expect(response?.status(), 'statut de /xx/login').toBe(404)
    await expect(page.getByTestId('global-not-found-screen')).toBeVisible()
  })
})
