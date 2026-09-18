import { expect, test } from './support/fixtures'
import { type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { getUserId, openCategoriesTab, seedCategory, seedProduct, unique } from './support/products'
import { EVENT_PALETTE } from '../src/lib/event-palette'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SPRINT 84 — #577 : UNE SEULE PALETTE, ET AUCUNE RÉÉCRITURE SILENCIEUSE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ce que les tests unitaires NE PEUVENT PAS prouver, et que cette spec prouve :
 *
 *  1. NON-RÉÉCRITURE DE BOUT EN BOUT (DEC-S84-001) — une catégorie stockée avec
 *     une ANCIENNE couleur (`#E5691E`, l'orange de l'ex-`CATEGORY_SWATCHES`)
 *     s'ouvre en « Personnalisé », et après un renommage enregistré, la couleur
 *     RELUE EN BASE est toujours `#E5691E`. Le test unitaire prouve le payload du
 *     composant ; seul ce parcours prouve que rien, entre le drawer et la base
 *     (hook de mutation, service, backend), ne la « ramène » à la palette.
 *
 *  2. LE FORMULAIRE D'ÉVÉNEMENT PEINT LA PALETTE DU HANDOFF — les 12 pastilles
 *     du drawer de création sont peintes par `var(--evt-*)` : on relit le
 *     `background-color` CALCULÉ et on le compare au miroir JS `EVENT_PALETTE`
 *     (lui-même verrouillé sur `colors.css` et sur le handoff par
 *     `src/lib/event-palette.test.ts`). jsdom ne résout aucun `var()`.
 *
 *  3. CLAVIER RÉEL — flèche droite depuis la pastille cochée : le focus ET la
 *     sélection avancent, et le champ hex suit (motif radiogroup APG).
 *
 * Le contraste PEINT du glyphe de coche sur les 12 couleurs, en clair et en
 * sombre, reste couvert par `sprint-73-model-vs-rendered.spec.ts` (pastilles du
 * `CategoryDrawer`, même composant `PaletteColorPicker`).
 *
 * NE PROUVE PAS : l'ordre de tabulation complet du formulaire, ni le picker libre
 * (`react-colorful`, piloté au pointeur — hors périmètre, comme au S73).
 */

test.use({ storageState: PROD.storageState, viewport: { width: 1280, height: 900 } })

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

/** `#RRGGBB` → `rgb(r, g, b)`, la forme que rend `getComputedStyle` pour un token hex. */
function toRgbString(hex: string): string {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16)
  return `rgb(${n(1)}, ${n(3)}, ${n(5)})`
}

async function paintedFill(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).backgroundColor)
}

/** Ouvre le drawer de création d'événement sur un produit seedé. */
async function openNewEventForm(page: Page): Promise<void> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('577 Cat'))
  const product = await seedProduct(page, {
    userId,
    name: unique('577 Prod'),
    categoryId: cat.id,
  })
  await ensureAuthenticated(page)
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('shell-new-event-drawer')).toBeVisible({ timeout: CLICK_BUDGET })
  await page.getByTestId('shell-new-event-drawer-product-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('event-form')).toBeVisible()
}

test.describe('#577 — non-réécriture d’une couleur hors palette (DEC-S84-001)', () => {
  test('catégorie `#E5691E` : « Personnalisé » à l’ouverture, couleur intacte en base après renommage', async ({
    page,
  }) => {
    const LEGACY = '#E5691E'
    const original = unique('577 Legacy')
    const cat = await seedCategory(page, original, LEGACY)

    await openCategoriesTab(page)
    await page.getByTestId(`categories-card-${cat.id}`).click()
    await expect(page.getByTestId('category-drawer-form')).toBeVisible()

    // État d'ouverture : « Personnalisé » actif, aucune des 12 pastilles cochée.
    await expect(page.getByTestId('category-color-custom')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('radio')).toHaveCount(12)

    await page.getByTestId('category-name-input').fill(`${original} MAJ`)
    await page.getByTestId('category-submit').click()
    await expect(page.getByTestId('category-drawer-form')).toBeHidden()

    // Relecture EN BASE, pas dans l'UI : c'est la valeur stockée qui est en jeu.
    const res = await page.request.get('/api/categories')
    expect(res.ok(), `GET /api/categories (obtenu ${res.status()})`).toBeTruthy()
    const all = (await res.json()) as Array<{ id: string; name: string; color: string | null }>
    const stored = all.find((c) => c.id === cat.id)
    expect(stored, 'catégorie seedée introuvable après enregistrement').toBeDefined()
    expect(stored?.name).toBe(`${original} MAJ`)
    expect(
      stored?.color?.toUpperCase(),
      'la couleur hors palette a été réécrite par l’enregistrement',
    ).toBe(LEGACY)
  })
})

test.describe('#577 — palette du handoff dans le formulaire d’événement', () => {
  test('12 pastilles peintes par les tokens `--evt-*`, dans l’ordre du handoff', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    await openNewEventForm(page)

    const radios = page.getByTestId('event-form').getByRole('radio')
    await expect(radios).toHaveCount(12)
    for (const [i, entry] of EVENT_PALETTE.entries()) {
      const radio = radios.nth(i)
      await expect(radio).toHaveAttribute('data-testid', `event-form-swatch-${entry.hex}`)
      expect(await paintedFill(radio), `${entry.role} (${entry.token})`).toBe(
        toRgbString(entry.hex),
      )
    }
    await expect(page.getByTestId('event-form-color-custom')).toBeVisible()
  })

  test('clavier : flèche droite depuis la pastille cochée déplace focus ET sélection', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await neutralizeDevToolingPointerEvents(page)
    await openNewEventForm(page)

    // Couleur par défaut d'un nouvel événement = cobalt (`DEFAULT_COLOR`).
    const cobalt = page.getByTestId('event-form-swatch-#3B62D4')
    await expect(cobalt).toHaveAttribute('aria-checked', 'true')
    await cobalt.focus()
    await page.keyboard.press('ArrowRight')

    const periwinkle = page.getByTestId('event-form-swatch-#6C7BE0')
    await expect(periwinkle).toBeFocused()
    await expect(periwinkle).toHaveAttribute('aria-checked', 'true')
    await expect(cobalt).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByTestId('event-form-color-input')).toHaveValue('#6C7BE0')
  })
})
