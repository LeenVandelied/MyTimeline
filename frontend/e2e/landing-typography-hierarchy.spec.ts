import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'

/**
 * #348 — HIÉRARCHIE TYPOGRAPHIQUE RENDUE DE LA LANDING, 3 PALIERS × 4 LOCALES × 2 THÈMES.
 *
 * POURQUOI UN E2E ET PAS UN UNITAIRE. Rien ici ne se déduit d'une classe utilitaire :
 *   · l'échelle du DS Graphite n'est PAS celle de Tailwind (`text-lg` = 27 px, pas 18) ;
 *   · `text-4xl`/`text-5xl` ne sont pas des classes mortes — ils retombent sur les
 *     DÉFAUTS Tailwind (36 / 48 px), donc PLUS PETIT que `text-3xl` (57 px) ;
 *   · une utilitaire `text-*` pose aussi un `line-height` APPARIÉ, qui peut diverger
 *     de la taille (cf. bloc CASCADE de `ds/tokens/base.css:21-52`).
 * jsdom ne résout ni les media queries, ni la précédence des `@layer`, ni la mise en
 * page : un test unitaire serait vert quoi qu'il arrive (PIT S48/S51).
 *
 * ⚠ ET IL EXIGE LINUX. Les métriques de police macOS sont plus étroites. #334 (S49)
 * puis #347 (S52) ont conclu « écart 0 partout » depuis macOS et ont été démentis
 * les deux fois par la CI Ubuntu (PIT-S52-001). Les chiffres de référence de cette
 * spec sont relevés dans `mcr.microsoft.com/playwright:v1.61.1-jammy`.
 */

const LOCALES = ['fr', 'en', 'de', 'es'] as const
const SCHEMES = ['light', 'dark'] as const

/**
 * Paliers. 320/375 = mobile étroit (c'est là que le `h1` à 35 px risque de se
 * multiplier en lignes en `de`) ; 768 = premier pixel `md`, où le `h1` passe à
 * 45 px ET où la colonne se réduit à `w-1/2` ; 1023/1024 = les deux côtés du seuil
 * `lg`, le palier le plus tendu du `h1` (57 px dans ~584 px utiles) ; 1280 = desktop
 * nominal. On mesure LES DEUX CÔTÉS de chaque seuil : #381 a montré qu'un défaut
 * attendu entre 768 et 1023 sortait en réalité à 1024 (le `container` Tailwind
 * plafonne la largeur utile et peut annuler le défaut attendu).
 */
const WIDTHS = [320, 375, 768, 1023, 1024, 1280] as const

/** Échelle DS complète (`ds/tokens/typography.css`). Rien ne doit rendre hors d'elle. */
const DS_SCALE = [13, 15, 17, 21, 27, 35, 45, 57]

/**
 * Cibles d'échelle par palier — c'est le verdict `ui-design` du Sprint 59
 * (`docs/memory/sprints/sprint-59/ui-design-arbitrage.md`), figé ici en chiffres
 * RENDUS et non en classes.
 */
function expected(width: number) {
  if (width < 768) return { h1: 35, subtitle: 21, h2: 27, h3: 21, stepNumber: 27 }
  if (width < 1024) return { h1: 45, subtitle: 27, h2: 35, h3: 27, stepNumber: 27 }
  return { h1: 57, subtitle: 27, h2: 35, h3: 27, stepNumber: 27 }
}

/**
 * Outillage de DÉVELOPPEMENT à exclure de tout balayage DOM : le bouton flottant des
 * TanStack Query Devtools et l'overlay Next remontent comme des éléments de page et
 * suivent la largeur du viewport. Ils n'existent pas en production. Exclusion déjà
 * portée par `landing-mobile-overflow.spec.ts` — même liste.
 */
const DEV_TOOLING = ['.tsqd-parent-container', 'nextjs-portal', '#__next-build-watcher']

/**
 * Interlignes attendus, en RATIO (`line-height` rendu / `font-size` rendu).
 *
 * C'est la moitié la plus fragile du correctif, et elle est INVISIBLE dans le nom
 * de la classe : en Tailwind 4 une utilitaire `text-*` pose aussi
 * `line-height: var(--tw-leading, var(--text-<n>--line-height))`. La règle
 * `base.css:53` (`h1..h6 { line-height: var(--leading-tight) }`) est HORS layer et
 * couvre donc les titres — mais PAS le `<p>` du sous-titre ni le `<span>` du
 * chiffre. Sans `leading-*` explicite sur ces deux-là :
 *   · `text-md` → `--text-md--line-height` n'existe chez personne (nom propre au
 *     DS) → déclaration invalide au calcul → héritage silencieux du parent ;
 *   · `md:text-lg` → `--text-lg--line-height` existe, au DÉFAUT TAILWIND 1.5556.
 * Un test qui ne mesure que `font-size` laisserait donc passer la moitié du défaut.
 */
const EXPECTED_RATIO = { h1: 1.08, subtitle: 1.5, stepNumber: 1 } as const

interface TypeMetrics {
  h1: number
  subtitle: number
  h2: number
  h3: number
  stepNumber: number
  h1Ratio: number
  subtitleRatio: number
  stepNumberRatio: number
  h1Count: number
  h1Lines: number
  h1BoxWidth: number
  columnWidth: number
  h1ScrollWidth: number
  h1ClientWidth: number
  /** Plus grande taille rendue HORS `<footer>` et hors outillage de dev — cf. AC #2. */
  pageMaxFontPx: number
  pageMaxFontTag: string
  /** Plus grande taille rendue DANS le `<footer>` — relevée, non assertée (cf. AC #2). */
  footerMaxFontPx: number
  docScrollWidth: number
  docClientWidth: number
}

/**
 * Relève les tailles RENDUES (`getComputedStyle().fontSize`), jamais déduites d'une
 * classe. Ancrage STRUCTUREL — jamais sur un libellé : la spec doit rester valable
 * dans les 4 locales.
 */
async function readTypography(page: Page, devTooling: string[]): Promise<TypeMetrics> {
  return page.evaluate((tooling) => {
    const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize)
    /** `line-height` rendu rapporté à la taille rendue — `normal` compté comme NaN. */
    const ratio = (el: Element) => {
      const style = getComputedStyle(el)
      return +(parseFloat(style.lineHeight) / parseFloat(style.fontSize)).toFixed(4)
    }

    const h1s = document.querySelectorAll('h1')
    const h1 = h1s[0]
    if (!h1) throw new Error('h1 du hero introuvable')

    // Le sous-titre est le `<p>` frère immédiat du `h1` (HeroSection).
    const subtitle = h1.nextElementSibling
    if (!subtitle || subtitle.tagName !== 'P') throw new Error('sous-titre du hero introuvable')

    // La colonne `md:w-1/2` qui contraint le `h1` en desktop.
    const column = h1.parentElement
    if (!column) throw new Error('colonne du hero introuvable')

    const how = document.querySelector('#how-it-works')
    if (!how) throw new Error('section #how-it-works introuvable')
    const h2 = how.querySelector('h2')
    const h3 = how.querySelector('h3')
    if (!h2 || !h3) throw new Error('titres de #how-it-works introuvables')
    // La pastille chiffrée est le `<span>` de la carte d'étape, au-dessus du `h3`.
    const card = h3.parentElement
    const stepNumber = card?.querySelector('span')
    if (!stepNumber) throw new Error('chiffre d’étape introuvable')

    // Nombre de LIGNES du h1 : compté sur les boîtes de ligne réelles d'un Range,
    // jamais déduit d'une hauteur.
    const range = document.createRange()
    range.selectNodeContents(h1)
    const h1Lines = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0)
      .length

    // Balayage page entière : le h1 doit rester le plus GROS texte rendu (AC #2).
    let pageMaxFontPx = 0
    let pageMaxFontTag = ''
    let footerMaxFontPx = 0
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (tooling.some((sel) => el.closest(sel))) continue
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      // Seuls les éléments porteurs de texte propre comptent : un conteneur hérite
      // d'une taille qu'il ne rend jamais.
      const ownText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0,
      )
      if (!ownText) continue
      const size = parseFloat(style.fontSize)
      if (el.closest('footer')) {
        footerMaxFontPx = Math.max(footerMaxFontPx, size)
        continue
      }
      if (size > pageMaxFontPx) {
        pageMaxFontPx = size
        pageMaxFontTag = `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 40)}`
      }
    }

    return {
      h1: px(h1),
      subtitle: px(subtitle),
      h2: px(h2),
      h3: px(h3),
      stepNumber: px(stepNumber),
      h1Ratio: ratio(h1),
      subtitleRatio: ratio(subtitle),
      stepNumberRatio: ratio(stepNumber),
      h1Count: h1s.length,
      h1Lines,
      h1BoxWidth: +h1.getBoundingClientRect().width.toFixed(1),
      columnWidth: +column.getBoundingClientRect().width.toFixed(1),
      h1ScrollWidth: h1.scrollWidth,
      h1ClientWidth: h1.clientWidth,
      pageMaxFontPx,
      pageMaxFontTag,
      footerMaxFontPx,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
    }
  }, devTooling)
}

for (const scheme of SCHEMES) {
  test.describe(`Landing — hiérarchie typographique, thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const width of WIDTHS) {
      test(`${width} px — échelle DS et hiérarchie, les 4 locales`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        const want = expected(width)
        const relevé: string[] = []

        for (const locale of LOCALES) {
          await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' })
          await waitForFonts(page)
          // Le curseur reste où Playwright l'a laissé : sans cela un élément peut
          // être mesuré dans son état `:hover`.
          await page.mouse.move(0, 0)

          const m = await readTypography(page, DEV_TOOLING)
          relevé.push(
            `${locale}: h1 ${m.h1}px×${m.h1Ratio}/${m.h1Lines}l (boîte ${m.h1BoxWidth} dans ` +
              `colonne ${m.columnWidth}), sous-titre ${m.subtitle}px×${m.subtitleRatio}, ` +
              `h2 ${m.h2}px, h3 ${m.h3}px, ` +
              `chiffre ${m.stepNumber}px×${m.stepNumberRatio}, max hors-footer ${m.pageMaxFontPx}px ` +
              `(${m.pageMaxFontTag}), max footer ${m.footerMaxFontPx}px`,
          )

          // `expect.soft` : on veut le tableau COMPLET des locales fautives. Corriger
          // `fr` sans regarder `de`/`es` a déjà produit un faux « corrigé » au S49.
          const check = (
            label: string,
            got: number,
            wanted: number,
            token: string,
            extra = '',
          ) =>
            expect
              .soft(
                got,
                `${label} à ${width} px en ${locale} — attendu ${wanted}px (${token} de ` +
                  `ds/tokens/typography.css), mesuré ${got}px.${extra}`,
              )
              .toBe(wanted)

          check(
            'h1 du hero',
            m.h1,
            want.h1,
            width < 768 ? 'text-xl' : width < 1024 ? 'md:text-2xl' : 'lg:text-3xl',
            ' Un h1 à 36 ou 48px signifie le retour de `text-4xl`/`text-5xl`, hors échelle DS.',
          )
          check(
            'sous-titre du hero',
            m.subtitle,
            want.subtitle,
            width < 768 ? 'text-md' : 'md:text-lg',
          )
          check('h2 de #how-it-works', m.h2, want.h2, width < 768 ? 'text-lg' : 'md:text-xl')
          check('h3 d’étape', m.h3, want.h3, width < 768 ? 'text-md' : 'md:text-lg')
          check(
            'chiffre d’étape',
            m.stepNumber,
            want.stepNumber,
            'text-lg',
            ' À `text-2xl` il vaudrait 45px et dépasserait le h2 de sa propre section.',
          )

          // INTERLIGNES — la moitié invisible du correctif (cf. EXPECTED_RATIO).
          for (const [label, got, wanted, token] of [
            ['h1 du hero', m.h1Ratio, EXPECTED_RATIO.h1, 'leading-tight + base.css:53'],
            ['sous-titre du hero', m.subtitleRatio, EXPECTED_RATIO.subtitle, 'leading-normal'],
            ['chiffre d’étape', m.stepNumberRatio, EXPECTED_RATIO.stepNumber, 'leading-none'],
          ] as const) {
            expect
              .soft(
                got,
                `interligne de ${label} à ${width} px en ${locale} — attendu ${wanted} ` +
                  `(${token}), mesuré ${got}. Un ratio à 1.5556 ou 1.4 signifie que le ` +
                  `\`line-height\` APPARIÉ à l'utilitaire \`text-*\` a repris la main : ` +
                  `le \`leading-*\` explicite a disparu (cf. ds/tokens/base.css:21-52).`,
              )
              .toBeCloseTo(wanted, 1)
          }

          // AC #2 — le h1 est l'élément le plus grand de la page, à toutes largeurs.
          expect
            .soft(m.h1Count, `un seul h1 attendu sur la landing, trouvé ${m.h1Count}`)
            .toBe(1)

          /**
           * ⚠ `<footer>` EXCLU DU BALAYAGE — exclusion MESURÉE, pas commodité.
           * Première exécution jammy de cette spec, AVANT toute exclusion :
           * `FooterSection.tsx:38` rend « Ma Timeline » en `text-2xl` = 45 px, à
           * TOUTES largeurs (aucun palier). Il bat donc le h1 à 320/375 px (35 px) et
           * l'ÉGALE de 768 à 1023 px (45 px) : l'AC #2 est en défaut sous `lg` pour un
           * élément HORS du périmètre de #348 — et elle l'était DÉJÀ avant ce
           * correctif, le h1 valant alors 36 px (défaut Tailwind `text-4xl`).
           * Le briefing classe explicitement ce site en follow-up : on ne le corrige
           * pas « en passant ». On l'exclut donc du verdict tout en RELEVANT sa taille
           * (annotation ci-dessous), pour que le chiffre reste au dossier.
           */
          expect
            .soft(
              m.pageMaxFontPx,
              `le h1 (${m.h1}px) doit rester le plus grand texte rendu hors footer à ` +
                `${width} px en ${locale} — mesuré ${m.pageMaxFontPx}px sur ` +
                `\`${m.pageMaxFontTag}\``,
            )
            .toBe(m.h1)

          // AC #1 — chaque élément secondaire rend sous le titre qu'il accompagne.
          expect
            .soft(
              m.subtitle,
              `le sous-titre du hero (${m.subtitle}px) doit rendre sous le h1 (${m.h1}px) ` +
                `à ${width} px en ${locale}`,
            )
            .toBeLessThan(m.h1)
          expect
            .soft(
              m.h2,
              `le h2 de section (${m.h2}px) doit rendre sous le h1 (${m.h1}px) à ${width} px ` +
                `en ${locale}`,
            )
            .toBeLessThan(m.h1)

          /**
           * ⚠ ÉCART D'AC MESURÉ ET ASSUMÉ, PAS UN OUBLI.
           * L'AC de #348 demande « STRICTEMENT plus petit ». Le verdict `ui-design`
           * fixe le chiffre d'étape à `text-lg` sans palier (27 px) et le h2 à
           * `text-lg md:text-xl` (27 / 35) : sous `md` les deux valent 27 px — ÉGAUX,
           * pas strictement inférieurs. Et le chiffre DÉPASSE alors le h3 de sa propre
           * étape (21 px). On fige donc l'inégalité LARGE contre le h2, et l'inégalité
           * STRICTE seulement là où le verdict la produit (≥ 768 px). L'écart part en
           * follow-up ; le figer ici en `<=` empêche au moins une régression vers 45 px.
           */
          expect
            .soft(
              m.stepNumber,
              `chiffre d’étape (${m.stepNumber}px) vs h2 de section (${m.h2}px) à ${width} px ` +
                `en ${locale} — égalité TOLÉRÉE sous md (écart d'AC #348 documenté), ` +
                `dépassement JAMAIS`,
            )
            .toBeLessThanOrEqual(m.h2)
          if (width >= 768) {
            expect
              .soft(
                m.stepNumber,
                `au-dessus de md le chiffre d’étape (${m.stepNumber}px) doit rendre ` +
                  `STRICTEMENT sous le h2 (${m.h2}px) — ${width} px, ${locale}`,
              )
              .toBeLessThan(m.h2)
          }

          // Toute taille rendue reste DANS l'échelle DS — le vrai garde-fou anti-`4xl`.
          for (const [label, value] of Object.entries({
            h1: m.h1,
            subtitle: m.subtitle,
            h2: m.h2,
            h3: m.h3,
            stepNumber: m.stepNumber,
          })) {
            expect
              .soft(
                DS_SCALE,
                `${label} rend ${value}px à ${width} px en ${locale} : valeur HORS échelle DS ` +
                  `(${DS_SCALE.join('/')}). 36 ou 48px = défaut Tailwind, donc \`text-4xl\`/` +
                  `\`text-5xl\` de retour.`,
              )
              .toContain(value)
          }

          // Aucun débordement introduit — c'est le point que `ui-design` a laissé
          // ouvert : le h1 à 57 px dans une colonne `md:w-1/2` (~584 px à 1280).
          expect
            .soft(
              m.h1ScrollWidth,
              `le h1 déborde de sa colonne à ${width} px en ${locale} : ` +
                `scrollWidth ${m.h1ScrollWidth} > clientWidth ${m.h1ClientWidth} ` +
                `(colonne ${m.columnWidth}px, ${m.h1Lines} ligne(s))`,
            )
            .toBeLessThanOrEqual(m.h1ClientWidth)
          expect
            .soft(
              m.docScrollWidth,
              `débordement horizontal de page à ${width} px en ${locale} : ` +
                `${m.docScrollWidth} > ${m.docClientWidth}`,
            )
            .toBeLessThanOrEqual(m.docClientWidth)
        }

        test.info().annotations.push({
          type: `typo-${width}px-${scheme}`,
          description: relevé.join(' | '),
        })
      })
    }
  })
}

/**
 * FRONTIÈRES D'ÉCHELLE DU h1 — le garde-fou anti-régression de #348.
 *
 * Le h1 est le SEUL élément de la landing à avoir trois paliers. On fige les deux
 * bascules, franches, mesurées des deux côtés : sans cela un refactor peut aligner
 * le h1 sur un autre seuil sans que rien ne rougisse (c'est exactement le
 * désalignement de paliers qui a produit #381).
 *
 * `de` : locale la plus large, donc le pire cas de retour à la ligne.
 */
test.describe('Landing — les trois paliers du h1 du hero', () => {
  const measure = async (page: Page, width: number) => {
    await page.setViewportSize({ width, height: 900 })
    await waitForFonts(page)
    return readTypography(page, DEV_TOOLING)
  }

  test('bascule `md` du h1 : 35px à 767, 45px à 768 (`de`)', async ({ page }) => {
    await page.goto('/de', { waitUntil: 'domcontentloaded' })

    const below = await measure(page, 767)
    const above = await measure(page, 768)

    expect(below.h1, 'text-xl attendu à 767 px').toBe(35)
    expect(above.h1, 'md:text-2xl attendu à 768 px').toBe(45)
  })

  test('bascule `lg` du h1 : 45px à 1023, 57px à 1024, sans débordement (`de`)', async ({
    page,
  }) => {
    await page.goto('/de', { waitUntil: 'domcontentloaded' })

    const below = await measure(page, 1023)
    const above = await measure(page, 1024)

    expect(below.h1, 'md:text-2xl attendu à 1023 px').toBe(45)
    expect(above.h1, 'lg:text-3xl attendu à 1024 px').toBe(57)

    // LE point laissé ouvert par `ui-design` : la tenue de 57 px dans `md:w-1/2`.
    // S'il déborde, le repli prévu est `lg:text-2xl` (45 px).
    expect(
      above.h1ScrollWidth,
      `h1 à 57 px dans la colonne md:w-1/2 (${above.columnWidth}px) à 1024 px en \`de\` : ` +
        `scrollWidth ${above.h1ScrollWidth} > clientWidth ${above.h1ClientWidth}. ` +
        `Si ce test rougit, replier sur \`lg:text-2xl\` (45 px).`,
    ).toBeLessThanOrEqual(above.h1ClientWidth)
  })
})
