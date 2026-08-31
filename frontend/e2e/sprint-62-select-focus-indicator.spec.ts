import { test, expect, type Locator, type Page } from '@playwright/test'
import { PROD } from './support/accounts'
import { ensureAuthenticated, openSettingsChapter } from './support/auth'
import { getUserId, gotoProducts, seedCategory, seedProduct, unique } from './support/products'
import {
  contrastRatio,
  formatProfile,
  readStrip,
  settleForMeasurement,
  WCAG_NON_TEXT,
  type PixelStrip,
} from './support/pixel'

/**
 * #414 (Sprint 62) — VERDICT : L'OPTION SURVOLÉE AU CLAVIER D'UN `Select` RADIX
 * OBTIENT-ELLE UN INDICATEUR >= 3:1 (WCAG 1.4.11) SOUS FIREFOX, EN MONTAGE RÉEL ?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RÉPONSE MESURÉE : OUI. LE DÉFAUT DÉCRIT PAR #383 EST INFIRMÉ EN CONTEXTE.
 * ─────────────────────────────────────────────────────────────────────────────
 * #383 affirmait que, sur Firefox 151, les options n'obtenaient JAMAIS
 * `:focus-visible` menu ouvert au clavier, donc aucun contour peint, laissant
 * pour seul signal le fond `accent-soft` à 1,23:1 clair / 1,19:1 sombre.
 * #375 n'avait PAS reproduit le défaut sur le composant isolé en Storybook,
 * sans pouvoir l'infirmer : personne n'avait mesuré en montage réel.
 *
 * Mesuré ici, au pixel peint, sur le Firefox embarqué par Playwright :
 * l'option survolée EST en `:focus-visible`, `document.activeElement` EST
 * l'élément `role="option"` (Radix lui donne un focus DOM réel), et le contour
 * de `ds/tokens/base.css` (`@layer base { :focus-visible }`) EST PEINT —
 * visible dans le dump brut comme une bande `--color-focus` à +3/+4 px, entre
 * le vide d'`outline-offset` (+1/+2) et le fond du popover (+5 et au-delà).
 *
 * Le chiffre de #383 est simultanément REPRODUIT et REQUALIFIÉ : `accent-soft`
 * contre le fond du popover vaut bien ~1,23:1 / ~1,19:1 — mais ce n'est pas
 * l'indicateur de focus, c'est la surface de survol. L'indicateur, lui, est le
 * contour, à ~6,1:1 / ~6,5:1. WCAG 1.4.11 est satisfait.
 *
 * Conséquence : AUCUN correctif applicatif n'est apporté par #414. En ajouter un
 * (une variante `data-[highlighted]:` posant un second motif) violerait
 * `DEC-S58-001` en dédoublant l'indicateur, pour corriger un défaut qui n'existe
 * pas. Cette spec est le garde-fou qui rend le verdict REJOUABLE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES TROIS MONTAGES RÉELS (consommateurs vérifiés par `grep` au démarrage)
 * ─────────────────────────────────────────────────────────────────────────────
 *   · `PreferencesSection.tsx:63`  -> `pref-language`  (/fr/settings)
 *   · `ProductDrawer.tsx:306`      -> `product-category-trigger`
 *   · `NewEventDrawer.tsx:205`     -> `shell-new-event-drawer-product-trigger`
 * (L'issue citait `EventEditForm` : vérifié, ce fichier n'importe PAS `ui/select`.)
 *
 * ⚠ DÉFAUT DISTINCT DÉCOUVERT EN MESURANT LE 3e MONTAGE, puis CORRIGÉ AU
 * SPRINT 63 (#446) : dans `NewEventDrawer`, le popover n'était pas peint du
 * tout — recouvert par le panneau du drawer (`z-50` sous `--z-modal`). Ce
 * n'était pas #414, qui l'avait figé en deux `test.fail()`. Ces annotations ont
 * été RETIRÉES par #446 et les tests mesurent maintenant la peinture, sur les
 * DEUX surfaces du drawer (`.mt-drawer` desktop, `.mt-sheet` mobile). Voir le
 * bloc de commentaire en fin de fichier pour le dossier complet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UN E2E, ET POURQUOI FIREFOX
 * ─────────────────────────────────────────────────────────────────────────────
 * `jsdom` (Vitest) ne résout ni la précédence des `@layer` ni la PEINTURE —
 * c'est-à-dire exactement le mécanisme en cause. Un test unitaire serait vert
 * quoi qu'il arrive (famille `PIT-S48-002` : CI verte != page correcte). Et le
 * défaut allégué est une divergence de HEURISTIQUE `:focus-visible` entre
 * moteurs : le mesurer sur Chromium seul ne dirait rien. D'où le projet
 * `firefox` de `playwright.config.ts`, restreint par `testMatch` à CETTE spec.
 *
 * ⚠ WebKit reste HORS PÉRIMÈTRE de #414 : non ajouté au harnais, NON VÉRIFIÉ.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE PARCOURS EST CLAVIER LÀ OÙ ÇA COMPTE
 * ─────────────────────────────────────────────────────────────────────────────
 * C'est tout l'objet du bug : une personne qui navigue sans souris. La
 * heuristique `:focus-visible` des moteurs est pilotée par la MODALITÉ de la
 * dernière interaction — on atteint donc le déclencheur par `Tab` RÉELS
 * (jamais `locator.focus()`, qui ne déclare aucune modalité) et on ouvre par
 * `Enter`. Les clics ne servent qu'à la mise en place (ouvrir un drawer), et
 * `assertTriggerIsKeyboardFocused` sert de TÉMOIN : si le déclencheur obtient
 * `:focus-visible`, la modalité clavier EST enregistrée par le moteur, et tout
 * verdict sur l'option porte alors sur l'option, pas sur un geste raté du
 * harnais.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉTHODE DE MESURE
 * ─────────────────────────────────────────────────────────────────────────────
 * Sonde `support/pixel.ts` (`PAT-S58-002`, livrée par #415), RÉUTILISÉE telle
 * quelle, agrégation par MODE.
 *
 * ⚠ `PIT-S58-001` — le fond « adjacent » n'est PAS le `background-color` d'un
 * ancêtre. Le `SelectContent` est PORTALISÉ et le popover a sa propre bordure
 * (relevée à +5 px dans le dump du `ProductDrawer` en clair) : une sonde qui
 * l'attrape annonce un faux ratio (S58 : 16,3:1 au lieu de 6,08:1). Les offsets
 * ci-dessous sont fixés sur le DUMP BRUT imprimé à chaque run.
 *
 * ⚠ `PIT-S58-002` — l'état et l'instant font partie de la mesure :
 * `data-highlighted` asserté AVANT lecture, puis `settleForMeasurement`
 * (>=450 ms — Tailwind v4 fait entrer `outline-color` dans `transition-colors`).
 * Le pixel et `getComputedStyle` doivent CONCORDER : la largeur déclarée du
 * contour est vérifiée à 2px, et la bande peinte est cherchée à l'offset que
 * cette déclaration impose.
 *
 * PRÉREQUIS RUNTIME : backend Spring + Postgres migré, front servi depuis une
 * origine présente dans `app.cors.allowed-origins` (:3000 ou :3100).
 * Cf. `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
 */

test.use({ storageState: PROD.storageState })

/** Bord haut de l'option, loin de ses coins `rounded-xs` (rayon 3 px). */
const SIDE = 'top' as const
const EDGE_GUARD_PX = 10
const SAMPLES = 21

/**
 * Offsets FIXÉS SUR LE DUMP BRUT imprimé par chaque test (`PIT-S58-001`).
 * Négatif = vers l'INTÉRIEUR de l'option ; positif = vers l'extérieur.
 *
 *  · `OUTLINE` = +3 px. `base.css` déclare `outline: 2px solid` +
 *    `outline-offset: 2px` : le trait occupe donc la bande [2,4[ px vers
 *    l'extérieur, dont +3 est le centre. Ce n'est pas un choix empirique, c'est
 *    la conséquence arithmétique de la déclaration — et le dump la confirme à
 *    chaque run.
 *  · `POPOVER_BG` = +1 px. Le vide d'`outline-offset`, c'est-à-dire le pixel du
 *    popover IMMÉDIATEMENT adjacent au trait. On ne va PAS chercher plus loin :
 *    à +5 px le dump du `ProductDrawer` en clair montre `#16181d`, la bordure du
 *    popover — précisément le piège qui a produit 16,3:1 au S58.
 *  · `ITEM_SURFACE` = -4 px. La surface propre de l'option (`accent-soft`
 *    lorsqu'elle est survolée). Sert à REPRODUIRE le chiffre de #383, jamais à
 *    conclure.
 */
const OUTLINE_OFFSET_PX = 3
const POPOVER_BG_OFFSET_PX = 1
const ITEM_SURFACE_OFFSET_PX = -4

/** Bornes du dump brut, de l'intérieur de l'option vers l'extérieur du popover. */
const DUMP_FROM_PX = -6
const DUMP_TO_PX = 8

/** État de l'option survolée, relevé AVANT toute lecture de pixel. */
interface HighlightedState {
  focusVisible: boolean
  focused: boolean
  activeElementTag: string
  activeElementRole: string | null
  outlineStyle: string
  outlineWidth: string
  outlineColor: string
  outlineOffset: string
  boxShadow: string
  backgroundColor: string
}

/**
 * Amène le focus sur `target` PAR TABULATIONS RÉELLES.
 *
 * Volontairement pas de `locator.focus()` : un focus programmatique ne déclare
 * aucune modalité d'entrée, et c'est précisément la heuristique de modalité que
 * cette spec met en cause.
 */
async function tabTo(page: Page, target: Locator, maxTabs = 80): Promise<number> {
  for (let i = 1; i <= maxTabs; i += 1) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => document.activeElement === el)) return i
  }
  throw new Error(
    `Le déclencheur n'a pas été atteint après ${maxTabs} tabulations. La mesure est ` +
      `abandonnée plutôt que rattrapée par un focus programmatique : celui-ci ne ` +
      `déclare aucune modalité clavier et fausserait :focus-visible.`,
  )
}

/** TÉMOIN DE MODALITÉ (cf. en-tête) : sans lui, un `fv=false` serait ininterprétable. */
async function assertTriggerIsKeyboardFocused(trigger: Locator, label: string): Promise<void> {
  expect(
    await trigger.evaluate((el) => el.matches(':focus-visible')),
    `${label} : le DÉCLENCHEUR lui-même n'est pas en :focus-visible après tabulation. ` +
      `La modalité clavier n'est pas enregistrée par ce moteur — un verdict sur l'option ` +
      `mettrait alors en cause le harnais, pas le composant.`,
  ).toBe(true)
}

/**
 * Ouvre le `Select` au CLAVIER et descend d'un cran. Rend l'option survolée.
 *
 * `ArrowDown` déplace le survol sans rien sélectionner : aucun `onValueChange`
 * n'est émis tant qu'`Enter` n'est pas repressé — important sur `pref-language`,
 * dont la sélection provoquerait une NAVIGATION de locale.
 */
async function openWithKeyboardAndHighlight(page: Page, trigger: Locator): Promise<Locator> {
  await page.keyboard.press('Enter')
  const listbox = page.locator('[role="listbox"]')
  await expect(listbox).toBeVisible()
  await page.keyboard.press('ArrowDown')

  const highlighted = listbox.locator('[role="option"][data-highlighted]')
  await expect(
    highlighted,
    `Après ArrowDown, EXACTEMENT une option doit porter data-highlighted (état Radix).`,
  ).toHaveCount(1)
  // Le panneau est portalisé : il ne descend pas du déclencheur dans le DOM.
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  return highlighted
}

/** Relève l'état complet de l'option survolée (`PIT-S58-002`, volet « état »). */
async function readHighlightedState(highlighted: Locator): Promise<HighlightedState> {
  return highlighted.evaluate((el) => {
    const s = getComputedStyle(el)
    const active = document.activeElement
    return {
      focusVisible: el.matches(':focus-visible'),
      focused: el.matches(':focus'),
      activeElementTag: active?.tagName.toLowerCase() ?? 'null',
      activeElementRole: active?.getAttribute('role') ?? null,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      outlineColor: s.outlineColor,
      outlineOffset: s.outlineOffset,
      boxShadow: s.boxShadow,
      backgroundColor: s.backgroundColor,
    }
  })
}

/**
 * DUMP BRUT de part et d'autre du bord haut de l'option.
 *
 * `dumpOutwardProfile` ne parcourt que `0..max` vers l'extérieur ; ici la
 * surface de l'option est à l'INTÉRIEUR. On appelle donc `readStrip` — même
 * sonde, même agrégation par MODE — sur une plage signée. Aucune fonction ne
 * cherche « le meilleur pixel » : le profil est imprimé, et les offsets de
 * mesure sont des constantes du fichier justifiées par la déclaration CSS.
 */
async function dumpSignedProfile(page: Page, target: Locator): Promise<PixelStrip[]> {
  const out: PixelStrip[] = []
  for (let o = DUMP_FROM_PX; o <= DUMP_TO_PX; o += 1) {
    out.push(
      await readStrip(page, target, {
        side: SIDE,
        offsetPx: o,
        samples: SAMPLES,
        edgeGuardPx: EDGE_GUARD_PX,
      }),
    )
  }
  return out
}

interface Measurement {
  /** Contour DS (`--color-focus`) contre le fond du popover — l'indicateur WCAG 1.4.11. */
  outlineRatio: number
  /** Surface `accent-soft` contre le même fond — le chiffre de #383, pour comparaison. */
  surfaceRatio: number
  state: HighlightedState
  report: string
}

/** Mesure l'option survolée et consigne TOUT : état, dump brut, offsets, unanimité, ratios. */
async function probeHighlighted(
  page: Page,
  highlighted: Locator,
  label: string,
): Promise<Measurement> {
  await settleForMeasurement(page)
  const state = await readHighlightedState(highlighted)

  const strip = async (offsetPx: number): Promise<PixelStrip> =>
    readStrip(page, highlighted, {
      side: SIDE,
      offsetPx,
      samples: SAMPLES,
      edgeGuardPx: EDGE_GUARD_PX,
    })

  const profile = await dumpSignedProfile(page, highlighted)
  const outline = await strip(OUTLINE_OFFSET_PX)
  const popoverBg = await strip(POPOVER_BG_OFFSET_PX)
  const itemSurface = await strip(ITEM_SURFACE_OFFSET_PX)

  const outlineRatio = contrastRatio(outline.dominant, popoverBg.dominant)
  const surfaceRatio = contrastRatio(itemSurface.dominant, popoverBg.dominant)

  const report =
    `\n[#414] ${label}\n` +
    `  état : focus-visible=${state.focusVisible} focus=${state.focused} ` +
    `activeElement=<${state.activeElementTag} role=${state.activeElementRole}>\n` +
    `  outline DÉCLARÉ = ${state.outlineStyle} ${state.outlineWidth} ${state.outlineColor} ` +
    `offset ${state.outlineOffset} | box-shadow=${state.boxShadow}\n` +
    `  background-color DÉCLARÉ = ${state.backgroundColor}\n` +
    `  profil brut PEINT (côté ${SIDE}, ${SAMPLES} échantillons/ligne, ` +
    `négatif = INTÉRIEUR de l'option) :\n${formatProfile(profile)}\n` +
    `  INDICATEUR (contour) +${OUTLINE_OFFSET_PX}px = ${outline.dominantHex} ` +
    `(unanimité ${(outline.unanimity * 100).toFixed(0)}%) vs fond popover ` +
    `+${POPOVER_BG_OFFSET_PX}px = ${popoverBg.dominantHex} ` +
    `(unanimité ${(popoverBg.unanimity * 100).toFixed(0)}%) -> ${outlineRatio.toFixed(2)}:1\n` +
    `  pour mémoire, la SURFACE seule (le chiffre de #383) ${ITEM_SURFACE_OFFSET_PX}px = ` +
    `${itemSurface.dominantHex} contre le même fond -> ${surfaceRatio.toFixed(2)}:1 ` +
    `(sous 3:1 — c'est pourquoi l'indicateur est le contour, pas la surface)\n`

  console.log(report)

  // Une unanimité basse = arc, dégradé ou mauvais offset : le ratio ne vaudrait
  // rien, on refuse de le publier (`PIT-S58-001`).
  for (const [name, s] of [
    ['le contour', outline],
    ['le fond du popover', popoverBg],
    ["la surface de l'option", itemSurface],
  ] as const) {
    expect(
      s.unanimity,
      `${label} : unanimité trop basse sur ${name} (${(s.unanimity * 100).toFixed(0)}%).${report}`,
    ).toBeGreaterThanOrEqual(0.6)
  }

  return { outlineRatio, surfaceRatio, state, report }
}

/** Assertion de sortie de #414, commune aux montages où le popover est peint. */
function expectFocusIndicatorConforms(label: string, m: Measurement): void {
  // 1. L'ÉTAT : c'est l'affirmation littérale de #414 (« n'obtient jamais
  //    :focus-visible »). Elle est ici contredite, moteur par moteur.
  expect(
    m.state.focusVisible,
    `${label} : l'option survolée n'est pas en :focus-visible. Ce serait le défaut ` +
      `décrit par #383 — mesuré ABSENT sur les deux moteurs exercés.${m.report}`,
  ).toBe(true)

  // 2. LE PIXEL ET LA DÉCLARATION DOIVENT CONCORDER (`PIT-S58-002`).
  expect(
    m.state.outlineStyle,
    `${label} : aucun contour déclaré sur l'option survolée.${m.report}`,
  ).not.toBe('none')
  expect(
    m.state.outlineWidth,
    `${label} : contour déclaré hors charte DS (attendu 2px).${m.report}`,
  ).toBe('2px')

  // 3. LE SEUIL WCAG 1.4.11, sur le pixel PEINT.
  expect(
    m.outlineRatio,
    `${label} : l'indicateur de focus peint est sous le seuil WCAG 1.4.11 (3:1).${m.report}`,
  ).toBeGreaterThanOrEqual(WCAG_NON_TEXT)

  // 4. GARDE-FOU CONTRE UNE FAUSSE BONNE NOUVELLE : la surface `accent-soft`
  //    doit RESTER sous le seuil (~1,2:1). Si elle passait au-dessus, c'est que
  //    `--color-accent-soft` aurait été remonté — ce que #414 interdit
  //    explicitement (9+ consommateurs hors focus : `::selection`, `button`,
  //    `dropdown-menu`, `landing`, `animations`, `AvatarUpload`). Rougir alors
  //    est le comportement voulu.
  expect(
    m.surfaceRatio,
    `${label} : la SURFACE de survol dépasse 3:1. Ce n'est pas une amélioration : ` +
      `cela signale que --color-accent-soft a été modifié, ce que #414 interdit.${m.report}`,
  ).toBeLessThan(WCAG_NON_TEXT)
}

/**
 * `NewEventDrawer` a DEUX SURFACES, donc deux chemins CSS — pas deux conforts
 * de vérification (#446) :
 *   · `>= lg`  -> `.mt-drawer.mt-drawer--form` (`ds/components/timeline.css:271`)
 *   · `< lg`   -> `.mt-sheet`                  (`ds/components/timeline.css:406`)
 * `NewEventDrawer.tsx:73` bascule sur `useMediaQuery('(max-width: 1023px)')`.
 * Les DEUX règles portent `z-index: var(--z-modal)` : le défaut de #446 vivait
 * dans les deux, il doit être mesuré dans les deux.
 */
const COMPACT_VIEWPORT = { width: 390, height: 844 } as const

/**
 * Mise en place commune aux tests `NewEventDrawer`. Rend l'option survolée.
 *
 * ⚠ POURQUOI LE PASSAGE EN MOBILE SE FAIT *APRÈS* L'OUVERTURE, et pas en
 * ouvrant depuis un viewport étroit : le SEUL déclencheur du drawer aujourd'hui
 * est `shell-sidebar-new-event-button`, porté par l'`<aside>` de
 * `AppShell.tsx:139` qui est `hidden … lg:flex` — donc absent sous 1024 px.
 * Il n'existe AUCUN déclencheur mobile (vérifié : `shell-sidebar-new-event-button`
 * est l'unique appelant de `setShowCreate(true)`). Le redimensionnement est donc
 * le seul accès à `.mt-sheet`, et c'est un accès RÉEL — `useMediaQuery` écoute
 * `change`, et `NewEventDrawer` documente lui-même que la variante sheet « couvre
 * le redimensionnement ». Si un déclencheur mobile est ajouté un jour, ouvrir
 * directement depuis lui et supprimer ce commentaire.
 */
async function openNewEventDrawerSelect(
  page: Page,
  opts: { compact?: boolean } = {},
): Promise<Locator> {
  const userId = await getUserId(page)
  const cat = await seedCategory(page, unique('414 Ev Cat'))
  await seedProduct(page, { userId, name: unique('414 Ev Prod'), categoryId: cat.id })

  await ensureAuthenticated(page)
  await page.goto('/fr/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('timeline-screen')).toBeVisible()

  // Idem ProductDrawer : l'ouverture du drawer est un détail de mise en place,
  // la mesure porte sur le Select atteint ensuite au clavier.
  await page.getByTestId('shell-sidebar-new-event-button').click()
  const panel = page.getByTestId('shell-new-event-drawer')
  await expect(panel).toBeVisible()

  if (opts.compact) {
    await page.setViewportSize({ ...COMPACT_VIEWPORT })
    // ORACLE DE CHEMIN CSS, pas de confort : sans lui, un test « mobile » qui
    // aurait silencieusement gardé `.mt-drawer` rejouerait le cas desktop et
    // rendrait un vert vide de sens (famille `PIT-S54-002`).
    await expect(
      panel,
      `Sous ${COMPACT_VIEWPORT.width}px le panneau doit rendre la variante .mt-sheet ` +
        `(NewEventDrawer.tsx:141). S'il porte encore .mt-drawer, la bascule useMediaQuery ` +
        `n'a pas eu lieu et la mesure porterait sur le chemin DESKTOP.`,
    ).toHaveClass(/(^|\s)mt-sheet(\s|$)/)
  } else {
    await expect(panel).toHaveClass(/(^|\s)mt-drawer(\s|$)/)
  }

  const trigger = page.getByTestId('shell-new-event-drawer-product-trigger')
  await expect(trigger).toBeVisible()
  const tabs = await tabTo(page, trigger)
  await assertTriggerIsKeyboardFocused(trigger, 'shell-new-event-drawer-product-trigger')
  console.log(`[#414] shell-new-event-drawer-product-trigger atteint en ${tabs} tabulations`)

  return openWithKeyboardAndHighlight(page, trigger)
}

const SCHEMES = ['light', 'dark'] as const

for (const scheme of SCHEMES) {
  test.describe(`#414 indicateur de l'option survolée au clavier — thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test(`PreferencesSection / pref-language (/fr/settings) — ${scheme}`, async ({ page }) => {
      await openSettingsChapter(page, 'preferences')
      const trigger = page.getByTestId('pref-language')
      await expect(trigger).toBeVisible()

      const tabs = await tabTo(page, trigger)
      await assertTriggerIsKeyboardFocused(trigger, 'pref-language')
      console.log(`[#414] pref-language atteint en ${tabs} tabulations`)

      const highlighted = await openWithKeyboardAndHighlight(page, trigger)
      const label = `PreferencesSection / pref-language (${scheme})`
      expectFocusIndicatorConforms(label, await probeHighlighted(page, highlighted, label))
    })

    test(`ProductDrawer / product-category-trigger — ${scheme}`, async ({ page }) => {
      await seedCategory(page, unique('414 Cat'))
      await gotoProducts(page)
      // L'OUVERTURE DU DRAWER peut se faire à la souris : ce qui est mesuré, c'est
      // le Select, et la modalité d'entrée est (re)déclarée par la tabulation qui
      // suit — `assertTriggerIsKeyboardFocused` en est le témoin.
      await page.getByTestId('products-new-button').click()
      await expect(page.getByTestId('product-drawer-form')).toBeVisible()

      const trigger = page.getByTestId('product-category-trigger')
      await expect(trigger).toBeVisible()
      const tabs = await tabTo(page, trigger)
      await assertTriggerIsKeyboardFocused(trigger, 'product-category-trigger')
      console.log(`[#414] product-category-trigger atteint en ${tabs} tabulations`)

      const highlighted = await openWithKeyboardAndHighlight(page, trigger)
      const label = `ProductDrawer / product-category-trigger (${scheme})`
      expectFocusIndicatorConforms(label, await probeHighlighted(page, highlighted, label))
    })

    /**
     * 3e MONTAGE, VOLET ÉTAT. Séparé du volet PIXEL (les deux tests qui suivent)
     * depuis #414, où l'état était vérifiable alors que le pixel ne l'était pas —
     * le défaut de superposition empêchait de peindre le popover. #446 a levé ce
     * défaut, mais la séparation est CONSERVÉE : le verdict de #414 porte sur
     * l'état et la déclaration, celui de #446 sur la peinture. Les garder
     * distincts fait dire à un rouge LEQUEL des deux a régressé.
     */
    test(`NewEventDrawer / product-trigger — état et déclaration — ${scheme}`, async ({ page }) => {
      const highlighted = await openNewEventDrawerSelect(page)
      await settleForMeasurement(page)
      const state = await readHighlightedState(highlighted)
      console.log(
        `\n[#414] NewEventDrawer / product-trigger (${scheme}) — état seul\n` +
          `  focus-visible=${state.focusVisible} focus=${state.focused} ` +
          `activeElement=<${state.activeElementTag} role=${state.activeElementRole}>\n` +
          `  outline DÉCLARÉ = ${state.outlineStyle} ${state.outlineWidth} ` +
          `${state.outlineColor} offset ${state.outlineOffset}\n`,
      )
      expect(
        state.focusVisible,
        `NewEventDrawer (${scheme}) : l'option survolée n'est pas en :focus-visible.`,
      ).toBe(true)
      expect(
        state.outlineStyle,
        `NewEventDrawer (${scheme}) : aucun contour déclaré sur l'option survolée.`,
      ).not.toBe('none')
      expect(
        state.outlineWidth,
        `NewEventDrawer (${scheme}) : contour déclaré hors charte DS (attendu 2px).`,
      ).toBe('2px')
    })

    /**
     * DÉFAUT DE SUPERPOSITION — CORRIGÉ AU SPRINT 63 (#446), `test.fail()` RETIRÉ.
     *
     * HISTORIQUE. #414 avait découvert ici, EN MESURANT, un défaut distinct du
     * sien : le popover du `Select` n'était PAS PEINT dans `NewEventDrawer`, il
     * était intégralement recouvert par le panneau du drawer.
     *
     *   · `ui/select.tsx` — `SelectContent` portait `z-50` (= `--z-popover`) ;
     *   · `ds/components/timeline.css:271,406` — `.mt-drawer` ET `.mt-sheet`
     *     portent `z-index: var(--z-modal)`, soit 70 (`ds/tokens/spacing.css`).
     *
     * Le drawer est rendu EN LIGNE (`AppShell.tsx:259`), pas dans un portail :
     * sa valeur `z` plus élevée l'emportait quel que soit l'ordre du DOM. Le
     * profil de pixels sous l'option ne rendait que le panneau du drawer —
     * `#ffffff` en clair, `#131519` en sombre, unanimité 100 % sur les quinze
     * offsets — alors même que le DOM affirmait le contraire.
     *
     * #414 avait figé le constat en `test.fail()` plutôt qu'en commentaire, pour
     * qu'il soit EXÉCUTABLE et qu'il ROUGISSE le jour de la correction. C'est ce
     * qui s'est produit : #446 a relevé `SelectContent` au palier partagé
     * `--z-popover-over-modal` (75, `ds/tokens/spacing.css`, cf. `ADR-008`), et
     * l'annotation a été RETIRÉE — pas contournée, pas neutralisée. Ce test
     * mesure désormais la peinture pour de bon, et redeviendra rouge si le palier
     * repasse sous `--z-modal`.
     *
     * ⚠ CE QUI A PRESQUE TROMPÉ LA MESURE D'ORIGINE, et qui trompera quiconque
     * « re-vérifiera » ce correctif au DOM — corollaire exact de `PIT-S58-001`,
     * consigné en `PIT-S62-001` : `document.elementsFromPoint()` au centre de
     * l'option rend l'option EN TÊTE de pile, sans le moindre élément du drawer,
     * MÊME QUAND elle est recouverte. Une couche Radix ouverte pose
     * `body { pointer-events: none }`, ce qui retire tout le reste du test de
     * survol. Hit-testing et peinture sont deux choses différentes ; seule la
     * lecture de pixel tranche. Ne pas remplacer la sonde par un `elementsFromPoint`.
     *
     * LES DEUX SURFACES SONT MESURÉES SÉPARÉMENT (desktop `.mt-drawer`, mobile
     * `.mt-sheet`) : ce sont deux règles CSS distinctes portant le même token,
     * donc deux fois le même risque — pas une double vérification de confort.
     */
    test(`NewEventDrawer / product-trigger — le popover est PEINT (desktop, .mt-drawer) — ${scheme}`, async ({
      page,
    }) => {
      const highlighted = await openNewEventDrawerSelect(page)
      const label = `NewEventDrawer / product-trigger — desktop .mt-drawer (${scheme})`
      expectFocusIndicatorConforms(label, await probeHighlighted(page, highlighted, label))
    })

    test(`NewEventDrawer / product-trigger — le popover est PEINT (mobile, .mt-sheet) — ${scheme}`, async ({
      page,
    }) => {
      const highlighted = await openNewEventDrawerSelect(page, { compact: true })
      const label = `NewEventDrawer / product-trigger — mobile .mt-sheet (${scheme})`
      expectFocusIndicatorConforms(label, await probeHighlighted(page, highlighted, label))
    })
  })
}
