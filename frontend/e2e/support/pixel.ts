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
 */
export async function assertFocusVisible(locator: Locator): Promise<void> {
  const state = await locator.evaluate((el) => ({
    focusVisible: el.matches(':focus-visible'),
    disabled: el instanceof HTMLInputElement || el instanceof HTMLButtonElement ? el.disabled : false,
    tag: el.tagName.toLowerCase(),
  }))
  if (!state.focusVisible) {
    throw new Error(
      `Mesure refusée : <${state.tag}> n'est PAS en :focus-visible. ` +
        `Un ratio lu hors de l'état visé ne prouve rien (PIT-S58-002).`,
    )
  }
  if (state.disabled) {
    throw new Error(
      `Mesure refusée : <${state.tag}> est disabled — S58 a publié un 1,59:1 lu ` +
        `sur un bouton désactivé (opacity:.4). Assurer l'état avant de mesurer.`,
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
 */
async function captureRegion(
  page: Page,
  box: Box,
  marginPx: number,
): Promise<(x: number, y: number) => Rgb> {
  const clip = {
    x: Math.max(0, box.x - marginPx),
    y: Math.max(0, box.y - marginPx),
    width: box.width + marginPx * 2,
    height: box.height + marginPx * 2,
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
    return { width: bitmap.width, height: bitmap.height, data: Array.from(data) }
  }, png)

  // Le screenshot est rendu en pixels PÉRIPHÉRIQUES : sur un écran HiDPI il est
  // plus grand que le clip CSS. On dérive l'échelle du rapport réel plutôt que
  // de faire confiance à `devicePixelRatio`, que l'émulation de viewport modifie.
  const scaleX = decoded.width / clip.width
  const scaleY = decoded.height / clip.height

  return (cssX: number, cssY: number): Rgb => {
    const px = Math.min(decoded.width - 1, Math.max(0, Math.round((cssX - clip.x) * scaleX)))
    const py = Math.min(decoded.height - 1, Math.max(0, Math.round((cssY - clip.y) * scaleY)))
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

/** Couleur modale d'une liste d'échantillons, avec sa part. */
function mode(samples: PixelSample[]): { rgb: Rgb; unanimity: number } {
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
  const read = await captureRegion(page, box, Math.ceil(opts.offsetPx) + 3)
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
  const { indicatorOffsetPx, adjacentOffsetPx, ...strip } = opts
  const indicator = await readStrip(page, locator, { ...strip, offsetPx: indicatorOffsetPx })
  const adjacent = await readStrip(page, locator, { ...strip, offsetPx: adjacentOffsetPx })
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
