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
 * #347 — paliers de largeur couverts par la mesure de débordement.
 *
 * `TABLET` est le palier ajouté : 768 et 820 px tombaient dans la mise en page
 * desktop (bascule à `md`) tout en n'ayant que 736 px utiles. 1024 px est la borne
 * haute, premier pixel où la navigation desktop revient légitimement.
 * `PHONE` reprend les largeurs déjà propres depuis #334 : non-régression.
 */
const PHONE_WIDTHS = [320, 375, 390] as const
const TABLET_WIDTHS = [768, 820] as const
const DESKTOP_MIN = 1024
const LOCALES = ['fr', 'en', 'de', 'es'] as const

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

  test('le passage en `lg` referme le panneau au lieu de le masquer', async ({ page }) => {
    await gotoLanding(page)
    await openMenu(page)

    // À `lg`, `lg:hidden` masque le panneau — mais si l'état restait vrai, le
    // focus-trap continuerait de tourner (Escape avalé pour toute la page,
    // tabulation piégée) sur un dialogue invisible, burger disparu.
    // #347 : on franchit EXACTEMENT le premier pixel desktop (1024) et non 1280.
    // À 1280 le test restait vert même si `LG_BREAKPOINT_QUERY` et les classes
    // `lg:hidden` se désynchronisaient de quelques dizaines de pixels.
    await page.setViewportSize({ width: DESKTOP_MIN, height: 800 })
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
       * panneau.
       *
       * ⚠ ÉTAT DU CODE AU S52 — le paragraphe qui suivait ici décrivait un
       * couplage SUPPRIMÉ depuis. Il disait que « le `focus:bg-accent` de
       * `ui/dropdown-menu.tsx` gagne (4,71:1 clair / 6,94:1 sombre) ». Ces
       * chiffres et ce mécanisme N'EXISTENT PLUS : #346 a posé l'invariant
       * « le focus ne change que la SURFACE », donc `dropdown-menu.tsx` porte
       * `focus:bg-accent-soft` et non plus `focus:bg-accent`.
       *
       * Ce que le code fait AUJOURD'HUI : l'item actif pose
       * `bg-accent text-accent-ink focus:bg-accent-hover`
       * (`ui/language-selector.tsx`) — la paire de repos est celle sanctionnée
       * par le DS, et le focus n'assombrit que l'aplat. Ratios MESURÉS après
       * correctif : **6,08:1 en clair / 8,78:1 en sombre**, avec un delta de
       * surface repos→focus de 1,29:1 / 1,27:1 (l'item actif reste distinguable).
       *
       * L'état qui découvrait le défaut d'origine reste MIXTE : souris posée sur
       * l'item actif, puis navigation au CLAVIER vers un autre item — le focus
       * part, le `:hover` reste. Mesuré AVANT tout correctif : **1.10:1 en clair**
       * (#ffffff sur #f3f4f6) et **1.17:1 en sombre** (#0b0c0e sur #1b1e24).
       * Ce test fige les trois états, car la conformité des deux premiers dépend
       * d'un ordre de cascade (`focus:` vs `hover:`) que rien d'autre ne garantit.
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

/**
 * #347 — DÉBORDEMENT HORIZONTAL DU HEADER, TOUS PALIERS × 4 LOCALES.
 *
 * POURQUOI CE BLOC EXISTE. L'assertion `scrollWidth <= clientWidth` de #334 ne
 * tournait QU'À 375 px et QU'EN `fr`. Le palier tablette n'était donc mesuré par
 * personne, et le défaut y est resté entier après #334 : mesuré au navigateur au
 * HEAD 473ed65, à 768 px, `documentElement.scrollWidth` valait 871 (fr), 858 (de)
 * et 876 (es) pour 768 de `clientWidth`.
 *
 * ⚠ CETTE MESURE EXIGE PLAYWRIGHT. jsdom ne clampe pas les métriques de
 * défilement (on y écrit 400 dans `scrollLeft`, on relit 400) et ne résout ni la
 * mise en page ni les media queries : un test unitaire serait vert quoi qu'il
 * arrive. Cf. PIT « les tests de scroll sous jsdom ne prouvent rien » (S51) et
 * « CI verte ≠ page correcte » (S48).
 *
 * La locale compte : `de` et `es` sont les plus larges, une mesure faite en `fr`
 * seul sous-estime le débordement. `en` est le cas trompeur — il ne débordait PAS
 * à 768 px avant correctif (mesuré 768/768), il tenait à 0,1 px près.
 */
test.describe('Landing — aucun débordement horizontal, tous paliers', () => {
  const measureOverflow = (page: Page) =>
    page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }))

  for (const width of [...PHONE_WIDTHS, ...TABLET_WIDTHS, DESKTOP_MIN]) {
    const tier = PHONE_WIDTHS.includes(width as (typeof PHONE_WIDTHS)[number])
      ? 'non-régression #334'
      : 'palier #347'

    test(`${width} px — ${tier} — les 4 locales`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const failures: string[] = []

      for (const locale of LOCALES) {
        await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
        await waitForFonts(page)
        const m = await measureOverflow(page)

        // `expect.soft` : on veut le tableau COMPLET des locales fautives dans le
        // rapport, pas seulement la première. Le débordement dépend de la longueur
        // des libellés traduits — corriger `fr` sans regarder `de`/`es` a déjà
        // produit un faux « corrigé » au S49.
        expect
          .soft(
            m.scrollWidth,
            `débordement à ${width} px en ${locale} : scrollWidth=${m.scrollWidth} > clientWidth=${m.clientWidth}`,
          )
          .toBeLessThanOrEqual(m.clientWidth)
        expect
          .soft(
            m.bodyScrollWidth,
            `débordement du body à ${width} px en ${locale} : ${m.bodyScrollWidth} > ${m.clientWidth}`,
          )
          .toBeLessThanOrEqual(m.clientWidth)

        if (m.scrollWidth > m.clientWidth) {
          failures.push(`${locale}:+${m.scrollWidth - m.clientWidth}px`)
        }
      }

      test.info().annotations.push({
        type: 'débordement',
        description: `${width} px — ${failures.length === 0 ? 'aucun' : failures.join(', ')}`,
      })
    })
  }

  /**
   * FRONTIÈRE EXACTE DU PALIER — le garde-fou de synchronisation.
   *
   * `LG_BREAKPOINT_QUERY` (`HeaderSection.tsx`) est un `matchMedia` écrit en JS ;
   * le burger, l'overlay et le panneau sont masqués par des classes `lg:hidden`.
   * Rien dans le typage ne relie les deux : ils peuvent diverger silencieusement.
   * On vérifie donc qu'ils basculent au MÊME pixel — 1023 côté mobile, 1024 côté
   * desktop. En cas de divergence, le focus-trap tourne sur un panneau masqué et
   * avale l'`Escape` de toute la page, burger disparu : régression invisible.
   */
  test('le burger et la navigation desktop basculent au même pixel (1023/1024)', async ({
    page,
  }) => {
    const toggle = page.getByTestId(MOBILE_MENU.toggle)
    const nav = page.locator('header nav')

    await page.setViewportSize({ width: DESKTOP_MIN - 1, height: 900 })
    await page.goto('/fr', { waitUntil: 'domcontentloaded' })
    await waitForFonts(page)
    await expect(toggle, 'le burger doit être visible au dernier pixel du palier tablette').toBeVisible()
    await expect(nav, 'la navigation desktop ne doit pas être visible à 1023 px').toBeHidden()
    expect(await page.evaluate(() => window.matchMedia('(min-width: 64rem)').matches)).toBe(false)

    await page.setViewportSize({ width: DESKTOP_MIN, height: 900 })
    await expect(toggle, 'le burger doit disparaître au premier pixel desktop').toBeHidden()
    await expect(nav, 'la navigation desktop doit revenir à 1024 px').toBeVisible()
    expect(await page.evaluate(() => window.matchMedia('(min-width: 64rem)').matches)).toBe(true)
  })

  /**
   * Le panneau doit rester ATTEIGNABLE sur tout le palier tablette : c'est lui qui
   * porte désormais les ancres de navigation, « Connexion » et le sélecteur de
   * langue entre 768 et 1023 px. Sans cela, le correctif de débordement rendrait
   * la navigation inaccessible — le critère 4 de l'issue (tout reste atteignable).
   */
  for (const width of TABLET_WIDTHS) {
    test(`${width} px — le panneau donne accès à la navigation et à « Connexion »`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      const panel = await openMenu(page)
      await expect(panel.locator('nav a')).toHaveCount(3)
      await expect(panel.locator('a[href="/fr/login"]')).toHaveCount(1)

      // Le panneau lui-même ne doit pas réintroduire de débordement : il est en
      // `fixed`, mais `min(320px,85vw)` reste dans le cadre à toute largeur.
      const m = await measureOverflow(page)
      expect(
        m.scrollWidth,
        `débordement panneau ouvert à ${width} px : ${JSON.stringify(m)}`,
      ).toBeLessThanOrEqual(m.clientWidth)
    })
  }
})
