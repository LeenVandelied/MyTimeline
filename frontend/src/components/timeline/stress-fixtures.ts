import type { FullCalendarEvent } from '@/types/event'
import type { Resource } from './lib'

/**
 * #69 — Générateur de JEU DE DONNÉES DE CHARGE pour la frise.
 *
 * Isolé de `fixtures.tsx` (fixtures de rendu, petites et lisibles) et hors du
 * fichier de stories : un export de valeur dans un `*.stories.tsx` est interprété
 * par CSF comme une story supplémentaire.
 *
 * DÉTERMINISTE (PRNG `mulberry32` à graine fixe) : deux exécutions du banc de
 * mesure comparent bien la même frise avant / après optimisation (cf.
 * `docs/adr/ADR-007-virtualisation-timeline.md`, section « Méthodologie »).
 */

/** PRNG déterministe (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTE = ['#3B62D4', '#4FA459', '#C2410C', '#7C3AED', '#0E7490', '#B91C1C']

export interface StressDataset {
  events: FullCalendarEvent[]
  resources: Resource[]
}

export interface StressDatasetOptions {
  eventCount: number
  laneCount?: number
  categoryCount?: number
  today?: Date
  /** Étalement temporel : ± ce nombre de jours autour de `today`. */
  spreadDays?: number
}

/**
 * `eventCount` événements répartis sur `laneCount` produits (lanes), eux-mêmes
 * répartis sur `categoryCount` catégories, étalés sur ±`spreadDays` jours.
 *
 * Proportions volontairement RÉALISTES pour un power user (BR-EVE-011, palier
 * PRO illimité) : beaucoup de produits, quelques événements par produit, étalés
 * sur plus d'un an — c'est ce profil qui fait exploser le DOM sans virtualisation.
 */
export function buildStressDataset({
  eventCount,
  laneCount = 120,
  categoryCount = 12,
  today = new Date(2026, 6, 15),
  spreadDays = 200,
}: StressDatasetOptions): StressDataset {
  const rand = mulberry32(42)

  const resources: Resource[] = Array.from({ length: laneCount }, (_, i) => ({
    id: `p${i}`,
    title: `Produit ${i + 1}`,
    category: `Catégorie ${(i % categoryCount) + 1}`,
  }))

  const iso = (d: Date) => d.toISOString().slice(0, 10)

  const events: FullCalendarEvent[] = Array.from({ length: eventCount }, (_, i) => {
    const resource = resources[i % laneCount]
    const offset = Math.round((rand() * 2 - 1) * spreadDays)
    const span = 1 + Math.floor(rand() * 12)
    const start = new Date(today)
    start.setDate(start.getDate() + offset)
    const end = new Date(start)
    end.setDate(end.getDate() + span)
    return {
      id: `e${i}`,
      title: `Événement ${i + 1}`,
      start: iso(start),
      end: iso(end),
      allDay: true,
      resourceId: resource.id,
      color: PALETTE[i % PALETTE.length],
      extendedProps: {
        productId: resource.id,
        productName: resource.title,
        category: resource.category,
        type: span > 1 ? 'duration' : 'single',
      },
    }
  })

  return { events, resources }
}
