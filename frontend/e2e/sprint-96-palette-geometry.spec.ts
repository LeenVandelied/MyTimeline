import { expect, test } from './support/fixtures'
import { type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, openCategoriesTab, seedCategory, seedProduct, unique } from './support/products'
import { EVENT_PALETTE } from '../src/lib/event-palette'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SPRINT 96 — #665 : GÉOMÉTRIE DE LA RANGÉE DE PASTILLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POURQUOI CETTE SPEC EXISTE, ET POURQUOI ELLE NE PEUT PAS ÊTRE UN TEST UNITAIRE
 *
 * Les deux critères de #665 sont des MISES EN PAGE : « la cible fait >= 44×44 »
 * et « aucune pastille seule sur sa ligne ». jsdom ne calcule aucun layout —
 * `getBoundingClientRect()` y rend 0×0 pour tout le monde et deux pastilles
 * censées être sur deux lignes y partagent la même ordonnée nulle. Un test RTL
 * qui asserte la PRÉSENCE de `grid-cols-6` ou de `size-11` prouverait seulement
 * que la chaîne est dans le `className` : il resterait vert si un ancêtre
 * imposait une autre largeur de colonne, si `sm:` ne se compilait pas, ou si un
 * conteneur écrasait la grille. C'est très exactement PIT-S48-002 (« CI verte
 * != page correcte ») et sa variante jsdom, déjà payée au S73 sur CE composant.
 *
 * CE QUI EST MESURÉ, ET AVEC QUEL ORACLE
 *
 *   (a) CIBLE TACTILE — `boundingBox()` de chacune des 12 pastilles ET du bouton
 *       « Personnalisé », à 375 px de large. Oracle : >= 44 px sur les DEUX axes
 *       (`styles/ds/a11y-audit.md` §1 l.24, §Mobile Form l.77-78, §4 l.140).
 *       La boîte réelle est l'oracle honnête PARCE QUE la correction agrandit la
 *       boîte au lieu d'étendre un `::before` hors flux : il n'y a pas de
 *       hitbox invisible à sonder, donc rien qu'un ancêtre défilant puisse
 *       clipper en silence (PIT PAT-S24-002).
 *
 *   (b) AUCUNE LIGNE ORPHELINE — les 12 pastilles sont groupées par ordonnée
 *       arrondie. Oracle : aucun groupe de cardinal 1. On vérifie EN PLUS le
 *       découpage exact attendu (6 + 6) : « pas d'orpheline » seul serait
 *       satisfait par un 11+1 devenu 10+2, qui reste déséquilibré.
 *
 *   (c) ORDRE DE LECTURE — la grille ne doit pas réordonner : ligne 1 = les 6
 *       premières entrées d'`EVENT_PALETTE`, ligne 2 = les 6 suivantes, chacune
 *       à gauche de la suivante. Sans cela l'ordre DOM (qui porte la navigation
 *       clavier, cf. #702) et l'ordre visuel divergeraient en silence.
 *
 * SUR LES TROIS SURFACES qui montent `PaletteColorPicker` — `CategoryDrawer`,
 * `ProductDrawer`, `EventEditForm` — parce que le défaut d'origine dépendait de
 * la largeur DISPONIBLE : il se présentait en 11+1 sur deux d'entre elles et en
 * 10+2 sur la troisième. Une seule surface ne prouverait rien des deux autres.
 *
 * EN THÈME CLAIR ET SOMBRE : la géométrie n'a aucune raison d'en dépendre, et
 * c'est précisément ce que le critère d'acceptation demande de VÉRIFIER plutôt
 * que de supposer. Le surcoût est de 2 exécutions, pas d'un second oracle.
 *
 * NE PROUVE PAS : le contraste peint (couvert par `sprint-73-model-vs-rendered`),
 * la non-réécriture des couleurs hors palette (`sprint-84-palette`), ni le rendu
 * desktop — inchangé au pixel près par construction (`sm:size-7` / `sm:h-7`),
 * et déjà tenu par les deux specs ci-dessus qui tournent à 1280 px.
 */

test.use({ storageState: PROD.storageState })

/** Minimum de cible tactile — `styles/ds/a11y-audit.md` §1 l.24 (WCAG 2.5.5). */
const TOUCH_TARGET_MIN_PX = 44

/** Viewport mobile de référence du critère d'acceptation #665. */
const MOBILE = { width: 375, height: 812 } as const

/**
 * Tolérance d'appariement de ligne. Deux pastilles d'une même rangée de grille
 * partagent leur ordonnée à la sous-pixellisation près ; deux rangées sont
 * séparées d'au moins la hauteur d'une pastille (44 px). 4 px discrimine donc
 * sans ambiguïté, et sans confondre un arrondi avec un retour à la ligne.
 */
const ROW_TOLERANCE_PX = 4

const NAV_BUDGET = 60_000
const CLICK_BUDGET = 15_000

interface Box {
  hex: string
  x: number
  y: number
  width: number
  height: number
}

/** Boîtes des 12 pastilles, dans l'ordre du DOM. */
async function swatchBoxes(page: Page, prefix: string): Promise<Box[]> {
  const boxes: Box[] = []
  for (const entry of EVENT_PALETTE) {
    const el = page.getByTestId(`${prefix}-swatch-${entry.hex}`)
    await expect(el, `pastille ${entry.role} absente`).toBeVisible({ timeout: CLICK_BUDGET })
    const b = await el.boundingBox()
    expect(b, `boundingBox nulle pour ${entry.role}`).not.toBeNull()
    boxes.push({ hex: entry.hex, x: b!.x, y: b!.y, width: b!.width, height: b!.height })
  }
  return boxes
}

/** Regroupe les boîtes en rangées visuelles, de haut en bas. */
function toRows(boxes: Box[]): Box[][] {
  const rows: Box[][] = []
  for (const b of [...boxes].sort((p, q) => p.y - q.y || p.x - q.x)) {
    const row = rows.find((r) => Math.abs(r[0].y - b.y) <= ROW_TOLERANCE_PX)
    if (row) row.push(b)
    else rows.push([b])
  }
  for (const r of rows) r.sort((p, q) => p.x - q.x)
  return rows
}

/** Résumé lisible dans le message d'échec : « 6 + 6 » ou « 11 + 1 ». */
function shape(rows: Box[][]): string {
  return rows.map((r) => r.length).join(' + ')
}

async function assertPaletteGeometry(page: Page, surface: string, prefix: string): Promise<void> {
  const boxes = await swatchBoxes(page, prefix)

  // (a) CIBLE TACTILE — chaque pastille, sur les deux axes.
  for (const b of boxes) {
    expect(
      Math.min(b.width, b.height),
      `${surface} — pastille ${b.hex} : cible ${b.width}×${b.height} px, ` +
        `minimum ${TOUCH_TARGET_MIN_PX}×${TOUCH_TARGET_MIN_PX} (a11y-audit §1 l.24)`,
    ).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_PX)
  }

  const custom = await page.getByTestId(`${prefix}-color-custom`).boundingBox()
  expect(custom, `${surface} — bouton « Personnalisé » non rendu`).not.toBeNull()
  expect(
    Math.min(custom!.width, custom!.height),
    `${surface} — « Personnalisé » : cible ${custom!.width}×${custom!.height} px, ` +
      `minimum ${TOUCH_TARGET_MIN_PX}`,
  ).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_PX)

  // (b) AUCUNE LIGNE ORPHELINE, et découpage 6 + 6.
  const rows = toRows(boxes)
  const orphans = rows.filter((r) => r.length === 1)
  expect(
    orphans.map((r) => r[0].hex),
    `${surface} — pastille(s) seule(s) sur leur ligne (découpage ${shape(rows)})`,
  ).toEqual([])
  expect(
    rows.map((r) => r.length),
    `${surface} — découpage obtenu : ${shape(rows)}`,
  ).toEqual([6, 6])

  // (c) ORDRE DE LECTURE = ordre DOM = ordre d'`EVENT_PALETTE`.
  expect(
    rows.flat().map((b) => b.hex),
    `${surface} — la grille réordonne les pastilles par rapport au DOM`,
  ).toEqual(EVENT_PALETTE.map((e) => e.hex))
}

/** Ouvre le drawer d'édition d'une catégorie seedée. */
async function openCategoryDrawer(page: Page): Promise<void> {
  const cat = await seedCategory(page, unique('665 Cat'))
  await openCategoriesTab(page)
  await page.getByTestId(`categories-card-${cat.id}`).click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('category-drawer-form')).toBeVisible({ timeout: CLICK_BUDGET })
}

/** Ouvre la sheet de création produit. */
async function openProductDrawer(page: Page): Promise<void> {
  await ensureAuthenticated(page)
  await page.goto('/fr/products', { waitUntil: 'domcontentloaded', timeout: NAV_BUDGET })
  await expect(page.getByTestId('products-list-view')).toBeVisible({ timeout: NAV_BUDGET })
  await page.getByTestId('products-new-button').click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('product-drawer-form')).toBeVisible({ timeout: CLICK_BUDGET })
}

/**
 * Ouvre le formulaire d'événement. Le déclencheur est `lg:hidden` / `hidden lg:…`
 * selon le viewport : en 375 px c'est `shell-mobile-new-event-button` qui est
 * rendu, le déclencheur de barre latérale y est CACHÉ (cf. `AppShell`, et
 * `sprint-66-mobile-create-event.spec.ts` qui verrouille cette bascule).
 */
async function openEventForm(page: Page): Promise<void> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('665 ECat'))
  const product = await seedProduct(page, {
    userId,
    name: unique('665 EProd'),
    categoryId: cat.id,
  })
  await ensureAuthenticated(page)
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: NAV_BUDGET })
  await page.getByTestId('shell-mobile-new-event-button').click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible({ timeout: CLICK_BUDGET })
  await page.getByTestId('shell-new-event-drawer-product-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('event-form')).toBeVisible({ timeout: CLICK_BUDGET })
  // Le champ couleur est en bas du formulaire : sans ce défilement, les boîtes
  // sont hors viewport et `boundingBox()` rendrait des ordonnées négatives.
  await page.getByTestId(`event-form-swatch-${EVENT_PALETTE[0].hex}`).scrollIntoViewIfNeeded()
}

const SURFACES = [
  { name: 'CategoryDrawer', prefix: 'category', open: openCategoryDrawer },
  { name: 'ProductDrawer', prefix: 'product', open: openProductDrawer },
  { name: 'EventEditForm', prefix: 'event-form', open: openEventForm },
] as const

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`#665 — palette, thème ${scheme}`, () => {
    test.use({ colorScheme: scheme, viewport: MOBILE })

    for (const surface of SURFACES) {
      test(`${surface.name} @375 : cibles >= 44×44 et grille 6×2`, async ({ page }) => {
        await neutralizeDevToolingPointerEvents(page)
        await surface.open(page)
        await assertPaletteGeometry(page, `${surface.name}/${scheme}`, surface.prefix)
      })
    }
  })
}
