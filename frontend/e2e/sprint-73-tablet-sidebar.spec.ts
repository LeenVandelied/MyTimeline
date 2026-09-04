import { expect, test, type Page } from '@playwright/test'
import { SHARED } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'

/**
 * #298 (Sprint 73) — SIDEBAR DU SHELL REPLIABLE SUR TABLETTE (icon-only 64px).
 *
 * LE TROU COUVERT. `AppShell` n'avait que deux états : `<aside className="hidden
 * … lg:flex">` (248px à partir de 1024) et rien en dessous. La doc du composant
 * prétendait que la tablette basculait sur `CompactRail`/`MobileDrawer` — c'était
 * FAUX : `CompactRail` est monté sur `(orientation: landscape) and (max-height:
 * 500px)` (un critère de HAUTEUR) et `MobileDrawer` sur `(max-width: 767px)`.
 * Entre 768 et 1023 px, aucun des deux ne s'appliquait : le shell ne rendait
 * AUCUNE nav. #298 comble ce trou par un état replié `hidden md:flex` +
 * `w-sidebar-collapsed lg:w-sidebar`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EST LE SEUL ORACLE
 * ─────────────────────────────────────────────────────────────────────────────
 * `AppShell.test.tsx` ne peut pas prouver ce critère : jsdom n'applique aucune
 * feuille de style et ne fait aucun layout, donc `hidden md:flex` /
 * `lg:w-sidebar` y sont inertes et la sidebar y est TOUJOURS dans le DOM, sans
 * largeur. Une assertion RTL sur la chaîne verrouille un littéral, pas un rendu
 * (famille [[PIT-S54-002]], répartition [[PAT-S66-001]]). « Repliée à 64px entre
 * md et lg » ne s'établit que dans un vrai moteur, et aux QUATRE bornes : 767 vs
 * 768 (apparition) ET 1023 vs 1024 (dépliage). Un test qui n'exercerait qu'une
 * borne ne distinguerait pas « palier correct » de « sidebar peinte partout »
 * ou de « repliée partout » — deux régressions visuelles opposées.
 *
 * VIEWPORT PAR `test.use` ET PAS `setViewportSize` (sauf pour le test de
 * réversibilité, qui teste précisément la resynchronisation) : la largeur doit
 * être établie AVANT `goto`, sinon on mesurerait le chemin desktop
 * ([[PIT-S63-001]]). Et aucune décision n'est prise sur un `locator.count()`
 * immédiat : toutes les attentes passent par `expect(...)`, qui auto-attend.
 *
 * ORACLE DE LARGEUR, PAS DE SEULE VISIBILITÉ. `toBeVisible()` ne distinguerait
 * pas 64 de 248 px. On lit donc la `boundingBox()` et on la compare aux valeurs
 * des tokens `--sidebar-width-collapsed` / `--sidebar-width` : un token qui ne
 * compilerait pas laisserait la largeur retomber sur `auto` (contenu) tout en
 * restant « visible ».
 *
 * PRÉREQUIS RUNTIME : backend Spring (:8080) + Postgres migré + front Next
 * (:3000) avec le proxy `/api`. Auth par `storageState` (compte fixe du projet
 * `setup`) → zéro register. Tests de LECTURE seule : compte partagé.
 */

test.use({ storageState: SHARED.storageState })

/** Seuil `md` de Tailwind (48rem) : apparition de la sidebar repliée. */
const MD = 768
/** Seuil `lg` (64rem) : dépliage de la sidebar. */
const LG = 1024
/** `--sidebar-width-collapsed` (spacing.css) → utilitaire `w-sidebar-collapsed`. */
const COLLAPSED_WIDTH = 64
/** `--sidebar-width` (spacing.css) → utilitaire `w-sidebar`. */
const FULL_WIDTH = 248

/** Première navigation après une modification : `next dev` recompile (10-20 s). */
const FIRST_NAV_BUDGET = 60_000

/**
 * Stabilise l'auth sur le dashboard à la viewport COURANTE (fixée par `test.use`
 * avant tout `goto`), après neutralisation des devtools React Query qui
 * intercepteraient les clics et fausseraient les mesures ([[PIT-S63-003]]).
 */
async function openShell(page: Page): Promise<void> {
  await neutralizeDevToolingPointerEvents(page)
  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })
  await ensureAuthenticated(page)
}

/** Largeur peinte de la sidebar (null si elle n'a pas de boîte). */
async function sidebarWidth(page: Page): Promise<number | null> {
  const box = await page.getByTestId('shell-sidebar').boundingBox()
  return box ? Math.round(box.width) : null
}

// ---------------------------------------------------------------------------
// 1. La matrice : un test par borne, viewport figée par `test.use`.
// ---------------------------------------------------------------------------

interface Palier {
  width: number
  label: string
  /** Sidebar peinte ? */
  sidebar: boolean
  /** Largeur attendue quand elle est peinte. */
  expectedWidth?: number
  /** Libellés textuels visibles (état déplié) ? */
  labels: boolean
}

const PALIERS: readonly Palier[] = [
  { width: MD - 1, label: 'mobile, dernier pixel', sidebar: false, labels: false },
  { width: MD, label: 'tablette, 1er pixel', sidebar: true, expectedWidth: COLLAPSED_WIDTH, labels: false },
  { width: LG - 1, label: 'tablette, dernier pixel', sidebar: true, expectedWidth: COLLAPSED_WIDTH, labels: false },
  { width: LG, label: 'desktop, 1er pixel', sidebar: true, expectedWidth: FULL_WIDTH, labels: true },
]

for (const p of PALIERS) {
  test.describe(`#298 — shell à ${p.width} px (${p.label})`, () => {
    test.use({ viewport: { width: p.width, height: 900 } })

    test(`sidebar, libellés et déclencheur unique à ${p.width} px`, async ({ page }) => {
      test.setTimeout(120_000)
      await openShell(page)

      const sidebar = page.getByTestId('shell-sidebar')
      const sidebarTrigger = page.getByTestId('shell-sidebar-new-event-button')
      const floatingTrigger = page.getByTestId('shell-mobile-new-event-button')
      const navLabel = page
        .getByTestId('shell-sidebar-nav-link-dashboard')
        .locator('span')
        .first()

      if (p.sidebar) {
        await expect(
          sidebar,
          `la sidebar doit être peinte à ${p.width} px (>= ${MD})`,
        ).toBeVisible()
        expect(
          await sidebarWidth(page),
          `à ${p.width} px la sidebar doit mesurer ${p.expectedWidth}px ` +
            "(token layout-specific ; une largeur inattendue = l'utilitaire n'a pas compilé)",
        ).toBe(p.expectedWidth)

        // Les cibles restent identifiables sans libellé visible : le nom
        // accessible ne vient PAS du texte peint mais d'`aria-label` (pattern
        // `RailButton`), donc il vaut aux deux états.
        await expect(page.getByTestId('shell-sidebar-nav-link-dashboard')).toHaveAttribute(
          'aria-label',
          /.+/,
        )
        await expect(page.getByTestId('shell-sidebar-nav-link-dashboard')).toHaveAttribute(
          'title',
          /.+/,
        )

        if (p.labels) {
          await expect(navLabel, `à ${p.width} px (>= ${LG}) le libellé doit être peint`).toBeVisible()
        } else {
          await expect(
            navLabel,
            `à ${p.width} px la sidebar est icon-only : le libellé ne doit PAS être peint`,
          ).toBeHidden()
        }
      } else {
        await expect(
          sidebar,
          `la sidebar doit être masquée à ${p.width} px (< ${MD})`,
        ).toBeHidden()
      }

      // ---- Invariant #455 réécrit pour 3 états : EXACTEMENT un déclencheur ----
      // `hidden md:flex` (aside) et `md:hidden` (flottant) sont deux classes que
      // rien ne relie dans le typage : si elles divergeaient, un palier aurait
      // deux déclencheurs, ou zéro (le défaut d'origine de #455).
      if (p.sidebar) {
        await expect(sidebarTrigger).toBeVisible()
        await expect(
          floatingTrigger,
          `à ${p.width} px (>= ${MD}) le bouton flottant doit céder la place à celui de la sidebar`,
        ).toBeHidden()
      } else {
        await expect(sidebarTrigger).toBeHidden()
        await expect(
          floatingTrigger,
          `à ${p.width} px (< ${MD}) le bouton flottant est le SEUL déclencheur de création`,
        ).toBeVisible()
      }
    })
  })
}

// ---------------------------------------------------------------------------
// 2. Réversibilité aux deux frontières. Une règle écrite `min-width` d'un côté
//    et `max-width` de l'autre passerait la matrice ci-dessus et échouerait ici.
// ---------------------------------------------------------------------------

test.describe('#298 — frontières réversibles', () => {
  test.use({ viewport: { width: LG, height: 900 } })

  test('767/768 et 1023/1024 basculent au pixel, dans les deux sens', async ({ page }) => {
    test.setTimeout(120_000)
    await openShell(page)

    const sidebar = page.getByTestId('shell-sidebar')
    const floatingTrigger = page.getByTestId('shell-mobile-new-event-button')

    // Départ : déplié.
    await expect(sidebar).toBeVisible()
    expect(await sidebarWidth(page)).toBe(FULL_WIDTH)

    // ---- Frontière `lg` : 1024 -> 1023 (dépliée -> repliée) -----------------
    await page.setViewportSize({ width: LG - 1, height: 900 })
    await expect(sidebar, 'à 1023 px la sidebar reste peinte, mais repliée').toBeVisible()
    await expect
      .poll(() => sidebarWidth(page), {
        message: 'à 1023 px la sidebar doit se replier à 64px',
      })
      .toBe(COLLAPSED_WIDTH)
    await expect(floatingTrigger, 'à 1023 px le flottant reste masqué').toBeHidden()

    // ---- Frontière `md` : 768 -> 767 (repliée -> masquée) -------------------
    await page.setViewportSize({ width: MD, height: 900 })
    await expect(sidebar, 'à 768 px la sidebar est encore peinte').toBeVisible()
    await expect.poll(() => sidebarWidth(page)).toBe(COLLAPSED_WIDTH)

    await page.setViewportSize({ width: MD - 1, height: 900 })
    await expect(sidebar, 'à 767 px la sidebar doit disparaître').toBeHidden()
    await expect(
      floatingTrigger,
      "à 767 px le bouton flottant reprend la main — sans lui, plus aucun déclencheur de création",
    ).toBeVisible()

    // ---- Retour montant : 767 -> 768 -> 1024 -------------------------------
    await page.setViewportSize({ width: MD, height: 900 })
    await expect(sidebar, 'de retour à 768 px la sidebar doit revenir').toBeVisible()
    await expect.poll(() => sidebarWidth(page)).toBe(COLLAPSED_WIDTH)
    await expect(floatingTrigger).toBeHidden()

    await page.setViewportSize({ width: LG, height: 900 })
    await expect.poll(() => sidebarWidth(page)).toBe(FULL_WIDTH)
  })
})
