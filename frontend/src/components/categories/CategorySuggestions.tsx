'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { useCreateCategory } from '@/hooks/useCreateCategory'
import { CATEGORY_SUGGESTIONS } from '@/lib/category-suggestions'
import { paletteHex, type EventPaletteRole } from '@/lib/event-palette'
import { TOUCH_TARGET_BUTTON } from '@/lib/touchTarget'

/**
 * Vrai si l'intercepteur de `apiClient.ts` signale déjà cet échec : toast sur 400, 401,
 * 403 et 500, bannière réseau sur un timeout ou une 5xx. Un second message ferait un
 * double signalement ; il reste le 409, les autres 4xx et l'absence de réponse.
 */
function interceptorSignals(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { code, response } = error as { code?: unknown; response?: { status?: unknown } }
  if (code === 'ECONNABORTED') return true
  const status = response?.status
  return typeof status === 'number' && (status >= 500 || [400, 401, 403].includes(status))
}

/**
 * #638 — catégories types d'un compte neuf. Un clic crée la catégorie tout de suite
 * (`useCreateCategory`) : on persiste le libellé résolu dans la langue du moment, jamais
 * la clé, avec la couleur du rôle de palette. Rien n'est écrit avant le clic.
 *
 * Après un clic, les boutons restent désactivés jusqu'au rechargement de la liste : la
 * mutation résout avant la fin de l'invalidation, un second clic créerait un doublon (ou
 * un 409). Le rechargement démonte ce composant ; seul un échec rend la main.
 *
 * Erreurs : l'intercepteur n'a aucune branche 409, ce composant affiche donc lui-même un
 * toast pour ce que l'intercepteur laisse passer (cf. `interceptorSignals`).
 *
 * `onChoose` est appelé au clic, avant la création : le parent s'en sert pour rendre le
 * focus quand la liste remplace ces boutons (#700).
 */
export function CategorySuggestions({ onChoose }: { onChoose?: () => void }) {
  const t = useTranslations('products.categories')
  const createMutation = useCreateCategory()
  const [locked, setLocked] = React.useState(false)
  // Le state arrive au rendu suivant : la ref ferme le double clic dans le même tick.
  const lockedRef = React.useRef(false)

  const choose = async (label: string, role: EventPaletteRole) => {
    if (lockedRef.current) return
    lockedRef.current = true
    setLocked(true)
    onChoose?.()
    try {
      await createMutation.mutateAsync({ name: label, color: paletteHex(role) })
    } catch (error) {
      lockedRef.current = false
      setLocked(false)
      if (interceptorSignals(error)) return
      const status = (error as { response?: { status?: unknown } } | null)?.response?.status
      toast.error(t(status === 409 ? 'suggestionConflict' : 'suggestionError', { name: label }))
    }
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      data-testid="categories-suggestions"
    >
      {CATEGORY_SUGGESTIONS.map(({ id, role }) => {
        const label = t(`suggestions.${id}`)
        return (
          <Button
            key={id}
            type="button"
            variant="outline"
            size="sm"
            className={TOUCH_TARGET_BUTTON}
            disabled={locked || createMutation.isPending}
            onClick={() => void choose(label, role)}
            data-testid={`categories-suggestion-${id}`}
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: `var(--evt-${role})` }}
              aria-hidden="true"
            />
            <span>{label}</span>
          </Button>
        )
      })}
    </div>
  )
}

export default CategorySuggestions
