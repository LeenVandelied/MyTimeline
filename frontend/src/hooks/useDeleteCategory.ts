'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCategory } from '@/services/categoryService'
import { queryKeys } from '@/lib/query-keys'

/**
 * #245 — Suppression d'une catégorie via TanStack Query v5 (mutation).
 *
 * `DELETE /api/categories/{id}?reassignToCategoryId=<uuid>` (BR-CAT-002). Symétrique
 * à `useCreateCategory`/`useUpdateCategory` : les composants n'appellent plus le
 * service `deleteCategory` brut (sans invalidation → listes périmées, cf. bug #245).
 *
 * Sur succès, invalide :
 *   - `queryKeys.categories.all` → la liste catégories se rafraîchit (plus de reload).
 *   - `queryKeys.products.all` → préfixe `['products']` qui COUVRE
 *     `products.withEvents(userId)` (matching de préfixe TanStack) : la réassignation
 *     de produits impacte la liste produits. Même choix que `useUpdateCategory`
 *     (invalidation par préfixe) → pas besoin de threader `userId` dans le hook, et
 *     les deux call sites (CategoriesView, CategoryDrawer) partagent le même pattern.
 *
 * L'erreur axios n'est PAS avalée : `mutateAsync` rejette pour que
 * `DeleteConfirmDialog` (#65) affiche l'erreur inline (`onConfirm` doit REJETER).
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, { id: string; reassignToCategoryId?: string }>({
    mutationFn: ({ id, reassignToCategoryId }) => deleteCategory(id, reassignToCategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}
