import { expect, test } from './support/fixtures'
import { type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { deleteProduct, getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #758 (Sprint 101) — LE FAB NE RECOUVRE PAS LA FIN DU TABLEAU DE BORD EN PAYSAGE MOBILE.
 *
 * LA QUESTION. La réserve anti-FAB de #480 vit sur `shell-main` (padding bas sous
 * `md`). Elle ne sert que si c'est la FENÊTRE qui défile. Or le profil paysage du
 * tableau de bord (`dashboard-landscape`, `(orientation: landscape) and
 * (max-height: 500px)`) contient une grille `overflow-y-auto` : si cette grille
 * était un scrollport interne borné au viewport, la réserve serait hors de lui et le
 * bas des colonnes pourrait finir sous le FAB.
 *
 * CE QUE LA MESURE A MONTRÉ (S101, 740×390 et 667×375). La grille NE défile
 * PAS : `scrollHeight === clientHeight` (417/417 et 441/441). Sa hauteur n'est bornée
 * par rien — la racine `dashboard` est `min-h-screen` (plancher, pas plafond) et
 * `dashboard-landscape` est un `flex-1` d'une colonne non bornée — donc elle prend la
 * hauteur de son contenu et c'est le document qui défile (655 > 390). La réserve de
 * `shell-main` (92 px) s'applique donc bien ; en bas de page, le pied `AppFooter`
 * s'intercale en plus entre les colonnes et le FAB. Aucun correctif n'a été apporté.
 *
 * CE QUE CETTE SPEC VERROUILLE (pour qu'un futur `h-screen` / `h-dvh` sur le
 * tableau de bord, qui ferait naître le scrollport interne, soit vu) :
 *   0. PROFIL — `dashboard-landscape` rendu, FAB peint (largeurs < 768).
 *   1. STRUCTURE — la grille n'a pas de débordement vertical interne, le document
 *      défile (sinon la mesure est vacante), aucun débordement horizontal
 *      ([[PIT-S100-004]]).
 *   2. ÉLÉMENTS RÉELS — grille ET fenêtre défilées au maximum (`behavior:'instant'`
 *      + 2 rAF), le dernier enfant et le plus bas focusable de CHAQUE colonne, puis
 *      le plus bas focusable de `shell-main` (liens du pied compris), finissent
 *      au-dessus du FAB et reçoivent le pointeur.
 *   3. SONDE — un bouton ajouté en fin de chaque colonne (point le plus bas qu'une
 *      colonne puisse atteindre) finit au-dessus du FAB ; celui de la colonne de
 *      droite, à l'aplomb du FAB, y reçoit le pointeur.
 *   4. TÉMOIN ([[PAT-S100-001]]) — réserve de `shell-main` retirée ET pied masqué :
 *      la sonde de droite DOIT alors croiser le FAB et être masquée par lui. Sans ce
 *      témoin, 2 et 3 pourraient être verts parce que le FAB n'est pas peint ou que
 *      rien ne défile.
 *
 * 844×390 (iPhone 14 paysage) est ≥ 768 : FAB `md:hidden` non peint, rien à
 * mesurer — seule l'absence du FAB y est assertée.
 *
 * ARMEMENT (S101) : `height:100vh` injecté sur `dashboard` ⇒ la grille défile en
 * interne (417 > 244 à 740×390, 441 > 229 à 667×375) et le verrou (1) rougit.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (cf. `playwright.config.ts`).
 */

test.use({ storageState: PROD.storageState })

const LANDSCAPES = [
  { width: 740, height: 390 },
  { width: 667, height: 375 },
] as const
const FIRST_NAV_BUDGET = 60_000
const READY_BUDGET = 30_000
const PROBE_CLASS = 'zz-s101-fab-probe'
const COLUMNS = ['dashboard-landscape-agenda', 'dashboard-landscape-products'] as const

interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

interface Reading {
  label: string
  box: Box
  hitAtCenter: boolean
  hitUnderFab: boolean
}

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

async function gotoLandscapeDashboard(page: Page): Promise<void> {
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard-landscape')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard-loading')).toHaveCount(0, { timeout: READY_BUDGET })
  // Données chargées : l'agenda liste les événements seedés du jour.
  await expect(page.getByTestId('dashboard-compact-agenda-today')).toBeVisible({
    timeout: READY_BUDGET,
  })
}

/**
 * Défile la grille interne PUIS la fenêtre au maximum, sans animation, et attend deux
 * frames : lire une boîte juste après un défilement animé donne une position périmée.
 * Répété jusqu'à deux lectures égales (hauteur stable, données tardives absorbées).
 */
async function scrollAllToBottom(page: Page): Promise<void> {
  let previous = ''
  await expect
    .poll(
      async () => {
        const state = await page.evaluate(async () => {
          const grid = document.querySelector(
            '[data-testid="dashboard-landscape-agenda"]',
          )?.parentElement
          if (!grid) throw new Error('grille paysage absente')
          grid.scrollTo({ top: grid.scrollHeight, left: 0, behavior: 'instant' })
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            left: 0,
            behavior: 'instant',
          })
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          return `${grid.scrollTop}/${Math.round(window.scrollY)}/${document.documentElement.scrollHeight}`
        })
        const stable = state === previous
        previous = state
        return stable
      },
      { message: 'le défilement bas doit se stabiliser', timeout: READY_BUDGET, intervals: [250] },
    )
    .toBe(true)
}

async function fabBox(page: Page): Promise<Box> {
  const fab = page.getByTestId('shell-mobile-new-event-button')
  await expect(fab).toBeVisible()
  return fab.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
  })
}

/**
 * Mesure, dans la page, soit les éléments réels (dernier enfant + plus bas focusable
 * de chaque colonne, puis plus bas focusable de `shell-main`), soit les sondes. Pour
 * chacun : boîte, et si `elementFromPoint` le désigne à son centre et à l'aplomb du
 * FAB (milieu de la bande verticale commune s'il y en a une). Une seule fonction
 * sérialisée : `page.evaluate` ne capture pas les fonctions de la spec.
 */
async function measure(page: Page, fab: Box, mode: 'real' | 'probes'): Promise<Reading[]> {
  return page.evaluate(
    ({ columns, f, probeClass, mode: m }) => {
      const read = (el: Element, label: string): Reading => {
        const r = el.getBoundingClientRect()
        const hit = (x: number, y: number) => {
          const target = document.elementFromPoint(x, y)
          return target !== null && el.contains(target)
        }
        const cy = (r.top + r.bottom) / 2
        const top = Math.max(r.top, f.top)
        const bottom = Math.min(r.bottom, f.bottom)
        const yUnder = bottom > top ? (top + bottom) / 2 : cy
        const xUnder = Math.min(Math.max((f.left + f.right) / 2, r.left + 1), r.right - 1)
        return {
          label,
          box: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
          hitAtCenter: hit((r.left + r.right) / 2, cy),
          hitUnderFab: hit(xUnder, yUnder),
        }
      }
      if (m === 'probes') {
        return Array.from(document.querySelectorAll(`.${probeClass}`)).map((p) =>
          read(p, `sonde ${(p as HTMLElement).dataset.column ?? '?'}`),
        )
      }
      const selector =
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const lowestMatching = (root: Element, sel: string): Element | null => {
        let best: { el: Element; bottom: number } | null = null
        for (const el of Array.from(root.querySelectorAll(sel))) {
          if (el.classList.contains(probeClass)) continue
          if (el.closest('[aria-hidden="true"], [inert]')) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          // Les carrousels défilent en X : seuls les éléments dans la fenêtre en largeur.
          if (r.left < 0 || r.right > window.innerWidth) continue
          const style = getComputedStyle(el)
          if (style.visibility === 'hidden' || style.pointerEvents === 'none') continue
          if (!best || r.bottom >= best.bottom) best = { el, bottom: r.bottom }
        }
        return best?.el ?? null
      }
      const name = (el: Element) => el.getAttribute('data-testid') ?? el.tagName.toLowerCase()
      const out: Reading[] = []
      for (const id of columns) {
        const col = document.querySelector(`[data-testid="${id}"]`)
        if (!col) throw new Error(`colonne ${id} absente`)
        const children = Array.from(col.children).filter((c) => !c.classList.contains(probeClass))
        const last = children[children.length - 1]
        if (!last) throw new Error(`colonne ${id} vide`)
        out.push(read(last, `${id} › dernier enfant (${name(last)})`))
        // Plus bas élément peint de la colonne (les rangées d'agenda ne sont pas
        // focusables), puis plus bas focusable s'il y en a un.
        const lowest = lowestMatching(col, '*')
        if (!lowest) throw new Error(`colonne ${id} sans élément peint`)
        out.push(read(lowest, `${id} › plus bas élément (${name(lowest)})`))
        const focusable = lowestMatching(col, selector)
        if (focusable) out.push(read(focusable, `${id} › plus bas focusable (${name(focusable)})`))
      }
      const main = document.querySelector('[data-testid="shell-main"]')
      if (!main) throw new Error('shell-main absent')
      const lowestInMain = lowestMatching(main, selector)
      if (!lowestInMain) throw new Error('shell-main sans focusable')
      out.push(read(lowestInMain, `shell-main › plus bas focusable (${name(lowestInMain)})`))
      return out
    },
    { columns: COLUMNS, f: fab, probeClass: PROBE_CLASS, mode },
  )
}

/** Ajoute une sonde 44 px pleine largeur en DERNIER enfant de chaque colonne. */
async function appendProbes(page: Page): Promise<void> {
  await page.evaluate(
    ({ columns, probeClass }) => {
      for (const id of columns) {
        const col = document.querySelector(`[data-testid="${id}"]`)
        if (!col) throw new Error(`colonne ${id} absente`)
        col.querySelector(`.${probeClass}`)?.remove()
        const probe = document.createElement('button')
        probe.type = 'button'
        probe.className = probeClass
        probe.dataset.column = id
        probe.textContent = 'probe'
        probe.style.display = 'block'
        probe.style.width = '100%'
        probe.style.height = '44px'
        col.append(probe)
      }
    },
    { columns: COLUMNS, probeClass: PROBE_CLASS },
  )
}

for (const viewport of LANDSCAPES) {
  test.describe(`#758 — paysage ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport })

    let userId = ''
    const productIds: string[] = []

    test.beforeEach(async ({ page }) => {
      await neutralizeDevToolingPointerEvents(page)
      // Warm-up : absorbe la compilation à froid de `next dev`.
      await page.goto('/fr/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: FIRST_NAV_BUDGET,
      })
      await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
      await ensureAuthenticated(page)
      // 3 produits à événement du jour : agenda et carrousel non vides, colonnes
      // assez hautes pour que le document défile (sinon la mesure est vacante).
      userId = await getUserId(page)
      const cat = await seedCategory(page, unique('S101 FAB Cat'))
      for (let i = 0; i < 3; i++) {
        const p = await seedProduct(page, {
          userId,
          name: unique('S101 FAB'),
          categoryId: cat.id,
        })
        productIds.push(p.id)
      }
    })

    test.afterEach(async ({ page }) => {
      for (const productId of productIds.splice(0)) {
        await deleteProduct(page, { userId, productId })
      }
    })

    test('fin des colonnes et pied dégagés du FAB, témoin sans réserve', async ({ page }) => {
      test.setTimeout(150_000)
      await gotoLandscapeDashboard(page)

      // ── (0) Profil ──────────────────────────────────────────────────────────
      await expect(page.getByTestId('dashboard-mobile-portrait')).toHaveCount(0)
      const reserve = await page
        .getByTestId('shell-main')
        .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
      expect(reserve, 'padding-bottom de shell-main sous md').toBeGreaterThan(52)

      // ── (1) Structure de défilement ─────────────────────────────────────────
      await scrollAllToBottom(page)
      const structure = await page.evaluate(() => {
        const grid = document.querySelector(
          '[data-testid="dashboard-landscape-agenda"]',
        )?.parentElement
        if (!grid) throw new Error('grille paysage absente')
        const doc = document.documentElement
        return {
          gridOverflowY: getComputedStyle(grid).overflowY,
          gridScrollHeight: grid.scrollHeight,
          gridClientHeight: grid.clientHeight,
          gridScrollWidth: grid.scrollWidth,
          gridClientWidth: grid.clientWidth,
          gridScrollLeft: grid.scrollLeft,
          docScrollHeight: doc.scrollHeight,
          docScrollWidth: doc.scrollWidth,
          docClientWidth: doc.clientWidth,
          innerHeight: window.innerHeight,
        }
      })
      console.log(
        `[#758] ${viewport.width}×${viewport.height} structure ${JSON.stringify(structure)}`,
      )
      // Prémisse de l'issue : la grille EST déclarée défilante…
      expect(structure.gridOverflowY).toBe('auto')
      // …mais n'a aucun débordement interne : c'est le document qui défile, donc la
      // réserve de `shell-main` s'applique. Si ce verrou rougit, un scrollport
      // interne borné est apparu et la réserve doit être portée DANS la grille.
      expect(
        structure.gridScrollHeight,
        'la grille paysage ne doit pas défiler en interne (réserve shell-main hors scrollport)',
      ).toBeLessThanOrEqual(structure.gridClientHeight + 1)
      expect(
        structure.docScrollHeight,
        'le document doit défiler (sinon mesure vacante)',
      ).toBeGreaterThan(structure.innerHeight)
      expect(structure.gridScrollLeft).toBe(0)
      expect(structure.gridScrollWidth).toBeLessThanOrEqual(structure.gridClientWidth)
      expect(structure.docScrollWidth).toBeLessThanOrEqual(structure.docClientWidth)

      // ── (2) Éléments réels ──────────────────────────────────────────────────
      const fab = await fabBox(page)
      const real = await measure(page, fab, 'real')
      console.log(`[#758] ${viewport.width}×${viewport.height} fab ${JSON.stringify(fab)}`)
      for (const r of real) {
        console.log(
          `[#758] ${viewport.width}×${viewport.height} ${r.label} ${JSON.stringify(r.box)}`,
        )
        expect(
          r.box.bottom,
          `${r.label} doit finir au-dessus du FAB (top ${fab.top})`,
        ).toBeLessThanOrEqual(fab.top)
        expect(intersects(r.box, fab), `${r.label} croise le FAB`).toBe(false)
        // En bas de page, la fin des colonnes est déjà remontée AU-DESSUS de la
        // fenêtre (pied + réserve dessous) : le pointeur n'est vérifiable que sur ce
        // qui est peint ; les colonnes le sont en (3), une fois positionnées.
        const cy = (r.box.top + r.box.bottom) / 2
        if (cy >= 0 && cy < viewport.height) {
          expect(r.hitAtCenter, `${r.label} doit recevoir le pointeur au centre`).toBe(true)
        }
      }

      // ── (3) Sondes en fin de colonne ────────────────────────────────────────
      await appendProbes(page)
      await scrollAllToBottom(page)
      const probes = await measure(page, await fabBox(page), 'probes')
      expect(probes).toHaveLength(2)
      for (const p of probes) {
        console.log(
          `[#758] ${viewport.width}×${viewport.height} ${p.label} ${JSON.stringify(p.box)}`,
        )
        expect(p.box.bottom, `${p.label} doit finir au-dessus du FAB`).toBeLessThanOrEqual(fab.top)
        expect(intersects(p.box, fab), `${p.label} croise le FAB`).toBe(false)
      }
      // Position la plus défavorable ATTEIGNABLE : on remonte la fenêtre pour poser le
      // bas de chaque sonde au ras du haut du FAB (reculer depuis le bas de page, donc
      // atteignable, au plus jusqu'à `scrollY = 0`) ; elle doit y être peinte et
      // cliquable, y compris à l'aplomb du FAB pour la colonne de droite.
      for (const column of COLUMNS) {
        await scrollAllToBottom(page)
        const before = (await measure(page, fab, 'probes')).find((p) => p.label.includes(column))
        expect(before, `sonde ${column}`).toBeDefined()
        const delta = Math.floor(fab.top - before!.box.bottom)
        expect(delta).toBeGreaterThanOrEqual(0)
        await page.evaluate(async (dy) => {
          window.scrollBy({ top: -dy, left: 0, behavior: 'instant' })
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        }, delta)
        const placed = (await measure(page, fab, 'probes')).find((p) => p.label.includes(column))
        console.log(
          `[#758] ${viewport.width}×${viewport.height} ${placed!.label} au ras du FAB ${JSON.stringify(placed!.box)}`,
        )
        // `scrollBy` est borné à 0 : une sonde haute dans la page (colonne gauche, plus
        // courte) peut ne jamais descendre jusqu'au FAB — elle reste alors plus haut.
        expect(placed!.box.top, `${placed!.label} peinte dans la fenêtre`).toBeGreaterThanOrEqual(0)
        expect(placed!.box.bottom).toBeLessThanOrEqual(fab.top)
        expect(placed!.hitAtCenter, `${placed!.label} cliquable au centre`).toBe(true)
        if (column === 'dashboard-landscape-products') {
          // La colonne de droite passe à l'aplomb du FAB (bord droit commun) : c'est
          // elle que le FAB masquerait.
          expect(placed!.box.right).toBeGreaterThan(fab.left)
          expect(placed!.hitUnderFab, 'sonde de droite cliquable à l’aplomb du FAB').toBe(true)
        }
      }

      // ── (4) Témoin : sans réserve ni pied, la sonde de droite DOIT passer sous le FAB
      await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('[data-testid="shell-main"]')
        if (!main) throw new Error('shell-main absent')
        main.style.paddingBottom = '0px'
        document.querySelectorAll<HTMLElement>('footer').forEach((f) => {
          f.style.display = 'none'
        })
      })
      await scrollAllToBottom(page)
      const witnessFab = await fabBox(page)
      const witness = (await measure(page, witnessFab, 'probes')).find((p) =>
        p.label.includes('dashboard-landscape-products'),
      )
      expect(witness, 'sonde témoin').toBeDefined()
      console.log(
        `[#758] ${viewport.width}×${viewport.height} TÉMOIN ${witness!.label} ${JSON.stringify(witness!.box)}`,
      )
      expect(
        intersects(witness!.box, witnessFab),
        'TÉMOIN — sans réserve ni pied, la sonde doit croiser le FAB (sinon l’oracle est vacant)',
      ).toBe(true)
      expect(witness!.hitUnderFab, 'TÉMOIN — le FAB doit masquer la sonde').toBe(false)
    })
  })
}

test.describe('#758 — paysage 844×390 (≥ md) : pas de FAB', () => {
  test.use({ viewport: { width: 844, height: 390 } })

  test('profil paysage sans FAB peint', async ({ page }) => {
    test.setTimeout(120_000)
    await neutralizeDevToolingPointerEvents(page)
    await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('dashboard-landscape')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
    await expect(page.getByTestId('shell-mobile-new-event-button')).toBeHidden()
  })
})
