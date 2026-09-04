import { expect, test, type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated } from './support/auth'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'
import { WCAG_AA_NON_TEXT, describeRendering, readStable, waitForFonts } from './support/contrast'
import { getUserId, seedCategory, seedProduct, unique } from './support/products'

/**
 * #325 (Sprint 70) — RENDU VISUEL DE LA MINI-FRISE D'APERÇU, CLAIR ET SOMBRE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 * #315 a livré la mini-frise du handoff §6 et a DÉDUIT sa conformité de l'usage
 * des tokens du DS, sans jamais regarder un rendu. C'est exactement le
 * raisonnement qui a produit deux CTA à 1.00:1 au Sprint 48 ([[PIT-S48-002]]) :
 * un token bien nommé ne dit rien de ce qui est peint. Seul un moteur de rendu
 * répond à « qu'est-ce que l'utilisateur voit » — `jsdom` ne met rien en page et
 * ne résout pas la précédence des `@layer`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA SPEC MESURE — un point par élément du handoff §6
 * ─────────────────────────────────────────────────────────────────────────────
 *   règle (graduations) · marqueur TODAY (barre + badge) · barre pleine ·
 *   connecteur pointillé · occurrence fantôme · légende · variante
 *   `.mt-evt--preview` (non interactive).
 *
 * MÉTHODE DES RATIOS (exigence de [[PIT-S58-001]] : dire COMMENT le ratio est
 * obtenu). `getComputedStyle` + compositage des fonds traversés, via
 * `support/contrast.ts` — le même module qui a servi à #337. Les éléments
 * mesurés ici ne portent AUCUNE transition de couleur et aucun pseudo-élément
 * couvrant : le style calculé et le pixel peint coïncident (contrairement au
 * cas `outline-offset` de [[PIT-S58-001]], où le trait est peint sur le parent).
 * L'attente de stabilisation de `readStable` reste appliquée — l'aperçu est
 * alimenté par des valeurs débouncées à 150 ms côté formulaire.
 *
 * ÉCHANTILLON CHOISI PAR LE RISQUE, pas par commodité ([[PIT-S53-*]], S53 :
 * une passe verte avait raté 28 titres faute d'échantillon représentatif) :
 *   - `cobalt`  = `DEFAULT_COLOR`, le cas nominal, celui que tout le monde voit ;
 *   - `citron`  = la couleur la PLUS CLAIRE de la palette curatée — c'est là que
 *     l'encre calculée par `contrastInk` bascule et là qu'un trait coloré
 *     disparaît sur un fond clair ;
 *   - `nuit`    = une couleur libre quasi noire (le champ couleur est un `input`
 *     texte : toute valeur hexadécimale valide est atteignable), pire cas du
 *     thème sombre.
 * Les deux thèmes sont parcourus pour chacune.
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api`
 * (`docs/memory/sprints/sprint-47/e2e-local-runbook.md`).
 */

const SCHEMES = ['light', 'dark'] as const

/** Desktop COURT : c'est la hauteur où le bandeau d'aperçu ampute le plus le corps. */
const DESKTOP_SHORT = { width: 1280, height: 700 }

const CLICK_BUDGET = 15_000
const FIRST_NAV_BUDGET = 60_000

interface Swatch {
  readonly name: string
  readonly hex: string
  /**
   * #497 — thèmes dans lesquels le trait est attendu **PLANCHÉ**, c'est-à-dire
   * peint dans une couleur DIFFÉRENTE de celle choisie par l'utilisateur.
   *
   * Historique. #325 mesurait déjà ces 4 cas mais les EXEMPTAIT du seuil : le
   * connecteur et le contour du fantôme reprenaient la couleur utilisateur sans
   * plancher (citron en clair **2.20:1** / **2.07:1** ; quasi-noir en sombre
   * **1.02:1** / **1.02:1** — le trait avait la luminance du fond). #497 a
   * tranché la doctrine (mélange progressif vers l'encre du thème jusqu'à 3:1,
   * `lib/color.ts:outlineFloorVars`) : l'exemption a donc DISPARU, tous les
   * traits sont exigés à `WCAG_AA_NON_TEXT` pour TOUTE couleur.
   *
   * Ce champ ne relâche plus rien — il durcit. Il ancre l'autre moitié de la
   * doctrine, celle qu'un seuil seul ne sait pas dire : le plancher est
   * **progressif**, donc une couleur déjà conforme doit ressortir **INTACTE**.
   * Sans cette assertion, un repli brutal sur un token neutre (ou un mélange
   * qui sur-corrige) passerait au vert en effaçant l'identité colorée des 12
   * couleurs de la palette.
   */
  readonly flooredIn: readonly (typeof SCHEMES)[number][]
}

const SWATCHES: readonly Swatch[] = [
  // Cas nominal : conforme dans les deux thèmes AVANT #497 (5.41 / 3.38 sur le
  // connecteur, 4.83 / 3.18 sur le contour) → doit rester rigoureusement intact.
  { name: 'cobalt (DEFAULT_COLOR)', hex: '#3B62D4', flooredIn: [] },
  // Pire cas CLAIR : la plus claire de la palette curatée.
  { name: 'citron (la plus claire de la palette)', hex: '#A7B83A', flooredIn: ['light'] },
  // Pire cas SOMBRE : couleur libre quasi noire (le champ couleur est un `input`
  // texte, toute valeur hexadécimale valide est atteignable).
  { name: 'nuit (couleur libre quasi noire)', hex: '#101318', flooredIn: ['dark'] },
] as const

/** `#RRGGBB` → `rgb(r, g, b)`, la forme rendue par `getComputedStyle`. */
function toRgbString(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Ouvre le drawer de création, choisit un produit et met le formulaire dans
 * l'état qui rend TOUS les éléments du §6 — c'est le seul état où le connecteur
 * et l'occurrence fantôme existent (`previewTimeline.ts` : pas de récurrence,
 * pas de fantôme, donc pas de connecteur).
 */
async function openPreviewInRecurringState(page: Page): Promise<Locator> {
  await neutralizeDevToolingPointerEvents(page)

  await page.goto('/fr/dashboard', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: FIRST_NAV_BUDGET })

  // BR-EVE-002 : sans produit, le drawer ne rend aucun formulaire.
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('325 Visual Cat'))
  const product = await seedProduct(page, {
    userId,
    name: unique('325 Visual Prod'),
    categoryId: cat.id,
  })
  await ensureAuthenticated(page)

  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded', timeout: FIRST_NAV_BUDGET })
  await page.getByTestId('shell-sidebar-new-event-button').click({ timeout: CLICK_BUDGET })

  const panel = page.getByTestId('shell-new-event-drawer')
  await expect(panel).toBeVisible({ timeout: CLICK_BUDGET })
  // Oracle de CHEMIN (repris de #326) : sans `.mt-drawer--form` on mesurerait la
  // bottom sheet, qui n'a PAS de bandeau d'aperçu — le test jugerait autre chose.
  await expect(panel).toHaveClass(/(^|\s)mt-drawer--form(\s|$)/)

  await page.getByTestId('shell-new-event-drawer-product-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId(`product-option-${product.id}`).click({ timeout: CLICK_BUDGET })
  await expect(page.getByTestId('event-form')).toBeVisible()

  await page.getByTestId('event-form-title-input').fill('Révision annuelle')

  // Date de début FUTURE et proche : TODAY reste dans la fenêtre (sinon pas de
  // marqueur à mesurer) et le fantôme mensuel y entre aussi.
  const start = new Date()
  start.setDate(start.getDate() + 3)
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
    start.getDate(),
  ).padStart(2, '0')}`
  await page.getByTestId('event-form-start-date').fill(iso)

  await page.getByTestId('event-form-recurring-toggle').click()
  await page.getByTestId('event-form-recurrence-trigger').click({ timeout: CLICK_BUDGET })
  await page.getByTestId('recurrence-unit-option-MONTH').click({ timeout: CLICK_BUDGET })

  await waitForFonts(page)
  return panel
}

/** Applique une couleur et attend que l'aperçu débouncé (150 ms) l'ait prise. */
async function applyColor(page: Page, hex: string): Promise<void> {
  await page.getByTestId('event-form-color-input').fill(hex)
  // Le pointeur est écarté AVANT toute mesure : un élément resté sous le curseur
  // serait lu dans son état `:hover` (le défaut réel attrapé au S48 via `readAtRest`).
  await page.mouse.move(0, 0)
  await expect
    .poll(
      async () =>
        page
          .getByTestId('event-form-preview-bar')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      { message: `la barre d'aperçu n'a jamais pris la couleur ${hex}`, timeout: 5_000 },
    )
    .not.toBe('')
  // Marge au-delà du débounce + des transitions `--dur-micro` ([[PIT-S58-002]] :
  // une sonde lancée trop tôt lit une couleur INTERPOLÉE).
  await page.waitForTimeout(500)
}

/** Contraste d'un TEXTE : seuil WCAG 1.4.3 déduit de la taille et de la graisse. */
async function expectTextReadable(locator: Locator, label: string): Promise<number> {
  const r = await readStable(locator)
  expect(r.ratio, describeRendering(label, r)).toBeGreaterThanOrEqual(r.wcagThreshold)
  return r.ratio
}

/**
 * Contraste d'un TRAIT porteur d'information (WCAG 1.4.11, 3:1).
 *
 * `property` désigne l'encre : la bordure pour un pointillé, le fond pour un
 * aplat plein (la barre TODAY). La garde de `readTextRendering` lève si la
 * bordure visée n'existe pas — sans quoi `currentColor` ferait mesurer le texte.
 */
async function expectTraitVisible(
  locator: Locator,
  label: string,
  property: 'borderTopColor' | 'backgroundColor',
): Promise<number> {
  const r = await readStable(locator, 3_000, property)
  expect(r.ratio, describeRendering(label, r)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT)
  return r.ratio
}

for (const scheme of SCHEMES) {
  test.describe(`#325 — mini-frise d'aperçu, thème ${scheme}`, () => {
    // `next-themes` est en `defaultTheme="system" enableSystem` : l'émulation
    // `colorScheme` suffit à poser `.dark` sur <html> (précédent : #337).
    test.use({ storageState: PROD.storageState, viewport: DESKTOP_SHORT, colorScheme: scheme })

    test('chaque élément du handoff §6 est rendu et lisible', async ({ page }) => {
      test.setTimeout(180_000)
      const panel = await openPreviewInRecurringState(page)

      // ── ORACLE DE THÈME ────────────────────────────────────────────────────
      // Sans lui, les deux blocs `describe` mesureraient le MÊME rendu clair et
      // la colonne « sombre » du rapport serait une copie déguisée.
      const isDark = await page.evaluate(
        () =>
          document.documentElement.classList.contains('dark') ||
          document.documentElement.getAttribute('data-theme') === 'dark',
      )
      expect(isDark, `le thème ${scheme} n'est pas réellement appliqué à <html>`).toBe(
        scheme === 'dark',
      )

      const preview = page.getByTestId('event-form-preview')
      await expect(preview).toBeVisible()
      const timeline = page.getByTestId('event-form-preview-timeline')

      // ── PRÉSENCE : les 7 éléments du §6 existent RÉELLEMENT ────────────────
      // Un ratio ne se mesure pas sur un élément absent : `readStable` lèverait,
      // mais le message ne dirait pas « le handoff n'est pas rendu ».
      for (const testid of [
        'event-form-preview-ruler',
        'event-form-preview-today',
        'event-form-preview-bar',
        'event-form-preview-connector',
        'event-form-preview-ghost',
        'event-form-preview-legend',
        'event-form-preview-recurrence',
      ]) {
        await expect(
          page.getByTestId(testid),
          `handoff §6 : ${testid} absent du rendu`,
        ).toHaveCount(1)
      }

      // La barre TODAY (`Cursor`) n'a pas de testid : elle est repérée par sa
      // classe utilitaire, et on exige l'UNICITÉ pour ne pas mesurer autre chose.
      const cursorBar = timeline.locator('div.bg-accent')
      await expect(cursorBar).toHaveCount(1)

      for (const swatch of SWATCHES) {
        await applyColor(page, swatch.hex)
        const tag = `[${scheme}/${swatch.name}]`

        // ── RÈGLE ────────────────────────────────────────────────────────────
        // `Ruler` rend une grille de `DateStamp` : des cellules `text-ink` sur
        // `bg-surface-2`, SAUF celle d'aujourd'hui qui passe sur `bg-accent-soft`.
        // Ces deux fonds sont mesurés séparément — c'est un aplat teinté, donc
        // le seul endroit de la règle où l'encre peut décrocher.
        const ruler = page.getByTestId('event-form-preview-ruler')
        const ticks = ruler.locator('div.grid > div')
        expect(await ticks.count(), 'la règle ne rend aucune graduation').toBeGreaterThan(0)
        await expectTextReadable(ticks.first(), `${tag} règle — graduation ordinaire`)
        // CONSTAT MESURÉ (#325), pas une hypothèse : la règle de l'aperçu ne
        // porte JAMAIS le surlignage `bg-accent-soft` de `DateStamp`. Ce
        // surlignage exige `day.toDateString() === now.toDateString()`, or
        // `previewTimeline.ts` échantillonne `PREVIEW_COLUMNS` dates réparties
        // sur toute la fenêtre : aucune ne tombe sur la journée courante, sauf
        // coïncidence. Ce n'est PAS un écart au handoff §6 — « règle + TODAY » y
        // est porté par le curseur et le badge, tous deux mesurés ci-dessous —
        // mais la cellule teintée n'existe pas et ne doit donc pas être
        // revendiquée comme mesurée. On fige le constat pour qu'un futur
        // changement de géométrie le signale au lieu de le glisser sous le tapis.
        await expect(
          ruler.locator('div.bg-accent-soft'),
          'la règle surligne désormais une cellule TODAY : géométrie changée, ' +
            'ce cas teinté n’est plus couvert par la mesure ci-dessus',
        ).toHaveCount(0)

        // ── MARQUEUR TODAY ───────────────────────────────────────────────────
        await expectTraitVisible(cursorBar, `${tag} TODAY — barre`, 'backgroundColor')
        await expectTextReadable(
          page.getByTestId('event-form-preview-today'),
          `${tag} TODAY — badge`,
        )

        // ── BARRE PLEINE ─────────────────────────────────────────────────────
        await expectTextReadable(
          page.getByTestId('event-form-preview-bar'),
          `${tag} barre — libellé`,
        )

        // ── CONNECTEUR POINTILLÉ + CONTOUR DU FANTÔME (#497) ─────────────────
        // Les deux traits sont peints dans la couleur de l'événement, PLANCHÉE
        // à 3:1. Exigé pour TOUTE couleur depuis #497 — l'exemption de #325 est
        // levée, c'est le durcissement demandé par l'issue.
        const traits = [
          {
            locator: page.getByTestId('event-form-preview-connector'),
            label: `${tag} connecteur pointillé`,
          },
          {
            locator: page.getByTestId('event-form-preview-ghost'),
            label: `${tag} fantôme — contour pointillé`,
          },
        ] as const
        const isFloored = swatch.flooredIn.includes(scheme)
        for (const trait of traits) {
          await expectTraitVisible(trait.locator, trait.label, 'borderTopColor')

          // ORACLE DE MÉCANISME. Le seuil seul ne dit pas COMMENT il est
          // atteint : un plancher inopérant + un fond qui aurait bougé
          // passerait aussi. On compare donc la couleur RÉELLEMENT peinte à
          // celle qui a été saisie — c'est la mesure qui distingue
          // « le plancher agit » de « le contraste est bon par accident ».
          const painted = await trait.locator.evaluate((el) => getComputedStyle(el).borderTopColor)
          if (isFloored) {
            expect(
              painted,
              `${trait.label} : le trait est encore peint dans la couleur BRUTE ` +
                `${swatch.hex} — le plancher #497 n'a pas été appliqué dans ce thème`,
            ).not.toBe(toRgbString(swatch.hex))
          } else {
            expect(
              painted,
              `${trait.label} : couleur déjà conforme AVANT #497, elle doit ressortir ` +
                `intacte (${swatch.hex}) — un plancher qui sur-corrige efface ` +
                "l'identité colorée de l'événement",
            ).toBe(toRgbString(swatch.hex))
          }
        }

        // ── OCCURRENCE FANTÔME — texte ───────────────────────────────────────
        // Exigé pour TOUTE couleur : l'encre est `--color-ink-muted`, elle ne
        // dépend pas de la couleur de l'événement. C'est ici que le dimmer
        // `opacity:.8` de `.mt-evt--draft` faisait tomber le clair à 3.59:1.
        await expectTextReadable(
          page.getByTestId('event-form-preview-ghost'),
          `${tag} fantôme — date`,
        )

        // ── LÉGENDE ──────────────────────────────────────────────────────────
        const legend = page.getByTestId('event-form-preview-legend')
        await expectTextReadable(legend.locator('span').first(), `${tag} légende — libellé`)
        await expectTextReadable(legend.locator('time'), `${tag} légende — date`)
        await expectTextReadable(
          page.getByTestId('event-form-preview-recurrence'),
          `${tag} légende — badge récurrence`,
        )
      }

      // ── GÉOMÉTRIE DU BANDEAU (les points laissés NON MESURÉS par #326) ────
      const previewHost = page.getByTestId('shell-new-event-drawer-preview')
      const hostBox = await previewHost.boundingBox()
      const panelBox = await panel.boundingBox()
      const headerBox = await panel.locator('.mt-drawer__header').boundingBox()
      expect(hostBox).not.toBeNull()
      expect(panelBox).not.toBeNull()
      expect(headerBox).not.toBeNull()

      // (a) Le bandeau ne doit pas dévorer le corps. Mesuré à 1280x700 :
      //     29.6% en clair, 26.8% en sombre, le corps garde 418px de défilement.
      expect(
        hostBox!.height / panelBox!.height,
        `le bandeau d'aperçu occupe ${Math.round((100 * hostBox!.height) / panelBox!.height)}% ` +
          'de la hauteur du drawer : le formulaire n’a plus de place pour défiler',
      ).toBeLessThan(0.45)

      // (b) « DOUBLE FILET » — l'hypothèse de #326 (« deux filets parallèles
      //     séparés d'environ une interligne, artefact visuel probable ») est
      //     RÉFUTÉE par la mesure : le filet du header et celui du bandeau sont
      //     séparés par toute la hauteur de l'aperçu, 207px en clair / 187px en
      //     sombre. Ce ne sont pas deux traits voisins, ce sont les deux bords
      //     d'un bloc. On fige le constat : si un jour le bandeau se vide au
      //     point de coller les deux filets, c'est là que ça se verra.
      const ruleGap = hostBox!.y + hostBox!.height - (headerBox!.y + headerBox!.height)
      expect(
        ruleGap,
        `filets du header et du bandeau distants de ${ruleGap.toFixed(0)}px : trop proches, ` +
          'ils se lisent comme un doublon de trait',
      ).toBeGreaterThan(24)
    })

    test('la variante `.mt-evt--preview` est réellement non interactive', async ({ page }) => {
      test.setTimeout(180_000)
      await openPreviewInRecurringState(page)
      await applyColor(page, SWATCHES[0].hex)

      const bar = page.getByTestId('event-form-preview-bar')
      const ghost = page.getByTestId('event-form-preview-ghost')

      // Le modificateur est bien posé sur les DEUX barres (une régression de
      // classe rendrait tout le reste du test vacuement vert).
      await expect(bar).toHaveClass(/(^|\s)mt-evt--preview(\s|$)/)
      await expect(ghost).toHaveClass(/(^|\s)mt-evt--preview(\s|$)/)

      for (const [label, target] of [
        ['barre pleine', bar],
        ['occurrence fantôme', ghost],
      ] as const) {
        await page.mouse.move(0, 0)
        await page.waitForTimeout(300)
        const rest = await target.evaluate((el) => {
          const s = getComputedStyle(el)
          return { cursor: s.cursor, filter: s.filter, boxShadow: s.boxShadow }
        })
        expect(rest.cursor, `${label} : curseur d'affordance cliquable au repos`).toBe('default')

        await target.hover()
        // `.mt-evt` anime `filter` et `box-shadow` sur `--dur-micro` : mesurer
        // trop tôt lirait une valeur INTERPOLÉE ([[PIT-S58-002]]).
        await page.waitForTimeout(500)
        const hovered = await target.evaluate((el) => {
          const s = getComputedStyle(el)
          return { cursor: s.cursor, filter: s.filter, boxShadow: s.boxShadow }
        })

        expect(hovered.cursor, `${label} : le survol réintroduit un curseur cliquable`).toBe(
          'default',
        )
        expect(
          hovered.filter,
          `${label} : le survol modifie le filtre (${rest.filter} → ${hovered.filter}) — ` +
            'affordance trompeuse sur un aperçu non cliquable',
        ).toBe(rest.filter)
        expect(
          hovered.boxShadow,
          `${label} : le survol modifie l'ombre (${rest.boxShadow} → ${hovered.boxShadow})`,
        ).toBe(rest.boxShadow)
      }
    })
  })
}
