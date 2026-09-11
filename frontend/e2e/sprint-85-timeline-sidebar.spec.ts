import { test, expect } from './support/fixtures'
import { type Locator, type Page, type Route } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { readAtRest, describeRendering, WCAG_AA_NORMAL } from './support/contrast'

/**
 * #592 (Sprint 85) — Sidebar de l'écran Vue Timeline : filtres par catégorie,
 * légende, « tout plier / tout déplier », raccourcis, panneau repliable
 * < 1024 px (DEC-S85-004), et ABSENCE sur le dashboard (DEC-S85-005).
 *
 * CE QUE LES TESTS UNITAIRES NE DISENT PAS. `TimelineView.test.tsx` prouve la
 * logique (masquage ≠ repli, navigation clavier sous filtre) mais jsdom
 * n'applique aucune feuille : la disposition en grille, le panneau superposé
 * masqué en CSS sous 1024 px, le barré et le contraste de la ligne masquée ne
 * se lisent qu'ici.
 *
 * DÉTERMINISME — listing produits STUBBÉ (même motif que #392 dans
 * `timeline.spec.ts`). Le compte PROD est partagé par tout le run : un état
 * réel mêlerait les catégories des autres specs, et la virtualisation verticale
 * (PIT-S64-009, seuil 60 lanes) pourrait démonter les lanes observées. Ici :
 * 3 catégories, 3 produits, 4 événements, noms et couleurs connus. Aucune
 * écriture, donc aucune donnée laissée sur le compte partagé.
 *
 * HYDRATATION (PIT-S83-001). Les filtres sont des BASCULES : un clic perdu ne se
 * rattrape pas par un réessai. La barrière est structurelle : `timeline/page.tsx`
 * rend `null` tant que l'utilisateur n'est pas chargé CÔTÉ CLIENT, la sidebar
 * n'existe donc jamais dans le HTML serveur — sa présence prouve un montage React.
 * `waitForSidebarMounted` la nomme explicitement.
 */

test.use({ storageState: PROD.storageState })

const PRODUCTS_LIST_RE = /\/api\/users\/[^/]+\/products(\?.*)?$/

const CAT = {
  vehicles: { id: '85a10000-0000-4000-8000-000000000001', name: 'S85 Véhicules', color: '#1D4ED8' },
  health: { id: '85a10000-0000-4000-8000-000000000002', name: 'S85 Santé', color: '#15803D' },
  // Catégorie SANS couleur (DEC-S85-006) : pastille en contour neutre.
  neutral: { id: '85a10000-0000-4000-8000-000000000003', name: 'S85 Neutre', color: null },
} as const

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function product(
  n: number,
  name: string,
  category: { id: string; name: string; color: string | null },
  eventDays: number[],
) {
  const id = `85b10000-0000-4000-8000-00000000000${n}`
  return {
    id,
    name,
    color: null,
    category,
    events: eventDays.map((day, i) => ({
      id: `85c10000-0000-4000-8000-0000000000${n}${i}`,
      title: `${name} · ${i + 1}`,
      type: 'single',
      startDate: isoDay(day),
      endDate: isoDay(day),
      productId: id,
      // Encre AA dans la pastille : pas de libellé extérieur parasite (#81).
      color: '#1D4ED8',
      archived: false,
    })),
  }
}

/** Ordre de la frise = ordre du listing : Véhicules, Santé, Neutre. */
const PRODUCTS = [
  product(1, 'S85 Voiture', CAT.vehicles, [0, 2]),
  product(2, 'S85 Mutuelle', CAT.health, [5]),
  product(3, 'S85 Divers', CAT.neutral, [8]),
]

async function stubProducts(page: Page): Promise<void> {
  await page.route(PRODUCTS_LIST_RE, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PRODUCTS),
    })
  })
}

async function waitForSidebarMounted(page: Page): Promise<void> {
  await expect(page.getByTestId('timeline-view')).toHaveAttribute('data-layout', 'screen')
  await expect(page.getByTestId('timeline-sidebar-filter')).toHaveCount(3)
}

async function gotoTimeline(page: Page): Promise<void> {
  await stubProducts(page)
  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
  await waitForSidebarMounted(page)
}

const filter = (page: Page, category: string): Locator =>
  page.locator(`[data-testid="timeline-sidebar-filter"][data-category="${category}"]`)
const groupHead = (page: Page, category: string): Locator =>
  page.getByTestId('timeline-group-head').filter({ hasText: category })
const laneTitle = (page: Page, productName: string): Locator =>
  page.getByTestId('timeline-resource-title').filter({ hasText: productName })
const pill = (page: Page, title: string): Locator =>
  page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)

test.describe('#592 /timeline — sidebar ≥ 1024 px (permanente)', () => {
  test('visible sans interaction : 4 blocs, légende, pastilles, pas de bouton Filtres ni de bulle ?', async ({
    page,
  }) => {
    await gotoTimeline(page)
    const sidebar = page.getByTestId('timeline-sidebar')
    await expect(sidebar).toBeVisible()
    await expect(page.getByTestId('timeline-sidebar-toggle')).toBeHidden()
    await expect(page.getByTestId('timeline-help')).toHaveCount(0)

    // Largeur maquette 248 px, colonne GAUCHE de la frise (avant la barre d'outils).
    const side = await sidebar.boundingBox()
    const scroll = await page.getByTestId('timeline-scroll').boundingBox()
    expect(side, 'sidebar mesurable').not.toBeNull()
    expect(scroll, 'frise mesurable').not.toBeNull()
    expect(Math.round(side!.width)).toBe(248)
    expect(side!.x + side!.width).toBeLessThanOrEqual(scroll!.x + 0.5)

    // Légende couleur ↔ catégorie visible sans interaction : chaque filtre porte
    // sa pastille ; la légende des marques dit « Événement ».
    await expect(page.getByTestId('timeline-sidebar-legend')).toBeVisible()
    await expect(page.getByTestId('timeline-sidebar-legend')).toContainText('Événement')
    const swatch = (cat: string) => filter(page, cat).getByTestId('timeline-sidebar-swatch')
    await expect(swatch(CAT.vehicles.name)).toHaveCSS('background-color', 'rgb(29, 78, 216)')
    await expect(swatch(CAT.health.name)).toHaveCSS('background-color', 'rgb(21, 128, 61)')
    // Sans couleur : contour neutre, AUCUN aplat inventé.
    await expect(swatch(CAT.neutral.name)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

    // Compteur = nombre d'ÉVÉNEMENTS (Véhicules en porte 2) + nom accessible complet.
    await expect(filter(page, CAT.vehicles.name)).toHaveAccessibleName(
      `${CAT.vehicles.name}, 2 événements`,
    )
    await expect(filter(page, CAT.health.name)).toHaveAccessibleName(
      `${CAT.health.name}, 1 événement`,
    )

    // Raccourcis déplacés de la bulle vers le pied de sidebar.
    const keys = page.getByTestId('timeline-sidebar-shortcuts')
    await expect(keys).toBeVisible()
    await expect(keys).toContainText('Aller à aujourd’hui')
    await expect(keys).toContainText('Plein écran')
  })

  test('masquer / réafficher une catégorie : en-tête ET lanes disparaissent puis reviennent', async ({
    page,
  }) => {
    await gotoTimeline(page)
    const minimapFilled = page.locator('.mt-minimap__bar--filled')
    const filledBefore = await minimapFilled.count()
    await expect(groupHead(page, CAT.vehicles.name)).toHaveCount(1)
    await expect(laneTitle(page, 'S85 Voiture')).toBeVisible()

    await filter(page, CAT.vehicles.name).click()
    await expect(filter(page, CAT.vehicles.name)).toHaveAttribute('aria-pressed', 'false')
    await expect(groupHead(page, CAT.vehicles.name)).toHaveCount(0)
    await expect(laneTitle(page, 'S85 Voiture')).toHaveCount(0)
    await expect(pill(page, 'S85 Voiture · 1')).toHaveCount(0)
    // Les autres catégories restent.
    await expect(groupHead(page, CAT.health.name)).toHaveCount(1)
    await expect(laneTitle(page, 'S85 Mutuelle')).toBeVisible()
    // La minimap ne représente plus que le visible.
    expect(await minimapFilled.count()).toBeLessThan(filledBefore)
    // L'état masqué ne repose pas sur l'opacité : libellé barré, ligne opaque.
    const label = filter(page, CAT.vehicles.name).locator('.mt-tlv-side__filter-label')
    await expect(label).toHaveCSS('text-decoration-line', 'line-through')
    await expect(filter(page, CAT.vehicles.name)).toHaveCSS('opacity', '1')

    await filter(page, CAT.vehicles.name).click()
    await expect(filter(page, CAT.vehicles.name)).toHaveAttribute('aria-pressed', 'true')
    await expect(groupHead(page, CAT.vehicles.name)).toHaveCount(1)
    await expect(laneTitle(page, 'S85 Voiture')).toBeVisible()
    await expect.poll(() => minimapFilled.count()).toBe(filledBefore)
  })

  test('contraste : libellé d’une catégorie masquée, titres, compteurs et raccourcis ≥ 4,5:1', async ({
    page,
  }) => {
    await gotoTimeline(page)
    await filter(page, CAT.health.name).click()
    await expect(filter(page, CAT.health.name)).toHaveAttribute('aria-pressed', 'false')

    const targets: Array<[string, Locator]> = [
      ['libellé masqué', filter(page, CAT.health.name).locator('.mt-tlv-side__filter-label')],
      ['compteur masqué', filter(page, CAT.health.name).locator('.mt-tlv-side__count')],
      ['titre de bloc', page.locator('.mt-tlv-side__title').first()],
      ['raccourci', page.getByTestId('timeline-sidebar-shortcuts').locator('li').first()],
    ]
    for (const [label, locator] of targets) {
      const r = await readAtRest(page, locator)
      // Mesure consignée dans le rapport JSON (trace de l'écart à la maquette).
      test.info().annotations.push({ type: 'contrast', description: describeRendering(label, r) })
      expect(r.effectiveOpacity, `${label} : aucune opacité réduite`).toBe(1)
      expect(r.ratio, describeRendering(label, r)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    }
  })

  test('« Tout plier » / « Tout déplier » agissent sur toutes les catégories, sans masquer', async ({
    page,
  }) => {
    await gotoTimeline(page)
    const heads = page.getByTestId('timeline-group-head')
    await expect(heads).toHaveCount(3)

    await page.getByTestId('timeline-sidebar-collapse-all').click()
    for (let i = 0; i < 3; i++) await expect(heads.nth(i)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByTestId('timeline-resource-row')).toHaveCount(0)

    await page.getByTestId('timeline-sidebar-expand-all').click()
    for (let i = 0; i < 3; i++) await expect(heads.nth(i)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('timeline-resource-row')).toHaveCount(3)
    await expect(
      page.locator('[data-testid="timeline-sidebar-filter"][aria-pressed="true"]'),
    ).toHaveCount(3)
  })

  test('navigation clavier sous filtre : ↑/↓ sautent la catégorie masquée', async ({ page }) => {
    await gotoTimeline(page)
    await filter(page, CAT.vehicles.name).click()
    await expect(groupHead(page, CAT.vehicles.name)).toHaveCount(0)

    const health = pill(page, 'S85 Mutuelle · 1')
    const neutral = pill(page, 'S85 Divers · 1')
    // Arrêt de tabulation unique (roving #81) : il est sur la 1re lane VISIBLE.
    await expect(health).toHaveAttribute('tabindex', '0')
    await health.focus()
    await page.keyboard.press('ArrowDown')
    await expect(neutral).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(health).toBeFocused()
    // Aucune lane fantôme au-dessus : la catégorie masquée n'est pas atteignable.
    await page.keyboard.press('ArrowUp')
    await expect(health).toBeFocused()
    await page.keyboard.press('Home')
    await expect(health).toBeFocused()
  })
})

test.describe('#592 /timeline — sidebar < 1024 px (repliée, DEC-S85-004)', () => {
  test.use({ viewport: { width: 900, height: 900 } })

  test('repliée par défaut ; « Filtres » ouvre un panneau superposé, Échap et clic extérieur ferment', async ({
    page,
  }) => {
    await gotoTimeline(page)
    const sidebar = page.getByTestId('timeline-sidebar')
    const toggle = page.getByTestId('timeline-sidebar-toggle')
    await expect(sidebar).toBeHidden()
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveAttribute('aria-controls', (await sidebar.getAttribute('id'))!)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(sidebar).toBeVisible()
    // Le focus entre dans le panneau.
    await expect(page.getByTestId('timeline-sidebar-expand-all')).toBeFocused()
    // Superposé à la FRISE, sous la barre d'outils (le bouton reste dégagé).
    const side = await sidebar.boundingBox()
    const toolbarBox = await toggle.boundingBox()
    expect(side!.y).toBeGreaterThanOrEqual(toolbarBox!.y + toolbarBox!.height)

    // Le filtre fonctionne depuis le panneau.
    await filter(page, CAT.health.name).click()
    await expect(groupHead(page, CAT.health.name)).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(sidebar).toBeHidden()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()

    // Clic extérieur (titre de l'écran) : ferme aussi.
    await toggle.click()
    await expect(sidebar).toBeVisible()
    await page.getByTestId('timeline-screen').locator('header h1').click()
    await expect(sidebar).toBeHidden()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Le masquage survit à la fermeture du panneau.
    await expect(groupHead(page, CAT.health.name)).toHaveCount(0)
  })
})

test.describe('#592 dashboard — frise incrustée SANS sidebar (DEC-S85-005)', () => {
  test('ni sidebar ni bouton Filtres ; la bulle ? reste', async ({ page }) => {
    await stubProducts(page)
    await ensureAuthenticated(page)
    const view = page.getByTestId('timeline-view')
    await expect(view).toHaveAttribute('data-layout', 'embedded')
    await expect(page.getByTestId('timeline-sidebar')).toHaveCount(0)
    await expect(page.getByTestId('timeline-sidebar-toggle')).toHaveCount(0)
    await expect(page.getByTestId('timeline-help')).toHaveCount(1)
  })
})
