import { test, expect } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { getUserId, seedCategory, seedProduct, todayIsoDate, unique } from './support/products'
import { revealSeededLane } from './support/timeline-lanes'

/**
 * #706 (Sprint 94) — GOUTTIÈRE DE PISTE MOBILE : un événement du début de plage
 * ne doit plus naître SOUS la colonne sticky des noms de lane.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE DÉFAUT EST VRAIMENT (et ce que l'énoncé disait de travers)
 * ─────────────────────────────────────────────────────────────────────────────
 * L'énoncé attribuait le défaut à `ensureVisible` et proposait de transposer le
 * correctif desktop #392. Les vues mobiles n'ont PAS d'`ensureVisible`. Le défaut
 * est STRUCTUREL : `.mt-tlm__lane-label` est `position:sticky; left:0` et OPAQUE,
 * tandis que les événements sont `position:absolute` à `left:event.leftPx` avec
 * pour origine le bord du RAIL. Tout événement dont l'abscisse de piste est
 * inférieure à la largeur de la colonne passait donc dessous, à TOUT niveau de
 * défilement. Le correctif réserve une gouttière de `--lane-header-w-m` en tête
 * de rail et y décale tout le contenu positionné.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI L'ORACLE N'EST **PAS** `elementFromPoint` (critère d'acceptation #2)
 * ─────────────────────────────────────────────────────────────────────────────
 * `.mt-tlm__lane-label` porte `pointer-events:none` (timeline.css) — contrairement
 * au desktop, où l'en-tête est un accordéon interactif (#195). Un hit-test au
 * centre du bloc ne peut donc JAMAIS rendre la colonne, que le défaut soit présent
 * ou corrigé : l'oracle demandé par l'énoncé serait VACUOUS (PIT-S91-006 /
 * PIT-S62-001, `elementsFromPoint` ne prouve pas l'ordre de peinture).
 * C'est aussi pourquoi le symptôme mobile est purement VISUEL (libellé tronqué ou
 * accolé au nom de la lane, constaté au S91) et non une perte d'atteignabilité
 * comme sur le desktop. L'oracle porteur est donc une comparaison de RECTANGLES
 * (`getBoundingClientRect`). Le hit-test est conservé en contrôle SECONDAIRE — il
 * atteste qu'aucun autre élément n'intercepte le bloc — et jamais présenté comme
 * la preuve du recouvrement.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI `scrollLeft = 0` SUFFIT À COUVRIR LE CRITÈRE « NAVIGATION »
 * ─────────────────────────────────────────────────────────────────────────────
 * Toute navigation mobile pose `scrollLeft = max(0, gouttière + x − largeur/2)`
 * (`useTimelineMobileState`, centrage initial et `scrollToToday`). Deux cas, deux
 * seulement :
 *  - la cible ne clampe pas → l'événement se retrouve à `largeur/2` du bord, soit
 *    195 px en portrait et 422 px en paysage, très au-delà des 120 px de colonne ;
 *  - la cible clampe à 0 → on est exactement dans l'état asserté ici.
 * Le pire cas est donc `scrollLeft = 0`, et c'est lui qu'on mesure. (Au zoom le
 * plus large, le rail entre souvent EN ENTIER dans la vue : `maxScroll` vaut 0 et
 * l'état est atteint sans aucun défilement artificiel — la spec le vérifie.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON-VACUITÉ — ce qui empêche ce test d'être vert pour rien
 * ─────────────────────────────────────────────────────────────────────────────
 * PIT-S85-005 / PIT-S90-005 : une garde peut rester verte quand on retire ce
 * qu'elle protège. On asserte donc explicitement la PRÉCONDITION du défaut avant
 * l'oracle : l'abscisse de PISTE de l'événement (lue sur le modèle — le `left` en
 * ligne du wrap, grandeur que le correctif ne touche pas) doit être INFÉRIEURE à
 * la largeur MESURÉE de la colonne. Les deux grandeurs sont indépendantes :
 * l'une vient du modèle, l'autre du layout. Sans gouttière, l'événement serait
 * donc peint à `railLeft + trackX`, à l'intérieur de la colonne → rouge.
 *
 * Auth : compte fixe PROD (`storageState`) — une spec neuve n'hérite d'AUCUNE
 * session (PIT-S90-011). Viewport posée par `test.use` AVANT `goto` : sinon la
 * variante desktop est montée et aucun testid mobile n'existe.
 * PRÉREQUIS RUNTIME : backend Spring + Postgres migré + front Next.
 */

const PORTRAIT = { width: 390, height: 844 }
/** Paysage « haut » (401..600) : même viewport que les specs mobiles existantes. */
const LANDSCAPE = { width: 844, height: 520 }

interface Seeded {
  eventTitle: string
  category: string
}

/** Le bloc de l'event seedé, ciblé par son titre (unique) plutôt que par index. */
function seededEvent(page: Page, title: string): Locator {
  return page.locator(`[data-testid="timeline-event"][data-event-title="${title}"]`)
}

/**
 * Seede une catégorie + un produit portant UN événement PONCTUEL daté
 * d'aujourd'hui (c'est le cas du bug d'origine : « le libellé d'un événement
 * épinglé apparaît coupé »), puis ouvre la frise dans la variante attendue.
 */
async function seedAndOpen(page: Page, variant: 'portrait' | 'landscape'): Promise<Seeded> {
  await ensureAuthenticated(page)

  const userId = await getUserId(page)
  const productName = unique('TL Gutter')
  const cat = await seedCategory(page, unique('TL Gutter Cat'))
  await seedProduct(page, {
    userId,
    name: productName,
    categoryId: cat.id,
    eventDate: todayIsoDate(),
  })

  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()
  await expect(page.getByTestId('timeline-host')).toBeVisible()
  await expect(page.getByTestId(`timeline-mobile-${variant}`)).toBeVisible()

  return { eventTitle: productName, category: cat.name }
}

/**
 * Dézoome jusqu'au niveau le plus large (bouton désactivé). C'est là que la plage
 * se comprime assez pour que le premier jour tombe sous la colonne : `computeRange`
 * pose `rangeStart` 30 jours avant le premier événement, soit 30 × 2,2 = 66 px au
 * zoom Année contre 120 px de colonne. Boucle BORNÉE et vérifiée : on asserte que
 * le bouton a bien fini désactivé plutôt que de coder en dur un nombre de clics.
 */
async function zoomOutToWidest(page: Page): Promise<void> {
  const zoomOut = page.getByTestId('timeline-zoom-out')
  for (let i = 0; i < 6 && !(await zoomOut.isDisabled()); i += 1) {
    await zoomOut.click()
  }
  await expect(zoomOut, 'le niveau de zoom le plus large doit être atteint').toBeDisabled()
}

/** Géométrie mesurée au navigateur pour une lane donnée (celle du produit semé). */
interface LaneGeometry {
  /** Abscisse de PISTE de l'événement, lue sur le MODÈLE (`left` en ligne du wrap). */
  trackLeftPx: number
  /** Largeur RENDUE de la colonne sticky (jamais présumée : `--lane-header-w-m`). */
  labelWidthPx: number
  /** Bord droit de la colonne, en coordonnées viewport. */
  labelRightPx: number
  /** Bord gauche peint de l'événement, en coordonnées viewport. */
  eventLeftPx: number
  /** Ce que le hit-test rend au centre de l'événement (contrôle SECONDAIRE). */
  hitTestTestId: string | null
  /** Course de défilement restante (0 = le rail entre en entier dans la vue). */
  maxScrollPx: number
  scrollLeftPx: number
}

async function measureLane(page: Page, eventTitle: string): Promise<LaneGeometry> {
  return page.evaluate((title) => {
    const evt = document.querySelector(
      `[data-testid="timeline-event"][data-event-title="${title}"]`,
    ) as HTMLElement | null
    if (!evt) throw new Error(`événement « ${title} » non monté dans le DOM`)
    const wrap = evt.closest('.mt-tlm__evt-wrap') as HTMLElement | null
    if (!wrap) throw new Error('wrap `.mt-tlm__evt-wrap` introuvable')
    const lane = wrap.closest('.mt-tlm__lane') as HTMLElement | null
    if (!lane) throw new Error('lane `.mt-tlm__lane` introuvable')
    const label = lane.querySelector('.mt-tlm__lane-label') as HTMLElement | null
    if (!label) throw new Error('en-tête de lane `.mt-tlm__lane-label` introuvable')
    const scroll = evt.closest('.mt-tlm__scroll') as HTMLElement | null
    if (!scroll) throw new Error('conteneur `.mt-tlm__scroll` introuvable')

    const evtRect = evt.getBoundingClientRect()
    const labelRect = label.getBoundingClientRect()
    const hit = document.elementFromPoint(
      evtRect.left + evtRect.width / 2,
      evtRect.top + evtRect.height / 2,
    ) as HTMLElement | null
    const hitOwner = hit?.closest('[data-testid]') as HTMLElement | null

    return {
      // `style.left` du wrap = repère PISTE (le décalage de gouttière est posé en
      // CSS par `margin-left`, il n'apparaît pas ici) : grandeur INVARIANTE au
      // correctif, donc utilisable comme précondition indépendante de l'oracle.
      trackLeftPx: Number.parseFloat(wrap.style.left),
      labelWidthPx: labelRect.width,
      labelRightPx: labelRect.right,
      eventLeftPx: evtRect.left,
      hitTestTestId: hitOwner?.getAttribute('data-testid') ?? null,
      maxScrollPx: scroll.scrollWidth - scroll.clientWidth,
      scrollLeftPx: scroll.scrollLeft,
    }
  }, eventTitle)
}

/** Ramène la piste à son extrême gauche (pire cas de tout centrage clampé). */
async function scrollTrackToStart(page: Page): Promise<void> {
  await page.getByTestId('timeline-scroll').evaluate((el) => {
    el.scrollTo({ left: 0, behavior: 'instant' })
  })
  // Condition, pas délai (PIT-S86-003) : `.mt-tlm__scroll` ne porte pas
  // `scroll-behavior:smooth`, mais on attend tout de même l'état stabilisé plutôt
  // que de mesurer une position en vol (PIT-S63-015).
  await expect
    .poll(() => page.getByTestId('timeline-scroll').evaluate((el) => el.scrollLeft))
    .toBe(0)
}

/**
 * Publie les grandeurs mesurées dans le rapport. Un oracle de géométrie qui ne
 * laisse AUCUN chiffre derrière lui oblige le lecteur suivant à le rejouer pour
 * savoir ce qu'il a vu passer — et c'est ainsi qu'un vert vacuous survit.
 */
function annotate(
  testInfo: { annotations: { type: string; description?: string }[] },
  geo: LaneGeometry,
  label: string,
): void {
  testInfo.annotations.push({
    type: 'geometrie-706',
    description:
      `${label} — trackLeft=${geo.trackLeftPx}px labelWidth=${geo.labelWidthPx}px ` +
      `labelRight=${geo.labelRightPx}px eventLeft=${geo.eventLeftPx}px ` +
      `scrollLeft=${geo.scrollLeftPx}px maxScroll=${geo.maxScrollPx}px hit=${geo.hitTestTestId}`,
  })
}

function assertGutter(geo: LaneGeometry, label: string): void {
  // --- PRÉCONDITION : on est bien dans la zone du défaut -----------------------
  expect(
    geo.labelWidthPx,
    `${label} — la colonne sticky doit avoir une largeur mesurable`,
  ).toBeGreaterThan(0)
  expect(
    geo.trackLeftPx,
    `${label} — l'abscisse de PISTE de l'événement (${geo.trackLeftPx}px) doit tomber ` +
      `sous la largeur de la colonne (${geo.labelWidthPx}px), sinon ce test ne prouve rien`,
  ).toBeLessThan(geo.labelWidthPx)

  // --- ORACLE : l'événement est peint À DROITE de la colonne -------------------
  // Tolérance d'un demi-pixel : les rectangles sont fractionnaires (zoom 2,2 px/j).
  expect(
    geo.eventLeftPx,
    `${label} — le bloc (left=${geo.eventLeftPx}) doit commencer au bord droit de la ` +
      `colonne sticky (right=${geo.labelRightPx}) ou après`,
  ).toBeGreaterThanOrEqual(geo.labelRightPx - 0.5)

  // --- CONTRÔLE SECONDAIRE (non porteur, cf. en-tête) -------------------------
  expect(geo.hitTestTestId, `${label} — rien ne doit intercepter le centre du bloc`).toBe(
    'timeline-event',
  )
}

test.describe('#706 — frise mobile : gouttière de piste (portrait)', () => {
  test.use({ storageState: PROD.storageState, viewport: PORTRAIT })

  test("un événement du début de plage n'est jamais peint sous la colonne sticky", async ({
    page,
  }, testInfo) => {
    const { eventTitle, category } = await seedAndOpen(page, 'portrait')

    await zoomOutToWidest(page)
    await scrollTrackToStart(page)
    // Parade virtualisation verticale posée APRÈS les clics de zoom (le clic fait
    // remonter la page et re-sort la lane de la bande) — cf. `timeline-lanes.ts`.
    await revealSeededLane(page, { category })
    await expect(seededEvent(page, eventTitle)).toHaveCount(1)

    const geo = await measureLane(page, eventTitle)
    expect(geo.scrollLeftPx, 'la piste doit être à son extrême gauche').toBe(0)
    annotate(testInfo, geo, 'portrait 390×844')
    assertGutter(geo, 'portrait 390×844')
  })
})

test.describe('#706 — frise mobile : gouttière de piste (paysage)', () => {
  test.use({ storageState: PROD.storageState, viewport: LANDSCAPE })

  test("un événement du début de plage n'est jamais peint sous la colonne sticky", async ({
    page,
  }, testInfo) => {
    const { eventTitle, category } = await seedAndOpen(page, 'landscape')

    await zoomOutToWidest(page)
    await scrollTrackToStart(page)
    await revealSeededLane(page, { category })
    await expect(seededEvent(page, eventTitle)).toHaveCount(1)

    const geo = await measureLane(page, eventTitle)
    expect(geo.scrollLeftPx, 'la piste doit être à son extrême gauche').toBe(0)
    annotate(testInfo, geo, 'paysage 844×520')
    assertGutter(geo, 'paysage 844×520')
  })
})
