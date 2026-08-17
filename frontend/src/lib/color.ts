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
