/**
 * #66 (corrections review) — Helper contraste WCAG mutualisé (charte
 * `docs/design/graphite-handoff.md` §Helpers : `textOn(hex)` unique, pas de
 * duplication). Remplace l'ancienne formule naïve `luminance > 0.5` de
 * `EventEditForm.tsx` qui faisait échouer 10/12 couleurs de la palette event à
 * AA 4.5:1 (ex. citron #A7B83A → texte blanc à 2.20:1).
 *
 * Modèle 1-couleur (BR-EVE-009) : l'event porte UNE couleur de fond ; l'encre
 * (noir/blanc) est CALCULÉE par contraste réel, jamais hardcodée `text-white`.
 */

/** Hex #RGB ou #RRGGBB (aligné `HEX_COLOR_REGEX` de types/event.ts). */
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Encres candidates (charte Graphite : `--color-ink` / blanc pur). */
export const INK_DARK = '#0B0C0E'
export const INK_LIGHT = '#FFFFFF'

/** Seuil WCAG AA texte normal. */
export const WCAG_AA_NORMAL = 4.5

/**
 * Luminance relative sRGB d'une couleur `#RGB`/`#RRGGBB` (WCAG 2.x).
 * Linéarisation gamma par canal puis pondération 0.2126/0.7152/0.0722.
 */
export function relativeLuminance(hex: string): number {
  let h = hex.slice(1)
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const channel = (start: number) => {
    const c = parseInt(h.slice(start, start + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

/**
 * Ratio de contraste WCAG entre deux couleurs hex : `(Lclair + 0.05) /
 * (Lsombre + 0.05)`, valeur dans [1, 21].
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA)
  const lb = relativeLuminance(hexB)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Encre (noir `INK_DARK` vs blanc `INK_LIGHT`) qui MAXIMISE le ratio de
 * contraste WCAG contre le fond `hex`. Choisit le « moins pire » si aucune
 * n'atteint 4.5:1 — le résidu AA est signalé côté charte, pas bricolé ici
 * (pas de halo/text-shadow non prévu).
 *
 * Fallback `var(--color-ink)` si `hex` absent/invalide (préserve le theming DS).
 */
export function contrastInk(hex: string | undefined | null): string {
  if (!hex || !HEX_RE.test(hex)) return 'var(--color-ink)'
  const withDark = contrastRatio(hex, INK_DARK)
  const withLight = contrastRatio(hex, INK_LIGHT)
  return withDark >= withLight ? INK_DARK : INK_LIGHT
}

/** Alias sémantique charte (`textOn(hex)`). */
export const textOn = contrastInk

/**
 * #230 (correction review S61) — Réplique en JS la couleur que le NAVIGATEUR
 * produit pour `filter: grayscale(1)` (DS `.mt-tlv__evt--archived` /
 * `.mt-tlm__evt--archived`).
 *
 * ⚠ La fonction raccourcie CSS `grayscale()` opère dans l'espace **sRGB**
 * (CSS Filter Effects L1 §8 : `color-interpolation-filters: sRGB`) : la somme
 * pondérée `0.2126·R' + 0.7152·G' + 0.0722·B'` porte sur les canaux
 * **gamma-encodés** (0-255), PAS sur les valeurs linéarisées de `relativeLuminance`.
 * La linéarisation étant convexe, le gris obtenu a une luminance WCAG INFÉRIEURE
 * à celle de la couleur d'origine (inégalité de Jensen) → le fond s'assombrit.
 * D'où le besoin de recalculer l'encre sur CETTE couleur et pas sur l'originale :
 * noir et blanc sont des points fixes de `grayscale()`, l'encre ne bouge pas
 * toute seule (c'est le bug corrigé ici).
 *
 * Hex invalide/absent → renvoyé tel quel (préserve le theming DS `var(--…)`).
 */
export function grayscaleHex(hex: string): string {
  if (!HEX_RE.test(hex)) return hex
  let h = hex.slice(1)
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const y = Math.min(255, Math.max(0, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)))
  const c = y.toString(16).padStart(2, '0')
  return `#${c}${c}${c}`
}

/* ═══════════════════════════════════════════════════════════════════════════
   #497 — PLANCHER DE LISIBILITÉ des traits peints dans la COULEUR UTILISATEUR
   ═══════════════════════════════════════════════════════════════════════════

   Contexte mesuré (#325, S70) : le connecteur pointillé et le contour de
   l'occurrence fantôme de la mini-frise d'aperçu reprennent la couleur choisie
   par l'utilisateur SANS aucun plancher. Relevé au navigateur, drawer 1280×700 :
   citron `#A7B83A` en clair → connecteur **2.20:1**, contour **2.07:1** ;
   quasi-noir `#101318` en sombre → **1.02:1** des deux côtés (le trait a la
   luminance du fond : il n'existe plus). Seuil WCAG 1.4.11 = 3:1.

   DOCTRINE ARBITRÉE (#497, S71) — mélange PROGRESSIF de la couleur utilisateur
   vers l'ENCRE DU THÈME jusqu'à franchir 3:1, et pas plus loin. Pourquoi ce
   choix plutôt qu'un repli sur un token neutre : le repli neutre efface
   l'identité colorée de l'événement sur TOUTES les couleurs sous le seuil, y
   compris celles qui n'en sont qu'à un cheveu. Le mélange progressif garde la
   teinte reconnaissable quand c'est possible (citron clair → citron sombre,
   `#A7B83A` → `#8D9B35`) et ne dégrade jusqu'au gris que les couleurs qui n'ont
   plus de marge (quasi-noir en sombre → `#616468`).

   PÉRIMÈTRE STRICT : ces deux traits, et EUX SEULS. Le plancher n'est PAS
   appliqué au remplissage de la barre pleine ni au fond à 8 % du fantôme — ce
   sont des aplats dont l'identité colorée est l'information, et leur encre est
   déjà calculée par `contrastInk`. Élargir serait un changement de doctrine
   sans mandat.

   THEME-AWARE : le pire cas n'est pas le même selon le thème (couleur très
   claire sur fond clair / couleur quasi noire sur fond sombre). On calcule donc
   les DEUX valeurs et c'est le CSS qui choisit (`.dark`/`[data-theme]`,
   `ds/components/timeline.css`) — pas un `useTheme()` côté JS, qui rendrait la
   première passe SSR sans plancher.                                         */

/** Seuil WCAG 1.4.11 — composants non textuels et objets graphiques. */
export const WCAG_AA_NON_TEXT = 3

/**
 * Marge ajoutée à la cible interne. Le modèle JS ci-dessous reproduit le
 * compositage du navigateur, mais pas sa précision : `color-mix()` interpole en
 * flottant là où l'on quantifie sur 8 bits par canal, et la sonde E2E lit la
 * couleur *rendue*. Sans marge, une valeur calculée à 3.004:1 peut être relue à
 * 2.998:1 — un rouge dû à l'arrondi, pas au rendu. La marge est un coussin de
 * quantification, PAS un relèvement du seuil : le seuil reste 3:1.
 */
export const CONTRAST_FLOOR_MARGIN = 0.05

/**
 * Surfaces réellement peintes derrière ces deux traits, par thème.
 *
 * Ce sont des COPIES de `--color-surface` (`ds/tokens/colors.css` l.54 pour
 * `:root`, l.126 pour `.dark`). Une duplication de token est une dette : elle
 * est ici inévitable (aucune fonction CSS ne calcule un contraste) et elle est
 * VERROUILLÉE par un test qui relit `colors.css` et compare — cf.
 * `color.test.ts` § « les constantes de thème ne divergent pas des tokens ».
 * Sans ce verrou on retomberait sur PIT-S58-004 (un garde-fou affirmé par un
 * commentaire, inexistant dans les faits).
 */
export const THEME_SURFACE = { light: '#FFFFFF', dark: '#131519' } as const

/** Encres de thème (`--color-ink` : `gray-900` en clair, `#ECEDEF` en sombre). */
export const THEME_INK = { light: '#16181D', dark: '#ECEDEF' } as const

export type ThemeName = keyof typeof THEME_SURFACE

/** Canaux 0-255 d'un hex `#RGB`/`#RRGGBB`. */
function channels(hex: string): [number, number, number] {
  let h = hex.slice(1)
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * Mélange `from` vers `to` par `weight` (0 → `from`, 1 → `to`), en sRGB
 * GAMMA-ENCODÉ — c'est-à-dire exactement ce que fait `color-mix(in srgb, …)`
 * (CSS Color 5 : `srgb` est l'espace encodé, `srgb-linear` serait l'autre).
 * Interpoler en linéaire ici produirait une couleur différente de celle que le
 * navigateur peint pour le fond à 8 % de `.mt-evt--draft`, et le plancher
 * serait calculé contre un fond qui n'existe pas.
 */
export function mixHex(from: string, to: string, weight: number): string {
  if (!HEX_RE.test(from) || !HEX_RE.test(to)) return from
  const t = Math.min(1, Math.max(0, weight))
  const a = channels(from)
  const b = channels(to)
  const out = a.map((v, i) => {
    const mixed = Math.round(v * (1 - t) + b[i] * t)
    return Math.min(255, Math.max(0, mixed)).toString(16).padStart(2, '0')
  })
  return `#${out.join('')}`
}

/**
 * Plus petit mélange de `color` vers `ink` qui atteint `target` contre
 * `background`. Renvoie `color` INCHANGÉE si elle est déjà conforme.
 *
 * ⚠ Le balayage est LINÉAIRE, pas dichotomique, et c'est délibéré : le
 * contraste n'est PAS monotone le long du chemin. En thème sombre, une couleur
 * quasi noire est plus sombre que la surface ; en la tirant vers l'encre claire
 * la luminance TRAVERSE celle du fond, donc le ratio redescend à 1.00:1 avant
 * de remonter. Une dichotomie sur un prédicat non monotone rendrait un `t`
 * arbitraire. 256 pas = la granularité réelle d'un canal 8 bits : chercher plus
 * fin ne produirait aucune couleur supplémentaire.
 *
 * Le ratio est vérifié sur le hex ARRONDI effectivement renvoyé, jamais sur la
 * valeur flottante intermédiaire — c'est cette couleur-là que le navigateur
 * peindra et que la sonde E2E relira.
 */
export function contrastFloor(
  color: string,
  background: string,
  ink: string,
  target: number = WCAG_AA_NON_TEXT + CONTRAST_FLOOR_MARGIN,
): string {
  if (!HEX_RE.test(color) || !HEX_RE.test(background) || !HEX_RE.test(ink)) return color
  // Court-circuit du cas conforme : on rend la chaîne D'ORIGINE, pas son
  // équivalent normalisé par `mixHex`. Sans ça `#3B62D4` ressortirait `#3b62d4`
  // — même couleur peinte, mais un `toBe(color)` (test comme revue de diff)
  // croirait à une modification, et le style inline changerait à chaque frappe.
  if (contrastRatio(color, background) >= target) return color
  const STEPS = 256
  for (let i = 1; i <= STEPS; i += 1) {
    const candidate = mixHex(color, ink, i / STEPS)
    if (contrastRatio(candidate, background) >= target) return candidate
  }
  // Inatteignable avec les tokens du DS (encre vs surface : 16.9:1 en clair,
  // 14.6:1 en sombre). Filet explicite plutôt qu'un `undefined` silencieux.
  return ink
}

/**
 * Propriétés personnalisées à poser sur un trait peint dans la couleur
 * utilisateur. Le CSS choisit selon le thème ; l'API est documentée dans
 * `ds/components/timeline.css` (§ #497).
 */
export interface OutlineFloorVars {
  '--mt-evt-outline': string
  '--mt-evt-outline-dark': string
}

/**
 * Calcule le plancher pour les DEUX thèmes.
 *
 * `tintPercent` = part de `color` déjà mélangée dans la surface pour former le
 * fond RÉELLEMENT peint derrière le trait. Les deux traits de l'aperçu n'ont
 * pas le même support et n'ont donc pas le même plancher :
 *   - connecteur : `0` — il flotte sur la lane, premier fond opaque = `surface` ;
 *   - contour du fantôme : `8` — `.mt-evt--draft` peint sa bordure PAR-DESSUS
 *     son propre fond `color-mix(… 8%, surface)` (`background-clip: border-box`).
 * Cette distinction n'est pas cosmétique : elle vaut ~0.6 point de ratio sur le
 * citron en clair (2.20 vs 2.07 dans les mesures d'origine).
 *
 * Renvoie `null` pour une couleur absente ou non hexadécimale → l'appelant
 * n'émet alors AUCUNE variable et le repli DS (`--color-rule-emphasis`, tier
 * fonctionnel arbitré par #352) reprend la main.
 */
export function outlineFloorVars(
  color: string | undefined | null,
  tintPercent = 0,
): OutlineFloorVars | null {
  if (!color || !HEX_RE.test(color)) return null
  const forTheme = (theme: ThemeName): string => {
    const surface = THEME_SURFACE[theme]
    const background = tintPercent > 0 ? mixHex(surface, color, tintPercent / 100) : surface
    return contrastFloor(color, background, THEME_INK[theme])
  }
  return { '--mt-evt-outline': forTheme('light'), '--mt-evt-outline-dark': forTheme('dark') }
}
