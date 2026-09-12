import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Mesure de contraste WCAG et de troncature, sur le rendu RÉEL (#337).
 *
 * Pourquoi ce module existe : le Sprint 48 a livré deux régressions visibles
 * (deux CTA bleu-sur-bleu à 1.00:1, un libellé coupé en plein mot) qu'AUCUN
 * harnais en place ne pouvait voir. `jsdom` ne résout ni la précédence des
 * `@layer` CSS ni la moindre mise en page ; `next build` ne contrôle aucun style
 * à l'exécution ; une relecture de diff ne devine pas une interaction de cascade
 * entre deux fichiers CSS. Seul un vrai moteur de rendu répond à la question
 * « qu'est-ce que l'utilisateur voit ». D'où : Playwright + `getComputedStyle`.
 *
 * Trois exigences de justesse, chacune correspondant à une erreur classique :
 *
 * 1. **Luminance relative WCAG 2.x** — linéarisation sRGB canal par canal
 *    (`c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`), PAS une moyenne de
 *    canaux ni la luminosité HSL. Une moyenne naïve donne un ratio faux d'un
 *    facteur ~2 sur les bleus, précisément la teinte de l'accent du DS.
 * 2. **Fond composité** — `getComputedStyle(el).backgroundColor` vaut
 *    `rgba(0,0,0,0)` sur la plupart des éléments : la couleur réellement
 *    derrière le texte est celle du premier ancêtre opaque, sur laquelle on
 *    ré-empile les couches semi-transparentes traversées. Sans ce ré-empilement,
 *    un voile `rgba()` sur un parent est ignoré et le ratio mesuré est faux.
 * 3. **Pseudo-éléments couvrants** — le voile de survol de `.cta-button` est un
 *    `::after` (`width: 0` au repos, `100%` au survol, teinte `ink` à 8 %). Il
 *    passe SOUS le texte et modifie donc le fond effectif. On le lit via
 *    `getComputedStyle(el, '::after')` et on ne le composite que s'il couvre
 *    réellement la boîte — c'est ce qui permet d'attraper la famille de
 *    régressions « survol qui écrase le contraste » (cf. le CTA tombé à 4.01:1
 *    avant #335).
 *
 * Normalisation des couleurs : on passe par un `<canvas>` 1×1
 * (`fillStyle` + `getImageData`) plutôt que par une regex. Chromium sérialise
 * `getComputedStyle` en `rgb()`/`rgba()` la plupart du temps, mais pas toujours
 * (`color-mix()`, `oklch()`, `color(srgb …)` ressortent tels quels selon
 * l'espace de couleur d'origine) — et le DS utilise `color-mix()`. Le canvas
 * accepte toutes ces syntaxes et rend des octets sRGB : un seul chemin, aucune
 * syntaxe oubliée.
 */

/** Seuil WCAG 2.1 AA — texte normal (1.4.3). */
export const WCAG_AA_NORMAL = 4.5
/** Seuil WCAG 2.1 AA — grand texte : >= 24px, ou >= 18.66px en gras (>= 700). */
export const WCAG_AA_LARGE = 3

/**
 * Plancher de projet appliqué aux appels à l'action, au-dessus du seuil WCAG.
 *
 * Les CTA de la landing sont rendus à 27px (échelle DS : `text-lg` = 27px, PAS
 * les 18px de l'échelle Tailwind par défaut) : ils tombent donc dans la case
 * « grand texte » et WCAG ne leur impose que 3:1. On exige quand même 4.5:1,
 * pour deux raisons factuelles :
 *  - la régression pré-#335 mesurait 4.01:1 au survol ; à 3:1 elle passerait le
 *    test, or c'est exactement le défaut que cette issue doit attraper ;
 *  - la marge sur le CTA primaire est déjà mince (4.71:1 sur l'accent en clair),
 *    tout assombrissement de fond doit rougir AVANT d'être livré.
 * Un CTA sous 4.5:1 est donc un échec ici même s'il reste conforme AA.
 */
export const CTA_MIN_RATIO = 4.5

/** Tolérance de troncature, en px : sub-pixels de rendu et arrondis de bordure. */
export const TRUNCATION_TOLERANCE_PX = 1

/**
 * Seuil WCAG 2.1 AA — composants d'interface et objets graphiques (1.4.11).
 *
 * S'applique aux traits qui PORTENT une information et ne sont pas du texte :
 * le connecteur pointillé et le contour de l'occurrence fantôme de l'aperçu
 * (#325, handoff §6) sont exactement cela — retirés, la récurrence n'est plus
 * lisible. C'est le même arbitrage que `--color-rule-emphasis` (#293) : un
 * filet DÉCORATIF peut plafonner à 1.2:1, un filet FONCTIONNEL non.
 */
export const WCAG_AA_NON_TEXT = 3

/**
 * Propriété calculée qui porte l'« encre » à mesurer.
 *
 * `'color'` (défaut) = le texte, seul cas jusqu'à #325. Les autres valeurs
 * permettent de mesurer un TRAIT contre son fond composité, avec exactement la
 * même arithmétique — plutôt qu'une seconde implémentation de la luminance
 * WCAG, dont la première version naïve du dépôt se trompait d'un facteur ~2 sur
 * les bleus (cf. en-tête de ce module).
 */
export type InkProperty = 'color' | 'borderTopColor' | 'borderBottomColor' | 'backgroundColor'

export interface TextRendering {
  /** Ratio de contraste WCAG entre la couleur du texte et le fond composité. */
  ratio: number
  /** Couleur de texte effective, `#rrggbb` (aplatie si semi-transparente). */
  foreground: string
  /** Fond effectif sous le texte, `#rrggbb` (ancêtres + voiles composités). */
  background: string
  fontSizePx: number
  fontWeight: number
  /** Vrai si le texte relève du seuil « grand texte » WCAG (3:1). */
  isLargeText: boolean
  /** Seuil WCAG applicable compte tenu de la taille et de la graisse. */
  wcagThreshold: number
  /** Produit des `opacity` de l'élément et de tous ses ancêtres. */
  effectiveOpacity: number
  /** Nombre de pseudo-éléments couvrants composités dans le fond. */
  overlayCount: number
  scrollWidth: number
  clientWidth: number
  scrollHeight: number
  clientHeight: number
  boxWidth: number
  boxHeight: number
  text: string
}

/**
 * Lit le rendu effectif d'un élément textuel. Tout le calcul se fait DANS la
 * page : le style calculé n'existe pas côté Node, et rapatrier l'arbre des
 * ancêtres pour le recomposer ici serait à la fois plus lent et plus fragile.
 */
export async function readTextRendering(
  locator: Locator,
  inkProperty: InkProperty = 'color',
): Promise<TextRendering> {
  return locator.evaluate((el: Element, inkProp: InkProperty): TextRendering => {
    type Rgba = [number, number, number, number]

    /**
     * Normalise n'importe quelle syntaxe CSS de couleur en octets sRGB.
     *
     * PIÈGE CORRIGÉ AU SPRINT 49 : `ctx.fillStyle = <syntaxe invalide>` est un
     * NO-OP silencieux — la spécification exige d'ignorer l'affectation, pas de
     * lever. Le `fillStyle` gardait donc sa valeur par défaut (`#000000`
     * opaque), et une couleur non analysable était composée comme un NOIR PLEIN.
     * Sur un fond clair, cela produit un ratio ÉLEVÉ : l'erreur penchait du côté
     * permissif, c'est-à-dire qu'un défaut réel pouvait passer au vert.
     *
     * Détection : on tente l'analyse depuis deux sentinelles différentes. Une
     * valeur valide donne la même sérialisation dans les deux cas ; une valeur
     * ignorée laisse chaque sentinelle en place, donc deux résultats différents.
     * Cette forme n'a pas d'angle mort — contrairement à « comparer au noir »,
     * qui accuserait à tort une couleur réellement noire.
     */
    const toRgba = (value: string): Rgba => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (ctx === null) throw new Error('contexte canvas 2d indisponible')
      const parseFrom = (sentinel: string): string => {
        ctx.fillStyle = sentinel
        ctx.fillStyle = value
        return String(ctx.fillStyle)
      }
      const fromBlack = parseFrom('#000000')
      const fromWhite = parseFrom('#ffffff')
      if (fromBlack !== fromWhite) {
        throw new Error(
          `couleur CSS non analysable par le canvas : « ${value} ». La mesure aurait ` +
            'composité un noir opaque par défaut et rendu un ratio faussement bon.',
        )
      }
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = value
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }

    /** Composition « source-over » d'une couche sur un fond opaque. */
    const over = (src: Rgba, dst: Rgba): Rgba => [
      src[0] * src[3] + dst[0] * (1 - src[3]),
      src[1] * src[3] + dst[1] * (1 - src[3]),
      src[2] * src[3] + dst[2] * (1 - src[3]),
      1,
    ]

    /** Luminance relative WCAG 2.x (linéarisation sRGB, pondération 709). */
    const luminance = (c: Rgba): number => {
      const channel = (v: number): number => {
        const s = v / 255
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
    }

    const contrast = (a: Rgba, b: Rgba): number => {
      const la = luminance(a)
      const lb = luminance(b)
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
    }

    const hex = (c: Rgba): string =>
      `#${[c[0], c[1], c[2]].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

    const style = getComputedStyle(el)
    const rect = el.getBoundingClientRect()

    /** Repère lisible d'un noeud dans un message d'échec. */
    const describeNode = (n: Element): string =>
      `<${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ''}` +
      `${n.classList.length > 0 ? `.${Array.from(n.classList).slice(0, 3).join('.')}` : ''}>`

    // --- Opacité effective : elle se propage depuis la RACINE ----------------
    // PIÈGE CORRIGÉ AU SPRINT 49 (revue de #337) : l'opacité était accumulée
    // dans la MÊME boucle que le fond, donc arrêtée par le `break` du premier
    // ancêtre opaque. Cette borne est valide pour le FOND — ce qui se trouve
    // derrière un aplat opaque ne se voit pas — mais JAMAIS pour l'opacité, qui
    // s'applique à tout le sous-arbre depuis la racine. Un `opacity: 0` posé
    // AU-DESSUS d'un fond opaque intermédiaire était donc ignoré :
    // `revealForMeasurement` validait une section jamais révélée et
    // `expectReadable` mesurait l'encre PLEINE d'un élément invisible. Là encore
    // l'erreur penchait du côté permissif, et sur le garde-fou lui-même.
    // D'où deux boucles distinctes, chacune avec sa propre condition d'arrêt.
    let effectiveOpacity = 1
    for (let node: Element | null = el; node !== null; node = node.parentElement) {
      const nodeOpacity = Number.parseFloat(getComputedStyle(node).opacity)
      if (Number.isFinite(nodeOpacity)) effectiveOpacity *= nodeOpacity
    }

    // --- Ancêtres : premier fond opaque + couches semi-transparentes ---------
    // Le point de DÉPART dépend de ce qu'on mesure (#325) :
    //  - texte et bordures sont peints PAR-DESSUS le fond de l'élément lui-même
    //    (`background-clip: border-box` par défaut) → on part de `el` ;
    //  - quand l'encre EST le fond de l'élément (barre TODAY `bg-accent`), le
    //    fond de `el` est l'objet mesuré, pas son support : partir de `el`
    //    composerait la couleur sur elle-même et rendrait 1.00:1 pour tout
    //    aplat, y compris parfaitement contrasté. On part donc du parent.
    const backdropRoot: Element | null = inkProp === 'backgroundColor' ? el.parentElement : el
    const layers: Rgba[] = []
    for (let node: Element | null = backdropRoot; node !== null; node = node.parentElement) {
      const nodeStyle = getComputedStyle(node)
      // DÉGRADÉS (revue du Sprint 49). Seul `backgroundColor` est composité. Un
      // ancêtre dont le fond est un `background-image` a un `backgroundColor`
      // TRANSPARENT : il n'était ni empilé, ni compté comme borne opaque — la
      // remontée continuait et le fond mesuré était FAUX, sans aucun signal.
      // Ce n'est pas théorique : `styles/landing.css` porte un
      // `linear-gradient(to right, var(--color-ink), var(--color-accent))` sur
      // `.gradient-text` et un halo flouté derrière le héros.
      // On lève, comme pour une couleur non analysable (cf. `toRgba`) : un
      // harnais de contraste doit échouer bruyamment plutôt que mesurer faux.
      // Limite assumée : les dégradés portés par un PSEUDO-élément couvrant ne
      // sont pas vus ici (leur `backgroundColor` transparent les fait ignorer
      // plus bas) — aucun n'existe aujourd'hui sur un chemin mesuré.
      if (nodeStyle.backgroundImage !== 'none') {
        throw new Error(
          `fond en dégradé/image sur une couche traversée ${describeNode(node)} : ` +
            `« ${nodeStyle.backgroundImage} ». Seul \`background-color\` est composité, ` +
            'le fond mesuré serait faux. Mesurer sur un ancêtre à fond uni, ou étendre ' +
            'le compositage aux dégradés.',
        )
      }
      const bg = toRgba(nodeStyle.backgroundColor)
      if (bg[3] > 0) layers.push(bg)
      if (bg[3] >= 1) break
    }

    // Fond de départ : le premier ancêtre opaque, sinon le blanc du canvas.
    let background: Rgba =
      layers.length > 0 && layers[layers.length - 1][3] >= 1
        ? (layers.pop() as Rgba)
        : [255, 255, 255, 1]
    // Ré-empilement du plus profond au plus proche de l'élément.
    for (let i = layers.length - 1; i >= 0; i -= 1) background = over(layers[i], background)

    // --- Pseudo-éléments couvrants (voile de survol de `.cta-button`) --------
    // Ne comptent que s'ils recouvrent effectivement la boîte : au repos le
    // voile fait `width: 0`, il ne doit alors rien changer au fond mesuré.
    let overlayCount = 0
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo)
      if (ps.content === 'none' || ps.display === 'none') continue
      const w = Number.parseFloat(ps.width)
      const h = Number.parseFloat(ps.height)
      if (!Number.isFinite(w) || !Number.isFinite(h)) continue
      const covers = w >= rect.width * 0.95 && h >= rect.height * 0.95
      if (!covers) continue
      const color = toRgba(ps.backgroundColor)
      const pseudoOpacity = Number.parseFloat(ps.opacity)
      const alpha = color[3] * (Number.isFinite(pseudoOpacity) ? pseudoOpacity : 1)
      if (alpha <= 0) continue
      background = over([color[0], color[1], color[2], alpha], background)
      overlayCount += 1
    }

    // --- Opacité effective -------------------------------------------------
    // PIÈGE CORRIGÉ AU SPRINT 49 : `effectiveOpacity` était calculé mais jamais
    // APPLIQUÉ. Seul `readAtRest` en tirait parti, via son plancher à 0.99 ;
    // `expectReadable` au survol, lui, ne le regardait pas — un élément à
    // `opacity: 0.4` rendait donc le ratio de son encre PLEINE, très au-dessus
    // de ce que l'œil reçoit. Là encore l'erreur penchait du côté permissif.
    //
    // Modèle retenu : l'opacité accumulée réduit l'alpha de l'encre, qui est
    // composée sur le fond mesuré. C'est une BORNE INFÉRIEURE du ratio réel
    // (quand le fond appartient au même groupe d'opacité, il pâlit lui aussi et
    // le contraste réel est un peu meilleur), et c'est le sens voulu : un
    // harnais de contraste doit se tromper en étant trop sévère, jamais l'inverse.
    // --- Encre mesurée ------------------------------------------------------
    // GARDE (#325). `border-top-color` vaut `currentColor` quand AUCUNE bordure
    // n'est déclarée : sans ce contrôle, mesurer le trait d'un élément qui n'en
    // a pas rendrait silencieusement le contraste de son TEXTE — un ratio
    // plausible, sur le mauvais objet. C'est le mode d'échec de PIT-S53-001
    // (`text-*` qui apparie un `line-height`) transposé aux bordures : la sonde
    // répond, mais à une autre question. On lève plutôt que de mesurer faux.
    if (inkProp === 'borderTopColor' || inkProp === 'borderBottomColor') {
      const side = inkProp === 'borderTopColor' ? 'Top' : 'Bottom'
      const lineStyle = style[`border${side}Style` as 'borderTopStyle' | 'borderBottomStyle']
      const lineWidth = Number.parseFloat(
        style[`border${side}Width` as 'borderTopWidth' | 'borderBottomWidth'],
      )
      if (lineStyle === 'none' || lineStyle === 'hidden' || !(lineWidth > 0)) {
        throw new Error(
          `aucune bordure ${side.toLowerCase()} sur ${describeNode(el)} ` +
            `(style « ${lineStyle} », largeur ${lineWidth}px) : la mesure aurait rendu ` +
            '`currentColor`, donc le contraste du TEXTE au lieu de celui du trait.',
        )
      }
    }
    const ink = toRgba(style[inkProp])
    const foreground = over([ink[0], ink[1], ink[2], ink[3] * effectiveOpacity], background)
    const fontSizePx = Number.parseFloat(style.fontSize)
    const fontWeight = Number.parseInt(style.fontWeight, 10)
    // WCAG 1.4.3 : « large scale » = >= 18pt (24px), ou >= 14pt (18.66px) en gras.
    const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700)

    return {
      ratio: contrast(foreground, background),
      foreground: hex(foreground),
      background: hex(background),
      fontSizePx,
      fontWeight,
      isLargeText,
      wcagThreshold: isLargeText ? 3 : 4.5,
      effectiveOpacity,
      overlayCount,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      boxWidth: rect.width,
      boxHeight: rect.height,
      text: (el.textContent ?? '').trim(),
    }
  }, inkProperty)
}

/**
 * Attend que les polices soient chargées.
 *
 * Obligatoire AVANT toute mesure de largeur : les libellés sont mesurés avec la
 * police de repli tant que le swap n'a pas eu lieu, et l'écart de métriques
 * produit des faux positifs de troncature intermittents.
 */
export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

/**
 * Amène l'élément dans le viewport et attend que la section qui le porte soit
 * réellement révélée.
 *
 * `useSectionAnimation` pose `.visible` (donc `opacity: 1`) via un
 * `IntersectionObserver` au défilement : mesurer un contraste sur une section
 * encore à `opacity: 0` ne veut rien dire. On attend donc l'opacité effective,
 * pas un simple `toBeVisible()` (Playwright considère « visible » un élément à
 * `opacity: 0` — seuls `display:none`, `visibility:hidden` et une boîte nulle le
 * masquent à ses yeux).
 */
export async function revealForMeasurement(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded()
  await expect
    .poll(async () => (await readTextRendering(locator)).effectiveOpacity, {
      message: "la section portant le CTA n'atteint pas opacity 1",
      timeout: 5_000,
    })
    .toBeGreaterThan(0.99)
}

/**
 * Mesure APRÈS avoir écarté la souris.
 *
 * Le curseur reste là où Playwright l'a laissé : après un défilement, un
 * élément peut se retrouver sous le pointeur et être mesuré dans son état
 * `:hover` au lieu de son état de repos. Constaté en mesurant : à 375px, le CTA
 * secondaire du hero passe sous le curseur après `scrollIntoViewIfNeeded` et
 * renvoie 1.00:1 (état de survol) au lieu de 17.32:1.
 */
export async function readAtRest(page: Page, locator: Locator): Promise<TextRendering> {
  await page.mouse.move(0, 0)
  await revealForMeasurement(locator)
  return readStable(locator)
}

/**
 * Mesure une fois le rendu STABILISÉ (deux lectures consécutives identiques).
 *
 * Indispensable, et pas seulement pour le confort : les CTA portent
 * `transition-all` / `transition-colors`, et le voile de `.cta-button` anime sa
 * largeur sur 300ms. Une mesure prise juste après `hover()` renvoie encore
 * l'ancienne couleur.
 *
 * Pourquoi PAS `expect.poll(...).toBeGreaterThanOrEqual(seuil)` : le poll
 * s'arrête dès que la condition est vraie, donc il valide l'état de DÉPART
 * (encore conforme) et ne voit jamais la dégradation qui arrive 200ms plus tard.
 * Constaté en développant cette spec : le défaut de survol du CTA secondaire
 * passait « vert » un run sur deux. On attend donc la stabilité, PUIS on juge.
 */
export async function readStable(
  locator: Locator,
  timeout = 3_000,
  inkProperty: InkProperty = 'color',
): Promise<TextRendering> {
  const deadline = Date.now() + timeout
  let previous = await readTextRendering(locator, inkProperty)
  for (;;) {
    await locator.page().waitForTimeout(120)
    const current = await readTextRendering(locator, inkProperty)
    const settled =
      Math.abs(current.ratio - previous.ratio) < 0.005 &&
      current.background === previous.background &&
      current.foreground === previous.foreground &&
      current.clientWidth === previous.clientWidth &&
      current.scrollWidth === previous.scrollWidth &&
      current.clientHeight === previous.clientHeight &&
      current.scrollHeight === previous.scrollHeight
    if (settled || Date.now() > deadline) return current
    previous = current
  }
}

/** Seuil applicable : le plus exigeant entre WCAG et le plancher projet. */
export function requiredRatio(rendering: TextRendering): number {
  return Math.max(rendering.wcagThreshold, CTA_MIN_RATIO)
}

/** Ligne de diagnostic lisible dans le rapport d'échec. */
export function describeRendering(label: string, r: TextRendering): string {
  return (
    `${label} — ${r.ratio.toFixed(2)}:1 (seuil ${requiredRatio(r)}) ` +
    `texte ${r.foreground} sur fond ${r.background}, ` +
    `${r.fontSizePx}px/${r.fontWeight}${r.isLargeText ? ' (grand texte)' : ''}, ` +
    `opacité ${r.effectiveOpacity}, ${r.overlayCount} voile(s) composité(s)`
  )
}

/** Contraste >= seuil, mesuré une fois les transitions arrivées à destination. */
export async function expectReadable(
  locator: Locator,
  label: string,
  timeout = 3_000,
): Promise<TextRendering> {
  const rendering = await readStable(locator, timeout)
  expect(rendering.ratio, describeRendering(label, rendering)).toBeGreaterThanOrEqual(
    requiredRatio(rendering),
  )
  return rendering
}

/**
 * Aucune troncature : `scrollWidth`/`scrollHeight` ne dépassent pas la boîte.
 *
 * `.cta-button` porte `overflow: hidden` (nécessaire au clipping du voile) :
 * un libellé trop long y est coupé SILENCIEUSEMENT — aucune erreur, aucun
 * changement de layout, juste un mot tronqué. C'est le défaut livré au S48 et
 * la seule métrique qui le voit est cet écart de largeur.
 */
export function expectNotTruncated(label: string, r: TextRendering): void {
  expect
    .soft(
      r.scrollWidth,
      `${label} : libellé tronqué horizontalement (« ${r.text} » — scrollWidth ${r.scrollWidth} > clientWidth ${r.clientWidth})`,
    )
    .toBeLessThanOrEqual(r.clientWidth + TRUNCATION_TOLERANCE_PX)
  expect
    .soft(
      r.scrollHeight,
      `${label} : libellé rogné verticalement (« ${r.text} » — scrollHeight ${r.scrollHeight} > clientHeight ${r.clientHeight})`,
    )
    .toBeLessThanOrEqual(r.clientHeight + TRUNCATION_TOLERANCE_PX)
}

export interface CtaTarget {
  /** Identifiant stable dans les messages d'échec. */
  name: string
  locator: Locator
}

/**
 * Les appels à l'action de la landing.
 *
 * Aucun de ces boutons ne porte de `data-testid` à ce jour et les ajouter
 * sortait du périmètre de #337 (les composants `landing/` étaient modifiés en
 * parallèle). On s'ancre donc sur la STRUCTURE et sur les `href`, jamais sur les
 * libellés : la suite tourne en `fr`/`en`/`es`/`de` et un texte français en dur
 * casserait dans trois locales sur quatre.
 *
 * - `header a[href$="/register"]` — CTA primaire de l'en-tête.
 * - `header a[href$="/login"]` — « Connexion ». ⚠ En `display:none` sous `md`
 *   depuis #334 : la spec des CTA le saute alors (`continue`), il n'était donc
 *   mesuré dans AUCUN test à 375 px, dans aucun thème. C'est `mobileMenuTargets`
 *   qui couvre sa copie du panneau burger — les deux sont nécessaires.
 * - `a.cta-button` — CTA primaire du hero (classe portée par lui seul).
 * - `section a[href="#how-it-works"]` — CTA secondaire du hero. Le `<header>`
 *   porte la même ancre dans sa navigation : la restreindre à `section` suffit
 *   à les distinguer sans dépendre d'un ordre.
 * - `section a[href$="/register"]:not(.cta-button)` — CTA du bandeau final.
 */
export function landingCtas(page: Page): CtaTarget[] {
  return [
    { name: 'header/inscription', locator: page.locator('header a[href$="/register"]') },
    { name: 'header/connexion', locator: page.locator('header a[href$="/login"]') },
    { name: 'hero/primaire', locator: page.locator('a.cta-button') },
    { name: 'hero/secondaire', locator: page.locator('section a[href="#how-it-works"]') },
    {
      name: 'bandeau-final/inscription',
      locator: page.locator('section a[href$="/register"]:not(.cta-button)'),
    },
  ]
}

/** Identifiants de test du menu burger de la landing (#334). */
export const MOBILE_MENU = {
  toggle: 'landing-header-menu-toggle',
  panel: 'landing-header-menu',
  close: 'landing-header-menu-close',
  overlay: 'landing-header-menu-overlay',
} as const

/**
 * Cibles textuelles du panneau burger OUVERT.
 *
 * Elles n'existent dans le DOM que menu ouvert et sous `md` : aucune spec des
 * CTA ne pouvait les atteindre. « Connexion », déplacé ici par #334, n'était
 * mesuré nulle part — c'est le trou que cette fonction ferme.
 *
 * Ancrage sur la structure et les `href`, jamais sur les libellés : la suite
 * tourne en `fr`/`en`/`es`/`de`.
 */
export function mobileMenuTargets(page: Page): CtaTarget[] {
  const panel = page.getByTestId(MOBILE_MENU.panel)
  return [
    { name: 'menu/titre', locator: panel.locator('h2') },
    { name: 'menu/ancre-1', locator: panel.locator('nav a').nth(0) },
    { name: 'menu/ancre-2', locator: panel.locator('nav a').nth(1) },
    { name: 'menu/ancre-3', locator: panel.locator('nav a').nth(2) },
    { name: 'menu/connexion', locator: panel.locator('a[href$="/login"]') },
  ]
}
