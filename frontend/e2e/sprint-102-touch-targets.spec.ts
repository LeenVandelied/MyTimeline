import { type Locator, type Page, type Route } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, seedProduct, todayIsoDate, unique } from './support/products'
import { revealSeededLane } from './support/timeline-lanes'

/**
 * #764 (Sprint 102) — CIBLES TACTILES 44 px (WCAG 2.5.5) à 375 px des surfaces que
 * #738 (réglages) et #754 (drawers, dialogues, listes denses) ne mesuraient pas.
 *
 * MESURER D'ABORD (PAT-S99-001, PAT-S101-001) : cette spec est l'oracle ; une zone
 * n'est corrigée (via `src/lib/touchTarget.ts`, DEC-S101-003) que si elle mesure
 * moins de 44 px ici.
 *
 * SURFACES :
 *  1. feuille d'actions de la frise portrait (`TimelineActionSheet`, ouverte par le
 *     `⋯` d'un bloc) : éditer / supprimer / annuler (`.mt-actionsheet__item`) ;
 *  2. fenêtre de LECTURE d'un événement : à 375 px c'est `TimelineBottomSheet`
 *     (monté par `TimelineMobilePortrait`), pas `EventDrawer` (desktop seulement,
 *     `TimelineView`). Seul contrôle : la croix `timeline-sheet-close` ;
 *  3. CTA d'état vide du tableau de bord. À 375 px (`dashboard/page.tsx`, branche
 *     `isMobile`) seuls `CompactAgenda` et `ProductCarousel` sont montés ;
 *     `WeekAgenda` et `ProductList` sont la branche desktop (≥ 768 px), où leur
 *     `max-md:h-11` est inerte. Leur ABSENCE à 375 px est assertée : si un jour ils
 *     y apparaissent, la spec rougit et il faudra les mesurer ici.
 *
 * ORACLE : boîte RENDUE (`getBoundingClientRect`) de TOUS les contrôles sous la
 * racine, liste construite par REQUÊTE DOM (même sélecteur que
 * `sprint-101-touch-targets.spec.ts`), garde anti-vacuité par surface.
 *
 * EXEMPTIONS : `sr-only`, `aria-hidden="true"`, poignées `*-grabber` (DEC-S99-002 :
 * la poignée de l'action sheet est un `<span aria-hidden>`, celle du bottom sheet
 * une zone de glissement sans rôle, doublée par la croix 44×44 + Escape).
 *
 * DONNÉES : frise — produit semé sur PROD avec un événement daté d'aujourd'hui (la
 * frise se centre sur « today »), purgé par la fixture. États vides — listing
 * produits stubbé (motif `sprint-90-first-contact.spec.ts`) : « aucun produit » et
 * « un produit sans événement » ne sont pas des états déterministes du compte PROD.
 */

const MIN_TARGET = 44
/** Tolérance sous-pixel : `h-11` = 2.75rem = 44 px exacts à dpr 1. */
const EPS = 0.01
const MOBILE = { width: 375, height: 812 } as const
const BUDGET = 15_000

interface Measured {
  label: string
  width: number
  height: number
}

/** Mesure TOUS les contrôles interactifs visibles sous `root` (motif PAT-S99-001). */
async function measureControls(root: Locator): Promise<Measured[]> {
  return root.evaluate((el) => {
    const SELECTOR = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'textarea',
      'select',
      '[role="button"]',
      '[role="combobox"]',
      '[role="option"]',
      '[role="switch"]',
      '[role="checkbox"]',
      'label.mt-switch',
    ].join(',')
    const isExempt = (node: Element): boolean =>
      node.classList.contains('sr-only') ||
      node.closest('[aria-hidden="true"]') !== null ||
      (node.getAttribute('data-testid') ?? '').endsWith('-grabber')
    const nodes = [el, ...Array.from(el.querySelectorAll(SELECTOR))].filter((n) =>
      n.matches(SELECTOR),
    )
    return nodes
      .filter((n) => !isExempt(n))
      .map((n) => {
        const r = n.getBoundingClientRect()
        const style = getComputedStyle(n)
        const pseudo = getComputedStyle(n, '::before')
        const extended = pseudo.content !== 'none' && pseudo.position === 'absolute'
        const text = (n.textContent ?? '').trim().slice(0, 30)
        const label =
          n.getAttribute('data-testid') ?? n.getAttribute('aria-label') ?? (text || n.tagName)
        return {
          label: `${n.tagName.toLowerCase()}[${label}]${extended ? '(::before)' : ''}`,
          width: extended ? Math.max(r.width, parseFloat(pseudo.width) || 0) : r.width,
          height: extended ? Math.max(r.height, parseFloat(pseudo.height) || 0) : r.height,
          visible:
            r.width > 0 &&
            r.height > 0 &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            style.display !== 'none',
        }
      })
      .filter((m) => m.visible)
      .map(({ label, width, height }) => ({ label, width, height }))
  })
}

/** Log de la mesure (reporter `line`) : sert de tableau au rapport de sprint. */
function report(step: string, measured: Measured[]): void {
  const rows = measured.map((m) => `${m.label}=${m.width.toFixed(1)}x${m.height.toFixed(1)}`)
  console.log(`[#764 ${step}] ${rows.join(' | ')}`)
}

/** Au moins `min` contrôles mesurés (anti-vacuité), chacun >= 44×44. */
async function expectAllTouchable(step: string, root: Locator, min: number): Promise<void> {
  const measured = await measureControls(root)
  report(step, measured)
  expect
    .soft(measured.length, `${step} : nombre de contrôles mesurés (garde anti-vacuité)`)
    .toBeGreaterThanOrEqual(min)
  const undersized = measured.filter(
    (m) => m.height < MIN_TARGET - EPS || m.width < MIN_TARGET - EPS,
  )
  expect.soft(undersized, `${step} : contrôles sous 44×44 px`).toEqual([])
}

/* ------------------------------------------------------------------------- */
/* Frise portrait                                                             */
/* ------------------------------------------------------------------------- */

/** Sème un produit avec un événement du jour et ouvre `/fr/timeline` en portrait. */
async function seedAndOpenPortraitTimeline(page: Page): Promise<string> {
  await ensureAuthenticated(page)
  const userId = await getUserId(page)
  const productName = unique('S102 Touch TL')
  const cat = await seedCategory(page, unique('S102 Touch TL Cat'))
  await seedProduct(page, {
    userId,
    name: productName,
    categoryId: cat.id,
    eventDate: todayIsoDate(),
  })
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-host')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('timeline-mobile-portrait')).toBeVisible({ timeout: BUDGET })
  await revealSeededLane(page, { category: cat.name, product: productName })
  return productName
}

function seededEvent(page: Page, title: string): Locator {
  return page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)
}

function seededEventMore(page: Page, title: string): Locator {
  return page
    .locator('.mt-tlm__evt-wrap')
    .filter({ has: page.locator(`[data-event-title="${title}"]`) })
    .getByTestId('timeline-event-more')
}

test.describe('#764 — frise mobile (375 px) : feuilles de lecture et d’actions', () => {
  test.use({ viewport: MOBILE, storageState: PROD.storageState })

  test('fenêtre de lecture (TimelineBottomSheet) puis feuille d’actions', async ({ page }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    const title = await seedAndOpenPortraitTimeline(page)
    // EventDrawer (desktop) ne doit pas être la fenêtre montée à cette largeur.
    await expect(page.getByTestId('timeline-view')).toHaveCount(0)

    // Fenêtre de lecture : la croix est l'unique contrôle (lignes = texte).
    await seededEvent(page, title).click({ timeout: BUDGET })
    const sheet = page.getByTestId('timeline-sheet')
    await expect(sheet).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('TimelineBottomSheet (lecture)', sheet, 1)
    await page.getByTestId('timeline-sheet-close').click({ timeout: BUDGET })
    await expect(sheet).toHaveCount(0)

    // Feuille d'actions : éditer + supprimer + annuler (la poignée est exemptée).
    await seededEventMore(page, title).click({ timeout: BUDGET })
    const actions = page.getByTestId('timeline-actionsheet')
    await expect(actions).toBeVisible({ timeout: BUDGET })
    await expectAllTouchable('TimelineActionSheet', actions, 3)
    await page.getByTestId('timeline-actionsheet-cancel').click({ timeout: BUDGET })
    await expect(actions).toHaveCount(0)
  })
})

/* ------------------------------------------------------------------------- */
/* États vides du tableau de bord                                             */
/* ------------------------------------------------------------------------- */

/** `GET /api/users/{userId}/products` — source de TOUT le dashboard (`useDashboardData`). */
const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

/** Produit SANS événement, à la forme de `productSchema` (cf. `sprint-90-first-contact`). */
const PRODUCT_WITHOUT_EVENTS = {
  id: '00000000-0000-7000-8000-000000000102',
  name: 'S102 produit sans événement',
  color: null,
  category: { id: '00000000-0000-7000-8000-000000000103', name: 'S102 catégorie', color: null },
  events: [],
}

/** Stub du listing produits (GET seulement ; les écritures passent au réseau réel). */
async function stubProductsList(page: Page, items: unknown[]): Promise<void> {
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

/** Ouvre le dashboard sur un listing stubbé et attend la branche mobile portrait. */
async function openMobileDashboard(page: Page, items: unknown[]): Promise<void> {
  await stubProductsList(page, items)
  const listed = page.waitForResponse(
    (res) => PRODUCTS_LIST_RE.test(res.url()) && res.request().method() === 'GET',
  )
  await ensureAuthenticated(page)
  await listed
  await expect(page.getByTestId('dashboard-mobile-portrait')).toBeVisible({ timeout: BUDGET })
  // Branche desktop absente à 375 px : `WeekAgenda` et `ProductList` n'y existent pas
  // (cf. en-tête). Assertion de périmètre, pas d'oubli de mesure.
  await expect(page.getByTestId('dashboard-week-agenda-empty')).toHaveCount(0)
  await expect(page.getByTestId('dashboard-product-list-empty')).toHaveCount(0)
  await expect(page.getByTestId('dashboard-week-agenda-empty-cta')).toHaveCount(0)
  await expect(page.getByTestId('dashboard-product-list-empty-cta')).toHaveCount(0)
}

test.describe('#764 — tableau de bord mobile (375 px) : CTA d’état vide', () => {
  test.use({ viewport: MOBILE, storageState: PROD.storageState })

  test('aucun produit : CTA du carousel produits', async ({ page }) => {
    await openMobileDashboard(page, [])
    const empty = page.getByTestId('dashboard-product-carousel-empty')
    await expect(page.getByTestId('dashboard-product-carousel-empty-cta')).toBeVisible()
    await expectAllTouchable('ProductCarousel (vide)', empty, 1)
  })

  test('un produit sans événement : CTA de l’agenda compact', async ({ page }) => {
    await openMobileDashboard(page, [PRODUCT_WITHOUT_EVENTS])
    const empty = page.getByTestId('dashboard-compact-agenda-empty')
    await expect(page.getByTestId('dashboard-compact-agenda-empty-cta')).toBeVisible()
    await expectAllTouchable('CompactAgenda (vide)', empty, 1)
  })
})
