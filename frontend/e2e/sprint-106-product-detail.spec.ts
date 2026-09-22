import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { WCAG_AA_NORMAL, describeRendering, readAtRest } from './support/contrast'
import { getUserId, gotoProducts, seedCategory, seedProduct, unique } from './support/products'
import { trackSeed } from './support/seed-cleanup'

/**
 * Sprint 106 — détail produit et chargements.
 *
 *  #606 — l'en-tête du détail est une FICHE D'INVENTAIRE au motif DS `.mt-drawer__row`
 *         (libellé mono majuscule à gauche, valeur à droite, filet), et une valeur longue
 *         (catégorie allemande insécable, viewport étroit) passe à la ligne DANS la ligne.
 *  #607 — dans l'historique, un événement PASSÉ est désaturé sur toute sa ligne SANS
 *         opacité : titre à l'encre `ink-muted` dont le contraste est MESURÉ (≥ 4.5:1) en
 *         clair ET en sombre ; pastille grisée ; passé + archivé = cumul.
 *  #698 — squelette visuel de la fiche (`product-detail-loading`), préchargement RSC (mode
 *         FULL) de la fiche au survol/focus d'une ligne, squelette du dashboard à la LARGEUR
 *         de la page réelle (mesurée, pas lue dans le JSX).
 *
 * Testids cités : `product-detail-inventory`, `product-detail-inventory-row`,
 * `product-detail-loading`, `dashboard-loading-layout`, `dashboard-loading-greeting`,
 * `dashboard-loading-ribbon`, `dashboard-loading-skeleton`.
 *
 * ⚠ Contre `next build` + `next start` UNIQUEMENT : `next dev` ne précharge rien
 * (PIT-S91-008), les tests de préchargement y seraient rouges par construction.
 *
 * Compte PROD (storageState) ; semis par API AVANT le premier chargement de page
 * (`staleTime` 30 s, PIT-S90-004), purgé par la fixture.
 */

test.use({ storageState: PROD.storageState })

const API = '/api'
const DESKTOP = { width: 1280, height: 900 }
const NARROW = { width: 390, height: 844 }

/** yyyy-mm-dd LOCAL décalé de `days` jours par rapport à aujourd'hui. */
function localIsoDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

interface ApiEvent {
  id: string
  title: string
  archived?: boolean
  version?: number
}

/**
 * Produit à TROIS événements ponctuels : à venir (+60 j), passé (−60 j), passé puis
 * archivé (−90 j). Dates très éloignées d'aujourd'hui : aucun fuseau ne les fait
 * basculer de statut. Même payload que `seedProduct` (celui du `ProductDrawer`).
 */
async function seedHistoryProduct(page: Page): Promise<{
  productId: string
  upcoming: ApiEvent
  past: ApiEvent
  pastArchived: ApiEvent
}> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('S106 Cat'))
  const names = {
    upcoming: unique('S106 avenir'),
    past: unique('S106 passe'),
    pastArchived: unique('S106 passe archive'),
  }
  const at = (days: number) => new Date(`${localIsoDate(days)}T12:00:00`).toISOString()
  const res = await page.request.post(`${API}/users/${userId}/products`, {
    data: {
      name: unique('S106 Prod'),
      category: cat.id,
      userId,
      events: [
        { name: names.upcoming, type: 'single', date: at(60) },
        { name: names.past, type: 'single', date: at(-60) },
        { name: names.pastArchived, type: 'single', date: at(-90) },
      ],
    },
  })
  expect(res.status(), `seed produit 2xx (obtenu ${res.status()})`).toBeLessThan(300)
  const { id: productId } = (await res.json()) as { id: string }
  await trackSeed(page, { kind: 'product', userId, id: productId })

  const list = await page.request.get(`${API}/users/${userId}/products/${productId}/events`)
  expect(list.ok()).toBeTruthy()
  const events = (await list.json()) as ApiEvent[]
  const byTitle = (title: string): ApiEvent => {
    const found = events.find((e) => e.title === title)
    expect(found, `event seedé « ${title} »`).toBeTruthy()
    return found as ApiEvent
  }
  const pastArchived = byTitle(names.pastArchived)
  const patch = await page.request.patch(`${API}/events/${pastArchived.id}`, {
    data: { archived: true, version: pastArchived.version },
  })
  expect(patch.status(), 'archivage par API').toBe(200)
  return {
    productId,
    upcoming: byTitle(names.upcoming),
    past: byTitle(names.past),
    pastArchived: { ...pastArchived, archived: true },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// #606 — fiche d'inventaire
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#606 — fiche d’inventaire au motif DS', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`thème ${scheme}`, () => {
      test.use({ viewport: DESKTOP, colorScheme: scheme })

      test('libellé mono majuscule à gauche, valeur à droite, filet sous chaque ligne', async ({
        page,
      }) => {
        const userId = await getUserId(page)
        const cat = await seedCategory(page, unique('S106 Inv'))
        const product = await seedProduct(page, {
          userId,
          name: unique('S106 Inv'),
          categoryId: cat.id,
        })
        await ensureAuthenticated(page)
        await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })

        const rows = page.getByTestId('product-detail-inventory-row')
        await expect(rows).toHaveCount(2)
        for (const row of await rows.all()) {
          const m = await row.evaluate((el) => {
            const dt = el.querySelector('dt') as HTMLElement
            const dd = el.querySelector('dd') as HTMLElement
            const rs = getComputedStyle(el)
            const ks = getComputedStyle(dt)
            const r = el.getBoundingClientRect()
            const k = dt.getBoundingClientRect()
            const v = dd.getBoundingClientRect()
            return {
              display: rs.display,
              ruleWidth: parseFloat(rs.borderBottomWidth),
              ruleStyle: rs.borderBottomStyle,
              keyFont: ks.fontFamily,
              keyTransform: ks.textTransform,
              keyLeftGap: k.left - r.left,
              valueRightGap: r.right - v.right,
              sameLine: Math.abs(k.top - v.top) < 4,
            }
          })
          expect(m.display).toBe('flex')
          expect(m.ruleWidth, 'filet sous la ligne').toBeGreaterThanOrEqual(1)
          expect(m.ruleStyle).toBe('solid')
          expect(m.keyFont.toLowerCase(), 'libellé en mono').toMatch(/plex mono|mono/)
          expect(m.keyTransform).toBe('uppercase')
          expect(Math.abs(m.keyLeftGap), 'libellé collé à gauche').toBeLessThanOrEqual(1)
          expect(Math.abs(m.valueRightGap), 'valeur collée à droite').toBeLessThanOrEqual(1)
          expect(m.sameLine, 'libellé et valeur sur la même ligne').toBe(true)
        }
        // La valeur hexadécimale reste en mono.
        const hexFont = await rows
          .nth(1)
          .locator('dd')
          .evaluate((el) => getComputedStyle(el).fontFamily)
        expect(hexFont.toLowerCase()).toMatch(/mono/)
      })
    })
  }

  test.describe('valeur longue en allemand, viewport étroit', () => {
    test.use({ viewport: NARROW })

    test('la catégorie insécable passe à la ligne, sans troncature ni débordement', async ({
      page,
    }) => {
      const userId = await getUserId(page)
      // Mot insécable de 60+ caractères : aucun espace où couper.
      const longName = `Kraftfahrzeughaftpflichtversicherungsunterlagenverwaltung${Date.now()}`
      const cat = await seedCategory(page, longName)
      const product = await seedProduct(page, {
        userId,
        name: unique('S106 Lang'),
        categoryId: cat.id,
      })
      await ensureAuthenticated(page)
      await page.goto(`/de/products/${product.id}`, { waitUntil: 'domcontentloaded' })

      const pill = page.getByTestId('product-detail-category')
      await expect(pill).toHaveText(longName)
      const m = await page
        .getByTestId('product-detail-inventory-row')
        .first()
        .evaluate((row) => {
          const card = row.closest('[data-testid="product-detail-card"]') as HTMLElement
          const dd = row.querySelector('dd') as HTMLElement
          const pillEl = dd.querySelector('[data-testid="product-detail-category"]') as HTMLElement
          const c = card.getBoundingClientRect()
          const r = row.getBoundingClientRect()
          const p = pillEl.getBoundingClientRect()
          return {
            rowOverflow: row.scrollWidth - row.clientWidth,
            ddOverflow: dd.scrollWidth - dd.clientWidth,
            pillOverflow: pillEl.scrollWidth - pillEl.clientWidth,
            rowInsideCard: r.right <= c.right + 0.5,
            pillInsideRow: p.right <= r.right + 0.5 && p.left >= r.left - 0.5,
            pillLines: Math.round(p.height / parseFloat(getComputedStyle(pillEl).lineHeight)),
            docOverflow: document.documentElement.scrollWidth - window.innerWidth,
          }
        })
      expect(m.rowOverflow, 'la ligne ne déborde pas').toBeLessThanOrEqual(0)
      expect(m.ddOverflow, 'la valeur ne déborde pas').toBeLessThanOrEqual(0)
      expect(m.pillOverflow, 'aucune troncature dans la pastille').toBeLessThanOrEqual(0)
      expect(m.rowInsideCard).toBe(true)
      expect(m.pillInsideRow).toBe(true)
      expect(m.pillLines, 'retour à la ligne effectif').toBeGreaterThanOrEqual(2)
      expect(m.docOverflow, 'aucun défilement horizontal de page').toBeLessThanOrEqual(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// #607 — historique : ligne passée désaturée, AA mesuré
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('#607 — ligne passée désaturée', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`thème ${scheme}`, () => {
      test.use({ viewport: DESKTOP, colorScheme: scheme })

      test('passé ≠ à venir, contraste AA du titre passé, cumul passé + archivé', async ({
        page,
      }) => {
        const seeded = await seedHistoryProduct(page)
        await ensureAuthenticated(page)
        await page.goto(`/fr/products/${seeded.productId}`, { waitUntil: 'domcontentloaded' })
        await page.getByTestId('product-detail-filter-all').click()

        const row = (id: string): Locator => page.getByTestId(`product-detail-history-row-${id}`)
        await expect(row(seeded.upcoming.id)).toHaveAttribute('data-past', 'false')
        await expect(row(seeded.past.id)).toHaveAttribute('data-past', 'true')
        await expect(row(seeded.pastArchived.id)).toHaveAttribute('data-past', 'true')

        const title = (id: string, text: string): Locator =>
          row(id).getByText(text, { exact: true })
        const upcomingTitle = title(seeded.upcoming.id, seeded.upcoming.title)
        const pastTitle = title(seeded.past.id, seeded.past.title)
        const pastArchivedTitle = title(seeded.pastArchived.id, seeded.pastArchived.title)

        // Visuellement distinct : l'encre du titre passé diffère de celle de l'à venir.
        const upcomingR = await readAtRest(page, upcomingTitle)
        const pastR = await readAtRest(page, pastTitle)
        const pastArchivedR = await readAtRest(page, pastArchivedTitle)
        expect(pastR.foreground, 'encre passée ≠ encre à venir').not.toBe(upcomingR.foreground)

        // AA MESURÉ sur le couple rendu (fond composité + encre), pas lu dans un token.
        for (const [label, r] of [
          ['titre passé', pastR],
          ['titre passé + archivé', pastArchivedR],
          ['titre à venir', upcomingR],
        ] as const) {
          expect(r.ratio, describeRendering(`${scheme} — ${label}`, r)).toBeGreaterThanOrEqual(
            WCAG_AA_NORMAL,
          )
          expect(r.effectiveOpacity, `${label} : aucune opacité sur le texte`).toBe(1)
          // Trace du ratio mesuré (rapport de sprint) : lue dans la sortie du reporter.
          console.log(`[S106 contraste] ${describeRendering(`${scheme} — ${label}`, r)}`)
        }
        // Aucun filtre sur la ligne ni ses ancêtres (un grisage déplacerait le ratio, PIT-S61-003).
        const filters = await pastTitle.evaluate((el) => {
          const out: string[] = []
          for (let n: Element | null = el; n; n = n.parentElement) {
            const f = getComputedStyle(n).filter
            if (f && f !== 'none') out.push(f)
          }
          return out
        })
        expect(filters).toEqual([])

        // Pastilles : passé = grisage complet sans opacité ; passé + archivé = cumul.
        const dot = (id: string) =>
          row(id)
            .locator('span[aria-hidden="true"]')
            .first()
            .evaluate((el) => {
              const s = getComputedStyle(el)
              return { filter: s.filter, opacity: s.opacity }
            })
        expect(await dot(seeded.upcoming.id)).toEqual({ filter: 'none', opacity: '1' })
        expect(await dot(seeded.past.id)).toEqual({ filter: 'grayscale(1)', opacity: '1' })
        expect(await dot(seeded.pastArchived.id)).toEqual({
          filter: 'grayscale(1)',
          opacity: '0.45',
        })

        // Indice non chromatique (WCAG 1.4.1) : mention sr-only sur les passés seulement.
        await expect(row(seeded.past.id).locator('.sr-only')).toHaveText('Passé')
        await expect(row(seeded.pastArchived.id).locator('.sr-only')).toHaveText('Passé')
        await expect(row(seeded.upcoming.id).locator('.sr-only')).toHaveCount(0)
        // L'archivé garde son action de désarchivage.
        await expect(
          page.getByTestId(`product-detail-unarchive-${seeded.pastArchived.id}`),
        ).toBeVisible()
      })
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// #698 — squelettes et préchargement
// ═══════════════════════════════════════════════════════════════════════════════

/** `GET /api/users/{userId}/products` — source de la fiche (`useProductsWithEvents`). */
const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

interface Gate {
  held: Promise<void>
  release: () => void
}

/** Retient les requêtes appariées dont `hold` est vrai jusqu'à `release()`. */
async function gate(
  page: Page,
  matches: (url: string) => boolean,
  hold: (route: Route) => boolean,
): Promise<Gate> {
  let release: () => void = () => {}
  const opened = new Promise<void>((resolve) => {
    release = resolve
  })
  let markHeld: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    markHeld = resolve
  })
  await page.route(
    (url) => matches(url.toString()),
    async (route) => {
      if (!hold(route)) {
        await route.continue()
        return
      }
      markHeld()
      await opened
      await route.continue()
    },
  )
  return { held, release: () => release() }
}

const isRscFor = (url: string, pathname: string): boolean => {
  const u = new URL(url)
  return u.pathname === pathname && u.searchParams.has('_rsc')
}

test.describe('#698 — squelettes et préchargement', () => {
  test.use({ viewport: DESKTOP })

  test('fiche : squelette VISUEL en lanes (testid, role status) pendant le chargement des données', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S106 Sk'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S106 Sk'),
      categoryId: cat.id,
    })
    await ensureAuthenticated(page)
    // Porte sur le listing produits : la vue reste en `isLoading` tant qu'il est retenu.
    const g = await gate(
      page,
      (url) => PRODUCTS_LIST_RE.test(new URL(url).pathname),
      (route) => route.request().method() === 'GET',
    )
    await page.goto(`/fr/products/${product.id}`, { waitUntil: 'domcontentloaded' })
    await g.held
    try {
      const skeleton = page.getByTestId('product-detail-loading')
      await expect(skeleton).toBeVisible()
      await expect(skeleton).toHaveAttribute('role', 'status')
      await expect(skeleton.locator('.sr-only')).toHaveText(/\S/)
      const heights = await skeleton
        .getByTestId('loading-skeleton-item')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
      expect(heights).toHaveLength(3)
      for (const h of heights) expect(h, 'lane peinte').toBeGreaterThan(0)
      await expect(page.getByTestId('product-detail-card')).toHaveCount(0)
    } finally {
      g.release()
    }
    await expect(page.getByTestId('product-detail-card')).toBeVisible()
    await expect(page.getByTestId('product-detail-loading')).toHaveCount(0)
  })

  /**
   * `router.prefetch(href)` précharge en mode FULL (défaut de l'API impérative, ≠ `<Link>`
   * qui précharge en AUTO) : la requête RSC part SANS l'en-tête `next-router-prefetch`
   * (relevé par sonde, `next start` 15.5). On la distingue donc d'une navigation par
   * l'URL de la page, inchangée, et par l'absence de clic.
   */
  const rscCountFor = (page: Page, path: string): { urls: string[] } => {
    const seen = { urls: [] as string[] }
    page.on('request', (req) => {
      if (isRscFor(req.url(), path)) seen.urls.push(req.url())
    })
    return seen
  }

  test('liste : le survol d’une ligne précharge la fiche (RSC), une fois, sans naviguer', async ({
    page,
  }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S106 Pf'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S106 Pf'),
      categoryId: cat.id,
    })
    const path = `/fr/products/${product.id}`
    const seen = rscCountFor(page, path)
    await gotoProducts(page)
    const row = page.getByTestId(`products-row-${product.id}`)
    await expect(row).toBeVisible()
    await page.mouse.move(0, 0)
    expect(seen.urls, 'aucun préchargement avant l’intention').toHaveLength(0)

    const prefetched = page.waitForRequest((req) => isRscFor(req.url(), path))
    await row.hover()
    await prefetched
    expect(new URL(page.url()).pathname, 'survol ≠ navigation').toBe('/fr/products')
    // Re-survol : pas de second préchargement.
    await page.mouse.move(0, 0)
    await row.hover()
    await page.waitForTimeout(300)
    expect(seen.urls).toHaveLength(1)

    // Le clic arrive sur la fiche (le préchargement ne casse pas la navigation).
    await row.click()
    await page.waitForURL(`**${path}`)
    await expect(page.getByTestId('product-detail-view')).toBeVisible()
  })

  test('liste : le focus clavier d’une ligne précharge la fiche', async ({ page }) => {
    const userId = await getUserId(page)
    const cat = await seedCategory(page, unique('S106 Pk'))
    const product = await seedProduct(page, {
      userId,
      name: unique('S106 Pk'),
      categoryId: cat.id,
    })
    const path = `/fr/products/${product.id}`
    await gotoProducts(page)
    const row = page.getByTestId(`products-row-${product.id}`)
    await expect(row).toBeVisible()
    await page.mouse.move(0, 0)
    const prefetched = page.waitForRequest((req) => isRscFor(req.url(), path))
    await row.focus()
    await expect(row).toBeFocused()
    await prefetched
    expect(new URL(page.url()).pathname, 'focus ≠ navigation').toBe('/fr/products')
  })

  test('dashboard : le squelette de segment a la LARGEUR et la structure de la page réelle', async ({
    page,
  }) => {
    // Navigation client /fr/products → /fr/dashboard par le lien du shell (préchargé) :
    // la requête RSC de NAVIGATION est retenue, le préchargement passe (motif S90).
    const g = await gate(
      page,
      (url) => isRscFor(url, '/fr/dashboard'),
      (route) => route.request().headers()['next-router-prefetch'] !== '1',
    )
    await gotoProducts(page)
    const link = page.getByTestId('shell-sidebar-nav-link-dashboard')
    await expect(link).toBeVisible()
    await link.click()
    await g.held

    const box = async (loc: Locator) => {
      const b = await loc.boundingBox()
      expect(b, 'élément peint').not.toBeNull()
      return b as { x: number; y: number; width: number; height: number }
    }
    let skeleton: {
      layout: { x: number; width: number }
      greeting: { x: number; width: number }
      ribbon: { x: number; y: number; width: number }
    }
    try {
      await expect(page.getByTestId('dashboard-loading-layout')).toBeVisible()
      await expect(page.getByTestId('dashboard-loading-skeleton')).toHaveAttribute('role', 'status')
      skeleton = {
        layout: await box(page.getByTestId('dashboard-loading-layout')),
        greeting: await box(page.getByTestId('dashboard-loading-greeting')),
        ribbon: await box(page.getByTestId('dashboard-loading-ribbon')),
      }
    } finally {
      g.release()
    }

    const greeting = page.getByTestId('dashboard-greeting')
    await expect(greeting).toBeVisible()
    await expect(page.getByTestId('dashboard-loading-layout')).toHaveCount(0)
    const real = {
      greeting: await box(greeting),
      ribbon: await box(page.getByTestId('dashboard-density-ribbon')),
    }
    const diag = JSON.stringify({ skeleton, real })
    console.log(`[S106 largeur dashboard] ${diag}`)
    // Même colonne de contenu : même bord gauche, même largeur (±1 px d'arrondi).
    expect(Math.abs(skeleton.greeting.x - real.greeting.x), diag).toBeLessThanOrEqual(1)
    expect(Math.abs(skeleton.greeting.width - real.greeting.width), diag).toBeLessThanOrEqual(1)
    expect(Math.abs(skeleton.ribbon.x - real.ribbon.x), diag).toBeLessThanOrEqual(1)
    expect(Math.abs(skeleton.ribbon.width - real.ribbon.width), diag).toBeLessThanOrEqual(1)
    // Pas de saut vertical notable du ruban à l'arrivée des données (polices et
    // sous-titre localisé : tolérance de quelques px, pas une égalité).
    expect(Math.abs(skeleton.ribbon.y - real.ribbon.y), diag).toBeLessThanOrEqual(6)
    // Garde contre l'ancien `max-w-3xl` (768 px) : à 1280 px la colonne est plus large.
    expect(skeleton.greeting.width, diag).toBeGreaterThan(768)
  })
})
