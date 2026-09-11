import { test, expect } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { getUserId, seedCategory, seedProduct } from './support/products'

/**
 * #575 — Titres de section rendus au navigateur (Sprint 84).
 *
 * CE QUE LES TESTS UNITAIRES NE PEUVENT PAS DIRE. `section-titles.test.tsx` et
 * `nav-label-class.test.ts` prouvent l'INTENTION (classes posées, contrat CSS
 * compilé). jsdom n'applique aucune feuille : la police effective, la casse
 * peinte, l'interligne et la tenue en allemand ne se lisent qu'ici. Deux pièges
 * de cascade rendent ces mesures nécessaires :
 *   · `h1..h6` reçoivent `font-family` d'une règle `@layer base` (cède aux
 *     utilitaires) mais `line-height` d'une règle HORS layer (PIT-S53-001) ;
 *   · `.mt-eyebrow` / `.mt-nav-label` sont HORS layer : elles battent toute
 *     utilitaire — leur valeur effective se mesure, elle ne se déduit pas.
 *
 * ORACLES LOCALE-AGNOSTIQUES. Aucun nom de police en dur (next/font les suffixe) :
 * « police display » = celle du `h1` de la page ; « police mono » = celle d'un
 * élément `font-mono` voisin. « encre pleine » = couleur du `h1` (`text-ink`).
 *
 * Mesures, pas captures : aucune référence visuelle n'est créée ni modifiée.
 */

test.use({ storageState: PROD.storageState })

const LOCALES = ['fr', 'en', 'es', 'de'] as const
type Locale = (typeof LOCALES)[number]

interface Typo {
  fontFamily: string
  fontSize: number
  fontWeight: string
  textTransform: string
  letterSpacing: number
  lineHeight: number
  color: string
  scrollWidth: number
  clientWidth: number
}

async function typo(locator: Locator): Promise<Typo> {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      fontFamily: s.fontFamily,
      fontSize: parseFloat(s.fontSize),
      fontWeight: s.fontWeight,
      textTransform: s.textTransform,
      letterSpacing: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing),
      lineHeight: parseFloat(s.lineHeight),
      color: s.color,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }
  })
}

/** Ouvre le dashboard dans la locale voulue et vérifie `<html lang>` (prérequis du `:lang(de)`). */
async function openDashboard(page: Page, locale: Locale): Promise<void> {
  await ensureAuthenticated(page)
  if (locale !== 'fr') {
    await page.goto(`/${locale}/dashboard`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('dashboard')).toBeVisible()
  }
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang), {
      message: `<html lang> doit valoir « ${locale} » : la détente allemande en dépend`,
    })
    .toBe(locale)
  await waitForFonts(page)
}

/** Vérifie qu'un `h2` est un TITRE : display, 600, 17px, sentence case, encre du `h1`. */
function expectSectionTitle(h2: Typo, h1: Typo, mono: Typo, where: string) {
  expect(h2.textTransform, `${where} : casse`).toBe('none')
  expect(h2.fontWeight, `${where} : graisse`).toBe('600')
  expect(h2.fontSize, `${where} : taille (--text-sm)`).toBe(17)
  expect(h2.fontFamily, `${where} : police display (celle du h1)`).toBe(h1.fontFamily)
  expect(h2.fontFamily, `${where} : ne doit plus être en mono`).not.toBe(mono.fontFamily)
  expect(h2.color, `${where} : encre pleine (celle du h1), pas ink-faint`).toBe(h1.color)
  // Hiérarchie : le titre de section reste SOUS le titre de page.
  expect(h2.fontSize, `${where} : h2 < h1`).toBeLessThan(h1.fontSize)
  // Interligne tenu par la règle HORS layer de base.css (1.08), pas par
  // l'appariement de `text-sm` (PIT-S53-001) : 17 × 1.08 = 18,36 px.
  expect(h2.lineHeight, `${where} : interligne 1.08`).toBeCloseTo(18.36, 1)
}

/* ------------------------------------------------ DASHBOARD DESKTOP, 2 THÈMES */

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`#575 — dashboard desktop (${scheme})`, () => {
    test.use({ viewport: { width: 1280, height: 800 }, colorScheme: scheme })

    test(`les 4 titres de section sont de vrais titres (${scheme})`, async ({ page }) => {
      await openDashboard(page, 'fr')
      // next-themes (defaultTheme="system") traduit `colorScheme` en `.dark` : on le
      // vérifie, sinon la moitié « sombre » mesurerait du clair (cf. S77).
      await expect
        .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
        .toBe(scheme === 'dark')

      const h1 = await typo(page.getByTestId('dashboard-greeting').locator('h1'))
      const ribbon = page.getByTestId('dashboard-density-ribbon')
      const mono = await typo(ribbon.locator('span.font-mono').first())

      await expect(page.locator('h1:visible')).toHaveCount(1)

      for (const testid of [
        'dashboard-density-ribbon',
        'dashboard-week-agenda',
        'dashboard-kpi-marginalia',
        'dashboard-product-list',
      ]) {
        const heading = page.getByTestId(testid).locator('h2')
        await expect(heading, `${testid} : un h2 visible`).toBeVisible()
        expectSectionTitle(await typo(heading), h1, mono, `${testid} (${scheme})`)
        // « 80 % de la valeur sans scroll » (handoff) : chaque titre de section
        // commence dans le 1er écran à 1280×800.
        const box = await heading.boundingBox()
        expect(box, `${testid} : boîte du titre`).not.toBeNull()
        expect(
          box!.y + box!.height,
          `${testid} : titre sous la ligne de flottaison`,
        ).toBeLessThanOrEqual(800)
      }
    })
  })
}

/* ------------------------------------------- EYEBROW DU RUBAN, 4 LOCALES */

test.describe('#575 — eyebrow du ruban au-dessus du titre (.mt-eyebrow)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  for (const locale of LOCALES) {
    test(`eyebrow mono capitales, détendu en allemand · ${locale}`, async ({ page }) => {
      await openDashboard(page, locale)
      const ribbon = page.getByTestId('dashboard-density-ribbon')
      const eyebrow = page.getByTestId('dashboard-density-eyebrow')
      const title = page.getByTestId('dashboard-density-title')
      const mono = await typo(ribbon.locator('span.font-mono').first())
      const e = await typo(eyebrow)

      expect(e.textTransform).toBe('uppercase')
      expect(e.fontFamily).toBe(mono.fontFamily)
      expect(e.fontSize, '.mt-eyebrow = 10px (DS)').toBe(10)
      // .08em par défaut, .02em en allemand (i18n.css §2).
      expect(e.letterSpacing).toBeCloseTo(locale === 'de' ? 0.2 : 0.8, 2)

      const eb = await eyebrow.boundingBox()
      const tb = await title.boundingBox()
      expect(eb!.y, 'l’eyebrow est AU-DESSUS du titre (motif GreetingHeader)').toBeLessThan(tb!.y)
    })
  }
})

/* ------------------------------------------ NAV LATÉRALE, 4 LOCALES */

test.describe('#575 — libellés de nav en mono capitales (DEC-S84-002)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  for (const locale of LOCALES) {
    test(`sidebar : mono, capitales, 13px, sans troncature · ${locale}`, async ({ page }) => {
      await openDashboard(page, locale)
      const sidebar = page.getByTestId('shell-sidebar')
      const mono = await typo(
        page.getByTestId('dashboard-density-ribbon').locator('span.font-mono').first(),
      )
      const sb = await sidebar.boundingBox()

      for (const id of ['dashboard', 'timeline', 'products'] as const) {
        const link = page.getByTestId(`shell-sidebar-nav-link-${id}`)
        const label = link.locator('span').first()
        await expect(label).toBeVisible()
        const l = await typo(label)
        const where = `nav ${id} · ${locale}`
        expect(l.textTransform, where).toBe('uppercase')
        expect(l.fontFamily, where).toBe(mono.fontFamily)
        expect(l.fontSize, `${where} : text-2xs`).toBe(13)
        // --tracking-wide (.06em) ; .02em en allemand (.mt-nav-label).
        expect(l.letterSpacing, where).toBeCloseTo(locale === 'de' ? 0.26 : 0.78, 2)
        expect(l.scrollWidth, `${where} : libellé tronqué`).toBeLessThanOrEqual(l.clientWidth + 1)
        const lb = await label.boundingBox()
        expect(lb!.x + lb!.width, `${where} : sort de la sidebar`).toBeLessThanOrEqual(
          sb!.x + sb!.width,
        )
      }

      // L'encre de la pilule active arrive jusqu'au libellé (la classe ne pose
      // aucune couleur — c'est ce qui disqualifiait `.mt-eyebrow`).
      const active = page.getByTestId('shell-sidebar-nav-link-dashboard')
      await expect(active).toHaveAttribute('aria-current', 'page')
      const linkColor = await active.evaluate((el) => getComputedStyle(el).color)
      expect((await typo(active.locator('span').first())).color).toBe(linkColor)
    })
  }
})

/* ------------------------------------------ ONGLETS RÉGLAGES, DE */

test.describe('#575 — onglets des Réglages en mono capitales', () => {
  for (const width of [768, 1024, 1280] as const) {
    test.describe(`${width} px`, () => {
      test.use({ viewport: { width, height: 900 } })

      for (const locale of ['fr', 'de'] as const) {
        test(`onglets mono capitales, page sans débordement · ${locale} · ${width}px`, async ({
          page,
        }) => {
          await ensureAuthenticated(page)
          await page.goto(`/${locale}/settings`, { waitUntil: 'domcontentloaded' })
          await expect(page.getByTestId('settings-tablist')).toBeVisible({ timeout: 30_000 })
          await waitForFonts(page)

          for (const id of ['profile', 'security', 'preferences', 'account'] as const) {
            const l = await typo(page.getByTestId(`settings-tab-${id}`).locator('span').first())
            expect(l.textTransform, `onglet ${id}`).toBe('uppercase')
            expect(l.fontSize, `onglet ${id}`).toBe(13)
            expect(l.letterSpacing, `onglet ${id}`).toBeCloseTo(locale === 'de' ? 0.26 : 0.78, 2)
          }

          const overflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }))
          expect(overflow.scrollWidth, 'débordement horizontal de page').toBeLessThanOrEqual(
            overflow.clientWidth,
          )

          // Défilement INTERNE de la tablist : autorisé par construction
          // (`overflow-x-auto`), donc journalisé et non asserté. L'estimation de
          // #575 est ~500 px en `de` ; ce relevé la confirme ou la réfute.
          const tl = await page.getByTestId('settings-tablist').evaluate((el) => ({
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          }))
          test.info().annotations.push({
            type: 'tablist',
            description: `${locale} · ${width}px : scrollWidth ${tl.scrollWidth} / clientWidth ${tl.clientWidth}`,
          })
        })
      }
    })
  }
})

/* ------------------------------------------ MOBILE PORTRAIT, ALLEMAND */

test.describe('#575 — dashboard mobile portrait en allemand (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('titres + eyebrow du ruban tiennent sans déborder', async ({ page }) => {
    await openDashboard(page, 'de')
    await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()

    const ribbon = page.getByTestId('dashboard-density-ribbon')
    const r = await ribbon.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(r.scrollWidth, 'le ruban déborde sa propre boîte (PIT-S77-013)').toBeLessThanOrEqual(
      r.clientWidth,
    )

    for (const testid of [
      'dashboard-density-ribbon',
      'dashboard-compact-agenda',
      'dashboard-product-carousel-section',
    ]) {
      const h2 = await typo(page.getByTestId(testid).locator('h2'))
      expect(h2.textTransform, testid).toBe('none')
      expect(h2.scrollWidth, `${testid} : titre tronqué/débordant`).toBeLessThanOrEqual(
        h2.clientWidth + 1,
      )
    }

    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(doc.scrollWidth, 'débordement horizontal de page').toBeLessThanOrEqual(doc.clientWidth)
  })
})

/* ------------------------------------------ DÉTAIL PRODUIT */

test.describe('#575 — détail produit', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('frise et historique : vrais titres, compteur en eyebrow au-dessus', async ({ page }) => {
    // Nom COURT et sécable : `unique()` produit un jeton de 16 chiffres qui fait
    // déborder le h1 (PIT-S63-013) — sans incidence ici, mais on ne le réintroduit pas.
    const suffix = `${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`
    const userId = await getUserId(page)
    const category = await seedCategory(page, `T575 ${suffix}`)
    const product = await seedProduct(page, {
      userId,
      name: `T575 ${suffix}`,
      categoryId: category.id,
    })

    await ensureAuthenticated(page)
    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('product-detail-view')).toBeVisible({ timeout: 30_000 })
    await waitForFonts(page)

    const h1 = await typo(page.getByTestId('product-detail-card').locator('h1'))
    const mono = await typo(page.getByTestId('product-detail-card').locator('dd.font-mono'))

    for (const testid of ['product-detail-timeline', 'product-detail-history']) {
      const heading = page.getByTestId(testid).locator('h2')
      await expect(heading).toBeVisible()
      expectSectionTitle(await typo(heading), h1, mono, testid)
    }

    const count = page.getByTestId('product-detail-history-count')
    const c = await typo(count)
    expect(c.textTransform).toBe('uppercase')
    expect(c.fontFamily).toBe(mono.fontFamily)
    await expect(count).toContainText('1')
    const cb = await count.boundingBox()
    const hb = await page.getByTestId('product-detail-history').locator('h2').boundingBox()
    expect(cb!.y, 'le compteur est AU-DESSUS du titre').toBeLessThan(hb!.y)
  })
})

/* ------------------------------ SALUT + CTA, MOBILE PORTRAIT (non-régression) */

test.describe('#575 — salut et CTA « Nouveau produit » à 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  // `GreetingHeader` partage sa rangée avec le CTA `nowrap` : sans `min-w-0` +
  // `break-words`, un nom sans espace impose sa largeur min-content et pousse le CTA
  // hors de l'écran (mesuré : page à 390 px en fr, 377 px en de — plus large en
  // français, donc indépendant de la locale). Le français est le pire cas mesuré.
  test('le CTA reste dans l’écran quand le nom est un jeton insécable', async ({ page }) => {
    await openDashboard(page, 'fr')
    await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible()

    // Précondition anti-vacuité : ce test ne prouve quelque chose QUE si le salut
    // porte un jeton long. Les comptes E2E ont un identifiant de ~13 chiffres
    // (PIT-S63-013) ; si la fixture change, ce test doit le dire, pas passer à vide.
    const longest = await page
      .getByTestId('dashboard-greeting')
      .locator('h1')
      .evaluate((el) => Math.max(...(el.textContent ?? '').split(/\s+/).map((w) => w.length)))
    expect(
      longest,
      'précondition : un jeton d’au moins 14 caractères dans le salut',
    ).toBeGreaterThanOrEqual(14)

    const box = await page.getByTestId('add-product-button').boundingBox()
    expect(box, 'CTA rendu').not.toBeNull()
    expect(box!.x + box!.width, 'CTA poussé hors de l’écran').toBeLessThanOrEqual(375)

    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(doc.scrollWidth, 'débordement horizontal de page').toBeLessThanOrEqual(doc.clientWidth)
  })
})
