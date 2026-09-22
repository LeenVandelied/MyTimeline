import { test, expect } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { ensureAuthenticated } from './support/auth'
import { PROD } from './support/accounts'
import { openCategoriesTab } from './support/products'
import {
  readStable,
  waitForFonts,
  WCAG_AA_NORMAL,
  WCAG_AA_NON_TEXT,
  type TextRendering,
} from './support/contrast'

/**
 * Sprint 97 — #670 (DEC-S97-001) : `--color-ink-faint` ne porte plus aucun texte.
 *
 * DÉFAUT CORRIGÉ : l'eyebrow de `/fr/timeline`, les placeholders du DS
 * (`.mt-input` / `.mt-textarea` / `.mt-select__placeholder`), compteurs, légendes,
 * mentions « aucun… » étaient peints en `ink-faint` = 2,56 à 2,99:1 selon la
 * surface et le thème (AA texte = 4,5:1). Le token garde sa valeur (palier
 * décoratif) ; tout texte passe sur `ink-muted`, les indicateurs de contrôle sur
 * `ink-muted` / `rule-emphasis` (1.4.11, ≥ 3:1).
 *
 * CE QUE JSDOM NE PEUT PAS PROUVER : la couleur RÉSOLUE (cascade DS + thème
 * `next-themes`) et le fond réellement peint sous le texte. D'où cette mesure sur
 * rendu réel, clair ET sombre, sur 4 consommateurs représentatifs :
 *   1. eyebrow de `/fr/timeline` (texte, surface `bg`) ;
 *   2. placeholder `.mt-textarea` du drawer catégorie (texte via `::placeholder`) ;
 *   3. eyebrow du dashboard (`dashboard-greeting-eyebrow`, texte) ;
 *   4. loupe de la recherche produits (icône d'indice de champ, 1.4.11 → 3:1).
 *
 * MESURE — `readStable` (fond composité des ancêtres, helper #337). Pour le
 * placeholder, le helper lit `color` de l'ÉLÉMENT, pas du pseudo : on garde son
 * fond composité et on remplace l'encre par `getComputedStyle(el,'::placeholder')`.
 *
 * CONTRÔLE NÉGATIF (joué au S97, cf. `issue-670-done.md`) : contre le code d'avant
 * migration, les 4 mesures × 2 thèmes rougissent (2,56 à 2,99:1).
 */

test.use({ storageState: PROD.storageState })

/** Luminance relative WCAG 2.x (linéarisation sRGB canal par canal). */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Couleur CSS quelconque → `#rrggbb` (canvas : accepte `color-mix()`, `oklch()`…). */
async function toHex(page: Page, css: string): Promise<string> {
  return page.evaluate((value) => {
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.fillStyle = '#010203'
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  }, css)
}

async function assertTheme(page: Page, scheme: 'light' | 'dark'): Promise<void> {
  // Le thème mesuré est bien celui annoncé (next-themes, attribute="class").
  if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  else await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
}

function expectRatio(r: TextRendering, min: number, tag: string): void {
  test.info().annotations.push({
    type: 'contraste',
    description: `${tag} ${r.foreground} sur ${r.background} = ${r.ratio.toFixed(2)}:1`,
  })
  expect(
    r.ratio,
    `${tag} ${r.foreground} sur ${r.background} = ${r.ratio.toFixed(2)}:1 (seuil ${min})`,
  ).toBeGreaterThanOrEqual(min)
  expect(r.effectiveOpacity, `${tag} opacité pleine`).toBe(1)
}

async function measure(page: Page, locator: Locator): Promise<TextRendering> {
  await page.mouse.move(0, 0)
  await locator.scrollIntoViewIfNeeded()
  await waitForFonts(page)
  return readStable(locator)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`#670 ink-faint → ink-muted — thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test('eyebrow de /fr/timeline ≥ 4,5:1', async ({ page }) => {
      await ensureAuthenticated(page)
      await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
      const eyebrow = page.getByTestId('timeline-screen').locator('header > span').first()
      await expect(eyebrow).toBeVisible()
      await expect(eyebrow).not.toBeEmpty()
      await assertTheme(page, scheme)
      expectRatio(await measure(page, eyebrow), WCAG_AA_NORMAL, `[${scheme}/timeline eyebrow]`)
    })

    test('eyebrow du dashboard ≥ 4,5:1', async ({ page }) => {
      await ensureAuthenticated(page)
      await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded' })
      const eyebrow = page.getByTestId('dashboard-greeting-eyebrow')
      await expect(eyebrow).toBeVisible()
      await expect(eyebrow).not.toBeEmpty()
      await assertTheme(page, scheme)
      expectRatio(await measure(page, eyebrow), WCAG_AA_NORMAL, `[${scheme}/dashboard eyebrow]`)
    })

    test('placeholder `.mt-textarea` du drawer catégorie ≥ 4,5:1', async ({ page }) => {
      await openCategoriesTab(page)
      await page.getByTestId('categories-new-button').click()
      const field = page.getByTestId('category-description-input')
      await expect(field).toBeVisible()
      await expect(field).toHaveValue('')
      await expect(field).toHaveAttribute('placeholder', /\S/)
      await expect(field).toBeEnabled()
      await expect(field).toHaveClass(/\bmt-textarea\b/)
      await assertTheme(page, scheme)

      const box = await measure(page, field)
      const placeholderCss = await field.evaluate(
        (el) => getComputedStyle(el, '::placeholder').color,
      )
      const fg = await toHex(page, placeholderCss)
      const r: TextRendering = { ...box, foreground: fg, ratio: ratio(fg, box.background) }
      expectRatio(r, WCAG_AA_NORMAL, `[${scheme}/placeholder mt-textarea]`)
    })

    test('loupe de la recherche produits ≥ 3:1 (1.4.11)', async ({ page }) => {
      await ensureAuthenticated(page)
      await page.goto('/fr/products', { waitUntil: 'domcontentloaded' })
      const input = page.getByTestId('products-search-input')
      await expect(input).toBeVisible()
      // L'icône est le frère précédent du champ (seul `svg` du conteneur relatif).
      const icon = input.locator('xpath=preceding-sibling::*[local-name()="svg"][1]')
      await expect(icon).toHaveCount(1)
      await assertTheme(page, scheme)
      // Le trait du glyphe hérite bien de `color` (stroke = currentColor) : c'est
      // donc `color` qu'il faut mesurer.
      const { color, stroke } = await icon.evaluate((el) => ({
        color: getComputedStyle(el).color,
        stroke: getComputedStyle(el).stroke,
      }))
      expect(stroke, 'stroke du glyphe = color').toBe(color)
      expectRatio(await measure(page, icon), WCAG_AA_NON_TEXT, `[${scheme}/loupe produits]`)
    })
  })
}
