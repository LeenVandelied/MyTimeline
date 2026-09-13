import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { devToolingSelectors } from './support/dev-tooling'

/**
 * #341 — Verrou de non-régression : aucun débordement horizontal de la landing
 * aux largeurs mobiles.
 *
 * ORIGINE — MESURE NÉGATIVE. L'issue #341 signalait « 4 éléments `<g>` d'un SVG
 * inline finissant à x = 384 pour un viewport de 375 px ». L'investigation a
 * localisé ces `<g>` : ils appartiennent au **bouton flottant des TanStack Query
 * Devtools** (`.tsqd-parent-container`, logo TanStack = 4 `<g>` + 3 `<ellipse>` +
 * 1 `<circle>`), monté par `src/contexts/QueryProvider.tsx` UNIQUEMENT sous
 * `NODE_ENV === 'development'`. Ce n'est donc ni un SVG applicatif, ni un défaut
 * de la landing, et il n'existe pas dans le bundle de production.
 *
 * ⚠ PIÈGE DE MESURE, C'EST LA RAISON D'ÊTRE DE CE FICHIER : un balayage
 * `getBoundingClientRect().right > clientWidth` exécuté sur un `npm run dev`
 * REMONTE ce bouton et ressemble trait pour trait à un vrai débordement (le
 * décalage suit la largeur du viewport : 329@320, 384@375, 399@390). Il n'en
 * produit pourtant aucun : `scrollWidth === clientWidth` et le défilement
 * horizontal est nul. Tout futur audit de débordement doit donc EXCLURE
 * l'outillage de dev avant de conclure — sans quoi il rouvrira #341 à
 * l'identique. La liste vit dans `support/dev-tooling.ts`, SOURCE UNIQUE
 * partagée avec `landing-typography-hierarchy.spec.ts` : elle était dupliquée
 * ici en dur et les deux copies avaient déjà divergé (Sprint 59).
 *
 * Ce que la spec vérifie, sur le rendu réel :
 *  1. `documentElement.scrollWidth <= clientWidth` ;
 *  2. le défilement horizontal effectif est nul — sonde réelle, `window.scrollTo`
 *     puis relecture de `window.scrollX`. Chromium clampe `scrollX` ; `jsdom` NON
 *     (on y écrit 400 et on relit 400), d'où l'obligation d'un E2E ici ;
 *  3. aucun élément applicatif ne dépasse le bord droit du document ;
 *  4. auto-contrôle : une largeur excessive injectée EST détectée (sinon la spec
 *     serait verte par aveuglement).
 *
 * Locales : `fr` (principale) et `de` (la plus large — c'est elle qui casse les
 * budgets de largeur, cf. l'échec CI Ubuntu du Sprint 52 à 1 px près en `de`).
 */

/** Largeurs de référence : 320 = plus petit mobile supporté, 414 = grand mobile. */
const WIDTHS = [320, 360, 375, 390, 414] as const
const LOCALES = ['fr', 'de'] as const

/** Tolérance sub-pixel : les arrondis de rendu produisent des écarts < 1 px. */
const SUBPIXEL_TOLERANCE_PX = 0.5

/**
 * `id` est relevé au même titre que `tag` et `cls` : c'est le seul champ qui
 * identifie la SONDE de l'auto-contrôle (`#overflow-self-check`, sans classe).
 * Sans lui, l'auto-contrôle ne pouvait s'assurer que d'un `tag === 'div'` —
 * satisfait par n'importe quel autre `div` fautif, donc incapable de prouver
 * que c'est bien la sonde injectée qui a été détectée (review Sprint 59).
 */
interface Offender {
  tag: string
  id: string
  cls: string
  right: number
  width: number
}

interface OverflowReport {
  clientWidth: number
  scrollWidth: number
  maxScrollX: number
  offenders: Offender[]
}

/**
 * Fait défiler la page de bout en bout puis revient en haut.
 *
 * `useSectionAnimation` révèle les sections au défilement (`opacity: 0` →
 * `visible`). La révélation ne joue que sur `opacity` et `translateY`, donc pas
 * sur la géométrie horizontale — mais mesurer une page dont la moitié des
 * sections n'a jamais été observée laisserait un doute inutile.
 */
async function revealWholePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    }
    window.scrollTo(0, 0)
  })
}

async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(
    ({ tolerance, tooling }) => {
      const de = document.documentElement
      const clientWidth = de.clientWidth
      const offenders: Array<{
        tag: string
        id: string
        cls: string
        right: number
        width: number
      }> = []

      /**
       * Revue S87 (C1) — BLOC CONTENEUR, pas parent DOM.
       *
       * Rend l'ancêtre qui sert de bloc conteneur à `el`, ou `null` quand c'est le
       * viewport / le bloc initial (dans ce cas AUCUN ancêtre ne rogne `el`).
       *  - `static` / `relative` / `sticky` : le parent (en flux, tout ancêtre rogne).
       *  - `fixed` : le premier ancêtre qui crée un bloc conteneur pour les `fixed`
       *    (`transform`, `perspective`, `filter`, `backdrop-filter`, `contain`
       *    paint|layout|strict|content, `will-change` transform|perspective|filter,
       *    `container-type` ≠ `normal`, `content-visibility: auto`), sinon le viewport.
       *  - `absolute` : idem, OU le premier ancêtre positionné.
       * CONSERVATEUR : une propriété créatrice oubliée ici fait remonter le bloc
       * conteneur trop haut, donc borne MOINS — vrai positif possible, jamais faux vert.
       */
      const containingBlockOf = (el: Element): Element | null => {
        const position = getComputedStyle(el).position
        if (position !== 'fixed' && position !== 'absolute') return el.parentElement
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p)
          if (position === 'absolute' && s.position !== 'static') return p
          if (
            s.transform !== 'none' ||
            s.perspective !== 'none' ||
            s.filter !== 'none' ||
            (s.backdropFilter ?? 'none') !== 'none' ||
            /\b(paint|layout|strict|content)\b/.test(s.contain) ||
            /\b(transform|perspective|filter)\b/.test(s.willChange) ||
            (s.containerType ?? 'normal') !== 'normal' ||
            s.contentVisibility === 'auto'
          )
            return p
        }
        return null
      }

      /** `overflow` ne s'applique pas à un `inline` ni à un `contents` : ils ne rognent rien. */
      const clipsX = (p: Element): boolean => {
        const s = getComputedStyle(p)
        return s.overflowX !== 'visible' && s.display !== 'inline' && s.display !== 'contents'
      }

      for (const el of Array.from(document.querySelectorAll('*'))) {
        // Outillage de DÉVELOPPEMENT, absent du bundle de production (cf.
        // `support/dev-tooling.ts`). Les inclure, c'est rouvrir #341 sur un
        // faux positif. `closest` teste aussi l'élément lui-même.
        if (tooling.some((sel) => el.closest(sel))) continue

        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue

        /**
         * #611 — BORD DROIT VISIBLE, pas bord droit de la boîte.
         *
         * La frise du hero est une piste de 1640 px qui défile DANS un panneau
         * `overflow:hidden` : à 320 px, ses barres finissent bien au-delà du bord
         * droit du document alors que rien n'en dépasse à l'écran (`scrollWidth ===
         * clientWidth`, `maxScrollX === 0`). `getBoundingClientRect` ignore le rognage
         * ([[PIT-S77-002]]) : sans correction, ce balayage fabriquait ~70 faux
         * débordements par largeur.
         *
         * On borne donc le bord droit par celui des ancêtres qui ROGNENT RÉELLEMENT
         * l'élément (`overflow-x` ≠ `visible`). Plus strict que l'exclusion de
         * `sprint-63-de-overflow-audit.spec.ts` (qui ignore tout contenu contenu) : un
         * conteneur rognant qui déborde LUI-MÊME reste un offender, et le contenu qu'il
         * laisse dépasser aussi. Remontée arrêtée AVANT `<body>` (scroll-lock Radix,
         * même raison que dans `sprint-63`).
         *
         * Revue S87 (C1) : la remontée suit la CHAÎNE DES BLOCS CONTENEURS, pas la chaîne
         * DOM. La 1re version bornait par TOUT ancêtre DOM rognant : un `position:fixed`
         * (bloc conteneur = viewport) ou un `absolute` dont le bloc conteneur positionné est
         * AU-DESSUS d'un `overflow:hidden` non positionné n'est PAS rogné par ce dernier —
         * il déborde réellement à l'écran, et la spec l'aurait déclaré visible-borné (faux
         * vert). Règle : un ancêtre rognant A rogne `el` ssi A est sur la chaîne
         * `el → bloc conteneur → bloc conteneur du bloc conteneur…`. Les ancêtres DOM
         * situés strictement ENTRE un élément hors flux et son bloc conteneur sont sautés.
         * Armé par les sondes 2 à 5 de l'auto-contrôle (la 3e et la 4e rougissent avec
         * l'ancienne remontée DOM — vérifié par mutation au S87).
         */
        let visibleRight = rect.right
        for (
          let cb = containingBlockOf(el);
          cb && cb !== de && cb !== document.body;
          cb = containingBlockOf(cb)
        ) {
          if (clipsX(cb)) visibleRight = Math.min(visibleRight, cb.getBoundingClientRect().right)
        }
        if (visibleRight > clientWidth + tolerance) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            cls: (el.getAttribute('class') ?? '').slice(0, 80),
            right: Math.round(visibleRight * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
          })
        }
      }

      // Sonde de défilement RÉEL : Chromium clampe `scrollX` à l'amplitude
      // effective, une page sans débordement renvoie donc 0.
      const previousY = window.scrollY
      window.scrollTo(5_000, previousY)
      const maxScrollX = window.scrollX
      window.scrollTo(0, previousY)

      return { clientWidth, scrollWidth: de.scrollWidth, maxScrollX, offenders }
    },
    { tolerance: SUBPIXEL_TOLERANCE_PX, tooling: devToolingSelectors() },
  )
}

for (const locale of LOCALES) {
  test.describe(`Landing — débordement horizontal, locale ${locale}`, () => {
    for (const width of WIDTHS) {
      test.describe(`viewport ${width}px`, () => {
        test.use({ viewport: { width, height: 800 } })

        test('aucun débordement horizontal', async ({ page }) => {
          await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
          await waitForFonts(page)
          await revealWholePage(page)
          // Mesure au repos : le curseur reste où Playwright l'a laissé et un
          // élément survolé peut être mesuré dans un état `:hover` élargi.
          await page.mouse.move(0, 0)

          const report = await measureOverflow(page)

          expect(
            report.offenders,
            `éléments dépassant le bord droit à ${width}px (${locale}) : ${JSON.stringify(report.offenders)}`,
          ).toEqual([])
          expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth)
          expect(report.maxScrollX).toBe(0)
        })
      })
    }
  })
}

test.describe('Landing — auto-contrôle du harnais de débordement', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('un élément trop large injecté EST détecté', async ({ page }) => {
    await page.goto('/fr', { waitUntil: 'domcontentloaded' })
    await waitForFonts(page)
    await page.mouse.move(0, 0)

    await expect.poll(async () => (await measureOverflow(page)).offenders.length).toBe(0)

    // `transition: none` + `min-width: 0` : une mutation injectée peut être
    // avalée par une transition en cours ou un `min-width` concurrent.
    const PROBE_ID = 'overflow-self-check'
    await page.evaluate((id) => {
      const probe = document.createElement('div')
      probe.id = id
      probe.style.cssText =
        'position:absolute;top:0;left:0;width:9999px;height:4px;transition:none;min-width:0;'
      document.body.appendChild(probe)
    }, PROBE_ID)

    const degraded = await measureOverflow(page)

    /**
     * On asserte l'IDENTITÉ de la sonde, pas sa forme.
     *
     * L'assertion précédente était `offenders.some((o) => o.tag === 'div')` :
     * VACUOUS, puisque n'importe quel autre `div` réellement fautif l'aurait
     * satisfaite. Elle ne prouvait donc pas ce que ce test prétend prouver —
     * que le harnais DÉTECTE la dégradation injectée. Relevé en review S59.
     */
    expect(
      degraded.offenders.map((o) => o.id),
      `le harnais doit détecter la sonde injectée \`#${PROBE_ID}\` (9999px de large) — ` +
        `débordants relevés : ${JSON.stringify(degraded.offenders)}`,
    ).toContain(PROBE_ID)

    await page.evaluate((id) => document.getElementById(id)?.remove(), PROBE_ID)

    /**
     * #611 — la borne par les ancêtres rognants ne doit pas AVEUGLER le harnais : un
     * conteneur `overflow:hidden` lui-même trop large reste un débordement, et son
     * contenu aussi. Sans cette sonde, une remontée « contenu ⇒ ignoré » passerait.
     */
    const CLIP_ID = 'overflow-self-check-clip'
    const CHILD_ID = 'overflow-self-check-clip-child'
    await page.evaluate(
      ({ clip, child }) => {
        const wrapper = document.createElement('div')
        wrapper.id = clip
        wrapper.style.cssText =
          'position:absolute;top:0;left:0;width:9999px;height:4px;overflow:hidden;transition:none;min-width:0;'
        const inner = document.createElement('div')
        inner.id = child
        inner.style.cssText = 'width:9999px;height:4px;'
        wrapper.appendChild(inner)
        document.body.appendChild(wrapper)
      },
      { clip: CLIP_ID, child: CHILD_ID },
    )

    const clipped = (await measureOverflow(page)).offenders.map((o) => o.id)
    expect(
      clipped,
      `un conteneur rognant trop large et son contenu doivent rester détectés — relevés : ${JSON.stringify(clipped)}`,
    ).toEqual(expect.arrayContaining([CLIP_ID, CHILD_ID]))

    await page.evaluate((id) => document.getElementById(id)?.remove(), CLIP_ID)

    /**
     * Revue S87 (C1) — un élément qui ÉCHAPPE au rognage de son ancêtre DOM doit rester
     * détecté. Conteneurs ÉTROITS (100 px) `overflow:hidden`, SANS `transform` :
     *  - 3. un `position:fixed` de 9999 px (bloc conteneur = viewport) — le wrapper est
     *       positionné, ce qui NE crée PAS de bloc conteneur pour un `fixed` ;
     *  - 4. un `position:absolute` de 9999 px sous un wrapper NON positionné (bloc
     *       conteneur = bloc initial, au-dessus du wrapper).
     * Tous deux débordent réellement à l'écran ; une borne par la chaîne DOM les masquait.
     * Contre-épreuve (5.) : le MÊME `fixed` sous un wrapper `transform` (qui devient son
     * bloc conteneur, donc le rogne) doit rester borné — sans elle, une implémentation
     * « ne jamais borner » passerait les sondes 3-4 (la frise, elle, couvre flux + absolute).
     */
    const FIXED_ID = 'overflow-self-check-fixed'
    const ABS_ID = 'overflow-self-check-absolute'
    const CONTAINED_ID = 'overflow-self-check-fixed-in-transform'
    const WRAPPER_IDS = [
      'overflow-self-check-wrap-fixed',
      'overflow-self-check-wrap-absolute',
      'overflow-self-check-wrap-transform',
    ]
    await page.evaluate(
      ({ fixed, abs, contained, wrappers }) => {
        const narrow = 'width:100px;height:4px;overflow:hidden;transition:none;min-width:0;'
        const wide = 'top:0;left:0;width:9999px;height:4px;transition:none;min-width:0;'
        const specs: Array<[string, string, string, string]> = [
          [
            wrappers[0],
            `position:absolute;top:0;left:0;${narrow}`,
            fixed,
            `position:fixed;${wide}`,
          ],
          [wrappers[1], narrow, abs, `position:absolute;${wide}`],
          [
            wrappers[2],
            `position:absolute;top:0;left:0;transform:translateZ(0);${narrow}`,
            contained,
            `position:fixed;${wide}`,
          ],
        ]
        for (const [wrapperId, wrapperCss, childId, childCss] of specs) {
          const wrapper = document.createElement('div')
          wrapper.id = wrapperId
          wrapper.style.cssText = wrapperCss
          const child = document.createElement('div')
          child.id = childId
          child.style.cssText = childCss
          wrapper.appendChild(child)
          document.body.appendChild(wrapper)
        }
      },
      { fixed: FIXED_ID, abs: ABS_ID, contained: CONTAINED_ID, wrappers: WRAPPER_IDS },
    )

    const escaped = (await measureOverflow(page)).offenders
    const escapedIds = escaped.map((o) => o.id)
    expect(
      escapedIds,
      `un \`fixed\` / \`absolute\` qui échappe au rognage de son ancêtre DOM doit être ` +
        `détecté — relevés : ${JSON.stringify(escaped)}`,
    ).toEqual(expect.arrayContaining([FIXED_ID, ABS_ID]))
    expect(
      escapedIds,
      'un `fixed` dont le bloc conteneur (`transform`) rogne doit rester borné',
    ).not.toContain(CONTAINED_ID)
    // Seules les deux sondes échappées sont relevées : la frise du hero (piste 1640 px,
    // barres `absolute`, dans un viewport rogné) et le contenu rogné restent NON relevés.
    expect(
      escaped.filter((o) => o.id !== FIXED_ID && o.id !== ABS_ID),
      'aucun autre élément (dont la frise du hero) ne doit être relevé',
    ).toEqual([])

    await page.evaluate(
      (ids) => ids.forEach((id) => document.getElementById(id)?.remove()),
      WRAPPER_IDS,
    )
  })
})
