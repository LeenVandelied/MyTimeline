'use client'

import { useMemo } from 'react'
import { useProductsWithEvents } from '@/hooks/useProductsWithEvents'
import { mapToFullCalendarEvent, type FullCalendarEvent } from '@/types/event'
import type { Product } from '@/types/product'
import type { Resource } from '@/components/timeline'
import { computeDashboardKpis, type DashboardKpis } from '@/components/dashboard/kpis'

export type { DashboardKpis } from '@/components/dashboard/kpis'

/**
 * #80 — Source de données UNIQUE du dashboard desktop (TanStack Query).
 *
 * AUCUN composant du dashboard n'appelle l'API directement : ils consomment ce
 * hook (critère d'acceptation). On réutilise `useProductsWithEvents` (#48, cache/
 * dédup TanStack v5, endpoint réel `GET /api/users/{userId}/products` avec events
 * embarqués) puis on dérive côté client :
 *   - `events`    : événements aplatis en `FullCalendarEvent` (réutilisables par
 *                   DensityRibbon / WeekAgenda via les briques timeline).
 *   - `resources` : produits en `Resource` (pour la frise existante si besoin).
 *   - KPIs        : les 4 métriques de « En bref » (#640, `components/dashboard/kpis.ts`),
 *                   calculées sur les événements NON archivés (BR-EVE-011).
 *
 * Les dérivations sont mémoïsées sur la référence `products` renvoyée par le cache.
 */
export interface DashboardData {
  products: Product[]
  events: FullCalendarEvent[]
  resources: Resource[]
  kpis: DashboardKpis
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useDashboardData(
  userId: string | undefined,
  now: Date = new Date(),
): DashboardData {
  const query = useProductsWithEvents(userId)
  const products = useMemo(() => query.data ?? [], [query.data])

  const events = useMemo<FullCalendarEvent[]>(
    () =>
      products.flatMap((product) =>
        (product.events ?? [])
          // BR-EVE-011 : « actif » = non archivé (KPI + agrégations lecture seule).
          .filter((event) => !event.archived)
          .map((event) =>
            mapToFullCalendarEvent(event, product.name, product.category.name, product.id),
          ),
      ),
    [products],
  )

  const resources = useMemo<Resource[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        title: product.name,
        category: product.category.name,
        // #592 (DEC-S85-006) — pastille de catégorie (sidebar, puis en-tête #601).
        categoryColor: product.category.color,
      })),
    [products],
  )

  // #640 — les KPIs ne dépendent que du JOUR CIVIL de `now` : mémoïser sur ce jour (et non
  // sur la référence `now`, recréée à chaque rendu par le paramètre par défaut) évite de
  // recalculer les récurrences à chaque rendu de la page.
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const kpis = useMemo<DashboardKpis>(
    () => computeDashboardKpis(events, new Date(todayKey)),
    [events, todayKey],
  )

  return {
    products,
    events,
    resources,
    kpis,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
