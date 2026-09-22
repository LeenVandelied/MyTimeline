import { test, expect, type Page } from '@playwright/test'
import { EVENT_PALETTE } from '../src/lib/event-palette'
import { waitForFonts } from './support/contrast'

/**
 * Sprint 103 — #612 : « Comment ça marche » devient une FRISE DE CAS D'USAGE à 4 jalons.
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER (d'où cette spec) :
 *   (a) le nombre de jalons RENDUS ;
 *   (b) la couleur réellement PEINTE de chaque pastille — `var(--evt-*)` résolu par la
 *       cascade — comparée au hex `EVENT_PALETTE` de son rôle ;
 *   (c) à 1280 px : une ligne horizontale continue, 4 jalons sur UNE rangée ;
 *   (d) à 375 px : frise VERTICALE (x identiques, y croissants), filet sous les
 *       pastilles, aucun débordement horizontal ;
 *   (+) à 768 px : 2 × 2 — et à TOUTE largeur, aucun filet ne traverse le texte d'un
 *       jalon (arbitrage A2) ;
 *   (e) plus aucune section ni lien `#features` ;
 *   (f) clair ET sombre (la pastille est posée sur un halo `--color-bg`, qui change).
 *
 * Landing publique : aucun `storageState` (PIT-S90-011 — pas besoin ici).
 *
 * PARSEUR DE COULEUR (PIT-S71-003) : Chrome peut rendre `color(srgb …)` au lieu de
 * `rgb()`. On passe par le canvas, qui accepte toutes les syntaxes, et on ÉCHOUE sur
 * une valeur qu'il ignore (deux sentinelles différentes → deux résultats différents),
 * plutôt que de rendre en silence la sentinelle.
 */

const SCHEMES = ['light', 'dark'] as const
const EXPECTED_ROLES = ['sky', 'periwinkle', 'grass', 'amber'] as const

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface FriezeGeometry {
  milestones: Array<{
    role: string
    box: Box
    dot: Box
    rule: Box
    /** Couleur PEINTE de la pastille, `#RRGGBB`. */
    dotHex: string
    /** Boîtes du texte (étiquette, titre, texte) du jalon. */
    texts: Box[]
  }>
  docScrollWidth: number
  docClientWidth: number
  featuresSections: number
  featuresLinks: number
  sectionOpacity: number
}

async function readFrieze(page: Page): Promise<FriezeGeometry> {
  return page.evaluate(() => {
    const toHex = (value: string): string => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) throw new Error('contexte canvas 2d indisponible')
      const parseFrom = (sentinel: string) => {
        ctx.fillStyle = sentinel
        ctx.fillStyle = value
        return String(ctx.fillStyle)
      }
      if (parseFrom('#000000') !== parseFrom('#ffffff')) {
        throw new Error(`couleur CSS non analysable : « ${value} »`)
      }
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = value
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      if (a !== 255) throw new Error(`pastille non opaque (alpha ${a}) : « ${value} »`)
      return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
    }
    const box = (el: Element): { x: number; y: number; w: number; h: number } => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const one = (root: ParentNode, testid: string): Element => {
      const found = root.querySelectorAll(`[data-testid="${testid}"]`)
      if (found.length !== 1) throw new Error(`${testid} : ${found.length} élément(s), 1 attendu`)
      return found[0]
    }

    const frieze = one(document, 'landing-frieze')
    const section = frieze.closest('section')
    const milestones = Array.from(
      frieze.querySelectorAll('[data-testid="landing-frieze-milestone"]'),
    ).map((li) => {
      const dot = one(li, 'landing-frieze-dot')
      return {
        role: li.getAttribute('data-role') ?? '',
        box: box(li),
        dot: box(dot),
        rule: box(one(li, 'landing-frieze-rule')),
        dotHex: toHex(getComputedStyle(dot).backgroundColor),
        texts: Array.from(li.querySelectorAll('p, h3')).map(box),
      }
    })
    return {
      milestones,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      featuresSections: document.querySelectorAll('#features').length,
      featuresLinks: document.querySelectorAll('a[href="#features"]').length,
      sectionOpacity: section ? parseFloat(getComputedStyle(section).opacity) : 0,
    }
  })
}

async function openLanding(page: Page, width: number, scheme: 'light' | 'dark'): Promise<void> {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto('/fr', { waitUntil: 'domcontentloaded' })
  await waitForFonts(page)
  // Le thème mesuré est bien celui annoncé (next-themes, attribute="class").
  if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
  const frieze = page.getByTestId('landing-frieze')
  await frieze.scrollIntoViewIfNeeded()
  // `useSectionAnimation` révèle la section au défilement (translateY 20px → 0, 0,8 s) :
  // une géométrie lue avant la fin de la transition serait décalée.
  await expect.poll(async () => (await readFrieze(page)).sectionOpacity, { timeout: 5_000 }).toBe(1)
  await expect
    .poll(
      () =>
        page.evaluate(() => getComputedStyle(document.querySelector('#how-it-works')!).transform),
      { timeout: 5_000 },
    )
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Aucun filet ne traverse le TEXTE d'un jalon (le sien ou un autre) — arbitrage A2. */
function expectRulesClearOfText(g: FriezeGeometry, where: string): void {
  for (const [i, m] of g.milestones.entries()) {
    for (const [j, other] of g.milestones.entries()) {
      for (const text of other.texts) {
        expect
          .soft(
            overlaps(m.rule, text),
            `${where} : le filet du jalon ${i + 1} traverse un texte du jalon ${j + 1} ` +
              `(filet ${JSON.stringify(m.rule)}, texte ${JSON.stringify(text)})`,
          )
          .toBe(false)
      }
    }
  }
}

function expectPalette(g: FriezeGeometry, where: string): void {
  expect(g.milestones, `${where} : 4 jalons attendus`).toHaveLength(4)
  expect(g.milestones.map((m) => m.role)).toEqual([...EXPECTED_ROLES])
  for (const m of g.milestones) {
    const entry = EVENT_PALETTE.find((e) => e.role === m.role)
    expect(entry, `${where} : rôle ${m.role} absent de EVENT_PALETTE`).toBeDefined()
    expect
      .soft(m.dotHex, `${where} : pastille ${m.role} peinte ${m.dotHex}, attendu ${entry?.hex}`)
      .toBe(entry?.hex)
    // Pastille 14 × 14 (maquette), carrée.
    expect.soft(Math.round(m.dot.w), `${where} : largeur pastille ${m.role}`).toBe(14)
    expect.soft(Math.round(m.dot.h), `${where} : hauteur pastille ${m.role}`).toBe(14)
  }
}

for (const scheme of SCHEMES) {
  test.describe(`Frise de cas d’usage (#612) — ${scheme}`, () => {
    test('1280 px : 4 jalons sur une rangée, une ligne horizontale continue', async ({ page }) => {
      await openLanding(page, 1280, scheme)
      const g = await readFrieze(page)
      expectPalette(g, `1280/${scheme}`)

      const [first] = g.milestones
      for (const [i, m] of g.milestones.entries()) {
        // Une seule rangée : même ordonnée ; ordre gauche → droite.
        expect.soft(Math.abs(m.box.y - first.box.y), `jalon ${i + 1} hors rangée`).toBeLessThan(1)
        if (i > 0) expect.soft(m.box.x).toBeGreaterThan(g.milestones[i - 1].box.x)
        // Filet HORIZONTAL de 1 px, à la même hauteur pour tous, et qui passe SOUS la
        // pastille (la pastille et son halo le coupent).
        expect.soft(Math.round(m.rule.h), `filet ${i + 1} : épaisseur`).toBe(1)
        expect.soft(m.rule.w, `filet ${i + 1} : horizontal`).toBeGreaterThan(m.rule.h)
        expect
          .soft(Math.abs(m.rule.y - first.rule.y), `filet ${i + 1} : même hauteur`)
          .toBeLessThan(1)
        expect.soft(m.rule.y).toBeGreaterThanOrEqual(m.dot.y)
        expect.soft(m.rule.y + m.rule.h).toBeLessThanOrEqual(m.dot.y + m.dot.h)
        // CONTINUITÉ : chaque segment rejoint le suivant par-dessus la gouttière.
        if (i < g.milestones.length - 1) {
          const next = g.milestones[i + 1]
          expect
            .soft(m.rule.x + m.rule.w, `filet ${i + 1} → ${i + 2} : ligne interrompue`)
            .toBeGreaterThanOrEqual(next.rule.x - 0.5)
        }
      }
      expectRulesClearOfText(g, `1280/${scheme}`)
      expect(g.featuresSections, 'section #features').toBe(0)
      expect(g.featuresLinks, 'liens vers #features').toBe(0)
      expect(g.docScrollWidth).toBeLessThanOrEqual(g.docClientWidth)
    })

    test('768 px : 2 × 2, une ligne par rangée, sans traverser un jalon', async ({ page }) => {
      await openLanding(page, 768, scheme)
      const g = await readFrieze(page)
      expectPalette(g, `768/${scheme}`)
      const [a, b, c, d] = g.milestones
      expect.soft(Math.abs(a.box.y - b.box.y), 'rangée 1').toBeLessThan(1)
      expect.soft(Math.abs(c.box.y - d.box.y), 'rangée 2').toBeLessThan(1)
      expect.soft(c.box.y, 'rangée 2 sous la rangée 1').toBeGreaterThan(a.box.y + a.box.h)
      expect.soft(Math.abs(a.box.x - c.box.x), 'colonne 1').toBeLessThan(1)
      for (const m of g.milestones) expect.soft(Math.round(m.rule.h)).toBe(1)
      expectRulesClearOfText(g, `768/${scheme}`)
      expect(g.docScrollWidth).toBeLessThanOrEqual(g.docClientWidth)
    })

    test('375 px : frise verticale, jalons empilés, aucun débordement', async ({ page }) => {
      await openLanding(page, 375, scheme)
      const g = await readFrieze(page)
      expectPalette(g, `375/${scheme}`)
      const [first] = g.milestones
      for (const [i, m] of g.milestones.entries()) {
        expect.soft(Math.abs(m.box.x - first.box.x), `jalon ${i + 1} : même x`).toBeLessThan(1)
        if (i > 0) {
          const prev = g.milestones[i - 1]
          expect
            .soft(m.box.y, `jalon ${i + 1} sous le précédent`)
            .toBeGreaterThan(prev.box.y + prev.box.h)
          // Le filet vertical du précédent rejoint ce jalon (pas de trou dans la frise).
          expect
            .soft(prev.rule.y + prev.rule.h, `filet ${i} → ${i + 1} : ligne interrompue`)
            .toBeGreaterThanOrEqual(m.rule.y - 0.5)
        }
        // Filet VERTICAL de 1 px, centré sous la pastille.
        expect.soft(Math.round(m.rule.w), `filet ${i + 1} : épaisseur`).toBe(1)
        expect.soft(m.rule.h, `filet ${i + 1} : vertical`).toBeGreaterThan(m.rule.w)
        const dotCenter = m.dot.x + m.dot.w / 2
        const ruleCenter = m.rule.x + m.rule.w / 2
        expect
          .soft(Math.abs(dotCenter - ruleCenter), `filet ${i + 1} centré sous la pastille`)
          .toBeLessThan(1)
      }
      expectRulesClearOfText(g, `375/${scheme}`)
      expect(
        g.docScrollWidth,
        `débordement horizontal à 375 px : ${g.docScrollWidth} > ${g.docClientWidth}`,
      ).toBeLessThanOrEqual(g.docClientWidth)
      expect(g.featuresSections).toBe(0)
    })
  })
}
