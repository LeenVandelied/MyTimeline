import type { Locator, Page } from '@playwright/test'

/**
 * Lecture de PIXEL PEINT — sonde de contraste WCAG 1.4.11 (`PAT-S58-002`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE, ET EN QUOI IL DIFFÈRE DE `contrast.ts`
 * ─────────────────────────────────────────────────────────────────────────────
 * `support/contrast.ts` mesure des couleurs **déclarées** : il part de
 * `getComputedStyle`, composite les ancêtres et les pseudo-éléments, et rend un
 * ratio. Son `getImageData` sur canvas 1×1 ne sert qu'à NORMALISER une chaîne
 * CSS (`color-mix()`, `oklch()`…) en octets sRGB — ce n'est pas une lecture
 * d'écran. Il ne peut donc répondre à aucune des questions suivantes :
 *
 *  · un `outline` est-il réellement PEINT, ou rogné par un ancêtre
 *    `overflow:hidden` (cf. `DEC-S58-004`, `PIT-S41-001`) ?
 *  · sur QUOI se peint-il ? `outline-offset` pose le trait sur le PARENT, et ce
 *    qui s'y trouve peut être un dégradé, un `color-mix`, un pseudo-élément ou
 *    un empilement de surfaces. Remonter le DOM pour trouver le premier ancêtre
 *    non transparent produit de FAUX ratios : `PIT-S58-001` a mesuré 1,00:1 sur
 *    un CTA dont la lecture de pixel donnait 5,93:1.
 *  · que vaut la couleur après ANTI-CRÉNELAGE ? Sur un contrôle circulaire, S58
 *    a lu 3,19:1 là où la couleur déclarée valait 3,70:1.
 *
 * Ce module répond à ces trois questions, et à elles seules : il capture
 * `page.screenshot({clip})`, décode le PNG DANS la page (`createImageBitmap` +
 * canvas `getImageData`) et rend les octets réellement affichés.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES TROIS RÈGLES D'USAGE — chacune correspond à une mesure fausse déjà livrée
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. **Les offsets se fixent par DUMP BRUT, jamais par heuristique.**
 *    `PIT-S58-001`, corollaire symétrique : une sonde « prends le pixel le plus
 *    écarté du fond » attrape la bordure du popover 1 px au-delà du trait et
 *    annonce 16,3:1 au lieu de 6,08:1. Aucune fonction de ce module ne cherche
 *    « le meilleur pixel ». On appelle d'abord {@link dumpOutwardProfile} pour
 *    VOIR le profil réel, on lit les offsets dessus, et on les passe en dur à
 *    {@link measureIndicatorContrast}. Le rapport de mesure doit citer le dump.
 *
 * 2. **Jamais sur un arc.** L'anti-crénelage dilue le pixel d'un trait courbe.
 *    On échantillonne un CÔTÉ DROIT (`side`), et on écarte les extrémités
 *    (`edgeGuard` / `edgeGuardPx`) où le rayon de bordure incurve le trait.
 *    Pour une pastille `border-radius:pill` de 38×22, la portion droite du bord
 *    haut ne fait que 16 px : passer `edgeGuardPx` explicitement, pas la
 *    fraction par défaut. Pour un cercle pur (`border-radius:50%`), il n'existe
 *    aucun côté droit — voir {@link measureIndicatorContrast} `tangentBandPx`.
 *
 * 3. **L'état et l'instant font partie de la mesure** (`PIT-S58-002`).
 *    Tailwind v4 fait entrer `outline-color` dans `transition-colors` : une
 *    sonde lancée < ~400 ms après le changement d'état lit une couleur
 *    INTERPOLÉE. Et S58 a lu 1,59:1 sur un bouton qui était `disabled`.
 *    Ce module ne pose aucun état lui-même : c'est l'appelant qui doit asserter
 *    `:focus-visible === true`, `disabled === false`, puis attendre ≥ 450 ms —
 *    {@link settleForMeasurement} le fait, et {@link assertFocusVisible} vérifie
 *    l'état. Utiliser les deux avant toute lecture.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AGRÉGATION : MODE, PAS EXTREMUM
 * ─────────────────────────────────────────────────────────────────────────────
 * Un trait de 2 px échantillonné en un seul point tombe dans un vide dès que
 * l'anti-crénelage mord. On échantillonne donc N points le long du côté et on
 * retient la couleur **MODALE** (la plus fréquente), pas la plus écartée du
 * fond : sur un segment droit et plein, la majorité des pixels vaut exactement
 * la couleur du trait, et les pixels crénelés sont minoritaires. Prendre
 * l'extremum, c'est réintroduire l'heuristique que `PIT-S58-001` interdit.
 * {@link PixelStrip.unanimity} expose la part du mode : une unanimité basse est
 * le signal qu'on échantillonne un arc ou un mauvais offset — pas un détail.
 * {@link measureIndicatorContrast} LÈVE en dessous de 0,6, sur CHACUNE de ses
 * deux bandes : la garde vit dans cette fonction, pas dans ses appelants, pour
 * qu'un appel qui aurait oublié de la recopier ne puisse pas en sortir un ratio
 * faux.
 *
 * La portée exacte de cette promesse — parce qu'un commentaire qui promet plus
 * que le code est le défaut que ce fichier a déjà eu trois fois :
 *  · elle vaut pour {@link measureIndicatorContrast}, la SEULE fonction qui rend
 *    un `ratio`. {@link readStrip} et {@link dumpOutwardProfile} rendent une
 *    `unanimity` SANS lever — c'est leur rôle (le dump doit pouvoir montrer une
 *    bande pourrie), et il revient à l'appelant qui calculerait lui-même un
 *    ratio depuis un `PixelStrip` de la lire ;
 *  · elle est levable, par `minUnanimity: 0` — opt-out explicite et écrit dans
 *    l'appel, jamais un défaut silencieux.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CES GARDES SONT ARMÉES PAR DES TESTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `src/__tests__/e2e-pixel-guards.test.ts` (Vitest) éprouve les quatre :
 * bande vide, seuil d'unanimité sur les DEUX bandes, état désactivé lu jusque
 * sur les ancêtres, et point hors région capturée. Chacun de ces tests a été
 * vérifié ROUGE garde neutralisée, VERT garde remise. Les deux specs Playwright
 * qui consomment la sonde mesurent des éléments sains (unanimité 100 %, loin des
 * bords) : elles ne déclenchent aucune garde et ne prouvent donc rien à leur
 * sujet. Toucher un seuil, un comparateur ou une tolérance ici sans faire rougir
 * ce fichier de test signifie que la garde correspondante a été perdue.
 *
 * @see docs/memory/sprints/sprint-58 — origine des pièges cités.
 */

/** Composantes sRGB 0-255 d'un pixel peint (l'alpha est déjà aplati par le compositing). */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** Un pixel lu, avec la coordonnée CSS (page) d'où il provient. */
export interface PixelSample {
  /** Abscisse CSS dans le repère de la page. */
  x: number
  /** Ordonnée CSS dans le repère de la page. */
  y: number
  rgb: Rgb
  /** `#rrggbb`, pour consignation directe dans un rapport. */
  hex: string
}

/** Résultat d'un échantillonnage le long d'un côté, à un offset donné. */
export interface PixelStrip {
  /** Couleur MODALE des échantillons — la valeur à utiliser. Jamais l'extremum. */
  dominant: Rgb
  /** {@link dominant} en `#rrggbb`. */
  dominantHex: string
  /**
   * Part des échantillons portant exactement {@link dominant}, dans `]0,1]`.
   * < 0.6 = on échantillonne probablement un arc, un dégradé ou un offset qui
   * chevauche deux zones. À citer dans tout rapport de mesure.
   */
  unanimity: number
  /** Tous les échantillons, dans l'ordre du parcours. Sert au dump brut. */
  samples: PixelSample[]
  /** Offset outward effectivement lu, en px CSS depuis la boîte de bordure. */
  offsetPx: number
  side: Side
}

/** Côté droit de la boîte de bordure le long duquel échantillonner. */
export type Side = 'top' | 'bottom' | 'left' | 'right'

export interface StripOptions {
  /** Côté à échantillonner. Choisir un côté DROIT du contrôle, jamais un arc. */
  side: Side
  /**
   * Distance vers l'EXTÉRIEUR de la boîte de bordure, en px CSS, jusqu'au
   * CENTRE du pixel lu. `0` = le pixel du bord lui-même ; `3` = 3 px dehors.
   * Valeur à fixer par {@link dumpOutwardProfile}, jamais devinée.
   */
  offsetPx: number
  /** Nombre d'échantillons répartis le long du côté. Défaut 15. */
  samples?: number
  /**
   * Fraction de la longueur du côté écartée à CHAQUE extrémité (zone d'arc du
   * rayon de bordure). Défaut 0.25. Ignoré si {@link edgeGuardPx} est fourni.
   */
  edgeGuard?: number
  /**
   * Garde d'extrémité en px CSS absolus, à préférer dès que le rayon de bordure
   * est connu : pour un `border-radius:999px` sur 38×22, le rayon vaut 11 px,
   * donc `edgeGuardPx: 12` garantit de rester sur la portion droite.
   */
  edgeGuardPx?: number
}

const toHex = (c: Rgb): string =>
  `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

/**
 * Luminance relative WCAG 2.x — linéarisation sRGB canal par canal.
 *
 * Volontairement redéfinie ici plutôt qu'importée de `contrast.ts` : là-bas la
 * fonction vit À L'INTÉRIEUR d'un `page.evaluate` (contrast.ts:151) et n'est pas
 * exportable côté Node. Ce module calcule côté Node, sur des octets déjà lus.
 * Une moyenne naïve des canaux donne un ratio faux d'un facteur ~2 sur les
 * bleus — précisément la teinte de `--color-focus` du DS.
 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number): number => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Ratio de contraste WCAG entre deux couleurs peintes, dans `[1, 21]`. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Attend que les transitions de couleur soient TERMINÉES (`PIT-S58-002`, volet
 * « instant »). Tailwind v4 anime `outline-color` et les couleurs de bordure ;
 * une lecture à < ~400 ms rend une couleur interpolée, sans que rien ne le
 * signale. 450 ms est le plancher retenu au S58.
 *
 * Neutralise aussi l'overlay `nextjs-portal` (`PIT-S58-005`), qui capte
 * `elementFromPoint` et fausse la première mesure géométrique sous `next dev`.
 */
export async function settleForMeasurement(page: Page, waitMs = 450): Promise<void> {
  await page.addStyleTag({
    content: 'nextjs-portal,#__next-build-watcher,.tsqd-parent-container{display:none !important}',
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(waitMs)
}

/**
 * Assertion d'ÉTAT préalable à toute mesure (`PIT-S58-002`, volet « état »).
 * S58 a publié un 1,59:1 mesuré sur un bouton `disabled` (`opacity:.4`).
 * Lève si l'élément n'est pas en `:focus-visible`, ou s'il est désactivé.
 *
 * ⚠ « DÉSACTIVÉ » NE SE LIT PAS QUE SUR `.disabled`. La propriété DOM n'existe
 * que sur les contrôles natifs. **Radix — donc `Select`, `DropdownMenu`,
 * `Checkbox`, `Switch` de ce dépôt — désactive des `div` / `span` par
 * `aria-disabled="true"` et/ou l'attribut `data-disabled`**, sur lesquels
 * `.disabled` vaut `undefined`. Une garde qui ne teste que `HTMLInputElement` /
 * `HTMLButtonElement` laisse donc passer un contrôle désactivé et rouvre
 * exactement `PIT-S58-002` (le 1,59:1 du S58) sur toute la surface Radix de
 * l'application. Les trois signaux sont testés, et le message NOMME celui qui a
 * levé — un `aria-disabled` posé par erreur ne se voit pas autrement.
 *
 * ⚠ ET IL NE SE LIT PAS QUE SUR L'ÉLÉMENT MESURÉ. Sur Radix, « désactivé » se
 * propage par le DOM et non par une propriété : un `Select.Item`, un
 * `DropdownMenu.Group` ou une `fieldset[data-disabled]` **ANCÊTRE** porte
 * l'attribut, et le descendant réellement peint (l'`<span>` du libellé, la
 * pastille, l'indicateur) n'en porte aucun. Une garde qui n'interroge que
 * `el` laisse donc passer exactement le cas qu'elle prétend couvrir. La
 * recherche remonte donc la chaîne avec `closest()`, et le message dit SUR QUEL
 * élément le signal a été trouvé — l'élément mesuré ou un ancêtre nommé : quand
 * cette garde lèvera dans six mois, c'est cette information-là qui évitera de
 * chercher l'attribut sur le mauvais nœud.
 *
 * Convention retenue, identique à celle de Radix : l'attribut `data-disabled`
 * n'est présent QUE lorsque le contrôle est désactivé (Radix ne publie pas
 * `data-disabled="false"`), donc sa seule présence suffit.
 */
export async function assertFocusVisible(locator: Locator): Promise<void> {
  const state = await locator.evaluate((el) => {
    /** Les deux signaux non natifs, en un seul sélecteur — remonté par `closest`. */
    const DISABLED_SELECTOR = '[aria-disabled="true"],[data-disabled]'

    const signalOn = (node: Element): string | null =>
      node.getAttribute('aria-disabled') === 'true'
        ? '`aria-disabled="true"`'
        : node.hasAttribute('data-disabled')
          ? "l'attribut `data-disabled` (convention Radix)"
          : null

    const label = (node: Element): string => {
      const id = node.id !== '' ? `#${node.id}` : ''
      const cls =
        node.classList.length > 0 ? `.${Array.from(node.classList).slice(0, 2).join('.')}` : ''
      return `<${node.tagName.toLowerCase()}${id}${cls}>`
    }

    const nativeDisabled =
      (el instanceof HTMLInputElement ||
        el instanceof HTMLButtonElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement) &&
      el.disabled

    let disabledBy: string | null = null
    let disabledOn: string | null = null
    if (nativeDisabled) {
      disabledBy = 'la propriété DOM `.disabled`'
      disabledOn = "l'élément mesuré lui-même"
    } else {
      const carrier = el.closest(DISABLED_SELECTOR)
      const carrierSignal = carrier == null ? null : signalOn(carrier)
      if (carrier != null && carrierSignal != null) {
        disabledBy = carrierSignal
        disabledOn = carrier === el ? "l'élément mesuré lui-même" : `un ANCÊTRE ${label(carrier)}`
      }
    }

    return {
      focusVisible: el.matches(':focus-visible'),
      disabledBy,
      disabledOn,
      tag: el.tagName.toLowerCase(),
    }
  })
  if (!state.focusVisible) {
    throw new Error(
      `Mesure refusée : <${state.tag}> n'est PAS en :focus-visible. ` +
        `Un ratio lu hors de l'état visé ne prouve rien (PIT-S58-002).`,
    )
  }
  if (state.disabledBy != null) {
    throw new Error(
      `Mesure refusée : <${state.tag}> est désactivé via ${state.disabledBy}, porté par ` +
        `${state.disabledOn} — S58 a publié un 1,59:1 lu sur un contrôle désactivé ` +
        `(opacity:.4). Sur Radix, un ancêtre (Item, Group, fieldset) désactive ses ` +
        `descendants sans qu'aucune propriété DOM ne le signale. ` +
        `Assurer l'état avant de mesurer (PIT-S58-002).`,
    )
  }
}

/** Rectangle CSS dans le repère de la page. */
interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Capture une fois la zone `box + marge` et rend un accesseur de pixel en
 * coordonnées CSS page. Le PNG est décodé DANS la page (`createImageBitmap` +
 * `getImageData`) : c'est la seule voie qui rend les octets réellement peints.
 *
 * ⚠ TROIS GARDES CONTRE UN RATIO FAUX SILENCIEUX — ne pas les retirer.
 *
 * `page.screenshot({clip})` **INTERSECTE le clip avec le viewport, sans le
 * signaler** : un clip qui déborde à droite ou en bas rend une image PLUS
 * PETITE que demandé. Une échelle dérivée de `décodé / clip` est alors fausse
 * (par ex. 0,94 au lieu de 1), et l'accesseur lit un pixel DÉCALÉ — un ratio
 * plausible mesuré au mauvais endroit. Le cas se produit dès qu'un contrôle
 * touche un bord, ce qui est banal sur une pastille en pied de drawer.
 *
 *  1. Le clip est CLAMPÉ sur `page.viewportSize()` : ce qui est demandé est ce
 *     qui est capturé, donc l'échelle reste juste.
 *  2. Les dimensions décodées sont ASSERTÉES contre `clip × devicePixelRatio`
 *     (± 1 px) : si le moteur rogne encore pour une raison non prévue ici, on
 *     lève au lieu de publier.
 *  3. Un point demandé HORS de la région capturée lève. L'ancien code le
 *     ramenait au bord le plus proche (`Math.min`/`Math.max`) et rendait
 *     silencieusement la couleur d'un AUTRE pixel — la garde 1 ne suffit pas :
 *     un offset vers l'extérieur d'un élément déjà collé au bord du viewport
 *     désigne un pixel qui n'existe simplement pas.
 */
async function captureRegion(
  page: Page,
  box: Box,
  marginPx: number,
): Promise<(x: number, y: number) => Rgb> {
  const viewport = page.viewportSize()
  const left = Math.max(0, box.x - marginPx)
  const top = Math.max(0, box.y - marginPx)
  const right = box.x + box.width + marginPx
  const bottom = box.y + box.height + marginPx
  const clip = {
    x: left,
    y: top,
    width: (viewport == null ? right : Math.min(viewport.width, right)) - left,
    height: (viewport == null ? bottom : Math.min(viewport.height, bottom)) - top,
  }
  if (clip.width <= 0 || clip.height <= 0) {
    throw new Error(
      `Zone de capture vide après clamp sur le viewport ` +
        `(${clip.width}×${clip.height}) : la boîte ${box.width}×${box.height} en ` +
        `(${box.x},${box.y}) avec marge ${marginPx}px ne croise pas la zone visible. ` +
        `Faire défiler l'élément dans le viewport avant de mesurer.`,
    )
  }

  const png = (await page.screenshot({ clip })).toString('base64')

  const decoded = await page.evaluate(async (b64: string) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx == null) throw new Error('canvas 2d indisponible')
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    return {
      width: bitmap.width,
      height: bitmap.height,
      dpr: window.devicePixelRatio,
      data: Array.from(data),
    }
  }, png)

  // Le screenshot est rendu en pixels PÉRIPHÉRIQUES : sur un écran HiDPI il est
  // plus grand que le clip CSS. On dérive l'échelle du rapport réel plutôt que
  // de faire confiance à `devicePixelRatio`, que l'émulation de viewport modifie.
  const scaleX = decoded.width / clip.width
  const scaleY = decoded.height / clip.height

  // …mais on VÉRIFIE ce rapport contre le `devicePixelRatio` observé dans la
  // page. Un écart > 1 px de large signe une intersection silencieuse du clip
  // par le viewport (cf. garde 2 du JSDoc) : l'échelle serait fausse et tous
  // les pixels lus décalés. Tolérance 1 px : le PNG est arrondi à l'entier.
  const expectedW = clip.width * decoded.dpr
  const expectedH = clip.height * decoded.dpr
  if (Math.abs(decoded.width - expectedW) > 1 || Math.abs(decoded.height - expectedH) > 1) {
    throw new Error(
      `Capture rognée : PNG ${decoded.width}×${decoded.height}px alors que le clip ` +
        `${clip.width}×${clip.height} CSS × dpr ${decoded.dpr} attendait ` +
        `${expectedW.toFixed(1)}×${expectedH.toFixed(1)}. L'échelle dérivée ` +
        `(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) serait fausse et TOUS les pixels ` +
        `lus décalés — un ratio publié ici ne vaudrait rien.`,
    )
  }

  return (cssX: number, cssY: number): Rgb => {
    const px = Math.round((cssX - clip.x) * scaleX)
    const py = Math.round((cssY - clip.y) * scaleY)
    if (px < 0 || px >= decoded.width || py < 0 || py >= decoded.height) {
      throw new Error(
        `Point (${cssX.toFixed(1)}, ${cssY.toFixed(1)}) CSS hors de la région capturée ` +
          `[${clip.x}, ${clip.x + clip.width}] × [${clip.y}, ${clip.y + clip.height}] : ` +
          `il n'existe aucun pixel à lire là. Rabattre la lecture sur le bord le plus ` +
          `proche rendrait la couleur d'un AUTRE pixel, donc un faux ratio. ` +
          `Choisir un autre côté, ou éloigner l'élément du bord du viewport.`,
      )
    }
    const i = (py * decoded.width + px) * 4
    return { r: decoded.data[i], g: decoded.data[i + 1], b: decoded.data[i + 2] }
  }
}

/** Positions CSS à échantillonner le long d'un côté, garde d'extrémité appliquée. */
function samplePositions(box: Box, opts: StripOptions): Array<{ x: number; y: number }> {
  const horizontal = opts.side === 'top' || opts.side === 'bottom'
  const span = horizontal ? box.width : box.height
  const guard = opts.edgeGuardPx ?? span * (opts.edgeGuard ?? 0.25)
  const usable = span - guard * 2
  if (usable <= 0) {
    throw new Error(
      `Garde d'extrémité (${guard}px × 2) >= longueur du côté ${opts.side} (${span}px) : ` +
        `aucun segment droit à échantillonner. Choisir un autre côté, ou baisser edgeGuardPx.`,
    )
  }
  const n = opts.samples ?? 15
  const start = (horizontal ? box.x : box.y) + guard
  const step = n > 1 ? usable / (n - 1) : 0

  const fixed =
    opts.side === 'top'
      ? box.y - opts.offsetPx
      : opts.side === 'bottom'
        ? box.y + box.height + opts.offsetPx
        : opts.side === 'left'
          ? box.x - opts.offsetPx
          : box.x + box.width + opts.offsetPx

  return Array.from({ length: n }, (_, i) => {
    const along = start + step * i
    return horizontal ? { x: along, y: fixed } : { x: fixed, y: along }
  })
}

/**
 * Couleur modale d'une liste d'échantillons, avec sa part.
 *
 * Lève sur une liste VIDE plutôt que de déréférencer `samples[0].hex` : avec
 * `samples: 0`, l'ancien code sortait un `TypeError` opaque (« Cannot read
 * properties of undefined ») à trois niveaux de la cause réelle, et
 * `unanimity` aurait valu `NaN` — donc une comparaison `>= 0.6` FAUSSE, qui
 * passe pour une mesure.
 *
 * Ex æquo : `Map` itère dans l'ordre de PREMIÈRE INSERTION, c'est-à-dire
 * l'ordre de parcours du côté, et `>` (strict) garde le premier. Le
 * départage est donc déterministe et reproductible d'un run à l'autre —
 * mais il n'a aucun sens physique : une unanimité qui laisse un ex æquo
 * décider vaut au mieux 50 %, donc bien sous le seuil de 0,6 que
 * {@link measureIndicatorContrast} impose. Le garde-fou est là, pas ici.
 */
function mode(samples: PixelSample[]): { rgb: Rgb; unanimity: number } {
  if (samples.length === 0) {
    throw new Error(
      'mode() : aucun échantillon à agréger. Une bande vide ne peut produire ni ' +
        "couleur ni unanimité — vérifier l'option `samples` (elle doit valoir >= 1).",
    )
  }
  const tally = new Map<string, number>()
  for (const s of samples) tally.set(s.hex, (tally.get(s.hex) ?? 0) + 1)
  let bestHex = samples[0].hex
  let bestCount = 0
  for (const [hex, count] of tally) {
    if (count > bestCount) {
      bestHex = hex
      bestCount = count
    }
  }
  const winner = samples.find((s) => s.hex === bestHex)
  if (winner == null) throw new Error('mode introuvable')
  return { rgb: winner.rgb, unanimity: bestCount / samples.length }
}

/**
 * Lit une bande de pixels le long d'un côté droit de l'élément, à un offset
 * fixé, et rend la couleur MODALE.
 *
 * L'offset ne se devine pas : le fixer sur la sortie de
 * {@link dumpOutwardProfile}.
 *
 * @example
 * const strip = await readStrip(page, track, { side: 'top', offsetPx: 3, edgeGuardPx: 12 })
 * console.log(strip.dominantHex, strip.unanimity)
 */
export async function readStrip(
  page: Page,
  locator: Locator,
  opts: StripOptions,
): Promise<PixelStrip> {
  const box = await locator.boundingBox()
  if (box == null) throw new Error("boundingBox() nulle : l'élément n'est pas rendu")
  // `Math.abs` : un offset NÉGATIF échantillonne l'INTÉRIEUR de la boîte (cf.
  // le profil signé de #414). Sans la valeur absolue, la marge devenait
  // négative et la région capturée RÉTRÉCISSAIT sous la boîte — inoffensif
  // tant que l'accesseur rabattait sur le bord, désormais une levée.
  const read = await captureRegion(page, box, Math.ceil(Math.abs(opts.offsetPx)) + 3)
  const samples: PixelSample[] = samplePositions(box, opts).map(({ x, y }) => {
    const rgb = read(x, y)
    return { x, y, rgb, hex: toHex(rgb) }
  })
  const { rgb, unanimity } = mode(samples)
  return {
    dominant: rgb,
    dominantHex: toHex(rgb),
    unanimity,
    samples,
    offsetPx: opts.offsetPx,
    side: opts.side,
  }
}

/**
 * DUMP BRUT — couleur modale à chaque offset entier de `0` à `maxOffsetPx`,
 * vers l'extérieur du côté choisi.
 *
 * C'est l'outil qui remplace l'heuristique interdite par `PIT-S58-001` : on
 * REGARDE où le trait commence et où il finit, puis on écrit les offsets en dur
 * dans la mesure. Un rapport de contraste qui n'exhibe pas ce profil ne dit pas
 * COMMENT il a obtenu son ratio, et ne vaut rien.
 *
 * @returns un tableau indexé par offset (0..maxOffsetPx inclus).
 */
export async function dumpOutwardProfile(
  page: Page,
  locator: Locator,
  side: Side,
  maxOffsetPx = 8,
  opts: Omit<StripOptions, 'side' | 'offsetPx'> = {},
): Promise<PixelStrip[]> {
  const out: PixelStrip[] = []
  for (let o = 0; o <= maxOffsetPx; o += 1) {
    out.push(await readStrip(page, locator, { ...opts, side, offsetPx: o }))
  }
  return out
}

/** Rend le profil en une ligne par offset, prêt à coller dans un rapport. */
export function formatProfile(profile: PixelStrip[]): string {
  return profile
    .map(
      (s) =>
        `  +${String(s.offsetPx).padStart(2)}px  ${s.dominantHex}  ` +
        `unanimité ${(s.unanimity * 100).toFixed(0)}%`,
    )
    .join('\n')
}

export interface IndicatorMeasurement {
  /** Ratio WCAG entre l'indicateur peint et son fond adjacent peint. */
  ratio: number
  /** Bande lue sur l'indicateur (le trait de focus). */
  indicator: PixelStrip
  /** Bande lue sur le fond immédiatement adjacent, au-delà du trait. */
  adjacent: PixelStrip
  /** Récit de la mesure : offsets, côté, unanimité. À consigner tel quel. */
  method: string
}

export interface IndicatorOptions extends Omit<StripOptions, 'offsetPx'> {
  /** Offset du CENTRE du trait de focus, lu sur le dump. */
  indicatorOffsetPx: number
  /** Offset d'un pixel de fond franc au-delà du trait, lu sur le dump. */
  adjacentOffsetPx: number
  /**
   * Unanimité minimale exigée sur CHACUNE des deux bandes. Défaut `0.6`, le
   * seuil que documente {@link PixelStrip.unanimity} — en dessous, la fonction
   * LÈVE au lieu de rendre un `ratio`.
   *
   * Pourquoi c'est un défaut LEVANT et non une valeur à consulter : une bande
   * peu unanime n'est pas « une mesure un peu bruitée », c'est un
   * échantillonnage tombé sur un arc, un dégradé ou un mauvais offset — le
   * `ratio` qui en sort désigne une couleur qui n'est celle de rien. #415 l'a
   * vécu sur `.mt-radio__dot` (cercle pur) : unanimité tombée à 48 %, ratio
   * NON publié. Ce jour-là seule une assertion écrite à la main dans la spec
   * l'a arrêté ; le prochain appelant qui oubliera de la copier publiera un
   * faux ratio. La garde vit donc ICI.
   *
   * Mettre `0` pour désactiver — à ne faire que dans un test qui éprouve
   * délibérément une bande non unanime, jamais pour « faire passer » une mesure.
   */
  minUnanimity?: number
}

/**
 * Mesure le contraste d'un indicateur de focus contre son fond ADJACENT, au
 * pixel peint (WCAG 1.4.11 : seuil 3:1).
 *
 * L'appelant DOIT avoir posé l'état et l'avoir asserté ({@link assertFocusVisible})
 * et attendu la fin des transitions ({@link settleForMeasurement}) — ce module ne
 * le fait pas à sa place, parce qu'un défaut d'état ne se voit pas dans le
 * résultat (`PIT-S58-002`).
 *
 * Le « fond adjacent » n'est PAS le `background-color` d'un ancêtre : c'est le
 * pixel réellement peint juste à côté du trait (`PIT-S58-001`).
 *
 * LÈVE si l'une des deux bandes est moins unanime que `minUnanimity` (défaut
 * 0,6) : un appelant n'a donc RIEN à asserter pour être protégé du faux ratio.
 *
 * @example
 * await assertFocusVisible(input)
 * await settleForMeasurement(page)
 * console.log(formatProfile(await dumpOutwardProfile(page, track, 'top')))
 * // le dump montre le trait à +3px et le fond franc à +6px :
 * const m = await measureIndicatorContrast(page, track, {
 *   side: 'top', edgeGuardPx: 12, indicatorOffsetPx: 3, adjacentOffsetPx: 6,
 * })
 * expect(m.ratio, m.method).toBeGreaterThanOrEqual(3)
 */
export async function measureIndicatorContrast(
  page: Page,
  locator: Locator,
  opts: IndicatorOptions,
): Promise<IndicatorMeasurement> {
  const { indicatorOffsetPx, adjacentOffsetPx, minUnanimity = 0.6, ...strip } = opts
  const indicator = await readStrip(page, locator, { ...strip, offsetPx: indicatorOffsetPx })
  const adjacent = await readStrip(page, locator, { ...strip, offsetPx: adjacentOffsetPx })

  // GARDE D'UNANIMITÉ — avant tout calcul de ratio, et sur les DEUX bandes : un
  // fond adjacent non unanime rend le dénominateur du ratio aussi douteux que
  // son numérateur. Cf. `IndicatorOptions.minUnanimity`.
  for (const [name, band, offset] of [
    ['le trait de focus', indicator, indicatorOffsetPx],
    ['le fond adjacent', adjacent, adjacentOffsetPx],
  ] as const) {
    if (band.unanimity < minUnanimity) {
      throw new Error(
        `Ratio NON publié : unanimité ${(band.unanimity * 100).toFixed(0)}% sur ${name} ` +
          `(côté ${band.side}, +${offset}px, seuil ${(minUnanimity * 100).toFixed(0)}%). ` +
          `On échantillonne probablement un arc, un dégradé ou un offset qui chevauche ` +
          `deux zones : la couleur modale (${band.dominantHex}) n'est celle de rien, et le ` +
          `ratio qu'elle produirait ne vaudrait rien (PIT-S58-001). Rejouer ` +
          `dumpOutwardProfile() et refixer les offsets, ou resserrer edgeGuardPx.`,
      )
    }
  }

  const ratio = contrastRatio(indicator.dominant, adjacent.dominant)
  const method =
    `lecture de pixel peint (page.screenshot -> createImageBitmap -> getImageData), ` +
    `côté ${opts.side}, ${opts.samples ?? 15} échantillons ; ` +
    `indicateur +${indicatorOffsetPx}px = ${indicator.dominantHex} ` +
    `(unanimité ${(indicator.unanimity * 100).toFixed(0)}%), ` +
    `fond adjacent +${adjacentOffsetPx}px = ${adjacent.dominantHex} ` +
    `(unanimité ${(adjacent.unanimity * 100).toFixed(0)}%) ` +
    `-> ${ratio.toFixed(2)}:1`
  return { ratio, indicator, adjacent, method }
}

/** Seuil WCAG 2.1 — 1.4.11 Non-text Contrast (indicateurs d'état, bordures de contrôle). */
export const WCAG_NON_TEXT = 3
