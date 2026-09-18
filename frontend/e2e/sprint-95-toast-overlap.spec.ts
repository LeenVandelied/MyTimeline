import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, seedCategory, unique } from './support/products'

/**
 * #714 (Sprint 95) — RECOUVREMENT RÉSIDUEL DU TOAST : ORACLE DE LA DÉCISION B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CETTE SPEC EST — et pourquoi elle n'assert PAS l'absence de recouvrement
 * ─────────────────────────────────────────────────────────────────────────────
 * L'arbitrage Designer de #714 est la DÉCISION B : le toast reste `top-right` à
 * 72px (`TOASTER_TOP_OFFSET`, inchangé), et le recouvrement résiduel documenté au
 * S92 est ACCEPTÉ plutôt que dégagé par un ancrage contextuel.
 *
 * Une décision d'acceptation est une AFFIRMATION GÉOMÉTRIQUE. Sans oracle, elle
 * n'est qu'un commentaire de plus : rien n'empêcherait le recouvrement de doubler
 * au prochain changement de gabarit, ni la « sortie de secours » qui le rend
 * tolérable de disparaître en silence. Cette spec rend donc B FALSIFIABLE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ DEUX PRÉMISSES DU S92 QUE LA MESURE A INFIRMÉES (#714)
 * ─────────────────────────────────────────────────────────────────────────────
 * La JSDoc du S92 situait la croix du `ProductDrawer` en bottom sheet « à ≈ 84–100px
 * à 844px de haut quand le formulaire remplit la sheet ». MESURÉ ICI, les deux
 * moitiés de cette phrase sont fausses :
 *
 *   1. LE FORMULAIRE NE REMPLIT JAMAIS LA SHEET À 844px. Le contenu réel du drawer
 *      de création (nom + catégorie + palette + date + aperçu + pied) mesure ≈ 672px.
 *      `max-h-[92vh]` vaut 776px à 844px de haut : le plafond n'est JAMAIS atteint,
 *      la sheet se dimensionne à son contenu et démarre à ≈ 170px. La croix tombe
 *      alors à ≈ 187px — 50px SOUS la carte du toast. **À 390×844, il n'y a AUCUN
 *      recouvrement.** La sheet ne se fait clamper qu'en dessous de ≈ 730px de haut
 *      (0,92·H < 672).
 *   2. LA CARTE NE FAIT PAS 46px. Le message d'erreur se replie sur deux lignes :
 *      la carte mesure ≈ 65px, soit une bande ≈ 72–137px et non 72–118px.
 *
 * Le recouvrement EXISTE donc bel et bien — mais sur les viewports COURTS, pas sur
 * celui que la note du S92 citait. On mesure les trois régimes plutôt qu'un seul :
 *   • TALL  390×844 — sheet libre, croix SOUS la bande : recouvrement NUL ;
 *   • MID   390×740 — sheet libre mais assez haute : croix ENTIÈREMENT recouverte
 *                     (pire cas, et c'est là que la sortie de secours compte) ;
 *   • SHORT 390×667 — sheet CLAMPÉE à `max-h-[92vh]` : croix partiellement recouverte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC MESURE, dans l'ordre de ce qui ferait tomber la décision
 * ─────────────────────────────────────────────────────────────────────────────
 *   (b) LA SORTIE DE SECOURS — le seul point que l'arbitrage n'a PAS pu établir
 *       statiquement. Le tap sur la bande d'overlay libre au-dessus de la sheet
 *       ferme-t-il la sheet ALORS QUE le toast d'erreur est affiché ? Si NON, la
 *       décision B s'effondre : l'utilisateur serait enfermé derrière un toast
 *       opaque pendant 4 s. C'est l'assertion à NE JAMAIS assouplir.
 *   (c) LA DISJONCTION — la bande tapable et la carte du toast ne doivent pas se
 *       chevaucher, sinon la sortie de (b) est fortuite et non structurelle.
 *   (a) LA BORNE DU RECOUVREMENT — ATTENDU sur MID/SHORT, NUL sur TALL. On l'ENCADRE
 *       (min ET max) : la spec rougit si la géométrie DÉRIVE dans un sens COMME dans
 *       l'autre. Un recouvrement qui RÉTRÉCIT est tout aussi significatif — il
 *       signifierait que le gabarit a bougé sous la décision, et que les motifs
 *       écrits dans la JSDoc ne décrivent plus le produit.
 *
 * MODÈLE ROBUSTE À LA PLATE-FORME. Les valeurs de POSITION (72px du toast, `top-4`
 * de la croix, `max-h-[92vh]`) sont du layout pur : elles sont assertées en dur.
 * Les valeurs de HAUTEUR DE TEXTE (carte du toast, contenu du formulaire) dépendent
 * des métriques de police, donc de l'OS : la CI tourne sous Linux, ce poste sous
 * macOS ([[PIT-S82-*]]). Elles ne sont donc jamais figées en dur — on les MESURE et
 * on vérifie la COHÉRENCE du modèle avec elles. Une dérive de gabarit rougit ; un
 * simple écart de rendu de police ne rougit pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE LEVIER DU TOAST D'ERREUR, ET POURQUOI CE STATUT-LÀ
 * ─────────────────────────────────────────────────────────────────────────────
 * On intercepte le `POST /api/users/{id}/products` et on rend un **400**.
 * `apiClient` lève alors `toast.error(validation.error)` — les produits ne figurent
 * PAS dans `INLINE_VALIDATION_ENDPOINTS` (qui ne contient que `/me/change-password`)
 * — et `ProductDrawer.onSubmit` retombe dans son `catch` : il pose un message inline
 * et NE FERME PAS la sheet. Toast d'erreur + sheet ouverte : la configuration de l'issue.
 *
 * POURQUOI PAS UN 500 (levier le plus évident) : à ≥ 500, `apiClient` appelle AUSSI
 * `networkStatusStore.reportServerError()`, qui monte `OfflineBanner` — une barre de
 * 32px en `--z-netbanner`, donc AU-DESSUS de tout, y compris de la bande d'overlay
 * qu'on veut taper. On mesurerait la géométrie d'une autre page. Le 400 est le seul
 * statut qui produise un toast d'erreur SANS effet de bord : 401 et 403 redirigent.
 *
 * ON NE FABRIQUE PAS LA GÉOMÉTRIE : aucune feuille de style n'est injectée, aucune
 * position n'est forcée. On intercepte une RÉPONSE SERVEUR et on mesure ce que
 * l'application rend d'elle-même.
 *
 * FENÊTRE DE MESURE. Un toast d'ERREUR vit 4 s (valeur de la bibliothèque :
 * `{error:4e3}` dans `react-hot-toast/dist/index.js` ; `TOAST_OPTIONS` ne surcharge
 * que `success`). Les mesures tiennent dans cette fenêtre et ne s'appuient sur AUCUN
 * délai fixe : `stableBox` attend une CONDITION (deux lectures consécutives égales),
 * car une boîte lue pendant l'animation d'entrée serait transitoire, et
 * `animations:'disabled'` ne fige pas une transition en cours. On ne survole JAMAIS
 * le toast pour prolonger la fenêtre : le survol suspend le décompte (WCAG 2.2.1)
 * mais n'existe pas au doigt — il rendrait la mesure plus confortable que la réalité.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

/** Les trois régimes de hauteur. La largeur est constante : seule la hauteur décide. */
const VIEWPORTS = {
  /** Sheet libre, croix SOUS la bande du toast : recouvrement NUL. */
  tall: { width: 390, height: 844 },
  /** Sheet libre mais haute : croix ENTIÈREMENT dans la bande — pire cas. */
  mid: { width: 390, height: 740 },
  /** Sheet CLAMPÉE à `max-h-[92vh]` : croix partiellement dans la bande. */
  short: { width: 390, height: 667 },
} as const

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** `--space-5 + --space-11 + --space-2` = 72px (encoche nulle en Chromium headless). */
const TOAST_TOP_OFFSET = 72
/** `top-4` de `DialogPrimitive.Close` dans `ui/dialog.tsx`. */
const CLOSE_INSET = 16
/** `max-h-[92vh]` sur `DialogContent` (`ProductDrawer`). */
const SHEET_MAX_VH = 0.92
/** Tolérance de sous-pixel / arrondi de layout. Jamais un moyen d'absorber une dérive. */
const EPSILON = 2

type Box = { x: number; y: number; width: number; height: number }

/** Deux boîtes se chevauchent-elles (bords jointifs = pas de chevauchement) ? */
function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/** Hauteur de l'intersection verticale de deux boîtes (0 si disjointes en y). */
function verticalOverlap(a: Box, b: Box): number {
  return Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
}

const fmt = (b: Box) =>
  `x=${Math.round(b.x)} y=${Math.round(b.y)} w=${Math.round(b.width)} h=${Math.round(b.height)}`

/**
 * Boîte STABILISÉE (PIT-S54-003) : deux lectures consécutives égales. Le toast entre
 * en animation ; une lecture prise pendant serait transitoire, et `animations:'disabled'`
 * ne fige pas une transition déjà lancée.
 */
async function stableBox(locator: Locator, label: string): Promise<Box> {
  const reads: { previous: Box | null; stable: Box | null } = { previous: null, stable: null }
  await expect
    .poll(
      async () => {
        const current = await locator.boundingBox()
        const last = reads.previous
        const same =
          current !== null &&
          last !== null &&
          Math.abs(current.x - last.x) < 0.5 &&
          Math.abs(current.y - last.y) < 0.5 &&
          Math.abs(current.width - last.width) < 0.5 &&
          Math.abs(current.height - last.height) < 0.5
        reads.previous = current
        if (same) reads.stable = current
        return same
      },
      { timeout: CLICK_BUDGET, message: `boîte de « ${label} » jamais stabilisée` },
    )
    .toBe(true)
  if (!reads.stable) throw new Error(`boîte de « ${label} » non stabilisée`)
  return reads.stable
}

/** La carte du toast DS, cherchée DANS l'hôte unique (`#_rht_toaster`). */
function toastCard(page: Page): Locator {
  return page.locator('#_rht_toaster').locator('[data-testid="app-toast"]')
}

/** La sheet `ProductDrawer` (contenu Radix). */
function sheet(page: Page): Locator {
  return page.locator('[role="dialog"]').filter({ has: page.getByTestId('product-drawer-form') })
}

/**
 * Boîte de l'OVERLAY Radix (`fixed inset-0`) et hauteur NATURELLE du contenu de la
 * sheet. L'overlay ne porte ni `data-testid` ni classe stable : on le prend par sa
 * RELATION au contenu (frère précédent dans le portail), ce qui reste vrai quelles
 * que soient les classes utilitaires.
 */
async function portalMetrics(page: Page): Promise<{ overlay: Box; contentScrollHeight: number }> {
  const m = await page.evaluate(() => {
    const content = document.querySelector('[role="dialog"]') as HTMLElement | null
    const overlay = content?.previousElementSibling as HTMLElement | null
    if (!content || !overlay) return null
    const r = overlay.getBoundingClientRect()
    return {
      overlay: { x: r.x, y: r.y, width: r.width, height: r.height },
      contentScrollHeight: content.scrollHeight,
    }
  })
  expect(m, "l'overlay Radix doit précéder le contenu dans le portail").not.toBeNull()
  return m as { overlay: Box; contentScrollHeight: number }
}

/**
 * Ouvre la sheet de CRÉATION produit, la remplit, et arme l'interception du POST en 400.
 */
async function openFilledCreateSheet(page: Page, label: string) {
  await neutralizeDevToolingPointerEvents(page)
  await ensureAuthenticated(page)
  await getUserId(page)
  const category = await seedCategory(page, unique(`714 ${label} Cat`))

  // 400 sur la CRÉATION seule : le GET de listing doit passer intact.
  await page.route('**/api/users/*/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'validation refusée (#714, interception E2E)' }),
    })
  })

  await page.goto('/fr/products', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('products-list-view')).toBeVisible({ timeout: FIRST_NAV_BUDGET })

  await page.getByTestId('products-new-button').click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('product-drawer-form')).toBeVisible({ timeout: CLICK_BUDGET })

  await page.getByTestId('product-name-input').fill(unique(`714 ${label} Prod`))
  await page.getByTestId('product-category-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId(`product-category-option-${category.id}`).click({ timeout: CLICK_BUDGET })
  await page.getByTestId('product-first-event-date').fill('2026-06-24')

  return { category }
}

/** Soumet et attend le 400 intercepté ; la sheet doit RESTER ouverte. */
async function submitAndExpectErrorToast(page: Page): Promise<Locator> {
  const rejected = page.waitForResponse(
    (r) => r.url().includes('/products') && r.request().method() === 'POST',
  )
  await page.getByTestId('product-submit').click({ timeout: CLICK_BUDGET })
  expect((await rejected).status(), 'le POST doit être rejeté en 400 (interception)').toBe(400)

  const toast = toastCard(page)
  await expect(toast, "le 400 doit lever un toast d'erreur global (apiClient)").toBeVisible({
    timeout: CLICK_BUDGET,
  })
  await expect(toast, 'variante danger attendue pour une erreur').toHaveClass(
    /(^|\s)mt-toast--danger(\s|$)/,
  )
  await expect(
    sheet(page),
    'la sheet doit RESTER ouverte après le rejet (sinon le scénario de #714 n’existe pas)',
  ).toBeVisible()
  return toast
}

/**
 * Mesure complète d'un régime, et contrôles COMMUNS à tous : position du toast,
 * position de la croix, hauteur de la sheet conforme au modèle, bande d'overlay
 * disjointe de la carte. Rend le recouvrement vertical croix/carte.
 */
async function measureRegime(page: Page, viewport: { width: number; height: number }) {
  const toast = await submitAndExpectErrorToast(page)

  const sheetBox = await stableBox(sheet(page), 'sheet ProductDrawer')
  const close = sheet(page).getByRole('button', { name: 'Close' })
  const closeBox = await stableBox(close, 'croix de la sheet')
  const cardBox = await stableBox(toast, 'carte du toast')
  const { overlay, contentScrollHeight } = await portalMetrics(page)

  // ── Invariants de LAYOUT PUR (indépendants des métriques de police) ───────────
  expect(
    Math.abs(cardBox.y - TOAST_TOP_OFFSET),
    `la carte doit rester posée à ${TOAST_TOP_OFFSET}px (mesuré ${Math.round(cardBox.y)}px) — la décision B est « on ne bouge pas »`,
  ).toBeLessThanOrEqual(EPSILON)

  expect(
    Math.abs(closeBox.y - (sheetBox.y + CLOSE_INSET)),
    `la croix doit être à \`top-4\` du haut de la sheet (sheet=${Math.round(sheetBox.y)}px, croix=${Math.round(closeBox.y)}px)`,
  ).toBeLessThanOrEqual(EPSILON)

  // La hauteur de la sheet suit le modèle « contenu, plafonné à 92vh ». On compare à
  // la hauteur de contenu MESURÉE (dépend de la police) — c'est le MODÈLE qu'on teste,
  // pas une constante de rendu.
  const expectedHeight = Math.min(contentScrollHeight, SHEET_MAX_VH * viewport.height)
  expect(
    Math.abs(sheetBox.height - expectedHeight),
    `hauteur de sheet incohérente avec min(contenu ${contentScrollHeight}px, 92vh ${Math.round(SHEET_MAX_VH * viewport.height)}px) : mesuré ${Math.round(sheetBox.height)}px`,
  ).toBeLessThanOrEqual(EPSILON + 2)

  // ── (c) LA BANDE D'OVERLAY TAPABLE ───────────────────────────────────────────
  // Du haut de l'écran jusqu'au PREMIER des deux obstacles : le haut de la sheet
  // (au-delà, on tape le formulaire) ou le haut de la carte du toast (au-delà, on
  // tape le toast, qui capte le pointeur). C'est la définition qui rend la sortie
  // STRUCTURELLE : le décalage fixe de 72px garantit à lui seul un ruban d'overlay
  // tapable en haut d'écran, quelle que soit la hauteur du viewport.
  const bandBottom = Math.min(sheetBox.y, TOAST_TOP_OFFSET)
  const band: Box = {
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: bandBottom - overlay.y,
  }
  expect(
    band.height,
    `la bande d'overlay tapable doit exister (mesuré ${Math.round(band.height)}px) — c'est la sortie utilisateur sur laquelle repose la décision B`,
  ).toBeGreaterThan(4)
  expect(
    intersects(band, cardBox),
    `la bande tapable [${fmt(band)}] doit être DISJOINTE de la carte [${fmt(cardBox)}] : sinon le tap de (b) réussirait par accident, pas par construction`,
  ).toBe(false)
  expect(
    band.y + band.height,
    `bas de bande (${Math.round(band.y + band.height)}px) vs haut de carte (${Math.round(cardBox.y)}px)`,
  ).toBeLessThanOrEqual(cardBox.y + EPSILON)

  const overlapPx = verticalOverlap(cardBox, closeBox)
  console.log(
    `[#714] ${viewport.width}x${viewport.height} :: toast=[${fmt(cardBox)}] croix=[${fmt(closeBox)}] ` +
      `sheet=[${fmt(sheetBox)}] contenu=${contentScrollHeight}px bande=[${fmt(band)}] ` +
      `recouvrement=${overlapPx.toFixed(1)}px`,
  )

  return { sheetBox, closeBox, cardBox, band, overlapPx, contentScrollHeight }
}

test.describe('#714 — TALL 390×844 : la sheet ne se remplit PAS, aucun recouvrement', () => {
  test.use({ storageState: PROD.storageState, viewport: VIEWPORTS.tall })

  test('(a) la croix tombe SOUS la bande du toast — la note du S92 situait ce cas à tort', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openFilledCreateSheet(page, 'Tall')
    const m = await measureRegime(page, VIEWPORTS.tall)

    // Le contenu ne peut PAS atteindre le plafond : c'est la prémisse infirmée du S92.
    expect(
      m.contentScrollHeight,
      `à ${VIEWPORTS.tall.height}px de haut, 92vh = ${Math.round(SHEET_MAX_VH * VIEWPORTS.tall.height)}px ; le contenu (${m.contentScrollHeight}px) doit rester DESSOUS — si un jour il passe au-dessus, ce régime devient recouvrant et la note de toaster.tsx doit être réécrite`,
    ).toBeLessThan(SHEET_MAX_VH * VIEWPORTS.tall.height)

    expect(
      m.overlapPx,
      `à 390×844 le recouvrement doit être NUL (croix=[${fmt(m.closeBox)}] sous la carte=[${fmt(m.cardBox)}])`,
    ).toBe(0)
    expect(
      m.closeBox.y,
      'la croix doit être SOUS le bas de la carte du toast',
    ).toBeGreaterThanOrEqual(m.cardBox.y + m.cardBox.height)
  })
})

test.describe('#714 — MID 390×740 : croix ENTIÈREMENT recouverte (pire cas)', () => {
  test.use({ storageState: PROD.storageState, viewport: VIEWPORTS.mid })

  test('(a)+(c) le recouvrement vaut TOUTE la hauteur de la croix, et la bande d’overlay en est disjointe', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openFilledCreateSheet(page, 'Mid')
    const m = await measureRegime(page, VIEWPORTS.mid)

    expect(
      intersects(m.cardBox, m.closeBox),
      `DÉCISION B : le recouvrement est ACCEPTÉ et donc ATTENDU ici. S'il a DISPARU, ce n'est pas une bonne nouvelle silencieuse — le gabarit a bougé sous la décision, et la JSDoc de toaster.tsx ne décrit plus le produit. carte=[${fmt(m.cardBox)}] croix=[${fmt(m.closeBox)}]`,
    ).toBe(true)

    // ENCADREMENT : la croix est INTÉGRALEMENT dans la bande du toast. Toute dérive,
    // dans un sens comme dans l'autre, rougit ici.
    expect(
      m.overlapPx,
      `recouvrement mesuré ${m.overlapPx.toFixed(1)}px pour une croix de ${Math.round(m.closeBox.height)}px : elle doit être ENTIÈREMENT couverte`,
    ).toBeGreaterThanOrEqual(m.closeBox.height - EPSILON)
    expect(m.overlapPx).toBeLessThanOrEqual(m.closeBox.height + EPSILON)

    // Même colonne : sans ce contrôle, un toast parti ailleurs rendrait le reste trivial.
    expect(m.cardBox.x + m.cardBox.width).toBeGreaterThan(m.closeBox.x)
  })

  test('(b) le tap sur la bande d’overlay ferme la sheet ALORS QUE le toast d’erreur est affiché', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openFilledCreateSheet(page, 'Escape')

    const toast = await submitAndExpectErrorToast(page)
    const sheetBox = await stableBox(sheet(page), 'sheet ProductDrawer')

    // Point de tap : milieu de la bande libre, au-dessus de la sheet. On ne survole
    // PAS le toast avant (le survol suspendrait son décompte — inexistant au doigt).
    const tapY = Math.floor(sheetBox.y / 2)
    const tapX = Math.floor(VIEWPORTS.mid.width / 2)
    expect(tapY, 'la bande libre doit avoir une épaisseur exploitable').toBeGreaterThan(4)
    expect(
      tapY,
      `le point de tap (${tapY}px) doit rester AU-DESSUS de la carte du toast (${TOAST_TOP_OFFSET}px) — sinon on taperait le toast, pas l'overlay`,
    ).toBeLessThan(TOAST_TOP_OFFSET)

    // Le toast est-il ENCORE là au moment du tap ? Si non, ce test aurait prouvé une
    // version plus faible de lui-même (fermeture sans toast) : on échoue franchement.
    await expect(
      toast,
      "le toast doit encore être affiché À L'INSTANT du tap — sinon la fenêtre de 4 s a expiré et le scénario de #714 n'a pas été exercé",
    ).toBeVisible()

    await page.mouse.click(tapX, tapY)

    await expect(
      sheet(page),
      `DÉCISION B TOMBE SI CECI ROUGIT : le tap sur la bande d'overlay (${tapX},${tapY}) doit fermer la sheet même pendant l'affichage du toast. Sinon l'utilisateur est enfermé derrière un toast opaque, et l'acceptation du recouvrement n'est plus défendable — il faut rouvrir #714 pour un ancrage contextuel.`,
    ).toBeHidden({ timeout: CLICK_BUDGET })
  })
})

test.describe('#714 — SHORT 390×667 : sheet CLAMPÉE à 92vh, croix partiellement recouverte', () => {
  test.use({ storageState: PROD.storageState, viewport: VIEWPORTS.short })

  test('(a)+(c) la sheet atteint bien `max-h-[92vh]` et le recouvrement reste PARTIEL et borné', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openFilledCreateSheet(page, 'Short')
    const m = await measureRegime(page, VIEWPORTS.short)

    // C'est ICI, et nulle part ailleurs, que le cas littéral du S92 se produit.
    expect(
      m.contentScrollHeight,
      `ce régime n'a de sens que si le contenu (${m.contentScrollHeight}px) DÉPASSE 92vh (${Math.round(SHEET_MAX_VH * VIEWPORTS.short.height)}px) : la sheet doit être clampée`,
    ).toBeGreaterThan(SHEET_MAX_VH * VIEWPORTS.short.height)
    expect(Math.abs(m.sheetBox.height - SHEET_MAX_VH * VIEWPORTS.short.height)).toBeLessThanOrEqual(
      EPSILON + 2,
    )

    // ENCADREMENT : recouvrement STRICTEMENT partiel — ni nul, ni total.
    expect(
      m.overlapPx,
      `le recouvrement doit être NON NUL (croix=[${fmt(m.closeBox)}] carte=[${fmt(m.cardBox)}])`,
    ).toBeGreaterThan(0)
    expect(
      m.overlapPx,
      `le recouvrement (${m.overlapPx.toFixed(1)}px) doit rester PARTIEL : la croix (${Math.round(m.closeBox.height)}px) dépasse par le haut de la bande du toast`,
    ).toBeLessThan(m.closeBox.height)
  })
})
