import { describe, it, expect } from 'vitest'
import type { FullCalendarEvent } from '@/types/event'
import {
  ZOOM_LEVELS,
  addDays,
  buildMinimapBuckets,
  buildRulerTicks,
  buildWeekendSegments,
  computeFit,
  computeRange,
  daysBetween,
  displayedEventDayExtent,
  FIT_EDGE_AIR_PX,
  FIT_MARGINS_PX,
  type FitMargins,
  indexEventsByResource,
  initialZoomState,
  isWeekend,
  positionEvents,
  scaleEventPositions,
  zoomReducer,
  DAY_WIDTH_PX,
  PIN_FOOTPRINT_PX,
  PIN_HALF_WIDTH_PX,
  eventKind,
  eventTrackExtent,
  type ZoomState,
} from './zoom'

/**
 * #55 — Tests du cœur pur de la Vue Timeline. Aucun réseau, aucun React :
 * on vérifie l'échelle temporelle, le positionnement, les graduations et le
 * reducer de zoom (invariant clé : le zoom ne touche QUE le niveau/offset).
 */

/**
 * #594 — le type par défaut du helper passe de `single` à `duration`. Avant #594 il
 * n'avait aucun effet sur la géométrie ; les tests de `positionEvents` ci-dessous
 * assertent une LARGEUR PROPORTIONNELLE À LA DURÉE (5 j × 10 px, plancher d'un jour),
 * ce qui est la définition d'une barre de durée. Un ponctuel a désormais une emprise
 * constante : il est couvert par le bloc « #594 » dédié, en `type: 'single'` explicite.
 */
function evt(
  id: string,
  start: string,
  end: string,
  resourceId = 'r1',
  type: 'single' | 'duration' = 'duration',
): FullCalendarEvent {
  return {
    id,
    title: id,
    start,
    end,
    allDay: true,
    resourceId,
    color: '#123456',
    extendedProps: { productId: resourceId, productName: 'P', category: 'C', type },
  }
}

describe('zoomReducer', () => {
  it('ZOOM_IN descend d’un niveau sans dépasser le plus fin', () => {
    let s: ZoomState = { level: 'month', offsetDays: 0 }
    s = zoomReducer(s, { type: 'ZOOM_IN' }) // week
    s = zoomReducer(s, { type: 'ZOOM_IN' }) // day
    expect(s.level).toBe('day')
    s = zoomReducer(s, { type: 'ZOOM_IN' }) // reste day (borne)
    expect(s.level).toBe('day')
  })

  it('ZOOM_OUT monte d’un niveau sans dépasser le plus large', () => {
    let s: ZoomState = { level: 'quarter', offsetDays: 0 }
    s = zoomReducer(s, { type: 'ZOOM_OUT' }) // year
    expect(s.level).toBe('year')
    s = zoomReducer(s, { type: 'ZOOM_OUT' }) // reste year
    expect(s.level).toBe('year')
  })

  it('PREV/NEXT_PERIOD décalent offsetDays par le pas du niveau', () => {
    const s0: ZoomState = { level: 'week', offsetDays: 0 }
    const next = zoomReducer(s0, { type: 'NEXT_PERIOD' })
    expect(next.offsetDays).toBe(14)
    const prev = zoomReducer(next, { type: 'PREV_PERIOD' })
    expect(prev.offsetDays).toBe(0)
  })

  it('SET_LEVEL fixe le niveau et préserve l’offset', () => {
    const s = zoomReducer({ level: 'day', offsetDays: 12 }, { type: 'SET_LEVEL', level: 'year' })
    expect(s).toEqual({ level: 'year', offsetDays: 12 })
  })

  it('initialZoomState = month / offset 0', () => {
    expect(initialZoomState).toEqual({ level: 'month', offsetDays: 0 })
    expect(ZOOM_LEVELS).toEqual(['day', 'week', 'month', 'quarter', 'year'])
  })
})

describe('daysBetween / addDays / isWeekend', () => {
  it('daysBetween compte les jours calendaires', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10)
    expect(daysBetween(new Date(2026, 0, 11), new Date(2026, 0, 1))).toBe(-10)
  })
  it('addDays avance de n jours à minuit', () => {
    const d = addDays(new Date(2026, 0, 31, 15), 1)
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(0)
  })
  it('isWeekend détecte samedi/dimanche', () => {
    expect(isWeekend(new Date(2026, 6, 4))).toBe(true) // samedi
    expect(isWeekend(new Date(2026, 6, 5))).toBe(true) // dimanche
    expect(isWeekend(new Date(2026, 6, 6))).toBe(false) // lundi
  })
})

describe('computeRange', () => {
  it('englobe tous les events avec une marge et inclut aujourd’hui', () => {
    const today = new Date(2026, 6, 15)
    const { rangeStart, rangeEnd, totalDays } = computeRange(
      [evt('a', '2026-08-01', '2026-08-05')],
      today,
      10,
    )
    // today (15 juil) - 10j de marde => borne min avant le 1er août event
    expect(rangeStart.getTime()).toBeLessThan(new Date(2026, 6, 15).getTime())
    expect(rangeEnd.getTime()).toBeGreaterThan(new Date(2026, 7, 5).getTime())
    expect(totalDays).toBeGreaterThan(0)
  })

  it('sans event : fenêtre par défaut centrée sur today', () => {
    const today = new Date(2026, 6, 15)
    const { totalDays } = computeRange([], today, 30)
    // ±30j autour de today = 61 jours.
    expect(totalDays).toBe(61)
  })
})

describe('positionEvents', () => {
  it('positionne left/width en px à l’échelle dayWidth, sans clamp fenêtre', () => {
    const rangeStart = new Date(2026, 6, 1)
    const map = positionEvents(
      [evt('a', '2026-07-11', '2026-07-16')],
      rangeStart,
      10,
      new Date(2026, 6, 20),
    )
    const [e] = map.get('r1')!
    expect(e.leftPx).toBe(100) // 10 jours * 10px
    expect(e.widthPx).toBe(50) // 5 jours * 10px
    expect(e.status).toBe('expired') // fin 16 < now 20
  })

  it('largeur minimale respectée pour un event 1 jour', () => {
    const rangeStart = new Date(2026, 6, 1)
    const map = positionEvents(
      [evt('a', '2026-07-01', '2026-07-01')],
      rangeStart,
      2,
      new Date(2026, 6, 1),
      6,
    )
    const [e] = map.get('r1')!
    expect(e.widthPx).toBe(6) // 1 jour * 2px = 2 → clampé à minWidth 6
  })

  it('ignore un event sans resourceId', () => {
    const bad = { ...evt('a', '2026-07-01', '2026-07-02'), resourceId: '' }
    const map = positionEvents([bad], new Date(2026, 6, 1), 10, new Date())
    expect(map.size).toBe(0)
  })

  it('statut ongoing quand now est dans l’intervalle', () => {
    const map = positionEvents(
      [evt('a', '2026-07-01', '2026-07-10')],
      new Date(2026, 6, 1),
      10,
      new Date(2026, 6, 5),
    )
    expect(map.get('r1')![0].status).toBe('ongoing')
  })
})

describe('#594 ponctuel (pin) vs durée d’un jour', () => {
  const rangeStart = new Date(2026, 6, 1)
  const now = new Date(2026, 6, 20)
  const single = evt('pin', '2026-07-11', '2026-07-11', 'r1', 'single')
  const oneDay = evt('bar', '2026-07-11', '2026-07-12', 'r1', 'duration')

  it('eventKind : seul `type === single` produit un pin (toute autre valeur garde la barre)', () => {
    expect(eventKind(single)).toBe('single')
    expect(eventKind(oneDay)).toBe('duration')
    expect(eventKind({ extendedProps: { ...oneDay.extendedProps, type: 'autre' } })).toBe(
      'duration',
    )
  })

  it('un ponctuel garde la MÊME emprise à tous les zooms ; une durée d’un jour, non', () => {
    const pinWidths = new Set<number>()
    const barWidths = new Set<number>()
    for (const dayWidth of Object.values(DAY_WIDTH_PX)) {
      const [pin, bar] = positionEvents([single, oneDay], rangeStart, dayWidth, now).get('r1')!
      pinWidths.add(pin.widthPx)
      barWidths.add(bar.widthPx)
      // Même date d'ancrage : la distinction ne vient QUE de la géométrie.
      expect(pin.leftPx).toBe(bar.leftPx)
    }
    expect([...pinWidths]).toEqual([PIN_FOOTPRINT_PX.desktop])
    // 96 / 34 / 12 / 6 (plancher sur 5) / 6 (plancher sur 2,2) → 4 valeurs distinctes.
    expect(barWidths.size).toBe(4)
  })

  it('l’emprise du pin est paramétrable (mobile : 90 px) sans toucher aux durées', () => {
    const [pin, bar] = positionEvents(
      [single, oneDay],
      rangeStart,
      12,
      now,
      6,
      PIN_FOOTPRINT_PX.mobile,
    ).get('r1')!
    expect(pin.widthPx).toBe(90)
    expect(bar.widthPx).toBe(12)
  })

  it('eventTrackExtent : le pin déborde de sa demi-largeur à gauche, la barre commence à la date', () => {
    const [pin, bar] = positionEvents([single, oneDay], rangeStart, 12, now).get('r1')!
    // 10 jours × 12 px = 120.
    expect(eventTrackExtent(pin)).toEqual({ start: 120 - PIN_HALF_WIDTH_PX, end: 220 })
    expect(eventTrackExtent(bar)).toEqual({ start: 120, end: 132 })
  })

  it('empilage de fait : l’emprise réservée d’un pin couvre la place de son libellé', () => {
    // L'emprise réservée est ce qui garantit qu'un événement dont le début tombe AVANT
    // la fin réservée est reconnu comme chevauchant le libellé — c'est elle que
    // l'empilage en rangées (#709, `lane-layout.ts`) consomme.
    const next = evt('next', '2026-07-15', '2026-07-16', 'r1', 'duration')
    const [pin, , after] = positionEvents([single, oneDay, next], rangeStart, 12, now).get('r1')!
    // Libellé à `x + 11` (maquette) : 4 jours × 12 px = 48 px plus loin, DANS les 100 px.
    expect(eventTrackExtent(after).start).toBeLessThan(eventTrackExtent(pin).end)
    expect(eventTrackExtent(after).start).toBeGreaterThan(pin.leftPx + 11)
  })
})

describe('buildRulerTicks', () => {
  it('vue jour : une graduation par jour', () => {
    const ticks = buildRulerTicks(new Date(2026, 6, 1), 5, 'day', 10, 'fr-FR')
    expect(ticks).toHaveLength(5)
    expect(ticks[0].leftPx).toBe(0)
    expect(ticks[4].leftPx).toBe(40)
  })

  it('vue mois : graduation par semaine (moins de ticks que de jours)', () => {
    const ticks = buildRulerTicks(new Date(2026, 6, 1), 30, 'month', 5, 'fr-FR')
    expect(ticks.length).toBeLessThan(30)
    expect(ticks.length).toBeGreaterThan(0)
  })

  it('vue année : graduation par mois', () => {
    const ticks = buildRulerTicks(new Date(2026, 0, 1), 365, 'year', 2, 'fr-FR')
    // ~12-13 mois sur une année.
    expect(ticks.length).toBeGreaterThanOrEqual(12)
    expect(ticks.length).toBeLessThanOrEqual(13)
  })
})

describe('buildWeekendSegments', () => {
  it('renvoie un segment par jour de week-end en vue jour', () => {
    // 2026-07-01 = mercredi ; 4/5 = sam/dim, 11/12 = sam/dim.
    const segs = buildWeekendSegments(new Date(2026, 6, 1), 14, 'day', 10)
    expect(segs.length).toBe(4)
    expect(segs[0].widthPx).toBe(10)
  })

  it('renvoie [] aux niveaux larges (mois/trimestre/année)', () => {
    expect(buildWeekendSegments(new Date(2026, 6, 1), 90, 'month', 5)).toEqual([])
    expect(buildWeekendSegments(new Date(2026, 6, 1), 365, 'year', 2)).toEqual([])
  })
})

describe('buildMinimapBuckets', () => {
  it('normalise la densité entre 0 et 1', () => {
    const rangeStart = new Date(2026, 6, 1)
    const events = [
      evt('a', '2026-07-01', '2026-07-01'),
      evt('b', '2026-07-01', '2026-07-01'),
      evt('c', '2026-07-30', '2026-07-30'),
    ]
    const buckets = buildMinimapBuckets(events, rangeStart, 31, 10)
    expect(buckets).toHaveLength(10)
    expect(Math.max(...buckets)).toBe(1) // bucket le plus dense normalisé à 1
    expect(Math.min(...buckets)).toBeGreaterThanOrEqual(0)
  })
})

/**
 * #597 — Recadrage `F` : action `FIT` du reducer, étendue des événements AFFICHÉS
 * (lue sur les données, en jours) et choix du niveau / décalage par `computeFit`.
 */
describe('#597 recadrage (FIT)', () => {
  const rangeStart = new Date(2026, 0, 1)
  const now = new Date(2026, 0, 1)

  it('FIT pose niveau ET décalage, en objet NEUF même à valeurs égales', () => {
    const s0: ZoomState = { level: 'month', offsetDays: 3 }
    const s1 = zoomReducer(s0, { type: 'FIT', level: 'week', offsetDays: 42 })
    expect(s1).toEqual({ level: 'week', offsetDays: 42 })
    // Un 2e `F` après un défilement manuel doit re-rendre (la frise ré-applique le cadrage).
    const s2 = zoomReducer(s1, { type: 'FIT', level: 'week', offsetDays: 42 })
    expect(s2).toEqual(s1)
    expect(s2).not.toBe(s1)
  })

  it('étendue : une durée court jusqu’au bout de sa barre, un ponctuel s’arrête à sa date', () => {
    const indexed = indexEventsByResource(
      [
        evt('d', '2026-01-11', '2026-01-16', 'r1', 'duration'), // jours 10 → 15
        evt('s', '2026-01-21', '2026-01-21', 'r2', 'single'), // jour 20
      ],
      rangeStart,
      now,
    )
    expect(displayedEventDayExtent(indexed, ['r1'])).toEqual({ startDay: 10, endDay: 15 })
    expect(displayedEventDayExtent(indexed, ['r2'])).toEqual({ startDay: 20, endDay: 20 })
    expect(displayedEventDayExtent(indexed, ['r1', 'r2'])).toEqual({ startDay: 10, endDay: 20 })
  })

  it('étendue : seules les ressources AFFICHÉES comptent (masquée/repliée exclue par l’appelant)', () => {
    const indexed = indexEventsByResource(
      [
        evt('near', '2026-01-11', '2026-01-12', 'shown'),
        evt('far', '2029-06-01', '2029-06-02', 'hidden'),
      ],
      rangeStart,
      now,
    )
    const shownOnly = displayedEventDayExtent(indexed, ['shown'])
    expect(shownOnly).toEqual({ startDay: 10, endDay: 11 })
    // Contrôle : avec la ressource masquée, l'étendue — donc le cadrage — change.
    const all = displayedEventDayExtent(indexed, ['shown', 'hidden'])
    expect(all?.endDay).toBeGreaterThan(1000)
    expect(computeFit(shownOnly, 1000)?.level).toBe('day')
    expect(computeFit(all, 1000)?.level).toBe('year')
  })

  it('rien d’affiché : étendue nulle, `computeFit` rend null (F = no-op)', () => {
    const indexed = indexEventsByResource(
      [evt('a', '2026-01-11', '2026-01-12', 'r1')],
      rangeStart,
      now,
    )
    expect(displayedEventDayExtent(indexed, [])).toBeNull()
    expect(displayedEventDayExtent(indexed, ['inconnue'])).toBeNull()
    expect(computeFit(null, 1000)).toBeNull()
    // Viewport non mesurable (jsdom, conteneur masqué) : no-op, pas de division par 0.
    expect(computeFit({ startDay: 10, endDay: 20 }, 0)).toBeNull()
  })

  // #804 — marges asymétriques : 40 px avant l'étendue, 135 px après (desktop).
  const { leadPx: LEAD, trailPx: TRAIL } = FIT_MARGINS_PX.desktop

  it('étendue COURTE : niveau le plus fin (`day`), centrée', () => {
    // Largeur utile 1000 − 40 − 135 = 825 px ; 5 j → 165 px/j idéal → `day` (96).
    const fit = computeFit({ startDay: 100, endDay: 105 }, 1000)
    expect(fit?.level).toBe('day')
    const lead = LEAD + (825 - 5 * DAY_WIDTH_PX.day) / 2
    expect(fit?.offsetDays).toBeCloseTo(100 - lead / DAY_WIDTH_PX.day, 10)
  })

  it('étendue d’un seul jour (un ponctuel) : `day`, emprise pin + libellé centrée', () => {
    const fit = computeFit({ startDay: 50, endDay: 50 }, 1000)
    expect(fit?.level).toBe('day')
    // #804 — la date tombe à 40 + 825 / 2 = 452,5 px : l'EMPRISE [date − 5, date + 100]
    // est centrée (même air de part et d'autre), plus la date seule.
    const datePx = (50 - (fit?.offsetDays ?? 0)) * DAY_WIDTH_PX.day
    expect(datePx).toBeCloseTo(LEAD + (1000 - LEAD - TRAIL) / 2, 10)
    expect(datePx - PIN_HALF_WIDTH_PX).toBeCloseTo(1000 - (datePx + PIN_FOOTPRINT_PX.desktop), 10)
  })

  it('étendue MOYENNE : le niveau le plus FIN qui tient (et le niveau plus fin déborde)', () => {
    // 60 j dans 825 px → 13,75 px/j : `week` (34) déborde, `month` (12) tient.
    const fit = computeFit({ startDay: 200, endDay: 260 }, 1000)
    expect(fit?.level).toBe('month')
    expect(60 * DAY_WIDTH_PX.month).toBeLessThanOrEqual(825)
    expect(60 * DAY_WIDTH_PX.week).toBeGreaterThan(825)
    const lead = LEAD + (825 - 60 * DAY_WIDTH_PX.month) / 2
    expect(fit?.offsetDays).toBeCloseTo(200 - lead / DAY_WIDTH_PX.month, 10)
  })

  it('étendue LONGUE : `year`, et alignée à gauche (marge comprise) si elle déborde encore', () => {
    // 1000 j dans 1025 px → 1,025 px/j < 2,2 : aucun niveau ne tient.
    const fit = computeFit({ startDay: 400, endDay: 1400 }, 1200)
    expect(fit?.level).toBe('year')
    expect(fit?.offsetDays).toBeCloseTo(400 - LEAD / DAY_WIDTH_PX.year, 10)
    // Deux ans tiennent en `year` dans un viewport large : centrés, pas alignés.
    const twoYears = computeFit({ startDay: 400, endDay: 1130 }, 1800)
    expect(twoYears?.level).toBe('year')
    const lead = LEAD + (1800 - LEAD - TRAIL - 730 * DAY_WIDTH_PX.year) / 2
    expect(twoYears?.offsetDays).toBeCloseTo(400 - lead / DAY_WIDTH_PX.year, 10)
  })

  it('décalage borné à 0 (l’étendue commence au bord de la piste)', () => {
    const fit = computeFit({ startDay: 1, endDay: 3 }, 1000)
    expect(fit?.offsetDays).toBe(0)
  })
})

/**
 * #804 — Après `F`, le libellé d'un pin en BOUT d'étendue reste dans la piste. On rejoue
 * le cadrage de bout en bout sur les DONNÉES (étendue → `computeFit` → échelle du niveau
 * retenu) et on relève l'emprise réelle de chaque événement (`eventTrackExtent` : pin à
 * `date − 5`, libellé jusqu'à `date + PIN_FOOTPRINT_PX`) dans le repère du viewport
 * (0 = bord droit de la gouttière, `width` = bord droit du conteneur).
 * ⚠ Géométrie pure : la mesure en pixels RÉELS (police, troncature CSS) relève de l'E2E.
 */
describe('#804 recadrage : emprise pin + libellé en bout d’étendue', () => {
  const rangeStart = new Date(2026, 0, 1)
  const now = new Date(2026, 0, 1)
  /** Piste utile d'un viewport desktop de 1000 px (gouttière 176 px). */
  const W = 1000 - 176

  const day = (n: number) => {
    const d = addDays(rangeStart, n)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  }
  const pin = (id: string, n: number) => evt(id, day(n), day(n), 'r1', 'single')
  const bar = (id: string, from: number, to: number) => evt(id, day(from), day(to), 'r2')

  /**
   * Emprises (px, repère viewport) de chaque événement après le cadrage `F`. Sans
   * `margins`, `computeFit` est appelé comme le fait `TimelineView` (défaut desktop).
   */
  function framed(
    events: FullCalendarEvent[],
    width: number,
    margins?: FitMargins,
    footprint: number = PIN_FOOTPRINT_PX.desktop,
  ) {
    const indexed = indexEventsByResource(events, rangeStart, now)
    const extent = displayedEventDayExtent(indexed, ['r1', 'r2'])
    const fit = margins ? computeFit(extent, width, margins) : computeFit(extent, width)
    if (!fit) throw new Error('cadrage nul')
    const dw = DAY_WIDTH_PX[fit.level]
    const scrollPx = fit.offsetDays * dw
    const extents = new Map<string, { start: number; end: number }>()
    for (const list of scaleEventPositions(indexed, dw, undefined, footprint).values()) {
      for (const e of list) {
        const { start, end } = eventTrackExtent(e)
        extents.set(e.id, { start: start - scrollPx, end: end - scrollPx })
      }
    }
    return { fit, extents }
  }

  /** Marges #597 (40 px des deux côtés) : contrôle négatif de chaque jeu. */
  const LEGACY: FitMargins = { leadPx: 40, trailPx: 40 }
  const EPS = 1e-9

  it('marges dérivées de l’emprise du pin (demi-pin à gauche, pin + libellé à droite)', () => {
    expect(FIT_MARGINS_PX.desktop).toEqual({
      leadPx: PIN_HALF_WIDTH_PX + FIT_EDGE_AIR_PX,
      trailPx: PIN_FOOTPRINT_PX.desktop + FIT_EDGE_AIR_PX,
    })
    expect(FIT_MARGINS_PX.mobile).toEqual({
      leadPx: PIN_HALF_WIDTH_PX + FIT_EDGE_AIR_PX,
      trailPx: PIN_FOOTPRINT_PX.mobile + FIT_EDGE_AIR_PX,
    })
    // Le bord gauche de #597 (40 px) ne bouge pas.
    expect(FIT_MARGINS_PX.desktop.leadPx).toBe(40)
    expect(FIT_MARGINS_PX.desktop.trailPx).toBe(135)
    expect(FIT_MARGINS_PX.mobile.trailPx).toBe(125)
  })

  it('jeu 1 — deux pins qui remplissent la largeur : le libellé du dernier n’est plus coupé', () => {
    // 21 j : avec 40/40 px, `week` (34 px/j) tenait juste — 714 px dans 744.
    const events = [pin('first', 100), pin('last', 121)]
    const legacy = framed(events, W, LEGACY).extents.get('last')!
    expect(legacy.end, 'contrôle négatif #597 : libellé coupé').toBeGreaterThan(W)

    const { fit, extents } = framed(events, W)
    expect(fit.level).toBe('month')
    expect(extents.get('last')!.end).toBeLessThanOrEqual(W - FIT_EDGE_AIR_PX + EPS)
    expect(extents.get('first')!.start).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - EPS)
  })

  it('jeu 2 — un pin seul : emprise entière, même air à gauche et à droite', () => {
    const legacy = framed([pin('only', 300)], W, LEGACY).extents.get('only')!
    // #597 centrait la DATE : l'air droit (412 − 100) était bien plus petit que le gauche.
    expect(W - legacy.end).toBeLessThan(legacy.start)

    const { fit, extents } = framed([pin('only', 300)], W)
    expect(fit.level).toBe('day')
    const e = extents.get('only')!
    expect(e.start).toBeCloseTo(W - e.end, 10)
    expect(e.end).toBeLessThanOrEqual(W - FIT_EDGE_AIR_PX + EPS)
  })

  it('jeu 3 — barre en tête, pin en queue : barre entière, libellé du pin entier', () => {
    // 61 j : avec 40/40 px, `month` (12 px/j) tenait juste — 732 px dans 744.
    const events = [bar('bar', 200, 230), pin('last', 261)]
    const legacy = framed(events, W, LEGACY).extents.get('last')!
    expect(legacy.end, 'contrôle négatif #597').toBeGreaterThan(W)

    const { fit, extents } = framed(events, W)
    expect(fit.level).toBe('quarter')
    expect(extents.get('bar')!.start).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - EPS)
    expect(extents.get('last')!.end).toBeLessThanOrEqual(W - FIT_EDGE_AIR_PX + EPS)
  })

  it('jeu 4 — pin en tête (extrémité GAUCHE), pin au milieu, pin en queue, en `year`', () => {
    // 650 j × 2,2 = 1430 px dans 1624 − 175 = 1449 : `year` tient, centré.
    const width = 1800 - 176
    const events = [pin('first', 400), pin('mid', 700), pin('last', 1050)]
    const { fit, extents } = framed(events, width)
    expect(fit.level).toBe('year')
    // Gauche : le demi-pin qui déborde de la date reste dans la piste, avec l'air.
    expect(extents.get('first')!.start).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - EPS)
    expect(extents.get('last')!.end).toBeLessThanOrEqual(width - FIT_EDGE_AIR_PX + EPS)
  })

  it('jeu 5 — étendue qui déborde même en `year` : alignée à gauche, pin de tête entier', () => {
    const events = [pin('first', 400), pin('last', 1400)]
    const { fit, extents } = framed(events, 1200 - 176)
    expect(fit.level).toBe('year')
    expect(extents.get('first')!.start).toBeCloseTo(FIT_EDGE_AIR_PX, 10)
  })

  it('mobile : marges mobiles (emprise 90 px) — le libellé du dernier pin tient', () => {
    const width = 700
    const events = [pin('first', 100), pin('last', 118)]
    const legacy = framed(events, width, LEGACY, PIN_FOOTPRINT_PX.mobile).extents.get('last')!
    expect(legacy.end, 'contrôle négatif #597').toBeGreaterThan(width)

    const { extents } = framed(events, width, FIT_MARGINS_PX.mobile, PIN_FOOTPRINT_PX.mobile)
    expect(extents.get('last')!.end).toBeLessThanOrEqual(width - FIT_EDGE_AIR_PX + EPS)
    expect(extents.get('first')!.start).toBeGreaterThanOrEqual(FIT_EDGE_AIR_PX - EPS)
  })

  it('libellé plus long que le plancher : l’appelant élargit `trailPx` à la réserve réelle', () => {
    // Réserve #746 d'un long titre (plafond 11 + 240 px) ; 54 j remplissent `month`.
    const reserve = 251
    const events = [pin('first', 100), pin('last', 154)]
    const floorOnly = framed(events, W, undefined, reserve).extents.get('last')!
    expect(floorOnly.end, 'le plancher 100 px ne couvre pas 251 px').toBeGreaterThan(W)

    const widened: FitMargins = {
      ...FIT_MARGINS_PX.desktop,
      trailPx: Math.max(FIT_MARGINS_PX.desktop.trailPx, reserve + FIT_EDGE_AIR_PX),
    }
    const { extents } = framed(events, W, widened, reserve)
    expect(extents.get('last')!.end).toBeLessThanOrEqual(W - FIT_EDGE_AIR_PX + EPS)
  })
})
