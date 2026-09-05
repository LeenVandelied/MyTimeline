import { test, expect, type Page } from '@playwright/test'
import { waitForFonts } from './support/contrast'
import { devToolingSelectors } from './support/dev-tooling'

/**
 * #348 — HIÉRARCHIE TYPOGRAPHIQUE RENDUE DE LA LANDING, 8 PALIERS × 4 LOCALES.
 *
 * ⚠ DEUX DÉROGATIONS ONT ÉTÉ RETIRÉES de cette spec en soldant les AC #1 et #2 de #348.
 * Elles encodaient l'état du code plutôt que l'AC, et il faut savoir pourquoi avant de
 * les réintroduire « pour faire passer le test » :
 *   1. le `<footer>` était EXCLU du balayage « le h1 est le plus grand » (AC #2), parce
 *      que son wordmark rendait 45 px à toutes largeurs. Le wordmark suit désormais le
 *      header (`text-md sm:text-lg`) et le balayage couvre la page ENTIÈRE ;
 *   2. le chiffre d'étape était figé en `<=` sous `md` (AC #1) pour tolérer l'égalité
 *      27/27 avec le h2 — ce qui masquait qu'il DÉPASSAIT le h3 de sa propre étape.
 *      Il est en `<` STRICT contre le h3 ET le h2, à tous les paliers.
 * Un test qui encode le défaut au lieu de l'AC ne protège rien : il le rend permanent.
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

/**
 * ⚠ LE CAS GÉNÉRAL EST MONO-THÈME (clair). NE PAS « RÉTABLIR » UNE BOUCLE
 * `['light','dark']` AUTOUR DES 8 PALIERS — c'est une régression de coût pour
 * zéro signal, et elle a déjà été retirée une fois (review Sprint 59).
 *
 * POURQUOI. Toutes les grandeurs assertées ici sont des MÉTRIQUES DE POLICE et
 * de mise en page — `fontSize`, `lineHeight`, nombre de boîtes de ligne,
 * `scrollWidth`, largeurs de boîte. Le thème du DS Graphite ne pilote que des
 * COULEURS : aucune règle `.dark` ni `prefers-color-scheme` du dépôt ne touche
 * `font-*`, `text-*` ni `leading-*` (vérifié sur `src/styles/**`). Boucler sur
 * les deux thèmes doublait donc 8 tests en 16, soit ~64 `page.goto`
 * supplémentaires, sur un check e2e REQUIS pour merger, avec `workers: 1` et
 * `retries: 2`. La seule grandeur réellement sensible au thème — le contraste —
 * a sa propre spec, `landing-cta-contrast.spec.ts`.
 *
 * POURQUOI IL RESTE QUAND MÊME UN CONTRÔLE SOMBRE. Un retrait TOTAL rendrait
 * l'invariant invérifiable : le jour où une règle `.dark` toucherait une
 * métrique de police, plus rien ne le verrait. Le contrôle ponctuel en fin de
 * fichier (« invariance des métriques au thème ») tient ce filet pour UN palier
 * et UNE locale, en comparant les deux thèmes dans le MÊME test — 1 test au
 * lieu de 8, et il prouve l'invariant au lieu de le supposer.
 */
const CONTROL_SCHEME_WIDTH = 768
const CONTROL_SCHEME_LOCALE = 'de'

/**
 * Paliers. 320/375 = mobile étroit (c'est là que le `h1` à 35 px risque de se
 * multiplier en lignes en `de`) ; 768 = premier pixel `md`, où le `h1` passe à
 * 45 px ET où la colonne se réduit à `w-1/2` ; 1023/1024 = les deux côtés du seuil
 * `lg`, le palier le plus tendu du `h1` (57 px dans ~584 px utiles) ; 1280 = desktop
 * nominal. On mesure LES DEUX CÔTÉS de chaque seuil : #381 a montré qu'un défaut
 * attendu entre 768 et 1023 sortait en réalité à 1024 (le `container` Tailwind
 * plafonne la largeur utile et peut annuler le défaut attendu).
 *
 * 639/640 ajoutés en absorbant l'AC #2 : le wordmark du footer est le SEUL élément de
 * la landing dont la bascule est en `sm` (640) et non en `md`. Sans ces deux largeurs,
 * son palier ne serait vérifié que par accident, de part et d'autre du seuil `md`.
 */
const WIDTHS = [320, 375, 639, 640, 768, 1023, 1024, 1280] as const

/** Échelle DS complète (`ds/tokens/typography.css`). Rien ne doit rendre hors d'elle. */
const DS_SCALE = [13, 15, 17, 21, 27, 35, 45, 57]

/**
 * Cibles d'échelle par palier — c'est le verdict `ui-design` du Sprint 59
 * (`docs/memory/sprints/sprint-59/ui-design-arbitrage.md`), figé ici en chiffres
 * RENDUS et non en classes.
 */
function expected(width: number) {
  if (width < 640) {
    return { h1: 35, subtitle: 21, h2: 27, h3: 21, stepNumber: 17, footerWordmark: 21 }
  }
  if (width < 768) {
    return { h1: 35, subtitle: 21, h2: 27, h3: 21, stepNumber: 17, footerWordmark: 27 }
  }
  if (width < 1024) {
    return { h1: 45, subtitle: 27, h2: 35, h3: 27, stepNumber: 21, footerWordmark: 27 }
  }
  return { h1: 57, subtitle: 27, h2: 35, h3: 27, stepNumber: 21, footerWordmark: 27 }
}

/**
 * Outillage de DÉVELOPPEMENT à exclure de tout balayage DOM. La liste est la SOURCE
 * UNIQUE `support/dev-tooling.ts`, partagée avec `landing-mobile-overflow.spec.ts` :
 * elle était dupliquée entre les deux specs sous un commentaire affirmant « même
 * liste » — faux, `#__next-build-watcher` ne figurait que d'un côté (review S59).
 */
const DEV_TOOLING = devToolingSelectors()

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
  /**
   * Plus grande taille rendue de TOUTE la page, `<footer>` COMPRIS — hors seul
   * outillage de dev. C'est l'assertion de l'AC #2 ; le footer n'en est plus exclu.
   */
  pageMaxFontPx: number
  pageMaxFontTag: string
  /** Plus grande taille rendue DANS le `<footer>`, relevée à part pour le diagnostic. */
  footerMaxFontPx: number
  footerMaxFontTag: string
  /** Wordmark « Ma Timeline » du footer et sa description — cf. AC #2. */
  footerWordmark: number
  footerDescription: number
  footerWordmarkLines: number
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
    const h1Lines = Array.from(range.getClientRects()).filter(
      (r) => r.width > 0 && r.height > 0,
    ).length

    // Le wordmark du footer : ancré STRUCTURELLEMENT comme le sous-titre du hero
    // (frère précédent de la description), jamais sur le libellé « Ma Timeline ».
    const footer = document.querySelector('footer')
    if (!footer) throw new Error('footer introuvable')
    const footerDescription = footer.querySelector('p')
    if (!footerDescription) throw new Error('description du footer introuvable')
    const footerWordmark = footerDescription.previousElementSibling
    if (!footerWordmark) throw new Error('wordmark du footer introuvable')

    const wordmarkRange = document.createRange()
    wordmarkRange.selectNodeContents(footerWordmark)
    const footerWordmarkLines = Array.from(wordmarkRange.getClientRects()).filter(
      (r) => r.width > 0 && r.height > 0,
    ).length

    /**
     * Balayage page ENTIÈRE : le h1 doit rester le plus GROS texte rendu (AC #2).
     *
     * ⚠ Le `<footer>` n'est PLUS exclu. L'exclusion précédente était le contournement
     * d'un vrai défaut (`FooterSection` rendait son wordmark en `text-2xl` = 45 px à
     * toutes largeurs, battant le h1 sous 768 px et l'égalant jusqu'à 1023 px). Le
     * wordmark est désormais aligné sur celui du header (`text-md sm:text-lg`), donc
     * l'AC #2 est vérifiable sans dérogation — et le rester est précisément ce que ce
     * balayage verrouille. Ne PAS réintroduire d'exclusion de zone ici : seule
     * l'exclusion de l'outillage de DÉVELOPPEMENT (absent en production) est légitime.
     */
    let pageMaxFontPx = 0
    let pageMaxFontTag = ''
    let footerMaxFontPx = 0
    let footerMaxFontTag = ''
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
      const tag = `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 40)}`
      if (el.closest('footer') && size > footerMaxFontPx) {
        footerMaxFontPx = size
        footerMaxFontTag = tag
      }
      if (size > pageMaxFontPx) {
        pageMaxFontPx = size
        pageMaxFontTag = tag
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
      footerMaxFontTag,
      footerWordmark: px(footerWordmark),
      footerDescription: px(footerDescription),
      footerWordmarkLines,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
    }
  }, devTooling)
}

test.describe('Landing — hiérarchie typographique', () => {
  // Thème CLAIR uniquement — cf. le bloc `CONTROL_SCHEME_*` en tête de fichier :
  // les métriques assertées ici sont invariantes au thème, et cet invariant est
  // lui-même vérifié par le contrôle ponctuel en fin de fichier.
  test.use({ colorScheme: 'light' })

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
            `chiffre ${m.stepNumber}px×${m.stepNumberRatio}, wordmark footer ` +
            `${m.footerWordmark}px/${m.footerWordmarkLines}l (desc ${m.footerDescription}px), ` +
            `max page ${m.pageMaxFontPx}px (${m.pageMaxFontTag}), ` +
            `max footer ${m.footerMaxFontPx}px (${m.footerMaxFontTag})`,
        )

        // `expect.soft` : on veut le tableau COMPLET des locales fautives. Corriger
        // `fr` sans regarder `de`/`es` a déjà produit un faux « corrigé » au S49.
        const check = (label: string, got: number, wanted: number, token: string, extra = '') =>
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
          width < 768 ? 'text-sm' : 'md:text-md',
          ' À `text-lg` il vaudrait 27px partout : ÉGAL au h2 sous md, et au-dessus ' +
            'du h3 de sa propre étape (21px).',
        )

        // INTERLIGNES — la moitié invisible du correctif (cf. EXPECTED_RATIO).
        for (const [label, got, wanted, token] of [
          ['h1 du hero', m.h1Ratio, EXPECTED_RATIO.h1, 'base.css:53, hors layer'],
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
        expect.soft(m.h1Count, `un seul h1 attendu sur la landing, trouvé ${m.h1Count}`).toBe(1)

        /**
         * AC #2 — LE h1 EST LE PLUS GRAND TEXTE DE LA PAGE, `<footer>` COMPRIS.
         *
         * L'exclusion du `<footer>` qui vivait ici est SUPPRIMÉE. Elle contournait un
         * défaut réel et mesuré : `FooterSection` rendait « Ma Timeline » en
         * `text-2xl` = 45 px à TOUTES largeurs (aucun palier), battant donc le h1 à
         * 320/375 px (35) et l'ÉGALANT de 768 à 1023 px (45). Le wordmark est passé à
         * `text-md sm:text-lg` (21 / 27), aligné sur celui du header : le balayage
         * couvre désormais la page entière et l'AC est verrouillée pour de bon.
         */
        expect
          .soft(
            m.pageMaxFontPx,
            `le h1 (${m.h1}px) doit rester le plus grand texte rendu de la page ENTIÈRE ` +
              `(footer compris) à ${width} px en ${locale} — mesuré ${m.pageMaxFontPx}px ` +
              `sur \`${m.pageMaxFontTag}\`. Si le coupable est dans le \`<footer>\`, ` +
              `c'est le wordmark : il doit suivre le header (\`text-md sm:text-lg\`), ` +
              `pas repasser à \`text-2xl\` (45px).`,
          )
          .toBe(m.h1)

        // Le wordmark du footer suit l'échelle du header — c'est le MÊME wordmark.
        check(
          'wordmark du footer',
          m.footerWordmark,
          want.footerWordmark,
          width < 640 ? 'text-md' : 'sm:text-lg',
          ' À `text-2xl` il vaudrait 45px et battrait le h1 sous 768px.',
        )
        // L'inversion doit DISPARAÎTRE, pas se déplacer : le wordmark reste au-dessus
        // de la description qu'il coiffe (15px, héritée du `body`).
        expect
          .soft(
            m.footerWordmark,
            `le wordmark du footer (${m.footerWordmark}px) doit rester AU-DESSUS de sa ` +
              `description (${m.footerDescription}px) à ${width} px en ${locale} — ` +
              `sinon l'inversion de hiérarchie est déplacée, pas supprimée`,
          )
          .toBeGreaterThan(m.footerDescription)
        // `whitespace-nowrap` volontairement ABSENT au footer (contrairement au
        // header) : ce test est ce qui justifie son absence, plutôt qu'un réflexe.
        expect
          .soft(
            m.footerWordmarkLines,
            `le wordmark du footer doit tenir sur UNE ligne à ${width} px en ${locale} ` +
              `sans \`whitespace-nowrap\` — mesuré ${m.footerWordmarkLines} ligne(s). ` +
              `S'il en prend deux, c'est \`whitespace-nowrap\` qu'il faut ajouter, ` +
              `pas ce test qu'il faut assouplir.`,
          )
          .toBe(1)

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
         * AC #1 — LE CHIFFRE D'ÉTAPE, STRICTEMENT, À TOUS LES PALIERS.
         *
         * La tolérance `<=` qui vivait ici est SUPPRIMÉE : elle figeait l'égalité
         * chiffre/h2 sous `md` (27 = 27) que produisait `text-lg`, et laissait passer
         * le vrai défaut — le chiffre DÉPASSAIT alors le h3 de sa propre étape
         * (27 > 21). Le chiffre est décoratif et se rattache au h3 de SON étape :
         * c'est contre lui que l'AC « strictement plus petit » se mesure d'abord.
         * `text-sm md:text-md` (17 / 21) le place sous les deux, partout.
         */
        expect
          .soft(
            m.stepNumber,
            `chiffre d’étape (${m.stepNumber}px) vs h3 de son étape (${m.h3}px) à ` +
              `${width} px en ${locale} — l'AC #1 exige STRICTEMENT plus petit que le ` +
              `titre auquel il se rattache. Égalité = échec : ` +
              `\`text-md md:text-lg\` rendrait 21/27, soit exactement le h3.`,
          )
          .toBeLessThan(m.h3)
        expect
          .soft(
            m.stepNumber,
            `chiffre d’étape (${m.stepNumber}px) vs h2 de section (${m.h2}px) à ${width} px ` +
              `en ${locale} — STRICTEMENT plus petit exigé à TOUS les paliers, y compris ` +
              `sous md (c'est là que \`text-lg\` produisait l'égalité 27/27).`,
          )
          .toBeLessThan(m.h2)

        // Toute taille rendue reste DANS l'échelle DS — le vrai garde-fou anti-`4xl`.
        for (const [label, value] of Object.entries({
          h1: m.h1,
          subtitle: m.subtitle,
          h2: m.h2,
          h3: m.h3,
          stepNumber: m.stepNumber,
          footerWordmark: m.footerWordmark,
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
        type: `typo-${width}px`,
        description: relevé.join(' | '),
      })
    })
  }
})

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

/**
 * CONTRÔLE PONCTUEL DU THÈME SOMBRE — le filet qui remplace la boucle `SCHEMES`.
 *
 * CE QU'IL REMPLACE. Les 8 paliers × 4 locales tournaient auparavant DEUX fois,
 * une fois par thème, pour un total de ~64 `page.goto` supplémentaires sur un
 * check e2e requis. Les 8 tests dupliqués n'apportaient aucun signal propre :
 * ils ré-assertaient les MÊMES constantes contre les MÊMES métriques.
 *
 * CE QU'IL AJOUTE, ET QUE LE RETRAIT TOTAL AURAIT PERDU. Le cas général est
 * mono-thème parce qu'on AFFIRME que les métriques de police sont invariantes au
 * thème. Ce test est ce qui rend cette affirmation VÉRIFIÉE plutôt que supposée :
 * il mesure le même palier dans les deux thèmes et exige l'égalité stricte de
 * TOUTES les métriques. Le jour où une règle `.dark` toucherait `font-*`,
 * `text-*` ou `leading-*`, c'est ici que ça rougira.
 *
 * ⚠ IL DOIT PROUVER QUE LA BASCULE A EU LIEU. `next-themes` est monté en
 * `attribute="class" defaultTheme="system" enableSystem` (`app/layout.tsx:53`) :
 * c'est `prefers-color-scheme` qui pilote la classe `.dark` sur `<html>`, via un
 * écouteur `matchMedia` posé au montage. Sans l'assertion sur cette classe, un
 * `emulateMedia` sans effet rendrait le test VACUOUS — il comparerait le thème
 * clair à lui-même et serait vert quoi qu'il arrive.
 */
test.describe('Landing — invariance des métriques typographiques au thème', () => {
  const isDark = (page: Page) =>
    page.evaluate(() => document.documentElement.classList.contains('dark'))

  test(`métriques identiques en clair et en sombre (${CONTROL_SCHEME_WIDTH} px, \`${CONTROL_SCHEME_LOCALE}\`)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: CONTROL_SCHEME_WIDTH, height: 900 })

    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`/${CONTROL_SCHEME_LOCALE}`, { waitUntil: 'domcontentloaded' })
    await waitForFonts(page)
    await page.mouse.move(0, 0)
    await expect
      .poll(() => isDark(page), {
        message: '`<html>` ne doit PAS porter `.dark` sous `prefers-color-scheme: light`',
      })
      .toBe(false)
    const light = await readTypography(page, DEV_TOOLING)

    await page.emulateMedia({ colorScheme: 'dark' })
    // La bascule passe par un écouteur `matchMedia` de next-themes : on ATTEND
    // qu'elle ait effectivement eu lieu avant de remesurer, sinon le test
    // comparerait le thème clair à lui-même.
    await expect
      .poll(() => isDark(page), {
        message:
          '`<html>` doit porter `.dark` après `emulateMedia({colorScheme:"dark"})` — ' +
          'sans cette bascule, ce contrôle serait vacuous',
      })
      .toBe(true)
    await waitForFonts(page)
    await page.mouse.move(0, 0)
    const dark = await readTypography(page, DEV_TOOLING)

    expect(
      dark,
      `les métriques typographiques doivent être STRICTEMENT identiques dans les deux ` +
        `thèmes à ${CONTROL_SCHEME_WIDTH} px en \`${CONTROL_SCHEME_LOCALE}\`. Si ce test ` +
        `rougit, une règle \`.dark\` ou \`prefers-color-scheme\` touche désormais ` +
        `\`font-*\` / \`text-*\` / \`leading-*\` : le cas général ci-dessus, mono-thème, ` +
        `ne le verrait pas — il faut alors étendre la couverture, pas assouplir ce test.\n` +
        `clair : ${JSON.stringify(light)}\nsombre : ${JSON.stringify(dark)}`,
    ).toEqual(light)

    // Et l'on revérifie que le thème sombre respecte bien les cibles d'échelle,
    // pour que ce test reste utile même si `light` dérivait en même temps.
    const want = expected(CONTROL_SCHEME_WIDTH)
    expect.soft(dark.h1, 'h1 en thème sombre').toBe(want.h1)
    expect.soft(dark.h2, 'h2 en thème sombre').toBe(want.h2)
    expect.soft(dark.h3, 'h3 en thème sombre').toBe(want.h3)
    expect.soft(dark.stepNumber, 'chiffre d’étape en thème sombre').toBe(want.stepNumber)
    expect.soft(dark.footerWordmark, 'wordmark du footer en thème sombre').toBe(want.footerWordmark)
  })
})
