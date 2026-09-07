import { expect, test, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'

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
 *  3. au PREMIER `requestAnimationFrame` — enregistré par un `addInitScript`,
 *     donc avant tout script de la page — la classe est déjà posée. Une classe
 *     absente à ce point signifierait qu'au moins une frame a pu être peinte en
 *     clair.
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
      requestAnimationFrame(() => {
        w.__themeAtFirstFrame = document.documentElement.className
      })
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
 * Clique la bascule et attend le basculement RÉEL de la classe — pas un simple
 * `waitForTimeout` : next-themes écrit `localStorage` puis met à jour `<html>`
 * dans le même tour, mais l'attente explicite documente l'oracle.
 */
async function toggleAndExpectFlip(page: Page, testId: string) {
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

    test('la bascule du panneau est atteignable, celle du header ne l’est pas', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      // Le groupe desktop reste dans le DOM (`hidden lg:flex`) mais n'est pas
      // atteignable : c'est bien le panneau qui porte la bascule sous `lg`.
      await expect(page.getByTestId('landing-header-theme-toggle')).toBeHidden()

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
        "aucun script inline ne pose le thème sur <html> avant hydratation — le flash de thème est de retour (CSP ? `scriptProps` ? provider sorti du document statique ?)",
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
