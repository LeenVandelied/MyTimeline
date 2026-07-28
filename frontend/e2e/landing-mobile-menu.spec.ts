import { test, expect, type Page } from '@playwright/test'
import {
  MOBILE_MENU,
  describeRendering,
  expectNotTruncated,
  expectReadable,
  mobileMenuTargets,
  readAtRest,
  requiredRatio,
  waitForFonts,
} from './support/contrast'

/**
 * #334 — Menu burger de la landing : comportement, accessibilité et contraste.
 *
 * POURQUOI CETTE SPEC EXISTE. Le panneau off-canvas est le livrable principal de
 * #334 et il n'avait AUCUNE couverture navigateur : ses quatre `data-testid`
 * n'apparaissaient nulle part dans `e2e/`. Il n'était vu que par jsdom, qui ne
 * résout ni la mise en page ni la précédence des `@layer` — exactement le trou
 * que le Sprint 49 devait fermer (PIT-S48 : « CI verte ≠ page correcte »).
 *
 * Deuxième trou fermé ici : depuis #334, `header a[href$="/login"]` est en
 * `display:none` sous `md`. La spec des CTA le saute donc à 375 px, et sa copie
 * du panneau n'était mesurée par personne — « Connexion » n'avait plus aucune
 * mesure de contraste à cette largeur, dans aucun thème.
 *
 * Mesures : `transition`/`animation` neutralisées avant toute lecture (le
 * panneau entre en 200 ms et les liens transitionnent leurs couleurs — sans
 * cela on lit une valeur INTERMÉDIAIRE d'interpolation), et souris écartée entre
 * deux lectures (le curseur reste où Playwright l'a laissé, un élément mesuré
 * « au repos » peut être sous le pointeur).
 *
 * Lancement local : cf. `docs/memory/sprints/sprint-47/e2e-local-runbook.md`.
 */

const MOBILE = { width: 375, height: 812 } as const
const SCHEMES = ['light', 'dark'] as const

/**
 * Ouvre le panneau et fige les animations. Renvoie le panneau.
 *
 * Le clic est RÉESSAYÉ tant que le panneau n'apparaît pas. `HeaderSection` est
 * un composant client : entre le premier rendu HTML et l'hydratation, le burger
 * est présent, visible et cliquable — mais son `onClick` n'est pas encore
 * attaché, et le clic est un NO-OP silencieux. Diagnostiqué en écrivant cette
 * spec : un premier passage a fait tomber le test du focus-trap, le suivant
 * celui du redimensionnement, toujours sur « panneau introuvable » — un
 * échec mobile qui n'a rien à voir avec le test qui le porte.
 * `toPass` rejoue le clic ; `setMenuOpen(true)` est idempotent.
 */
async function openMenu(page: Page) {
  const toggle = page.getByTestId(MOBILE_MENU.toggle)
  const panel = page.getByTestId(MOBILE_MENU.panel)
  await expect(async () => {
    await toggle.click()
    await expect(panel).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important }',
  })
  return panel
}

async function gotoLanding(page: Page): Promise<void> {
  await page.goto('/fr', { waitUntil: 'domcontentloaded' })
  await waitForFonts(page)
}

test.describe('Landing — menu burger (375 px)', () => {
  test.use({ viewport: MOBILE })

  test('ouverture, `aria-expanded` et `aria-controls` suivent l’état', async ({ page }) => {
    await gotoLanding(page)
    const toggle = page.getByTestId(MOBILE_MENU.toggle)

    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Fermé, le panneau n'est pas rendu : `aria-controls` pointerait vers un id
    // absent du DOM (référence pendante) — il ne doit donc pas être posé.
    await expect(toggle).not.toHaveAttribute('aria-controls', /.*/)
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)

    const panel = await openMenu(page)
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toHaveAttribute('aria-controls', MOBILE_MENU.panel)
    await expect(panel).toHaveAttribute('role', 'dialog')
    await expect(panel).toHaveAttribute('aria-modal', 'true')
    // Le dialogue doit être nommé, et son nom réellement présent dans le DOM.
    const labelledBy = await panel.getAttribute('aria-labelledby')
    expect(labelledBy).not.toBeNull()
    await expect(page.locator(`#${labelledBy}`)).toHaveCount(1)
  })

  test('le bouton fermer referme le panneau', async ({ page }) => {
    await gotoLanding(page)
    await openMenu(page)
    await page.getByTestId(MOBILE_MENU.close).click()
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)
    await expect(page.getByTestId(MOBILE_MENU.toggle)).toHaveAttribute('aria-expanded', 'false')
  })

  test("un clic sur l'overlay referme le panneau", async ({ page }) => {
    await gotoLanding(page)
    await openMenu(page)
    // Position EXPLICITE : l'overlay est en `inset-0`, mais le panneau
    // (`min(320px,85vw)`, donc ~319 px à 375 px de large) recouvre son centre.
    // Un clic au centre serait intercepté par le panneau et ne fermerait rien.
    await page.getByTestId(MOBILE_MENU.overlay).click({ position: { x: 20, y: 400 } })
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)
  })

  test('Escape referme le panneau et rend le focus au burger', async ({ page }) => {
    await gotoLanding(page)
    await openMenu(page)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)
    await expect(page.getByTestId(MOBILE_MENU.toggle)).toBeFocused()
  })

  test('un clic sur une ancre referme le panneau et navigue', async ({ page }) => {
    await gotoLanding(page)
    const panel = await openMenu(page)
    const anchor = panel.locator('nav a').first()
    const href = await anchor.getAttribute('href')
    expect(href).toMatch(/^#/)
    await anchor.click()
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)
    expect(new URL(page.url()).hash).toBe(href)
  })

  test('le focus est piégé dans le panneau', async ({ page }) => {
    await gotoLanding(page)
    const panel = await openMenu(page)

    // Focus initial : premier focusable du conteneur = le bouton fermer.
    await expect(page.getByTestId(MOBILE_MENU.close)).toBeFocused()

    const isFocusInsidePanel = () =>
      panel.evaluate((el) => document.activeElement !== null && el.contains(document.activeElement))

    // Shift+Tab depuis le premier élément boucle sur le DERNIER du panneau —
    // il ne doit surtout pas sortir vers le document (c'est tout l'objet du trap).
    await page.keyboard.press('Shift+Tab')
    expect(await isFocusInsidePanel(), 'Shift+Tab depuis le premier a quitté le panneau').toBe(true)

    // Puis Tab reboucle sur le premier : le cycle est fermé dans les deux sens.
    await page.keyboard.press('Tab')
    await expect(page.getByTestId(MOBILE_MENU.close)).toBeFocused()

    // Balayage complet : à aucun moment le focus ne s'échappe.
    const focusables = await panel.locator('button, [href], [tabindex]:not([tabindex="-1"])').count()
    expect(focusables).toBeGreaterThan(1)
    for (let i = 0; i < focusables + 1; i += 1) {
      await page.keyboard.press('Tab')
      expect(await isFocusInsidePanel(), `le focus a fui du panneau au Tab #${i + 1}`).toBe(true)
    }
  })

  test('aucun débordement horizontal, panneau fermé comme ouvert', async ({ page }) => {
    await gotoLanding(page)
    const overflow = () =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }))

    // C'est la régression d'origine de #334 : 173 px de scroll horizontal à
    // 375 px. Le panneau, en `fixed`, ne doit pas la réintroduire.
    const closed = await overflow()
    expect(closed.scrollWidth, `débordement horizontal, menu fermé : ${JSON.stringify(closed)}`)
      .toBeLessThanOrEqual(closed.clientWidth)

    await openMenu(page)
    const opened = await overflow()
    expect(opened.scrollWidth, `débordement horizontal, menu ouvert : ${JSON.stringify(opened)}`)
      .toBeLessThanOrEqual(opened.clientWidth)
    expect(opened.bodyScrollWidth).toBeLessThanOrEqual(opened.clientWidth)
  })

  test('le passage en `md` referme le panneau au lieu de le masquer', async ({ page }) => {
    await gotoLanding(page)
    await openMenu(page)

    // À `md`, `md:hidden` masque le panneau — mais si l'état restait vrai, le
    // focus-trap continuerait de tourner (Escape avalé pour toute la page,
    // tabulation piégée) sur un dialogue invisible, burger disparu.
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)

    // Preuve que l'ÉTAT a été remis à faux et pas seulement le rendu masqué :
    // au retour en mobile, le panneau ne doit pas réapparaître tout seul.
    await page.setViewportSize(MOBILE)
    await expect(page.getByTestId(MOBILE_MENU.panel)).toHaveCount(0)
    await expect(page.getByTestId(MOBILE_MENU.toggle)).toHaveAttribute('aria-expanded', 'false')
  })

  for (const scheme of SCHEMES) {
    test.describe(`contraste du panneau, thème ${scheme}`, () => {
      test.use({ colorScheme: scheme })

      test('contenu lisible au repos et au survol', async ({ page }) => {
        await gotoLanding(page)
        await openMenu(page)

        const measured: string[] = []
        for (const target of mobileMenuTargets(page)) {
          await expect(target.locator).toHaveCount(1)
          const rest = await readAtRest(page, target.locator)
          measured.push(describeRendering(target.name, rest))
          expect
            .soft(rest.ratio, describeRendering(target.name, rest))
            .toBeGreaterThanOrEqual(requiredRatio(rest))
          expectNotTruncated(target.name, rest)
        }

        // Survol : c'est ici que le couplage `hover:bg-accent-soft` +
        // `hover:text-accent` des ancres mesurait 3.83:1 en clair (15 px non
        // gras, seuil 4.5) avant le correctif du Sprint 49.
        for (const target of mobileMenuTargets(page)) {
          await target.locator.hover()
          const hovered = await expectReadable(target.locator, `${target.name} (survol)`)
          measured.push(describeRendering(`${target.name} (survol)`, hovered))
          await page.mouse.move(0, 0)
        }

        // L'icône du bouton fermer hérite de `currentColor` : elle relève du
        // seuil « non textuel » (1.4.11, 3:1), on lui applique quand même le
        // plancher projet — la marge mesurée le permet.
        const close = page.getByTestId(MOBILE_MENU.close)
        const closeRest = await readAtRest(page, close)
        measured.push(describeRendering('menu/fermer', closeRest))
        expect
          .soft(closeRest.ratio, describeRendering('menu/fermer', closeRest))
          .toBeGreaterThanOrEqual(requiredRatio(closeRest))
        await close.hover()
        measured.push(
          describeRendering('menu/fermer (survol)', await expectReadable(close, 'menu/fermer (survol)')),
        )

        test.info().annotations.push({ type: 'contraste-menu', description: measured.join(' | ') })
        expect(measured.length).toBeGreaterThan(0)
      })

      /**
       * Sélecteur de langue du panneau — item de la LOCALE ACTIVE.
       *
       * Il n'était couvert nulle part : la spec ne contenait aucune référence à
       * `language`/`locale`, alors que #334 monte `LanguageSelector` DANS le
       * panneau. L'item actif pose `bg-accent text-accent-foreground` ; il
       * portait aussi `hover:bg-surface-2`, qui ne change QUE la surface et
       * laisse l'encre d'accent en place.
       *
       * Le survol souris SEUL ne le montre pas : Radix focalise l'item au
       * `pointermove` et le `focus:bg-accent` de `ui/dropdown-menu.tsx` gagne
       * (mesuré 4.71:1 en clair / 6.94:1 en sombre). L'état qui découvre le
       * défaut est MIXTE : souris posée sur l'item actif, puis navigation au
       * CLAVIER vers un autre item — le focus part, le `:hover` reste. Mesuré
       * AVANT correctif : **1.10:1 en clair** (#ffffff sur #f3f4f6) et
       * **1.17:1 en sombre** (#0b0c0e sur #1b1e24). Ce test fige les trois
       * états, car la conformité des deux premiers dépend d'un ordre de cascade
       * (`focus:` vs `hover:`) que rien d'autre ne garantit.
       *
       * OUVERTURE AU CLAVIER, obligatoire : `trigger.click()` part en timeout et
       * `element.click()` en JS ne déclenche rien — Radix ouvre sur
       * `pointerdown`, pas sur `click`. `focus()` + `Enter` fonctionne.
       */
      test('sélecteur de langue : la locale active reste lisible (repos, survol, souris+clavier)', async ({
        page,
      }) => {
        await gotoLanding(page)
        const panel = await openMenu(page)

        const trigger = panel.locator('button[data-slot="dropdown-menu-trigger"]')
        await expect(trigger).toHaveCount(1)
        await trigger.focus()
        await page.keyboard.press('Enter')
        const content = page.locator('[data-slot="dropdown-menu-content"]')
        await expect(content).toBeVisible()

        // Le menu est portalisé donc hors du panneau : les animations figées par
        // `openMenu` l'ont été avant sa création. `nextjs-portal` est l'overlay
        // du serveur de dev Next, en bas à gauche : il intercepte les événements
        // pointeur exactement là où ce menu s'ouvre à 375 px (constaté : timeout
        // sur `hover()`). Absent en CI, la règle y est sans effet.
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important } nextjs-portal { display: none !important }',
        })

        // Ancrage structurel : la locale active est celle dont le lien pointe
        // vers le chemin courant (`/fr`). Aucun libellé en dur.
        const active = content.locator('a[href="/fr"] [role="menuitem"]')
        const other = content.locator('a[href="/en"] [role="menuitem"]')
        await expect(active).toHaveCount(1)
        await expect(other).toHaveCount(1)

        const measured: string[] = []

        const rest = await readAtRest(page, active)
        measured.push(describeRendering('langue/active (repos)', rest))
        expect
          .soft(rest.ratio, describeRendering('langue/active (repos)', rest))
          .toBeGreaterThanOrEqual(requiredRatio(rest))

        await active.hover()
        measured.push(
          describeRendering(
            'langue/active (survol)',
            await expectReadable(active, 'langue/active (survol)'),
          ),
        )

        // ÉTAT MIXTE : la souris reste sur l'item actif (elle y est depuis le
        // `hover()`), le clavier déplace le focus ailleurs. C'est ici que le
        // `hover:bg-*` s'applique SEUL, sans l'encre appariée du `focus:`.
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
        await expect(active).not.toHaveAttribute('data-highlighted', /.*/)
        measured.push(
          describeRendering(
            'langue/active (souris posée + clavier)',
            await expectReadable(active, 'langue/active (souris posée + clavier)'),
          ),
        )

        // L'item NON actif garde `hover:bg-surface-2` : il n'impose aucune
        // encre, mais le même état mixte doit rester lisible.
        await other.hover()
        await page.keyboard.press('ArrowUp')
        measured.push(
          describeRendering(
            'langue/inactive (souris posée + clavier)',
            await expectReadable(other, 'langue/inactive (souris posée + clavier)'),
          ),
        )

        test.info().annotations.push({ type: 'contraste-langue', description: measured.join(' | ') })
      })
    })
  }
})
