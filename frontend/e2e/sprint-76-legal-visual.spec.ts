import { test, expect, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import {
  describeRendering,
  readAtRest,
  readStable,
  waitForFonts,
  type TextRendering,
} from './support/contrast'
import { contrastRatio, measurePaintedGlyph } from './support/pixel'
import { devToolingSelectors } from './support/dev-tooling'

/**
 * #527 — VÉRIFICATION VISUELLE MESURÉE des éléments ajoutés aux pages légales
 * par #60 (Sprint 75) : le sommaire en chiffres romains et le bloc disclaimer.
 *
 * POURQUOI CE FICHIER EXISTE. `sprint-75-legal-pages.spec.ts` couvre le
 * FONCTIONNEL (libellés localisés, saut d'ancre, nombre d'entrées) et rien
 * d'autre. La conformité visuelle des deux surfaces ajoutées n'a jamais été
 * mesurée : elle était DÉDUITE du fait qu'elles réutilisent `text-ink-muted`
 * sur `bg-surface`, jetons validés ailleurs. Ce raisonnement a déjà été réfuté
 * deux fois sur ce dépôt — S48 (deux CTA à 1,00:1 livrés après une CI verte) et
 * [[BUG-S70-001]] (mini-frise d'aperçu à 2,49:1 en sombre, conformité elle
 * aussi « déduite des jetons »). Un jeton conforme AILLEURS ne prouve rien ICI :
 * le fond effectif dépend de la pile d'ancêtres réellement peinte, pas de la
 * classe posée sur l'élément ([[PIT-S58-001]]).
 *
 * CE QUE CE FICHIER MESURE, ET COMMENT.
 *  1. Contraste WCAG 1.4.3 (4,5:1 texte normal) des chiffres romains, des liens
 *     du sommaire et du texte du disclaimer, sur `/privacy` ET `/terms`, en
 *     thème CLAIR et SOMBRE. Instrument : `support/contrast.ts` — luminance
 *     WCAG 2.x, fond COMPOSITÉ depuis la pile d'ancêtres réelle, levée
 *     explicite sur toute couleur non analysable ou tout dégradé traversé.
 *  2. TÉMOIN DE PEINTURE au pixel (`support/pixel.ts`) sur chaque chiffre
 *     romain : le fond modal réellement peint sous le glyphe est comparé au
 *     fond composité par (1). C'est le contrôle qui manquait à S58 — un fond
 *     déduit du DOM et un fond peint peuvent diverger sans que rien ne le dise.
 *  3. Débordement du sommaire en `de` à 375 px, sur les deux pages : balayage
 *     de page repris de `sprint-63-de-overflow-audit.spec.ts`, plus un contrôle
 *     de confinement propre au sommaire (le lien est enfant direct d'un flex —
 *     configuration exacte de [[PIT-S73-001]]).
 *
 * ⚠ LE CHIFFRE ROMAIN EST `aria-hidden`, ET CELA NE L'EXEMPTE DE RIEN. WCAG
 * 1.4.3 porte sur la PRÉSENTATION VISUELLE du texte, pas sur son exposition aux
 * technologies d'assistance. Il est visible, il est du texte, il est soumis au
 * seuil. C'est même l'inverse d'une exemption : n'étant pas annoncé, il n'a
 * aucun substitut si on ne peut pas le lire.
 *
 * ⚠ LOCALE DE MESURE : `de`. Le disclaimer n'est rendu QUE hors `fr`
 * (`shouldShowLegalDisclaimer`) — le mesurer exige donc une locale non `fr`, et
 * `de` est aussi la locale visée par le volet débordement. Une seule locale
 * suffit pour le CONTRASTE : les jetons du DS ne dépendent pas de la langue,
 * seule la longueur du texte en dépend.
 *
 * ⚠ AUCUNE AUTHENTIFICATION. `/privacy` et `/terms` sont publiques : cette spec
 * ne touche à aucun compte E2E partagé, donc à aucune des pollutions décrites
 * par [[PIT-S73-006]] / [[PIT-S73-009]].
 */

/** Locale de mesure — non `fr` pour que le disclaimer soit rendu. Cf. en-tête. */
const LOCALE = 'de'

/** Largeur mobile visée par l'AC #2 de l'issue. */
const MOBILE_WIDTH = 375

/** Tolérance sub-pixel des comparaisons de boîtes (arrondis de rendu). */
const SUBPIXEL_TOLERANCE_PX = 0.5

/**
 * Les deux pages légales et leur sommaire.
 *
 * `entries` est aligné sur `src/lib/legal-pages.ts` (9 sections pour privacy,
 * 1 préambule + 10 articles pour terms) : si le sommaire maigrit, la boucle de
 * mesure le voit au lieu de mesurer silencieusement moins d'éléments.
 */
const PAGES = [
  { name: 'privacy', tocId: 'privacy-toc', entries: 9 },
  { name: 'terms', tocId: 'terms-toc', entries: 11 },
] as const

const SCHEMES = ['light', 'dark'] as const

/**
 * Les deux surfaces livrées par #60 et auditées par #527 — le périmètre exact
 * de cette issue. Tout ce qui est en dehors est un CONSTAT, pas une régression
 * du sprint 76 (le débordement de PAGE, lui, a été soldé par #532 — cf. le bloc
 * juste dessous et la garde anti-régression qui l'accompagne).
 */
const SCOPE_SELECTOR =
  '[data-testid="privacy-toc"],[data-testid="terms-toc"],[data-testid="legal-disclaimer"]'

/**
 * #532 (Sprint 77) — LE DÉFAUT DU `<h1>` QUE CE FICHIER CARACTÉRISAIT EST CORRIGÉ.
 *
 * Ce qu'il y avait ici. Une constante `KNOWN_PAGE_OVERFLOW` et un test qui FIGEAIT
 * le débordement du `<h1>` des deux pages légales (`text-3xl`, 57 px dans l'échelle
 * du DS) : il exigeait que ce fautif-là, et lui seul, déborde. Son propre message
 * disait de le SUPPRIMER le jour où le titre serait corrigé — [[PIT-S63-009]] : un
 * marqueur de dette laissé en place fige le périmètre de l'issue suivante.
 *
 * Ce qui l'a corrigé. #532 pose une rampe typographique responsive sur le titre
 * (`text-xl md:text-2xl lg:text-3xl`, 35/45/57 px), replie l'en-tête sous 640 px
 * (`flex-wrap` + `w-full sm:w-auto`) et ajoute le filet `min-w-0` + `break-words`
 * exigé par [[PIT-S73-001]] ; les `<h2>` de section reçoivent `break-words`, un
 * composé allemand débordant AUSSI leur boîte (« Artikel 8 – Änderung der
 * Nutzungsbedingungen », +133 px @320 px — second fautif que le balayage
 * `rect.right` ne voyait pas, puisqu'un texte qui déborde sa boîte n'élargit pas
 * son rectangle).
 *
 * Ce qui le remplace. Le test de caractérisation est RETOURNÉ en garde
 * anti-régression (« aucun débordement de page », 320 px ET 375 px), avec son
 * contrôle négatif intégré : le filet est retiré à l'exécution et la mesure DOIT
 * basculer, sinon la garde ne mesure rien ([[PIT-S62-003]]).
 *
 * MESURÉ le 2026-09-05 (`next dev`, Chromium, 4 locales × 5 largeurs) — avant / après :
 *   de /privacy +379 / 0 @320 · +324 / 0 @375 · +285 / 0 @414 · +59 / 0 @640
 *   de /terms   +395 / 0 @320 · +340 / 0 @375 · +301 / 0 @414 · +75 / 0 @640
 *   fr /privacy +177 / 0 @320 · +122 / 0 @375 | fr /terms +107 / 0 @320 · +52 / 0 @375
 *   es /privacy  +64 / 0 @320 |  es /terms +116 / 0 @320 · +61 / 0 @375
 *   en aucun débordement, ni avant ni après.
 */

/**
 * Relevé chiffré, une ligne JSON par mesure.
 *
 * Écriture INCRÉMENTALE et non un dump final : Playwright redémarre le worker
 * après un échec, ce qui remettrait un accumulateur en mémoire à zéro — motif
 * repris de `sprint-63-de-overflow-audit.spec.ts`. Sans `AUDIT_OUT`, la spec
 * fonctionne normalement et n'écrit rien.
 */
function record(row: Record<string, unknown>): void {
  const out = process.env.AUDIT_OUT
  if (out) fs.appendFileSync(out, JSON.stringify(row) + '\n', 'utf8')
}

/**
 * ORACLE DE THÈME — sans lui, les deux `describe` mesureraient le MÊME rendu
 * clair et la colonne « sombre » du rapport serait une copie déguisée.
 *
 * `next-themes` est monté en `attribute="class" defaultTheme="system"
 * enableSystem` (`app/[locale]/layout.tsx:64`, `src/components/theme-provider.tsx`) :
 * l'émulation `colorScheme` de Playwright suffit donc à poser `.dark` sur
 * `<html>`. Le DS écoute `.dark` ET `[data-theme="dark"]` — on teste les deux.
 */
async function assertThemeApplied(page: Page, scheme: (typeof SCHEMES)[number]): Promise<void> {
  const isDark = await page.evaluate(
    () =>
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark',
  )
  expect(
    isDark,
    `le thème « ${scheme} » n'est pas réellement appliqué à <html> — la mesure ` +
      `porterait sur l'autre thème sans que rien ne le signale`,
  ).toBe(scheme === 'dark')
}

/**
 * Mesure une cible textuelle, la consigne, et rend le relevé.
 *
 * Le VERDICT est rendu contre `r.wcagThreshold`, c'est-à-dire le seuil WCAG
 * 1.4.3 déduit de la taille et de la graisse RÉELLEMENT rendues — pas d'un
 * seuil supposé. `requiredRatio()` n'est volontairement pas utilisé ici : il
 * plaque en plus le plancher projet `CTA_MIN_RATIO`, motivé par les appels à
 * l'action de la landing et étranger à une page légale. Sur ces cibles les deux
 * coïncident (texte normal ⇒ 4,5), et l'assertion `wcagThreshold === 4.5`
 * ci-dessous VERROUILLE cette coïncidence : si un futur agrandissement faisait
 * basculer la cible en « grand texte », le test le dirait au lieu de relâcher
 * le seuil en silence.
 */
async function measureText(
  page: Page,
  locator: Locator,
  target: string,
  ctx: { page: string; scheme: string },
): Promise<TextRendering> {
  const r = await readAtRest(page, locator)
  record({
    kind: 'contrast',
    target,
    page: ctx.page,
    scheme: ctx.scheme,
    locale: LOCALE,
    ratio: Number(r.ratio.toFixed(3)),
    threshold: r.wcagThreshold,
    fg: r.foreground,
    bg: r.background,
    fontSizePx: r.fontSizePx,
    fontWeight: r.fontWeight,
    isLargeText: r.isLargeText,
    opacity: r.effectiveOpacity,
    text: r.text.slice(0, 40),
  })
  expect(
    r.wcagThreshold,
    `${target} : la cible est rendue à ${r.fontSizePx}px/${r.fontWeight} et relève donc ` +
      `du seuil « grand texte » (3:1). Le seuil applicable a changé — décider ` +
      `explicitement, ne pas laisser le harnais s'assouplir tout seul.`,
  ).toBe(4.5)
  expect(r.ratio, describeRendering(target, r)).toBeGreaterThanOrEqual(r.wcagThreshold)
  return r
}

/* ══════════════════════════════════════════════════ 1. CONTRASTE (1.4.3) */

for (const scheme of SCHEMES) {
  test.describe(`#527 — contraste des éléments légaux, thème ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const { name, tocId, entries } of PAGES) {
      test(`/${LOCALE}/${name} — chiffres romains, liens et disclaimer`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.goto(`/${LOCALE}/${name}`, { waitUntil: 'domcontentloaded' })
        const toc = page.getByTestId(tocId)
        await expect(toc).toBeVisible({ timeout: 30_000 })
        await waitForFonts(page)
        await assertThemeApplied(page, scheme)

        const ctx = { page: name, scheme }

        // ── Chiffres romains : TOUS, pas un échantillon ────────────────────
        // Ils portent le même jeton, mais rien ne garantit qu'ils portent le
        // même FOND : c'est précisément l'hypothèse que cette issue existe pour
        // ne plus faire. On les mesure donc un par un.
        const numerals = toc.locator('li > span[aria-hidden="true"]')
        await expect(
          numerals,
          `${name} : le sommaire doit rendre ${entries} chiffres romains ` +
            `(aligné sur src/lib/legal-pages.ts)`,
        ).toHaveCount(entries)

        for (let i = 0; i < entries; i += 1) {
          const numeral = numerals.nth(i)
          const r = await measureText(page, numeral, `${name}/chiffre-romain[${i}]`, ctx)

          // ── TÉMOIN DE PEINTURE (PIT-S58-001) ──────────────────────────────
          // `contrast.ts` compose le fond depuis les ancêtres du DOM ; ce n'est
          // pas la même chose que le fond PEINT. On lit donc les pixels de
          // l'intérieur du chiffre : la couleur MODALE y est le fond (le glyphe
          // « I. » n'occupe qu'une fraction d'une boîte `w-10`). Si les deux
          // divergent, le ratio publié plus haut décrit une autre page que
          // celle qui s'affiche.
          const painted = await measurePaintedGlyph(page, numeral, { insetPx: 1 })
          const fromDom = {
            r: Number.parseInt(r.background.slice(1, 3), 16),
            g: Number.parseInt(r.background.slice(3, 5), 16),
            b: Number.parseInt(r.background.slice(5, 7), 16),
          }
          const witness = contrastRatio(painted.fill, fromDom)
          record({
            kind: 'paint-witness',
            target: `${name}/chiffre-romain[${i}]`,
            page: name,
            scheme,
            paintedFill: painted.fillHex,
            paintedShare: Number(painted.fillShare.toFixed(3)),
            domBackground: r.background,
            divergence: Number(witness.toFixed(4)),
            glyphInkHex: painted.extremeHex,
          })
          expect(
            witness,
            `${name}/chiffre-romain[${i}] : le fond PEINT (${painted.fillHex}, ` +
              `${(painted.fillShare * 100).toFixed(0)}% des pixels intérieurs) diverge du fond ` +
              `COMPOSITÉ depuis le DOM (${r.background}) — écart ${witness.toFixed(3)}:1. ` +
              `Le ratio WCAG publié ne décrit alors pas ce qui est affiché (PIT-S58-001).`,
          ).toBeLessThan(1.05)
        }

        // ── Liens du sommaire ─────────────────────────────────────────────
        // Même jeton que le chiffre, fond identique — mais c'est LA cible
        // interactive : un lien illisible est un défaut plus grave qu'un
        // numéro illisible.
        const links = toc.locator('li > a[href^="#"]')
        await expect(links).toHaveCount(entries)
        for (let i = 0; i < entries; i += 1) {
          await measureText(page, links.nth(i), `${name}/lien-sommaire[${i}]`, ctx)
        }

        // ── Disclaimer ────────────────────────────────────────────────────
        const disclaimer = page.getByTestId('legal-disclaimer')
        await expect(
          disclaimer,
          `le disclaimer doit être rendu en « ${LOCALE} » (shouldShowLegalDisclaimer) — ` +
            `absent, la moitié de la matrice de mesure de #527 serait vide`,
        ).toBeVisible()
        await measureText(page, disclaimer, `${name}/disclaimer`, ctx)

        // ── Filets : MESURÉS ET CONSIGNÉS, non assertés — et pourquoi ──────
        // WCAG 1.4.11 (3:1) vise les éléments graphiques NÉCESSAIRES pour
        // identifier un composant ou son état. Le cadre `border-rule` du
        // sommaire et du disclaimer n'en est pas : retiré, le sommaire reste
        // une liste de liens et le disclaimer reste une phrase intégralement
        // lisible — aucune information n'est portée par le trait. Le DS
        // tranche d'ailleurs déjà ce cas, `ds/tokens/colors.css:62-66` :
        // `--color-rule` est DÉCORATIF et plafonne à 1,2:1, le tier fonctionnel
        // étant `--color-rule-emphasis` (3,97:1 / 4,07:1). Asserter 3:1 ici
        // rougirait sur un choix de charte délibéré, pas sur un défaut.
        // On consigne quand même les nombres : l'issue demande des mesures, et
        // un arbitrage non chiffré n'est pas vérifiable.
        for (const [label, target] of [
          [`${name}/filet-sommaire`, toc],
          [`${name}/filet-disclaimer`, disclaimer],
        ] as const) {
          const rule = await readStable(target, 3_000, 'borderTopColor')
          record({
            kind: 'rule-informational',
            target: label,
            page: name,
            scheme,
            ratio: Number(rule.ratio.toFixed(3)),
            fg: rule.foreground,
            bg: rule.background,
            classification: 'decoratif (WCAG 1.4.11 non applicable)',
          })
        }
      })
    }
  })
}

/* ═══════════════════════════════════════ 2. DÉBORDEMENT `de` À 375 PX */

interface Offender {
  tag: string
  id: string
  testid: string
  cls: string
  right: number
  width: number
  /**
   * Vrai si le fautif appartient au SOMMAIRE ou au DISCLAIMER, c.-à-d. aux deux
   * surfaces livrées par #60 et auditées par #527. C'est ce drapeau qui sépare
   * « le périmètre de cette issue déborde » (interdit, cf. `expectScopeClean`)
   * de « la page déborde ailleurs » (constat pré-existant, cf. le test de
   * caractérisation dédié).
   */
  inScope: boolean
}

interface OverflowReading {
  clientWidth: number
  scrollWidth: number
  maxScrollX: number
  offenders: Offender[]
}

/**
 * Balayage de débordement de PAGE — repris de
 * `sprint-63-de-overflow-audit.spec.ts` avec ses deux exclusions motivées.
 *
 *  · Outillage de DÉVELOPPEMENT (`support/dev-tooling.ts`) : sous `next dev`, le
 *    bouton flottant des Query Devtools et l'overlay Next débordent avec un
 *    décalage qui SUIT la largeur du viewport — indiscernable d'un vrai défaut,
 *    et c'est ce faux positif qui avait produit #341 ([[PIT-S59-002]]).
 *  · Contenu d'un défileur horizontal légitime : un élément contenu par un
 *    ancêtre `overflow-x` auto/scroll/hidden n'est pas un débordement de page.
 *
 * ⚠ LA REMONTÉE S'ARRÊTE AVANT `<body>` ET `<html>` — [[PIT-S63-012]]. Les
 * inclure ferait déclarer « contenu » TOUT le document dès qu'un scroll-lock
 * pose un `overflow` sur `body`, et MASQUERAIT l'élément fautif. Le débordement
 * de page est précisément ce que mesure `documentElement.scrollWidth`.
 *
 * `testid` est relevé en plus du tag/id : c'est ce qui permet d'asserter
 * l'IDENTITÉ d'un débordement dans l'auto-contrôle plus bas, plutôt qu'un
 * `some(o => o.tag === 'a')` que n'importe quel autre fautif satisferait.
 */
async function measureOverflow(page: Page): Promise<OverflowReading> {
  return page.evaluate(
    ({ tolerance, tooling, scope }) => {
      const docEl = document.documentElement
      const clientWidth = docEl.clientWidth
      const offenders: Offender[] = []

      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (tooling.some((sel) => el.closest(sel))) continue

        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue

        let contained = false
        for (
          let p = el.parentElement;
          p && p !== docEl && p !== document.body;
          p = p.parentElement
        ) {
          const ox = getComputedStyle(p).overflowX
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') {
            contained = true
            break
          }
        }
        if (contained) continue

        if (rect.right > clientWidth + tolerance) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            testid: el.getAttribute('data-testid') ?? '',
            cls: (el.getAttribute('class') ?? '').slice(0, 90),
            right: Math.round(rect.right * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
            inScope: el.closest(scope) !== null,
          })
        }
      }

      // Sonde de défilement RÉEL : Chromium clampe `scrollX`, une page sans
      // débordement rend donc 0. (jsdom ne clampe pas — d'où l'E2E ;
      // cf. [[jsdom-scroll-tests-prove-nothing]].)
      const previousY = window.scrollY
      window.scrollTo(5_000, previousY)
      const maxScrollX = window.scrollX
      window.scrollTo(0, previousY)

      return { clientWidth, scrollWidth: docEl.scrollWidth, maxScrollX, offenders }
    },
    { tolerance: SUBPIXEL_TOLERANCE_PX, tooling: devToolingSelectors(), scope: SCOPE_SELECTOR },
  )
}

/**
 * Confinement PROPRE AU SOMMAIRE, en plus du balayage de page.
 *
 * Pourquoi les deux. Le balayage de page ne voit qu'un dépassement du bord
 * DROIT du document. Un lien peut déborder de la boîte de contenu de son `<ol>`
 * — donc mordre le padding du `<nav>`, voire son coin arrondi — sans jamais
 * atteindre le bord du viewport si la page a de la marge. Ce contrôle-ci
 * répond à la question posée par l'issue (« le sommaire déborde-t-il ? »), le
 * balayage répond à « la page déborde-t-elle ? ».
 *
 * ⚠ CONFIGURATION EXACTE DE [[PIT-S73-001]] : le `<a>` est enfant DIRECT d'un
 * `<li class="flex gap-3">`. `min-width:auto` y conserve la taille min-content
 * du mot le plus long, et `overflow-wrap:break-word` — contrairement à
 * `anywhere` — ne réduit PAS min-content. Un `break-words` seul ne corrigerait
 * donc rien ici : il faut `min-w-0` en plus, ou `overflow-wrap:anywhere`.
 */
async function measureTocContainment(page: Page, tocId: string) {
  return page.evaluate((id) => {
    const nav = document.querySelector(`[data-testid="${id}"]`)
    if (nav === null) throw new Error(`sommaire « ${id} » absent du DOM`)
    const list = nav.querySelector('ol')
    if (list === null) throw new Error(`sommaire « ${id} » sans <ol>`)

    const listStyle = getComputedStyle(list)
    const listRect = list.getBoundingClientRect()
    const contentRight =
      listRect.right -
      Number.parseFloat(listStyle.paddingRight) -
      Number.parseFloat(listStyle.borderRightWidth)

    const items = Array.from(nav.querySelectorAll('li > *')).map((el) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return {
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute('data-testid') ?? '',
        text: (el.textContent ?? '').trim().slice(0, 40),
        right: Math.round(rect.right * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        minWidth: style.minWidth,
        overflowWrap: style.overflowWrap,
        wordBreak: style.wordBreak,
        overhangPx: Math.round((rect.right - contentRight) * 100) / 100,
      }
    })

    return {
      navWidth: Math.round(nav.getBoundingClientRect().width * 100) / 100,
      contentRight,
      items,
    }
  }, tocId)
}

test.describe(`#527 — débordement du sommaire en « ${LOCALE} » à ${MOBILE_WIDTH}px`, () => {
  test.use({ viewport: { width: MOBILE_WIDTH, height: 800 } })

  for (const { name, tocId, entries } of PAGES) {
    test(`/${LOCALE}/${name} — sommaire confiné et page non débordante`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.goto(`/${LOCALE}/${name}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(tocId)).toBeVisible({ timeout: 30_000 })
      await waitForFonts(page)
      // Un élément laissé sous le curseur est mesuré dans son état `:hover`,
      // qui peut l'élargir (soulignement, graisse). On écarte la souris.
      await page.mouse.move(0, 0)

      const sweep = await measureOverflow(page)
      const containment = await measureTocContainment(page, tocId)
      record({
        kind: 'overflow',
        page: name,
        locale: LOCALE,
        width: MOBILE_WIDTH,
        clientWidth: sweep.clientWidth,
        scrollWidth: sweep.scrollWidth,
        maxScrollX: sweep.maxScrollX,
        offenders: sweep.offenders,
        navWidth: containment.navWidth,
        maxOverhangPx: Math.max(...containment.items.map((i) => i.overhangPx)),
        maxScrollOverflowPx: Math.max(
          ...containment.items.map((i) => i.scrollWidth - i.clientWidth),
        ),
        items: containment.items,
      })

      const where = `${name} · ${LOCALE} · ${MOBILE_WIDTH}px`

      // ── LE VERROU DE #527 : rien du PÉRIMÈTRE ne déborde ────────────────
      // Restreint aux deux surfaces livrées par #60 — c'est le périmètre de
      // #527, et l'auto-contrôle plus bas prouve que ce verrou sait rougir.
      // Le débordement de PAGE, lui, n'est plus toléré depuis #532 : il est
      // couvert par la garde anti-régression du test suivant, qui asserte
      // l'ABSENCE de tout fautif, à 320 px comme à 375 px.
      expect(
        sweep.offenders.filter((o) => o.inScope),
        `${where} : le sommaire ou le disclaimer dépasse le bord droit du document — ` +
          `${JSON.stringify(sweep.offenders.filter((o) => o.inScope))}`,
      ).toEqual([])

      expect(
        containment.items.length,
        `${where} : ${entries} entrées attendues × 2 enfants (chiffre + lien)`,
      ).toBe(entries * 2)

      for (const item of containment.items) {
        expect(
          item.overhangPx,
          `${where} : « ${item.text} » (<${item.tag}>) dépasse la boîte de contenu du ` +
            `sommaire de ${item.overhangPx}px — min-width ${item.minWidth}, ` +
            `overflow-wrap ${item.overflowWrap}. Enfant direct d'un flex : ` +
            `un \`break-words\` seul ne suffit pas (PIT-S73-001).`,
        ).toBeLessThanOrEqual(SUBPIXEL_TOLERANCE_PX)
        expect(
          item.scrollWidth,
          `${where} : « ${item.text} » est coupé — scrollWidth ${item.scrollWidth} > ` +
            `clientWidth ${item.clientWidth}`,
        ).toBeLessThanOrEqual(item.clientWidth + 1)
      }

      // Le disclaimer partage la largeur du sommaire et porte, lui, du texte
      // RÉELLEMENT allemand (« Bestimmungen », « bereitgestellt ») — les
      // intitulés de section, eux, sont restés français dans les 4 locales.
      const disclaimer = page.getByTestId('legal-disclaimer')
      await expect(disclaimer).toBeVisible()
      const d = await readAtRest(page, disclaimer)
      record({
        kind: 'overflow',
        page: name,
        locale: LOCALE,
        width: MOBILE_WIDTH,
        target: 'disclaimer',
        scrollWidth: d.scrollWidth,
        clientWidth: d.clientWidth,
        boxWidth: d.boxWidth,
      })
      expect(
        d.scrollWidth,
        `${where} : le disclaimer déborde — scrollWidth ${d.scrollWidth} > ` +
          `clientWidth ${d.clientWidth}`,
      ).toBeLessThanOrEqual(d.clientWidth + 1)
    })

    /**
     * GARDE ANTI-RÉGRESSION #532 — la page ne déborde PLUS, à AUCUNE largeur
     * mobile. Remplace le test de caractérisation qui figeait le `<h1>` fautif
     * (cf. le bloc de commentaire en tête de fichier).
     *
     * DEUX LARGEURS, et pas seulement les 375 px du reste du fichier : à 320 px
     * la marge est la plus étroite (288 px de contenu) et c'est là que le
     * correctif se joue. `de` reste la locale de mesure — c'est le cas
     * DIMENSIONNANT depuis que #533 a traduit les titres
     * (« Nutzungsbedingungen » : 597 px à 57 px, contre 381 px pour le titre
     * français le plus long).
     *
     * CONTRÔLE NÉGATIF INTÉGRÉ ([[PIT-S62-003]]) : un « 0 débordement » ne vaut
     * rien tant qu'on n'a pas montré que l'instrument SAIT rougir. On retire
     * donc le filet (`min-width` + `overflow-wrap` + rampe) à l'exécution et on
     * exige que le débordement REVIENNE, sur le `<h1>` nommément.
     */
    for (const width of [320, MOBILE_WIDTH]) {
      test(`/${LOCALE}/${name} — aucun débordement de page à ${width}px (#532)`, async ({
        page,
      }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width, height: 800 })
        await page.goto(`/${LOCALE}/${name}`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId(tocId)).toBeVisible({ timeout: 30_000 })
        await waitForFonts(page)
        await page.mouse.move(0, 0)
        // La largeur du volet peut avoir bougé pendant le chargement : on la
        // REFIXE juste avant la mesure, sinon le relevé est silencieusement faux.
        await page.setViewportSize({ width, height: 800 })

        const sweep = await measureOverflow(page)
        record({
          kind: 'page-overflow-guard',
          page: name,
          locale: LOCALE,
          width,
          clientWidth: sweep.clientWidth,
          scrollWidth: sweep.scrollWidth,
          maxScrollX: sweep.maxScrollX,
          overshootPx: Math.round((sweep.scrollWidth - sweep.clientWidth) * 100) / 100,
          offenders: sweep.offenders,
        })

        const where = `${name} · ${LOCALE} · ${width}px`
        expect(
          sweep.offenders,
          `${where} : la page déborde — ${JSON.stringify(sweep.offenders)}`,
        ).toEqual([])
        expect(
          sweep.scrollWidth,
          `${where} : défilement horizontal du document (scrollWidth ${sweep.scrollWidth} > ` +
            `clientWidth ${sweep.clientWidth})`,
        ).toBeLessThanOrEqual(sweep.clientWidth + SUBPIXEL_TOLERANCE_PX)
        // Sonde de défilement RÉEL, en plus des boîtes : Chromium clampe `scrollX`.
        expect(sweep.maxScrollX, `${where} : la page défile de ${sweep.maxScrollX}px`).toBe(0)

        // ── contrôle négatif : sans le filet, le défaut d'origine revient ──
        await page.addStyleTag({
          content:
            'h1{font-size:57px !important;width:auto !important;' +
            'min-width:auto !important;overflow-wrap:normal !important;hyphens:none !important}',
        })
        const degraded = await measureOverflow(page)
        expect(
          degraded.offenders.map((o) => o.tag),
          `${where} : le filet retiré, le balayage NE VOIT PAS revenir le débordement du ` +
            `<h1> — cette garde ne mesure rien. Relevé : ${JSON.stringify(degraded.offenders)}`,
        ).toContain('h1')
      })
    }
  }
})

/* ══════════════════════════════════════════ 3. AUTO-CONTRÔLE DU HARNAIS */

/**
 * [[PIT-S62-003]] / [[coverage-check-vert-ne-prouve-rien]] : un garde-fou qui
 * ne peut pas rougir est un décor, et « aucun écart mesuré » ne vaut rien tant
 * qu'on n'a pas montré que l'instrument SAIT rougir.
 *
 * Ces deux tests dégradent le rendu à l'exécution et exigent que la mesure
 * bascule. Ils restent dans le fichier : ils sont la preuve, rejouée à chaque
 * run, que les assertions ci-dessus mesurent réellement quelque chose.
 */
test.describe('#527 — auto-contrôle du harnais', () => {
  test('une encre dégradée sur le chiffre romain EST détectée', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/${LOCALE}/privacy`, { waitUntil: 'domcontentloaded' })
    const numeral = page.getByTestId('privacy-toc').locator('li > span[aria-hidden="true"]').first()
    await expect(numeral).toBeVisible({ timeout: 30_000 })
    await waitForFonts(page)

    const before = await readAtRest(page, numeral)
    expect(
      before.ratio,
      `état de référence non conforme : ${describeRendering('chiffre romain', before)}`,
    ).toBeGreaterThanOrEqual(4.5)

    // Dégradation par le JETON, pas par une couleur littérale posée sur
    // l'élément : c'est le chemin qu'emprunterait une vraie régression du DS,
    // et cela vérifie du même coup que la sonde suit bien la variable CSS
    // jusqu'au rendu (et non une classe supposée).
    await page.addStyleTag({
      content: ':root, .dark { --color-ink-muted: #E9EAEC !important; }',
    })
    const after = await readStable(numeral)

    expect(
      after.ratio,
      `la sonde n'a PAS vu l'encre dégradée : ${describeRendering('chiffre romain dégradé', after)}. ` +
        `Si cette mesure reste conforme, les assertions de contraste de ce fichier ` +
        `ne mesurent rien.`,
    ).toBeLessThan(4.5)
    record({
      kind: 'self-check',
      target: 'contraste',
      baseline: Number(before.ratio.toFixed(3)),
      degraded: Number(after.ratio.toFixed(3)),
      degradedInk: after.foreground,
    })
  })

  test('un débordement injecté dans le sommaire EST détecté', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 800 })
    await page.goto(`/${LOCALE}/terms`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('terms-toc')).toBeVisible({ timeout: 30_000 })
    await waitForFonts(page)
    await page.mouse.move(0, 0)

    const clean = await measureOverflow(page)
    // Référence prise sur le PÉRIMÈTRE de #527 — c'est ce périmètre que
    // l'injection ci-dessous doit faire rougir. Depuis #532 la PAGE ne déborde
    // plus non plus (garde dédiée plus haut) : la référence vaut donc aussi
    // `[]` sur toute la page, mais la restreindre garde cet auto-contrôle
    // centré sur ce qu'il prouve.
    expect(
      clean.offenders.filter((o) => o.inScope),
      `le périmètre débordait DÉJÀ avant injection : ${JSON.stringify(clean.offenders)}`,
    ).toEqual([])

    // Jeton INSÉCABLE injecté dans le texte d'un lien du sommaire — la forme
    // exacte qu'un composé allemand donnerait à un intitulé de section si les
    // libellés étaient un jour traduits. C'est le cas de figure de
    // [[PIT-S73-001]] : enfant direct d'un flex, `min-width:auto`.
    const PROBE = 'Datenschutzgrundverordnungsdurchfuehrungsbestimmungen'
    await page.evaluate((probe) => {
      const link = document.querySelector('[data-testid="terms-toc-link-preamble"]')
      if (link === null) throw new Error('lien de sonde absent')
      link.textContent = probe
    }, PROBE)

    const degraded = await measureOverflow(page)
    const containment = await measureTocContainment(page, 'terms-toc')
    record({
      kind: 'self-check',
      target: 'debordement',
      probe: PROBE,
      cleanOffenders: clean.offenders.length,
      degradedOffenders: degraded.offenders,
      degradedScrollWidth: degraded.scrollWidth,
      probeItem: containment.items.find((i) => i.testid === 'terms-toc-link-preamble'),
    })

    // On asserte l'IDENTITÉ de la sonde, pas « au moins un fautif » : ce
    // dernier serait satisfait par n'importe quel autre débordement réel et ne
    // prouverait rien sur la sonde (contrôle négatif du S59).
    const probeItem = containment.items.find((i) => i.testid === 'terms-toc-link-preamble')
    expect(probeItem, 'sonde introuvable dans le relevé de confinement').toBeDefined()
    expect(
      probeItem!.overhangPx,
      `le contrôle de confinement n'a PAS vu le jeton insécable injecté ` +
        `(dépassement ${probeItem!.overhangPx}px) : les assertions de débordement de ce ` +
        `fichier ne mesurent rien.`,
    ).toBeGreaterThan(SUBPIXEL_TOLERANCE_PX)

    // …et le balayage de PAGE doit lui aussi voir apparaître la sonde DANS le
    // périmètre : c'est exactement l'assertion `inScope` du verrou de #527, dont
    // on prouve ici qu'elle sait rougir.
    expect(
      degraded.offenders.filter((o) => o.inScope).map((o) => o.testid),
      `le verrou de périmètre n'a PAS vu la sonde : ${JSON.stringify(degraded.offenders)}`,
    ).toContain('terms-toc-link-preamble')
  })
})
