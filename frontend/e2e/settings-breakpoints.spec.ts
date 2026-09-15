import { test, expect, type Page } from '@playwright/test'
import { openSettingsPage } from './support/auth'
import { SHARED } from './support/accounts'

/**
 * FU4 (Sprint 57) — PALIERS RESPONSIVE des Réglages sous le shell applicatif.
 *
 * POURQUOI CETTE SPEC — le contrôle de couverture E2E du sprint a relevé que
 * `settings-header` / `settings-back` n'étaient référencés par AUCUNE spec :
 * `settings-navigation.spec.ts` ne teste que la navigation par chapitres à la
 * viewport par défaut (1280) et `settings-mobile.spec.ts` que le drill-down à
 * 375 px. La bascule elle-même — qui apparaît, qui disparaît, à quel pixel —
 * n'était vérifiée qu'À LA MAIN. Sur ce projet c'est un risque documenté : deux
 * régressions visibles (S48 contraste, S53 titres) sont passées sous une CI verte.
 *
 * ⚠ CORRECTION DE L'ÉNONCÉ FU4 — le briefing décrivait `settings-header` comme
 * `lg:hidden` (« header masqué » à >= 1024 px). C'est FAUX dans le code livré :
 * `app/[locale]/(app)/settings/page.tsx` porte `lg:hidden` sur le SEUL bouton
 * retour (`settings-back`, via `<Button asChild className="lg:hidden">`), tandis
 * que le conteneur `settings-header` et son `<h1>` sont rendus à TOUS les paliers
 * — c'est explicitement documenté dans le composant (« Le `<h1>`, lui, reste rendu
 * à TOUS les paliers ») et c'est le comportement correct : une page garde son
 * titre, et l'unique `<h1>` du document ne doit pas dépendre de la largeur.
 * Cette spec ancre donc le comportement RÉEL :
 *   - `settings-header` VISIBLE partout (titre `<h1>` toujours présent) ;
 *   - `settings-back` visible < 1024 px (seule sortie vers le tableau de bord
 *     quand la sidebar du shell est masquée), MASQUÉ >= 1024 px (la sidebar prend
 *     le relais).
 * Asserter « header masqué à 1024 » aurait produit une spec rouge sur du code sain.
 *
 * MATRICE COUVERTE
 * | palier  | sidebar shell | chapitres            | settings-back | header |
 * |---------|---------------|----------------------|---------------|--------|
 * | 390 px  | masquée       | drill-down (index)   | visible       | visible|
 * | 768 px  | masquée       | onglets horizontaux  | visible       | visible|
 * | 1024 px | visible 248px | onglets horizontaux  | MASQUÉ        | visible|
 * | 1280 px | visible 248px | onglets horizontaux  | MASQUÉ        | visible|
 *
 * Un test qui n'asserterait la présence du testid qu'à UNE taille ne couvrirait
 * pas le palier. Les deux tests de FRONTIÈRE ci-dessous (767/768 et 1023/1024)
 * sont le cœur du filet : ils vérifient que la bascule se produit au pixel EXACT,
 * dans les DEUX sens. Ils rougissent si `lg:hidden` disparaît de `settings-back`
 * (le bouton resterait visible à 1024) comme s'il devenait `hidden` tout court
 * (le bouton disparaîtrait à 1023, laissant la page sans aucune sortie).
 *
 * PRÉREQUIS RUNTIME : identiques aux autres specs settings — backend + Postgres
 * migré, frontend Next. Auth via `storageState` (compte fixe provisionné par le
 * projet `setup`) -> ZÉRO register (anti rate-limit 5/min/IP). Tests de LECTURE
 * seule (aucune mutation) : compte partagé, parallélisables.
 */
test.use({ storageState: SHARED.storageState })

/** Seuil `lg` de Tailwind (64rem) : bascule sidebar shell <-> bouton retour. */
const LG = 1024
/** Seuil `md` (48rem) = `useMediaQuery('(max-width: 767px)')` : drill-down <-> onglets. */
const MD = 768
/** Largeur de la sidebar du shell dépliée (`--sidebar-width`, `w-sidebar`). */
const SIDEBAR_WIDTH = 248
/**
 * #298 (Sprint 73) — largeur de la sidebar REPLIÉE icon-only
 * (`--sidebar-width-collapsed`, `w-sidebar-collapsed`). Le shell a désormais
 * TROIS états : masquée (< md), repliée 64px (md..lg), dépliée 248px (>= lg).
 * Ce fichier ne teste PAS ce palier (c'est `sprint-73-tablet-sidebar.spec.ts`) ;
 * il en tient compte pour que ses propres assertions restent vraies.
 */
const SIDEBAR_WIDTH_COLLAPSED = 64

interface NavBox {
  testid: string
  width: number
  height: number
}

/**
 * Boîtes de TOUS les `<nav>` du document. Sert à compter les navigations
 * VERTICALES : #299 a fait basculer `SettingsShell` en onglets horizontaux
 * précisément pour ne pas doubler la sidebar du shell. Une régression qui
 * remettrait la nav de chapitres en colonne rendrait deux navs verticales côte à
 * côte — invisible pour un test unitaire jsdom (aucune mise en page).
 */
function measureNavs(page: Page): Promise<NavBox[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('nav')).map((el) => {
      const rect = el.getBoundingClientRect()
      return {
        testid: el.getAttribute('data-testid') ?? '(nav sans data-testid)',
        width: rect.width,
        height: rect.height,
      }
    }),
  )
}

/** Navs réellement rendues (une `aside` en `hidden lg:flex` a une boîte 0×0). */
const visibleNavs = (navs: readonly NavBox[]): NavBox[] =>
  navs.filter((nav) => nav.width > 0 && nav.height > 0)

/** Une nav est « verticale » quand elle est plus haute que large. */
const verticalNavs = (navs: readonly NavBox[]): NavBox[] =>
  visibleNavs(navs).filter((nav) => nav.height > nav.width)

function measureOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
}

// ---------------------------------------------------------------------------
// 1. La matrice, un test par palier (viewport figée par `test.use` : aucun
//    redimensionnement en cours de test, donc aucune dépendance à la
//    resynchronisation de `useMediaQuery` — cf. test de frontière plus bas).
// ---------------------------------------------------------------------------

interface Breakpoint {
  width: number
  label: string
  /**
   * Largeur attendue de la sidebar du shell, ou `null` si elle doit être masquée
   * (< md). #298 : 64px entre md et lg, 248px au-delà.
   */
  sidebar: number | null
  /** `false` = drill-down mobile (`settings-index`), `true` = tablist horizontal. */
  tabs: boolean
  /**
   * `settings-back` peint ? Il est gaté par `lg:hidden` — un palier DIFFÉRENT de
   * celui de la sidebar depuis #298 (`md`). Les deux ne peuvent donc plus être
   * déduits l'un de l'autre : entre 768 et 1023 px, la sidebar repliée ET le
   * retour coexistent (redondance signalée en follow-up, cf. plus bas).
   */
  back: boolean
}

const BREAKPOINTS: readonly Breakpoint[] = [
  { width: 390, label: 'téléphone (iPhone 14)', sidebar: null, tabs: false, back: true },
  { width: MD, label: 'tablette', sidebar: SIDEBAR_WIDTH_COLLAPSED, tabs: true, back: true },
  { width: LG, label: 'desktop, 1er pixel', sidebar: SIDEBAR_WIDTH, tabs: true, back: false },
  { width: 1280, label: 'desktop large', sidebar: SIDEBAR_WIDTH, tabs: true, back: false },
]

for (const bp of BREAKPOINTS) {
  test.describe(`Réglages responsive — ${bp.width} px (${bp.label})`, () => {
    test.use({ viewport: { width: bp.width, height: 900 } })

    test(`sidebar, chapitres et sortie de navigation à ${bp.width} px`, async ({ page }) => {
      await openSettingsPage(page)

      // ---- Le titre de page est rendu à TOUS les paliers -------------------
      const header = page.getByTestId('settings-header')
      await expect(
        header,
        `le header des Réglages doit être rendu à ${bp.width} px (il porte l'unique <h1>)`,
      ).toBeVisible()
      await expect(header.locator('h1')).toHaveCount(1)

      // ---- Sidebar du shell : le palier `lg` -------------------------------
      const sidebar = page.getByTestId('shell-sidebar')
      if (bp.sidebar !== null) {
        await expect(
          sidebar,
          `la sidebar du shell doit être montée à ${bp.width} px (>= ${MD})`,
        ).toBeVisible()
        const box = await sidebar.boundingBox()
        expect(box, 'la sidebar visible doit avoir une boîte mesurable').not.toBeNull()
        expect(
          box?.width,
          `la sidebar doit mesurer ${bp.sidebar}px à ${bp.width} px ` +
            '(--sidebar-width-collapsed entre md et lg, --sidebar-width au-delà)',
        ).toBe(bp.sidebar)
        // Le lien Réglages reste une cible peinte aux deux états (icon-only en
        // replié : son libellé est `hidden lg:inline`, pas le lien lui-même).
        await expect(page.getByTestId('shell-sidebar-settings-link')).toBeVisible()
      } else {
        await expect(
          sidebar,
          `la sidebar du shell doit être masquée à ${bp.width} px (< ${MD})`,
        ).toBeHidden()
      }

      // ---- Sortie de navigation : `settings-back` (`lg:hidden`) ------------
      // Le retour ne se déduit PLUS de la sidebar : leurs paliers ont divergé au
      // #298 (retour = `lg`, sidebar = `md`). D'où un champ dédié dans la
      // matrice — une déduction implicite masquerait la divergence.
      const back = page.getByTestId('settings-back')
      if (bp.back) {
        await expect(back, `le retour doit être visible à ${bp.width} px (< ${LG})`).toBeVisible()
        await expect(back).toHaveAttribute('href', '/fr/dashboard')
      } else {
        await expect(
          back,
          `le retour doit disparaître à ${bp.width} px : la sidebar dépliée assure la navigation`,
        ).toBeHidden()
      }
      // INVARIANT MINIMAL QUI TIENT ENCORE : au moins une sortie à tout palier.
      // AFFAIBLISSEMENT ASSUMÉ (était « exactement une »). Cause : #298 (Sprint 73) a
      // fait passer le palier de la sidebar à `md` alors que `settings-back` reste en
      // `lg:hidden` ; entre 768 et 1023 les deux sorties coexistent donc.
      // Ce n'est PAS un contournement pour faire passer le test : la redondance est
      // réelle en production et n'a pas encore été tranchée par le Designer.
      // Suivi : docs/memory/sprints/sprint-73/issue-298-done.md (RECOMMAND_FOLLOWUP
      // « redondance de sortie sur /settings en 768-1023 »). Dès que la décision est
      // prise, remettre l'invariant à « exactement une sortie ».
      const exits = (bp.back ? 1 : 0) + (bp.sidebar !== null ? 1 : 0)
      expect(exits, `aucune sortie de navigation à ${bp.width} px`).toBeGreaterThanOrEqual(1)

      // ---- Chapitres : drill-down (< md) vs onglets horizontaux (>= md) ----
      const tablist = page.getByTestId('settings-tablist')
      if (bp.tabs) {
        await expect(tablist, `les onglets doivent être montés à ${bp.width} px`).toBeVisible()
        await expect(tablist).toHaveAttribute('aria-orientation', 'horizontal')
        await expect(page.getByTestId('settings-tab-profile')).toHaveAttribute(
          'aria-selected',
          'true',
        )
        // La coquille desktop et le drill-down mobile s'excluent.
        await expect(page.getByTestId('settings-index')).toHaveCount(0)
      } else {
        await expect(
          page.getByTestId('settings-index'),
          `le drill-down mobile doit être monté à ${bp.width} px (< ${MD})`,
        ).toBeVisible()
        await expect(
          tablist,
          `les onglets ne doivent pas être dans le DOM à ${bp.width} px`,
        ).toHaveCount(0)
      }

      // ---- Une seule nav VERTICALE (#299 : pas de double sidebar) ----------
      const navs = await measureNavs(page)
      const vertical = verticalNavs(navs)
      const expectedVertical = bp.sidebar ? 1 : 0
      expect(
        vertical.length,
        `navigations verticales à ${bp.width} px : ${
          vertical
            .map((n) => `${n.testid} ${Math.round(n.width)}x${Math.round(n.height)}`)
            .join(', ') || 'aucune'
        }`,
      ).toBe(expectedVertical)

      // ---- Aucun débordement horizontal à aucun palier ---------------------
      const overflow = await measureOverflow(page)
      expect(
        overflow.scrollWidth,
        `débordement horizontal à ${bp.width} px : scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth)
    })
  })
}

// ---------------------------------------------------------------------------
// 2. Les FRONTIÈRES exactes — le filet qui rougit vraiment.
// ---------------------------------------------------------------------------

test.describe('Réglages responsive — frontières exactes des paliers', () => {
  /**
   * FRONTIÈRE `lg` (1023/1024). `settings-back` est masqué par `lg:hidden` ; la
   * sidebar du shell, elle, ne DISPARAÎT plus à cette frontière depuis #298 —
   * elle s'y REPLIE (248 -> 64 px), son masquage étant descendu à `md`. Ce test
   * vérifie donc désormais deux choses au pixel : le retour bascule bien à
   * 1023/1024, et la sidebar change bien de largeur au même pixel.
   *
   * SORTIE DE NAVIGATION — ce que ce test N'AFFIRME PLUS. L'ancienne rédaction
   * posait « sous lg la sidebar est masquée, le retour est la SEULE sortie ».
   * Ce n'est plus vrai entre 768 et 1023 px : la sidebar repliée y est peinte EN
   * PLUS du bouton retour, donc deux sorties coexistent. Ce n'est pas un défaut
   * fonctionnel (aucune n'est cassée) mais une redondance visuelle que #298 n'a
   * pas tranchée — `settings-back` devrait-il passer en `md:hidden` ? La
   * décision appartient au Designer et touche `SettingsShell`, hors du périmètre
   * de fichiers de #298 : suivi en follow-up. Le test se borne donc à décrire
   * l'état RÉEL, sans le déclarer souhaitable.
   */
  test('le retour et la sidebar basculent au même pixel (1023/1024)', async ({ page }) => {
    const back = page.getByTestId('settings-back')
    const sidebar = page.getByTestId('shell-sidebar')
    const header = page.getByTestId('settings-header')

    await page.setViewportSize({ width: LG - 1, height: 900 })
    await openSettingsPage(page)

    await expect(back, 'à 1023 px le retour doit être visible (`lg:hidden`)').toBeVisible()
    await expect(sidebar, 'à 1023 px la sidebar du shell est peinte, repliée (#298)').toBeVisible()
    await expect
      .poll(async () => (await sidebar.boundingBox())?.width, {
        message: 'à 1023 px la sidebar doit mesurer 64px (--sidebar-width-collapsed)',
      })
      .toBe(SIDEBAR_WIDTH_COLLAPSED)
    await expect(header, 'le header reste rendu à 1023 px').toBeVisible()

    // Bascule vers le desktop : masquage CSS pur (aucune remontée `matchMedia`
    // n’est nécessaire pour `lg:hidden`), la sidebar se déplie, le retour part.
    await page.setViewportSize({ width: LG, height: 900 })
    await expect(
      back,
      'au 1er pixel desktop (1024) le retour doit disparaître au profit de la sidebar dépliée',
    ).toBeHidden()
    await expect
      .poll(async () => (await sidebar.boundingBox())?.width, {
        message: 'à 1024 px la sidebar doit se déplier à 248px (--sidebar-width)',
      })
      .toBe(SIDEBAR_WIDTH)
    await expect(
      header,
      'le header reste rendu à 1024 px (le <h1> ne dépend pas de la largeur)',
    ).toBeVisible()

    // Retour en arrière : la bascule doit être RÉVERSIBLE (une règle écrite
    // `min-width` d’un côté et `max-width` de l’autre ne le serait pas).
    await page.setViewportSize({ width: LG - 1, height: 900 })
    await expect(back, 'de retour à 1023 px, le retour doit réapparaître').toBeVisible()
    await expect
      .poll(async () => (await sidebar.boundingBox())?.width, {
        message: 'de retour à 1023 px, la sidebar doit se replier à 64px',
      })
      .toBe(SIDEBAR_WIDTH_COLLAPSED)
  })

  /**
   * FRONTIÈRE `md` (767/768). Ici le pilote n’est PAS une classe CSS mais du JS :
   * `useMediaQuery('(max-width: 767px)')` dans `settings/page.tsx`, qui choisit
   * le composant monté. Le redimensionnement doit donc être RÉPERCUTÉ par
   * l’écouteur `change` du hook — c’est justement ce que ce test vérifie, en
   * plus du palier lui-même (un hook qui ne réécouterait plus figerait la page
   * sur la variante du premier rendu).
   */
  test('le drill-down et les onglets basculent au même pixel (767/768)', async ({ page }) => {
    const tablist = page.getByTestId('settings-tablist')
    const index = page.getByTestId('settings-index')

    await page.setViewportSize({ width: MD - 1, height: 900 })
    await openSettingsPage(page)

    await expect(index, 'à 767 px le drill-down mobile doit être monté').toBeVisible()
    await expect(tablist, 'à 767 px les onglets ne doivent pas être dans le DOM').toHaveCount(0)
    // Le retour est visible des DEUX côtés de cette frontière (elle est sous `lg`).
    await expect(page.getByTestId('settings-back')).toBeVisible()

    await page.setViewportSize({ width: MD, height: 900 })
    await expect(
      tablist,
      'au 1er pixel tablette (768) les onglets doivent être montés',
    ).toBeVisible()
    await expect(index, 'à 768 px le drill-down ne doit plus être dans le DOM').toHaveCount(0)
    await expect(page.getByTestId('settings-back')).toBeVisible()
    // #298 — 768 px est AUSSI le pixel d'apparition de la sidebar repliée : la
    // frontière `md` est partagée par deux mécanismes INDÉPENDANTS (le JS
    // `useMediaQuery` des onglets, et la classe CSS `hidden md:flex` du shell).
    // Les deux doivent basculer au MÊME pixel — d'où l'assertion ici (768, la
    // sidebar apparaît) et son complément plus bas (767, elle repart).
    await expect(
      page.getByTestId('shell-sidebar'),
      'au 1er pixel tablette (768) la sidebar repliée du shell doit apparaître',
    ).toBeVisible()

    await page.setViewportSize({ width: MD - 1, height: 900 })
    await expect(index, 'de retour à 767 px le drill-down doit revenir').toBeVisible()
    await expect(tablist, 'de retour à 767 px les onglets doivent être démontés').toHaveCount(0)
    await expect(
      page.getByTestId('shell-sidebar'),
      'de retour à 767 px (< md) la sidebar du shell doit se remasquer',
    ).toBeHidden()
  })
})
