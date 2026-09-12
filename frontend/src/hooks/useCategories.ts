'use client'

import { useQuery } from '@tanstack/react-query'
import { getCategories } from '@/services/categoryService'
import { queryKeys } from '@/lib/query-keys'
import type { Category } from '@/types/category'

/**
 * #65 — Liste des catégories de l'utilisateur (+ système) via TanStack Query v5.
 *
 * Alimente le `<Select>` de réassignation de la variante « catégorie » de
 * `DeleteConfirmDialog`. Clé de cache centralisée (`queryKeys.categories.all`)
 * afin qu'une création/suppression de catégorie ailleurs invalide la même
 * entrée. Forme objet v5 stricte (`gcTime`, pas `cacheTime`).
 *
 * `enabled` : le dialog ne monte le hook que pour la variante catégorie, mais on
 * expose un flag pour ne pas fetcher tant que le dialog n'est pas ouvert.
 */
export function useCategories(enabled = true) {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.all,
    queryFn: getCategories,
    enabled,
  })
}
