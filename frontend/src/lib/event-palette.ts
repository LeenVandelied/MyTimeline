/**
 * #577 — Palette curatée des 12 couleurs (événements ET catégories).
 *
 * SOURCE DE VÉRITÉ : les tokens `--evt-*` de `styles/ds/tokens/colors.css`, qui
 * portent les valeurs du handoff (`docs/design/graphite-handoff.md` §Palette
 * événements curatée). Ce module n'en est que le MIROIR côté JS, et n'existe que
 * parce qu'un formulaire doit STOCKER un hex `#RRGGBB` (contrat backend
 * `@Pattern ^#[0-9a-fA-F]{6}$`) : le navigateur sait peindre `var(--evt-red)`, il
 * ne sait pas en rendre la valeur à un `<form>`.
 *
 * Le miroir est verrouillé DEUX fois, et c'est ce qui l'autorise :
 *   1. `event-palette.test.ts` relit `colors.css` et échoue au moindre écart —
 *      nom, valeur, ordre, nombre, ou redéfinition d'un `--evt-*` sous `.dark` ;
 *   2. les pastilles sont PEINTES via `var(--evt-*)` et non via ce hex. Un écart
 *      qui échapperait au test se verrait au rendu : la sonde E2E
 *      `sprint-73-model-vs-rendered` compare le remplissage peint au hex porté par
 *      le `data-testid` de la pastille.
 *
 * ⚠ Aucune autre liste de ces couleurs ne doit exister dans `src/`. L'ancienne
 * `CATEGORY_SWATCHES` (`CategoryDrawer.tsx`, 10 valeurs sur 12 hors charte) a été
 * supprimée par #577 ; la reconstituer ailleurs rouvrirait exactement ce défaut.
 *
 * Couleurs HORS palette (DEC-S84-001) : elles restent valides, ne sont JAMAIS
 * réécrites, et s'affichent comme « Personnalisé » — `findPaletteEntry` renvoie
 * alors `undefined`, c'est le seul signal que les sélecteurs utilisent.
 */

/** Rôle chromatique d'une entrée — clé i18n `categories.palette.roles.<role>`. */
export type EventPaletteRole =
  | 'red'
  | 'orange'
  | 'amber'
  | 'citron'
  | 'grass'
  | 'teal'
  | 'sky'
  | 'cobalt'
  | 'periwinkle'
  | 'orchid'
  | 'rose'
  | 'graphite'

export interface EventPaletteEntry {
  readonly role: EventPaletteRole
  /** Nom du token DS (sans `var()`), défini sur `:root` seulement. */
  readonly token: `--evt-${EventPaletteRole}`
  /** Valeur du token, en MAJUSCULES — forme canonique émise par les sélecteurs. */
  readonly hex: string
}

/** Ordre = ordre de déclaration dans `colors.css` (verrouillé par test). */
export const EVENT_PALETTE: readonly EventPaletteEntry[] = [
  { role: 'red', token: '--evt-red', hex: '#E5484D' },
  { role: 'orange', token: '--evt-orange', hex: '#EE7B30' },
  { role: 'amber', token: '--evt-amber', hex: '#E3A82B' },
  { role: 'citron', token: '--evt-citron', hex: '#A7B83A' },
  { role: 'grass', token: '--evt-grass', hex: '#4FA459' },
  { role: 'teal', token: '--evt-teal', hex: '#2FA7A2' },
  { role: 'sky', token: '--evt-sky', hex: '#3E8BD6' },
  { role: 'cobalt', token: '--evt-cobalt', hex: '#3B62D4' },
  { role: 'periwinkle', token: '--evt-periwinkle', hex: '#6C7BE0' },
  { role: 'orchid', token: '--evt-orchid', hex: '#B056A8' },
  { role: 'rose', token: '--evt-rose', hex: '#DD5C97' },
  { role: 'graphite', token: '--evt-graphite', hex: '#6B7280' },
]

/**
 * Entrée de palette correspondant à `color`, comparaison INSENSIBLE À LA CASSE
 * (`#e5484d` et `#E5484D` désignent la même couleur stockée). `undefined` pour une
 * valeur absente, vide ou hors palette — c'est-à-dire « Personnalisé » dès qu'une
 * valeur existe.
 *
 * Lecture seule : ne normalise ni ne réécrit rien (DEC-S84-001).
 */
export function findPaletteEntry(color: string | null | undefined): EventPaletteEntry | undefined {
  if (!color) return undefined
  const needle = color.toUpperCase()
  return EVENT_PALETTE.find((entry) => entry.hex === needle)
}
