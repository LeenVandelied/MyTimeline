import { expect, test, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { neutralizeDevToolingPointerEvents } from './support/dev-tooling'

/**
 * #642 (DEC-S82-009) — la bascule de thème est ATTEIGNABLE HORS CONNEXION.
 *
 * CE QUE CETTE SPEC FERME. Avant #642, les deux seules bascules du dépôt vivaient
 * derrière l'authentification (`AppShell`, `MobileDrawer`) : un visiteur dont
 * l'OS est en sombre recevait du clair sans aucun recours. `settings-preferences`
 * couvrait la bascule CONNECTÉE ; rien ne couvrait les surfaces publiques.
 *
 * Trois surfaces, trois `data-testid` distincts — et ils DOIVENT l'être : sur la
 * landing, le groupe desktop est `hidden lg:flex` (donc TOUJOURS dans le DOM,
 * seulement masqué) pendant que le panneau mobile en monte un second. Un
 * identifiant partagé rendrait `getByTestId` ambigu à toute largeur < 1024 px.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ANTI-FLASH — CE QUI EST RÉELLEMENT PROUVÉ ICI, ET CE QUI NE L'EST PAS.
 *
 * Le critère « aucun flash de thème au premier rendu des routes publiques » ne
 * se prouve pas par une capture : au moment où `toHaveScreenshot` s'exécute, la
 * page est stabilisée depuis longtemps. On sonde donc le MÉCANISME, en trois
 * points de plus en plus contraignants :
 *
 *  1. le HTML SERVI (requête brute, hors navigateur) contient bien le script
 *     inline de pré-hydratation de next-themes — s'il disparaissait (CSP, option
 *     `scriptProps`, provider déplacé hors du document statique), le flash
 *     reviendrait et rien d'autre dans le dépôt ne le verrait ;
 *  2. à `DOMContentLoaded`, `<html>` porte DÉJÀ la classe attendue ;
 *  3. à la PREMIÈRE FRAME OÙ DU CONTENU PEINTABLE EXISTE — sonde enregistrée
 *     par un `addInitScript`, donc avant tout script de la page — la classe est
 *     déjà posée. Une classe absente à ce point signifierait qu'au moins une
 *     frame a pu être peinte en clair. ⚠ « première frame peintable », PAS
 *     « première frame » : voir le commentaire d'`armThemeProbes`, le rAF nu
 *     rendait un faux rouge ~1 fois sur 3.
 *
 * CE QUE ÇA NE PROUVE PAS : que rien n'a été peint. Aucune API de Playwright ne
 * donne le contenu des frames intermédiaires ; le point 3 est une borne, pas une
 * observation du pixel. Et ces trois sondes ne disent rien du CSS : que les
 * tokens du DS commutent bien sur `.dark` est couvert ailleurs
 * (`sprint-77-theme-visual.spec.ts`).
 *
 * ⚠ MODE DE RENDU. Le point 1 vaut pour `next start` (CI) comme pour `next dev`,
 * le script étant émis par le rendu serveur du provider dans les deux cas.
 */

const STORAGE_KEY = 'theme'

/** Sondes posées AVANT tout script de la page (cf. point 3 du pavé). */
async function armThemeProbes(page: Page, seededTheme?: 'light' | 'dark') {
  await page.addInitScript(
    ({ key, seeded }: { key: string; seeded?: string }) => {
      if (seeded) {
        try {
          window.localStorage.setItem(key, seeded)
        } catch {
          /* stockage indisponible : le test le verra via la classe manquante */
        }
      }
      const w = window as unknown as { __themeAtFirstFrame?: string; __themeAtDcl?: string }

      // ⚠ LE PREMIER `requestAnimationFrame` TOUT COURT EST UN FAUX ORACLE.
      // Il a été mesuré ROUGE ~1 fois sur 3 (`firstFrame` sans `.dark`, `dcl`
      // AVEC) alors qu'aucun flash n'est possible : le `<head>` porte deux
      // feuilles de style BLOQUANTES, le rendu est donc suspendu pendant que
      // le compositeur, lui, tique déjà. Un callback rAF enregistré au
      // document-start peut ainsi s'exécuter alors que le parseur n'a pas
      // encore atteint le script de next-themes — et une frame où RIEN n'est
      // peint ne prouve aucun flash. On échantillonne donc la PREMIÈRE FRAME
      // OÙ DU CONTENU PEINTABLE EXISTE, ce qui est la borne que le pavé
      // d'en-tête décrit vraiment. (HTML servi : `<body>` à l'octet ~1393, le
      // script de next-themes immédiatement après — il précède donc tout
      // contenu applicatif, et c'est cet ordre que la sonde verrouille.)
      // « PEINTABLE » SE MESURE, NE SE DEVINE PAS. Le HTML servi commence par
      // `<body><div hidden></div><script>…next-themes…</script>` : un test sur
      // la seule PRÉSENCE d'un élément non-script laissait donc encore passer
      // la frame d'AVANT le script, via ce `<div hidden>` (faux rouge résiduel
      // reproduit ~1 run sur 3). L'oracle exact est l'existence d'une BOÎTE
      // rendue — `getClientRects()` est vide pour un `hidden`, et vide tant que
      // les feuilles bloquantes du `<head>` n'ont pas produit de mise en page.
      const paintable = () => {
        const body = document.body
        if (!body) return false
        return Array.from(body.children).some(
          (el) =>
            !['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE'].includes(el.tagName) &&
            (el as HTMLElement).getClientRects().length > 0,
        )
      }
      const sampleFirstPaintableFrame = () => {
        if (paintable()) {
          w.__themeAtFirstFrame = document.documentElement.className
          return
        }
        requestAnimationFrame(sampleFirstPaintableFrame)
      }
      requestAnimationFrame(sampleFirstPaintableFrame)

      document.addEventListener('DOMContentLoaded', () => {
        w.__themeAtDcl = document.documentElement.className
      })
    },
    { key: STORAGE_KEY, seeded: seededTheme },
  )
}

async function readProbes(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __themeAtFirstFrame?: string; __themeAtDcl?: string }
    return {
      firstFrame: w.__themeAtFirstFrame ?? '(non relevé)',
      dcl: w.__themeAtDcl ?? '(non relevé)',
      now: document.documentElement.className,
    }
  })
}

const htmlClass = (page: Page) => page.locator('html').getAttribute('class')

/** Le thème effectif tel que le DS le voit : la classe `.dark` sur `<html>`. */
async function isDark(page: Page) {
  return ((await htmlClass(page)) ?? '').includes('dark')
}

/**
 * BARRIÈRE D'HYDRATATION EXPLICITE — à franchir AVANT tout clic.
 *
 * `ThemeToggle` ne pose `aria-pressed` qu'APRÈS sa garde `mounted`
 * (`ui/theme-toggle.tsx` : `aria-pressed={mounted ? isDark : undefined}`). Tant
 * que l'attribut manque, React n'a pas hydraté ce sous-arbre : le bouton est
 * pourtant déjà rendu, VISIBLE et CLIQUABLE — le clic part donc en NO-OP
 * SILENCIEUX, sans que Playwright n'ait rien à signaler (il n'y a simplement pas
 * encore de `onClick` attaché). L'échec se lit alors comme un défaut du
 * composant (« la classe .dark ne s'inverse pas »), ce qu'il n'est pas.
 *
 * C'est le piège déjà documenté par `landing-mobile-menu.spec.ts` (`openMenu`),
 * qui le traite en REJOUANT le clic sous `toPass`. Ce remède-là est
 * INAPPLICABLE à une bascule : `setMenuOpen(true)` est idempotent,
 * `setTheme(inverse)` ne l'est pas — un second clic ramènerait le thème à son
 * état initial et le test deviendrait non déterministe. D'où une barrière, pas
 * un réessai. Et surtout pas un `waitForTimeout`, qui serait à la fois lent et
 * flaky.
 */
async function waitForToggleHydrated(page: Page, testId: string) {
  await expect(
    page.getByTestId(testId),
    `${testId} : \`aria-pressed\` toujours absent — le sous-arbre React n'est pas hydraté, ` +
      `un clic serait un NO-OP silencieux (cf. barrière d'hydratation ci-dessus)`,
  ).toHaveAttribute('aria-pressed', /^(true|false)$/)
}

/**
 * Clique la bascule et attend le basculement RÉEL de la classe — pas un simple
 * `waitForTimeout` : next-themes écrit `localStorage` puis met à jour `<html>`
 * dans le même tour, mais l'attente explicite documente l'oracle.
 */
async function toggleAndExpectFlip(page: Page, testId: string) {
  await waitForToggleHydrated(page, testId)
  const before = await isDark(page)
  await page.getByTestId(testId).click()
  await expect
    .poll(() => isDark(page), {
      message: `la classe .dark de <html> doit s'inverser après clic sur ${testId}`,
    })
    .toBe(!before)
  return !before
}

test.describe('Bascule de thème hors connexion', () => {
  /**
   * L'outillage de `next dev` est un OBSTACLE AU CLIC, pas seulement du bruit de
   * mesure. Mesuré ici : à 375 px, la bascule du panneau mobile est recouverte
   * par `<nextjs-portal>` et 60 tentatives de clic sont interceptées d'affilée
   * jusqu'à expiration. La CI e2e tourne elle aussi sur `next dev`
   * (`playwright.config.ts`) — le risque n'est donc pas local. On réutilise le
   * neutraliseur canonique du dépôt (`support/dev-tooling.ts`, #63/S63) plutôt
   * que de réécrire une exclusion locale : il pose `pointer-events:none` sur le
   * seul mobilier du serveur de dev, sans masquer ni démonter quoi que ce soit
   * d'applicatif.
   */
  test.beforeEach(async ({ page }) => {
    await neutralizeDevToolingPointerEvents(page)
  })

  test.describe('landing — nav desktop', () => {
    test.use({ viewport: { width: 1280, height: 900 } })

    test('la bascule est visible et inverse le thème', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      const toggle = page.getByTestId('landing-header-theme-toggle')
      await expect(toggle).toBeVisible()
      // Icône seule : le nom accessible est le SEUL contenu lisible.
      await expect(toggle).toHaveAttribute('aria-label', /.+/)
      await expect(toggle).toHaveAttribute('aria-pressed', /true|false/)

      await toggleAndExpectFlip(page, 'landing-header-theme-toggle')
    })

    test('le choix fait AVANT connexion survit à un rechargement', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      const chosenDark = await toggleAndExpectFlip(page, 'landing-header-theme-toggle')
      expect(await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY)).toBe(
        chosenDark ? 'dark' : 'light',
      )

      await page.reload({ waitUntil: 'domcontentloaded' })
      expect(await isDark(page)).toBe(chosenDark)

      // Et il survit à une navigation vers une AUTRE route publique.
      await page.goto('/fr/login', { waitUntil: 'domcontentloaded' })
      expect(await isDark(page)).toBe(chosenDark)
    })
  })

  test.describe('landing — panneau mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('la bascule du panneau est atteignable, celle du header ne l’est pas', async ({
      page,
    }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      // Le groupe desktop reste dans le DOM (`hidden lg:flex`) mais n'est pas
      // atteignable : c'est bien le panneau qui porte la bascule sous `lg`.
      await expect(page.getByTestId('landing-header-theme-toggle')).toBeHidden()

      // Le burger n'expose AUCUN marqueur de montage propre — mais il partage le
      // sous-arbre client de `HeaderSection` avec la bascule desktop, qui reste
      // dans le DOM sous `lg` (`hidden lg:flex`). Son `aria-pressed` est donc
      // l'oracle d'hydratation du burger aussi, et `toHaveAttribute` n'exige pas
      // la visibilité. Sans cette barrière, le clic est un NO-OP, le panneau
      // n'est jamais monté, et l'échec se lit « landing-header-menu introuvable ».
      await waitForToggleHydrated(page, 'landing-header-theme-toggle')

      await page.getByTestId('landing-header-menu-toggle').click()
      await expect(page.getByTestId('landing-header-menu')).toBeVisible()

      const toggle = page.getByTestId('landing-mobile-menu-theme-toggle')
      await expect(toggle).toBeVisible()
      await toggleAndExpectFlip(page, 'landing-mobile-menu-theme-toggle')
    })
  })

  test.describe('pages d’authentification', () => {
    const AUTH_ROUTES = [
      '/fr/login',
      '/fr/register',
      '/fr/forgot-password',
      '/fr/reset-password?token=e2e-theme-toggle',
    ] as const

    for (const route of AUTH_ROUTES) {
      test(`${route} — la bascule est exposée et inverse le thème`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        await waitForFonts(page)

        const toggle = page.getByTestId('auth-theme-toggle')
        await expect(toggle).toBeVisible()
        await expect(toggle).toHaveAttribute('aria-label', /.+/)

        await toggleAndExpectFlip(page, 'auth-theme-toggle')
      })
    }
  })

  test.describe('absence de flash au premier rendu (routes publiques statiques)', () => {
    test('le HTML SERVI porte le script de pré-hydratation de next-themes', async ({
      page,
      baseURL,
    }) => {
      const response = await page.request.get(`${baseURL}/fr`)
      expect(response.ok()).toBe(true)
      const html = await response.text()

      // Signature du script inline de next-themes : il écrit sur
      // `document.documentElement` AVANT que React ne s'hydrate.
      const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(
        (m) => m[1],
      )
      const preHydration = inlineScripts.filter(
        (s) => s.includes('documentElement') && s.includes('localStorage'),
      )
      expect(
        preHydration.length,
        'aucun script inline ne pose le thème sur <html> avant hydratation — le flash de thème est de retour (CSP ? `scriptProps` ? provider sorti du document statique ?)',
      ).toBeGreaterThan(0)
    })

    test('OS en sombre, aucune préférence stockée : .dark est posée dès la 1re frame', async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await armThemeProbes(page)
      await page.goto('/fr', { waitUntil: 'load' })

      const probes = await readProbes(page)
      expect(probes.now, JSON.stringify(probes)).toContain('dark')
      expect(probes.dcl, JSON.stringify(probes)).toContain('dark')
      expect(probes.firstFrame, JSON.stringify(probes)).toContain('dark')
    })

    test('préférence stockée « dark » et OS en clair : .dark est posée dès la 1re frame', async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await armThemeProbes(page, 'dark')
      await page.goto('/fr/login', { waitUntil: 'load' })

      const probes = await readProbes(page)
      expect(probes.now, JSON.stringify(probes)).toContain('dark')
      expect(probes.dcl, JSON.stringify(probes)).toContain('dark')
      expect(probes.firstFrame, JSON.stringify(probes)).toContain('dark')
    })

    test('auto-contrôle : les sondes SAVENT rendre « clair » (elles ne disent pas toujours dark)', async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await armThemeProbes(page, 'light')
      await page.goto('/fr', { waitUntil: 'load' })

      const probes = await readProbes(page)
      expect(probes.firstFrame, JSON.stringify(probes)).not.toContain('dark')
      expect(probes.now, JSON.stringify(probes)).not.toContain('dark')
    })
  })
})
