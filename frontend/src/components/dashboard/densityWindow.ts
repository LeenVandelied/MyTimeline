/**
 * #623 — Géométrie PURE du ruban de densité du tableau de bord : règle graduée et
 * viewport déplaçable (maquette `Dashboard.dc.html`, § Hero, DEC-S108-003).
 *
 * Tout ce qui convertit des pixels en jours vit ici, hors du composant : jsdom ne
 * fait aucun layout (`getBoundingClientRect` y vaut 0), donc le calcul
 * pointeur → jours ne se prouve en test unitaire que sur une fonction pure. Le
 * vrai glisser se prouve en E2E (`e2e/sprint-108-density-ribbon.spec.ts`).
 *
 * Repère : le jour `d` (0 = aujourd'hui, bord GAUCHE) est à `d / rangeDays` de la
 * largeur de la piste ; la graduation `rangeDays` est le bord droit.
 */

/** Largeur du viewport, en jours (maquette : `pct(9)`). */
export const VIEWPORT_DAYS = 9

/** Pas de la règle, en jours (maquette : k = 0, 5, …, 30). */
export const RULER_STEP_DAYS = 5

/** Ancrage horizontal d'un libellé de graduation. */
export type TickAnchor = 'start' | 'center' | 'end'

export interface RulerTick {
  /** Décalage en jours depuis aujourd'hui. */
  day: number
  /** Position dans la piste, en pourcentage [0..100]. */
  pct: number
  /** Bord gauche aligné à gauche, bord droit aligné à droite, le reste centré. */
  anchor: TickAnchor
}

/** Position (%) d'un jour dans une fenêtre de `rangeDays` jours. */
export function dayToPct(day: number, rangeDays: number): number {
  return rangeDays > 0 ? (day / rangeDays) * 100 : 0
}

/**
 * Graduations tous les `step` jours, de 0 à `rangeDays` inclus. Pour 30 jours et
 * un pas de 5 : 0, 5, 10, 15, 20, 25, 30 (7 libellés).
 */
export function rulerTicks(rangeDays: number, step = RULER_STEP_DAYS): RulerTick[] {
  if (rangeDays <= 0 || step <= 0) return []
  const ticks: RulerTick[] = []
  for (let day = 0; day <= rangeDays; day += step) {
    ticks.push({
      day,
      pct: dayToPct(day, rangeDays),
      anchor: day === 0 ? 'start' : day === rangeDays ? 'end' : 'center',
    })
  }
  return ticks
}

/** Largeur effective du viewport : jamais plus large que la fenêtre elle-même. */
export function viewportDays(rangeDays: number, days = VIEWPORT_DAYS): number {
  return Math.max(0, Math.min(days, rangeDays))
}

/** Début maximal du viewport (maquette : 30 − 9 = 21). */
export function maxViewportStart(rangeDays: number, days = VIEWPORT_DAYS): number {
  return Math.max(0, rangeDays - viewportDays(rangeDays, days))
}

/** Borne un début de viewport dans [0, max]. `NaN` → 0. */
export function clampViewportStart(start: number, rangeDays: number, days = VIEWPORT_DAYS): number {
  if (!Number.isFinite(start)) return start === Infinity ? maxViewportStart(rangeDays, days) : 0
  return Math.min(maxViewportStart(rangeDays, days), Math.max(0, start))
}

/**
 * Glisser au pointeur : nouveau début (continu, en jours) à partir du début au
 * moment de la saisie et du déplacement horizontal en px. Maquette :
 * `delta jours = (clientX − x0) / largeurPiste × 30`, borné à [0, 21].
 * Piste sans largeur (jsdom, élément masqué) : la position ne bouge pas.
 */
export function dragViewportStart(args: {
  originStart: number
  deltaPx: number
  trackWidthPx: number
  rangeDays: number
  days?: number
}): number {
  const { originStart, deltaPx, trackWidthPx, rangeDays, days = VIEWPORT_DAYS } = args
  if (!(trackWidthPx > 0)) return clampViewportStart(originStart, rangeDays, days)
  return clampViewportStart(originStart + (deltaPx / trackWidthPx) * rangeDays, rangeDays, days)
}

/** Pas clavier d'une page (PageUp / PageDown), en jours. */
export const VIEWPORT_PAGE_DAYS = 7

/**
 * Clavier du slider (APG « Slider ») : ←/↓ −1 j, →/↑ +1 j, PageDown −7, PageUp +7,
 * Home = début, End = fin. Part de la position ARRONDIE (un glisser laisse une
 * position continue). Touche non gérée → `null` (l'appelant ne consomme pas
 * l'événement).
 */
export function keyToViewportStart(
  key: string,
  current: number,
  rangeDays: number,
  days = VIEWPORT_DAYS,
): number | null {
  const base = Math.round(current)
  const clamp = (v: number) => clampViewportStart(v, rangeDays, days)
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clamp(base - 1)
    case 'ArrowRight':
    case 'ArrowUp':
      return clamp(base + 1)
    case 'PageDown':
      return clamp(base - VIEWPORT_PAGE_DAYS)
    case 'PageUp':
      return clamp(base + VIEWPORT_PAGE_DAYS)
    case 'Home':
      return 0
    case 'End':
      return maxViewportStart(rangeDays, days)
    default:
      return null
  }
}

/** `from` + `n` jours CIVILS (minuit local ; `setDate` absorbe les changements d'heure). */
export function addCalendarDays(from: Date, n: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() + n)
  return d
}
