import { test, expect } from '@playwright/test'
import {
  describeRendering,
  expectNotTruncated,
  expectReadable,
  landingCtas,
  readAtRest,
  readTextRendering,
  requiredRatio,
  revealForMeasurement,
  waitForFonts,
} from './support/contrast'

/**
 * #337 — Contrôle automatisé du contraste et de la troncature des CTA de la landing.
 *
 * Filet de sécurité pour la famille de régressions livrée au Sprint 48 : deux CTA
 * primaires rendus bleu-sur-bleu (1.00:1, illisibles) et un libellé coupé en plein
 * mot. Aucun harnais en place ne pouvait les voir — `jsdom` ne résout ni la
 * précédence des `@layer` ni la mise en page, `next build` ne contrôle aucun style
 * à l'exécution, et une relecture de diff ne devine pas une cascade CSS.
 *
 * Ce que la spec vérifie, sur le rendu réel (Chromium) :
 *  1. les sections de la landing sont bien RÉVÉLÉES (`opacity` > 0) — mesurer un
 *     contraste sur une section à `opacity: 0` ne veut rien dire ;
 *  2. le contraste au REPOS de chaque CTA, en clair ET en sombre, aux deux
 *     largeurs de référence (1280 / 375) ;
 *  3. le contraste au SURVOL — c'est un voile de survol qui avait fait tomber le
 *     CTA du hero à 4.01:1 avant #335 ;
 *  4. l'absence de troncature (`scrollWidth`/`scrollHeight` vs la boîte).
 *
 * Seuil appliqué : `max(seuil WCAG applicable, 4.5)` — cf. `CTA_MIN_RATIO` dans
 * `support/contrast.ts`. Les CTA de la landing sont rendus à 27px (échelle DS,
 * PAS l'échelle Tailwind) donc WCAG ne leur imposerait que 3:1 ; à 3:1 la
 * régression pré-#335 de 4.01:1 passerait, ce qui viderait la spec de son objet.
 *
 * Aucune authentification : la landing est publique. Aucun libellé en dur : la
 * suite tourne en fr/en/es/de, l'ancrage se fait sur la structure et les `href`.
 *
 * Lancement local : cf. `docs/memory/sprints/sprint-47/e2e-local-runbook.md`
 * (frontend sur :3100, `PLAYWRIGHT_BASE_URL`, `--workers=1`).
 */

const SCHEMES = ['light', 'dark'] as const

/**
 * CTA attendus PAR VIEWPORT — et non un simple « au moins un ».
 *
 * DÉFAUT CORRIGÉ (revue du Sprint 49) : un CTA invisible était sauté par un
 * `continue` SILENCIEUX, et la seule garde était `measured.length > 0`. Une
 * régression masquant 4 CTA sur 5 (un `display:none` de trop, une section jamais
 * révélée, un sélecteur cassé par un renommage) laissait donc la spec au VERT
 * avec une seule mesure. On fige la LISTE des noms mesurés : tout CTA qui
 * disparaît fait rougir, et tout CTA qui apparaît là où on ne l'attend pas
 * aussi.
 *
 * `header/connexion` est en `display:none` sous `md` depuis #334 : sa copie du
 * panneau burger est couverte par `landing-mobile-menu.spec.ts` (`menu/connexion`).
 * C'est la SEULE absence légitime, et elle est déclarée ici plutôt que déduite.
 */
const VIEWPORTS = [
  {
    label: 'desktop 1280',
    size: { width: 1280, height: 800 },
    expected: [
      'header/inscription',
      'header/connexion',
      'hero/primaire',
      'hero/secondaire',
      'bandeau-final/inscription',
    ],
  },
  {
    label: 'mobile 375',
    size: { width: 375, height: 812 },
    expected: [
      'header/inscription',
      'hero/primaire',
      'hero/secondaire',
      'bandeau-final/inscription',
    ],
  },
] as const

/** Viewport par défaut des projets Playwright (`devices['Desktop Chrome']`). */
const DEFAULT_VIEWPORT_EXPECTED = VIEWPORTS[0].expected

for (const scheme of SCHEMES) {
  test.describe(`Landing — CTA, thème ${scheme}`, () => {
    // `next-themes` est en `defaultTheme="system" enableSystem` : l'émulation
    // `colorScheme` du contexte suffit à poser `.dark` sur <html>, sans passer
    // par le localStorage ni par un sélecteur d'interface.
    test.use({ colorScheme: scheme })

    test('les sections sont révélées : au chargement pour le hero, au défilement pour les autres', async ({
      page,
    }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      const heroCta = page.locator('a.cta-button')
      await expect(heroCta).toHaveCount(1)

      // SANS défilement : la section au-dessus de la ligne de flottaison doit
      // être révélée d'elle-même. Si cette assertion rougit, l'hypothèse
      // « landing invisible au chargement » est confirmée.
      await expect
        .poll(async () => (await readTextRendering(heroCta)).effectiveOpacity, {
          message: 'le hero reste à opacity 0 au chargement (landing invisible)',
          timeout: 5_000,
        })
        .toBeGreaterThan(0.99)

      // Les sections sous la ligne de flottaison sont à `opacity: 0` par
      // conception et se révèlent au défilement : on vérifie que le mécanisme
      // aboutit pour CHACUNE (un observer cassé les laisserait à 0).
      const sections = page.locator('.section-animation')
      const count = await sections.count()
      expect(count).toBeGreaterThan(0)
      for (let i = 0; i < count; i += 1) {
        const section = sections.nth(i)
        await section.scrollIntoViewIfNeeded()
        await expect
          .poll(async () => (await readTextRendering(section)).effectiveOpacity, {
            message: `section #${i} jamais révélée (classe .visible non posée)`,
            timeout: 5_000,
          })
          .toBeGreaterThan(0.99)
      }
    })

    for (const viewport of VIEWPORTS) {
      test.describe(`viewport ${viewport.label}`, () => {
        test.use({ viewport: viewport.size })

        test('contraste au repos >= seuil et libellés non tronqués', async ({ page }) => {
          await page.goto('/fr', { waitUntil: 'domcontentloaded' })
          await waitForFonts(page)

          const measured: string[] = []
          const measuredNames: string[] = []
          const skipped: string[] = []
          for (const cta of landingCtas(page)) {
            await expect(cta.locator).toHaveCount(1)
            // « Connexion » bascule dans le menu burger sous `md` : hors du DOM
            // rendu visible, il n'y a rien à mesurer. Le saut est TRACÉ, jamais
            // silencieux — c'est la liste attendue ci-dessous qui l'arbitre.
            if (!(await cta.locator.isVisible())) {
              skipped.push(cta.name)
              continue
            }

            const rendering = await readAtRest(page, cta.locator)
            measured.push(describeRendering(cta.name, rendering))
            measuredNames.push(cta.name)

            expect
              .soft(rendering.ratio, describeRendering(cta.name, rendering))
              .toBeGreaterThanOrEqual(requiredRatio(rendering))
            expectNotTruncated(cta.name, rendering)
          }
          // Trace systématique : le rapport porte les ratios même quand tout
          // passe, ce qui rend la dérive lisible d'un run à l'autre.
          test
            .info()
            .annotations.push({ type: 'contraste-repos', description: measured.join(' | ') })
          if (skipped.length > 0) {
            test.info().annotations.push({ type: 'cta-sautés', description: skipped.join(' | ') })
          }
          expect(
            measuredNames,
            `CTA réellement mesurés à ${viewport.label} (sautés : ${skipped.join(', ') || 'aucun'}) — ` +
              "un CTA manquant ici n'est PAS une absence de mesure anodine : c'est un CTA " +
              'devenu invisible, donc une régression à part entière',
          ).toEqual([...viewport.expected])
        })
      })
    }

    test('contraste au survol >= seuil', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      const hovered: string[] = []
      const skipped: string[] = []
      for (const cta of landingCtas(page)) {
        // `hero/secondaire` n'est plus exclu : le défaut d'appariement du survol
        // qui le faisait disparaître a été corrigé dans `ui/button.tsx`.
        if (!(await cta.locator.isVisible())) {
          skipped.push(cta.name)
          continue
        }
        // RÉVÉLER AVANT DE SURVOLER. Les sections montent à `opacity: 1` via un
        // `IntersectionObserver` : hors de cette attente, on mesure une section
        // encore à 0 et le texte a la couleur exacte du fond (1.00:1). Le défaut
        // était MASQUÉ avant le Sprint 49 — `effectiveOpacity` s'arrêtait au
        // premier ancêtre opaque, donc l'opacité de la section n'entrait pas
        // dans le calcul. Le harnais devenu correct rend le manque d'attente
        // visible : c'est une lacune de séquencement de la spec, pas un défaut
        // de la page.
        await revealForMeasurement(cta.locator)
        await cta.locator.hover()
        await expectReadable(cta.locator, `${cta.name} (survol)`)
        hovered.push(cta.name)
      }
      // Même garde qu'au repos : sans elle, un seul CTA survolé suffisait à
      // rendre ce test vert. Ce test tourne au viewport par défaut du projet
      // (`Desktop Chrome`), donc les cinq CTA sont attendus.
      expect(
        hovered,
        `CTA réellement survolés (sautés : ${skipped.join(', ') || 'aucun'})`,
      ).toEqual([...DEFAULT_VIEWPORT_EXPECTED])
    })

    /**
     * Auto-contrôle du harnais (critère 3 de #337).
     *
     * Un test de contraste qui ne rougit jamais ne vaut rien — c'est le défaut
     * exact du harnais que cette issue corrige. On injecte donc une dégradation
     * connue dans la page (`addStyleTag`, aucun fichier source touché) et on
     * vérifie que la mesure la voit. Si ce test tombe, les assertions ci-dessus
     * sont devenues aveugles et leur vert ne prouve plus rien.
     */
    test('auto-contrôle : une dégradation injectée est bien détectée', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)
      const hero = page.locator('a.cta-button')
      await readAtRest(page, hero)

      // 1. Contraste — fond = couleur du texte : le cas « bleu sur bleu » du S48,
      // exactement 1.00:1, et indépendant du thème.
      // `transition: none` est indispensable : le CTA porte `transition-all`, et
      // sans cela on mesure une valeur INTERMÉDIAIRE de l'interpolation (mesuré :
      // rgb(91,156,236) à mi-chemin entre l'accent et le blanc) — la dégradation
      // paraîtrait alors non détectée alors qu'elle l'est 300ms plus tard.
      await page.addStyleTag({
        content:
          '.cta-button { background-color: currentColor !important; transition: none !important }',
      })
      const degraded = await readTextRendering(hero)
      expect(degraded.ratio, 'la mesure ne voit pas un fond identique au texte').toBeLessThan(1.1)
      let flagged = false
      try {
        await expectReadable(hero, 'mutation/contraste', 500)
      } catch {
        flagged = true
      }
      expect(flagged, "l'assertion de contraste n'a pas rougi sur une dégradation à 1.00:1").toBe(
        true,
      )

      // 2. Troncature — libellé forcé sur une ligne dans une boîte trop étroite.
      // `min-width: 0` est requis : le CTA porte `min-w-min` (plancher
      // `min-content` posé au S48 contre la troncature), qui l'emporte sur
      // `width` et rendrait la mutation inopérante.
      await page.addStyleTag({
        content:
          '.cta-button { white-space: nowrap !important; min-width: 0 !important; width: 120px !important; transition: none !important }',
      })
      const clipped = await readTextRendering(hero)
      expect(
        clipped.scrollWidth,
        'la mesure ne voit pas un libellé coupé par `overflow: hidden`',
      ).toBeGreaterThan(clipped.clientWidth + 1)
    })

    /**
     * Auto-contrôle des deux défauts qui rendaient le harnais PERMISSIF
     * (trouvés à la revue du Sprint 49). Un test de contraste qui se trompe du
     * côté indulgent est pire que pas de test : il donne un vert qui ne prouve
     * rien. Ces deux assertions échouent si l'un des deux revient.
     */
    test('auto-contrôle : le harnais ne se trompe plus du côté permissif', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)
      const hero = page.locator('a.cta-button')
      await readAtRest(page, hero)

      // 1. OPACITÉ. `effectiveOpacity` était calculé mais jamais appliqué au
      // compositage : seul `readAtRest` s'en servait, via son plancher à 0.99.
      // `expectReadable` au survol lisait donc l'encre PLEINE d'un élément
      // semi-transparent et rendait un ratio optimiste.
      await page.addStyleTag({
        content: '.cta-button { opacity: 0.3 !important; transition: none !important }',
      })
      const faded = await readTextRendering(hero)
      expect(faded.effectiveOpacity, "l'opacité injectée n'est pas vue").toBeLessThan(0.4)
      expect(
        faded.ratio,
        `un CTA à 30% d'opacité est mesuré ${faded.ratio.toFixed(2)}:1 : l'opacité n'est pas composée`,
      ).toBeLessThan(3)
      let opacityFlagged = false
      try {
        await expectReadable(hero, 'mutation/opacité', 500)
      } catch {
        opacityFlagged = true
      }
      expect(
        opacityFlagged,
        "l'assertion de contraste n'a pas rougi sur un élément à 30% d'opacité",
      ).toBe(true)

      // 2. COULEUR NON ANALYSABLE. `ctx.fillStyle = <syntaxe invalide>` est un
      // NO-OP silencieux : le `fillStyle` gardait sa valeur par défaut et la
      // couleur était composée comme un NOIR PLEIN — sur fond clair, un ratio
      // faussement excellent. On empoisonne `getComputedStyle` pour ce seul
      // élément et cette seule propriété : la mesure doit LEVER, pas deviner.
      await page.evaluate(() => {
        const original = window.getComputedStyle.bind(window)
        window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
          const style = original(element, pseudo ?? undefined)
          if (pseudo || !element.classList?.contains('cta-button')) return style
          return new Proxy(style, {
            get: (target, property) => {
              if (property === 'color') return 'ceci-nest-pas-une-couleur(42)'
              const value = Reflect.get(target, property) as unknown
              return typeof value === 'function' ? value.bind(target) : value
            },
          })
        }) as typeof window.getComputedStyle
      })
      await expect(
        readTextRendering(hero),
        'une couleur CSS non analysable est composée silencieusement au lieu de lever',
      ).rejects.toThrow(/non analysable/)
    })

    // DÉFAUT CORRIGÉ au Sprint 49 (il était PRÉEXISTANT, non introduit par
    // #334/#335/#336). `Button variant="outline"` portait
    // `hover:text-accent-foreground` dans `src/components/ui/button.tsx` ;
    // `--color-accent-foreground` vaut `--color-accent-ink`, la couleur de texte
    // prévue SUR l'accent. Au survol, `HeroSection` remplaçait bien le fond
    // (`hover:bg-surface`) mais pas la couleur de texte du variant (`text-ink`
    // n'entre pas en conflit avec un utilitaire `hover:text-*`, tailwind-merge
    // ne les fusionne pas) : le libellé devenait blanc sur blanc en clair
    // (1.00:1) et quasi-noir sur anthracite en sombre (1.07:1) — il
    // DISPARAISSAIT au survol dans les deux thèmes.
    // Correctif : les variants `outline` et `ghost` ne posent plus AUCUNE
    // couleur de texte au survol ; le survol ne change que la surface
    // (`hover:bg-accent-soft`), l'encre de repos reste en place. L'invariant est
    // tenu par `src/components/ui/button.hover-pairing.test.ts`.
    // Ce test est désormais une assertion normale : plus de `test.fail()`.
    test('le CTA secondaire du hero reste lisible au survol', async ({ page }) => {
      await page.goto('/fr', { waitUntil: 'domcontentloaded' })
      await waitForFonts(page)

      const secondary = page.locator('section a[href="#how-it-works"]')
      // Même attente qu'au-dessus : sans elle, le survol peut tomber pendant le
      // fondu d'apparition de la section et mesurer 1.00:1 à `opacity: 0`.
      await revealForMeasurement(secondary)
      await secondary.hover()
      await expectReadable(secondary, 'hero/secondaire (survol)', 1_500)
    })
  })
}
