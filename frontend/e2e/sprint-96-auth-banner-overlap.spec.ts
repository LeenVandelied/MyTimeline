import { type Page } from '@playwright/test'
import { expect, test } from './support/fixtures'

/**
 * #656 (Sprint 96) — LA BANNIÈRE RÉSEAU NE DOIT PLUS RECOUVRIR LES CONTRÔLES D'AUTH.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE SPEC EXISTE, ET POURQUOI ELLE NE PEUT PAS ÊTRE UNE CAPTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * `e2e/sprint-77-theme-visual.spec.ts` injecte `display:none` sur
 * `[data-testid="network-banner"]` avant chaque capture (et c'est JUSTIFIÉ là-bas :
 * la bannière n'existe qu'API éteinte, elle aurait rougi en permanence en CI). Ce
 * défaut-ci est donc STRUCTURELLEMENT invisible à la suite visuelle : il faut un
 * oracle de GÉOMÉTRIE, bannière FORCÉE à l'écran. Un vert de captures ne dit rien
 * sur #656, ni dans un sens ni dans l'autre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CAUSE, MESURÉE (et non l'énoncé de l'issue, qui ne la donne pas)
 * ─────────────────────────────────────────────────────────────────────────────
 * `OfflineBanner` est `position:sticky; top:0` (`.mt-sysbanner--sticky`,
 * `styles/ds/components/i18n.css`) : il est DANS LE FLUX de `<body>` et pousse donc
 * le contenu de 32px. C'est le comportement voulu, et il est correct partout.
 *
 * Les 4 pages d'auth, elles, sortaient du flux : leur conteneur langue/thème est
 * `absolute top-4 right-4` et leur racine n'était PAS positionnée. Le bloc
 * conteneur d'un `absolute` sans ancêtre positionné est le BLOC CONTENEUR INITIAL,
 * ancré à l'origine du document : le conteneur restait donc à y=16 pendant que la
 * page, elle, descendait à y=32. MESURÉ avant correctif (1280x720, les 4 pages) :
 *
 *   bannière  y=0   h=32   →  0..32
 *   conteneur y=16  h=36   →  16..52      recouvrement VISUEL de 16px
 *   cible tactile 44x44 (`::before` des deux boutons) → 12..56, soit 20px masqués
 *   `elementFromPoint` au sommet de la cible → BANNIÈRE ; au centre → le bouton
 *
 * CORRECTIF : `relative` sur la racine des 4 pages. Le conteneur s'ancre à la PAGE
 * et suit la poussée de la bannière. MESURÉ sans bannière, avant ET après : y=16
 * à l'identique — le correctif est un NO-OP visuel tant que la bannière est absente.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE LEVIER : `GET /api/auth/me` EN 500
 * ─────────────────────────────────────────────────────────────────────────────
 * `AuthProvider` appelle `/api/auth/me` au montage sur TOUTE page, y compris les
 * pages publiques. L'intercepteur d'`apiClient` classe la santé réseau AVANT tout
 * court-circuit : un `status >= 500` appelle `networkStatusStore.reportServerError()`
 * même sur un endpoint de `INLINE_AUTH_ENDPOINTS`. La bannière monte donc en
 * `data-state="server-error"`, sans redirection (401 seul redirige).
 * ON NE FABRIQUE AUCUNE GÉOMÉTRIE : aucune feuille injectée, aucune position forcée.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CIBLE D'ACCESSIBILITÉ RETENUE : AAA (WCAG 2.4.12), pas seulement AA (2.4.11)
 * ─────────────────────────────────────────────────────────────────────────────
 * Le recouvrement d'origine laissait le centre cliquable : 2.4.11 (AA, « pas
 * ENTIÈREMENT masqué ») tenait. On vise malgré tout le dégagement TOTAL, pour une
 * raison chiffrée et non par excès de zèle : la cible tactile des deux boutons vaut
 * 44px de haut, dont 20 étaient masqués — il en restait 24, soit EXACTEMENT le seuil
 * de WCAG 2.5.8 (AA). Aucune marge. Le dégagement complet coûtant un mot-clé CSS,
 * l'arbitrage ne se pose pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI RESTE, ET QUI EST ENCADRÉ PLUTÔT QUE TU
 * ─────────────────────────────────────────────────────────────────────────────
 * La racine reste `min-h-screen` (100vh) sous une bannière de 32px DANS LE FLUX :
 * le document dépasse donc de 32px et la page est défilable d'autant. Défilée à
 * fond, la bannière collante revient recouvrir 16px du conteneur. Ce résidu N'EST
 * PAS propre à l'auth (toute racine `min-h-screen` déborde de la hauteur de la
 * bannière) et le dégager exigerait de refaire la mise en page de `<body>` en
 * colonne flex — hors périmètre de #656. Le test `residu` l'ENCADRE (exactement
 * 32px de débordement, exactement 16px de recouvrement) : la spec rougit si la
 * géométrie dérive dans un sens COMME dans l'autre, y compris si quelqu'un corrige
 * le résidu sans mettre à jour ce contrat.
 * Ce que 2.4.11/2.4.12 exigent est en revanche vérifié : au moment où le contrôle
 * REÇOIT le focus clavier, il est intégralement dégagé (test `focus clavier`).
 *
 * PRÉREQUIS RUNTIME : backend + front avec proxy `/api` (runbook E2E S47).
 */

type Box = { x: number; y: number; width: number; height: number }

/** Hauteur de `.mt-sysbanner` (`ds/components/i18n.css`). Layout pur : asserté en dur. */
const BANNER_H = 32
/** `top-4` du conteneur langue/thème des 4 pages d'auth. */
const CONTROLS_INSET = 16
/** Cible tactile des deux déclencheurs (`before:h-11 before:w-11`, PAT-S24-002). */
const TOUCH_TARGET = 44
/** Tolérance de sous-pixel. Jamais un moyen d'absorber une dérive. */
const EPSILON = 1

const AUTH_PAGES = [
  { name: 'login', path: '/fr/login' },
  { name: 'register', path: '/fr/register' },
  { name: 'forgot-password', path: '/fr/forgot-password' },
  { name: 'reset-password', path: '/fr/reset-password?token=e2e-656-banner-overlap' },
] as const

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const fmt = (b: Box) =>
  `x=${Math.round(b.x)} y=${Math.round(b.y)} w=${Math.round(b.width)} h=${Math.round(b.height)}`

/**
 * Arme le levier PUIS ouvre la page, et attend que la bannière soit MONTÉE dans son
 * état `server-error`. On n'attend aucun délai fixe : la condition est l'attribut.
 */
async function openWithBanner(page: Page, path: string): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'e2e-656' }),
    }),
  )
  await page.goto(path)
  await expect(page.getByTestId('network-banner')).toHaveAttribute('data-state', 'server-error')
}

/** Boîte non nulle, ou échec explicite (`boundingBox()` rend `null` si non rendu). */
async function box(page: Page, selector: string): Promise<Box> {
  const found = await page.locator(selector).first().boundingBox()
  expect(found, `boîte introuvable pour ${selector}`).not.toBeNull()
  return found as Box
}

/**
 * Le conteneur langue/thème n'a pas de `data-testid` propre : c'est le PARENT direct
 * de la bascule de thème (`<div class="absolute top-4 right-4 …">` des 4 pages).
 * On le vise par cette relation plutôt qu'en ajoutant un testid de confort.
 */
const CONTROLS = '[data-testid="auth-theme-toggle"] >> xpath=..'
const TOGGLE = '[data-testid="auth-theme-toggle"]'
const BANNER = '[data-testid="network-banner"]'

/**
 * Qui reçoit réellement le pointeur en (x, y) ? Seul test qui prouve l'ACCESSIBILITÉ
 * du contrôle : deux boîtes peuvent être disjointes en apparence et un empilement
 * inattendu intercepter quand même le clic.
 */
async function hitAt(page: Page, x: number, y: number): Promise<'banner' | 'toggle' | 'other'> {
  return page.evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px, py)
      if (!el) return 'other' as const
      if (el.closest('[data-testid="network-banner"]')) return 'banner' as const
      if (el.closest('[data-testid="auth-theme-toggle"]')) return 'toggle' as const
      return 'other' as const
    },
    [x, y],
  )
}

for (const vp of VIEWPORTS) {
  test.describe(`#656 — bannière réseau vs contrôles d'auth (${vp.name} ${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const authPage of AUTH_PAGES) {
      test(`${authPage.name} — boîtes disjointes, bannière affichée`, async ({ page }) => {
        await openWithBanner(page, authPage.path)

        const banner = await box(page, BANNER)
        const controls = await box(page, CONTROLS)

        // La bannière est bien celle du DS, pleine largeur, en haut.
        expect(Math.round(banner.y)).toBe(0)
        expect(Math.round(banner.height)).toBe(BANNER_H)
        expect(Math.round(banner.width)).toBe(vp.width)

        // CRITÈRE D'ACCEPTATION : plus aucun recouvrement. Bords jointifs tolérés.
        expect(
          controls.y,
          `bannière ${fmt(banner)} recouvre le conteneur ${fmt(controls)}`,
        ).toBeGreaterThanOrEqual(banner.y + banner.height - EPSILON)

        // Le conteneur suit la poussée du flux : `top-4` SOUS la bannière.
        expect(Math.round(controls.y)).toBe(BANNER_H + CONTROLS_INSET)
      })

      test(`${authPage.name} — cible tactile 44px intégralement atteignable`, async ({ page }) => {
        await openWithBanner(page, authPage.path)

        const toggle = await box(page, TOGGLE)
        const cx = toggle.x + toggle.width / 2
        // Sommet de la cible 44x44 centrée sur le bouton (le `::before` déborde
        // de (44-36)/2 = 4px au-dessus du visuel — PAT-S24-002).
        const touchTop = toggle.y + toggle.height / 2 - TOUCH_TARGET / 2

        expect(await hitAt(page, cx, touchTop + 1), 'sommet de la cible tactile').toBe('toggle')
        expect(await hitAt(page, cx, toggle.y + 1), 'sommet du bouton visuel').toBe('toggle')
        expect(await hitAt(page, cx, toggle.y + toggle.height / 2), 'centre du bouton').toBe(
          'toggle',
        )
      })

      test(`${authPage.name} — focus clavier reçu hors bannière (WCAG 2.4.12)`, async ({
        page,
      }) => {
        await openWithBanner(page, authPage.path)

        await page.getByTestId('auth-theme-toggle').focus()
        await expect(page.getByTestId('auth-theme-toggle')).toBeFocused()

        const banner = await box(page, BANNER)
        const toggle = await box(page, TOGGLE)
        // AAA : AUCUNE partie du composant focalisé n'est masquée (2.4.12), et non
        // le seul « pas entièrement masqué » de 2.4.11 (AA).
        expect(
          toggle.y,
          `au moment du focus, la bannière ${fmt(banner)} mord sur ${fmt(toggle)}`,
        ).toBeGreaterThanOrEqual(banner.y + banner.height - EPSILON)
      })

      test(`${authPage.name} — résidu de défilement encadré (hors périmètre #656)`, async ({
        page,
      }) => {
        await openWithBanner(page, authPage.path)

        const metrics = await page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
        }))
        // Le débordement vaut EXACTEMENT la hauteur de la bannière : c'est la
        // signature d'une racine `min-h-screen` sous une bannière en flux.
        expect(metrics.scrollHeight - metrics.clientHeight).toBe(BANNER_H)

        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(BANNER_H)

        const banner = await box(page, BANNER)
        const controls = await box(page, CONTROLS)
        const overlap = Math.max(0, banner.y + banner.height - controls.y)
        // ENCADRÉ (min ET max) : un résidu qui GRANDIT est une régression, un résidu
        // qui RÉTRÉCIT signifie que la mise en page a bougé sous ce contrat.
        expect(Math.round(overlap), `résidu défilé, conteneur ${fmt(controls)}`).toBe(
          BANNER_H - CONTROLS_INSET,
        )
      })
    }
  })
}
