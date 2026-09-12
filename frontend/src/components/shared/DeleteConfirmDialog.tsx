'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/useCategories'

/**
 * #65 — Dialog de confirmation de suppression, 3 variantes (event / product /
 * category), responsive desktop (modal centré) / mobile (bottom sheet, boutons
 * stackés, swipe-down = Escape/close natif Radix).
 *
 * Réutilise les primitives `ui/` (dialog Radix, select, button, spinner) — pas
 * de réinvention. Couleurs danger + états désactivés via tokens Graphite
 * (`bg-destructive`, `disabled:opacity-50`).
 *
 * Contrat backend (br-categories, S10 #52) :
 *   - variante category avec produits liés → `<Select>` de réassignation
 *     OBLIGATOIRE (bouton Supprimer désactivé sans sélection). La cible exclut
 *     la catégorie en cours de suppression (garde self-target côté API aussi).
 *   - `DELETE /api/categories/{id}?reassignToCategoryId=<uuid>` : le uuid choisi
 *     est remonté via `onConfirm(reassignToCategoryId)`.
 *
 * Le composant ne fait AUCUN appel réseau de suppression : il délègue à
 * `onConfirm` (renvoyé par l'appelant, ex. drawer produit #61). Il gère
 * uniquement l'état local `deleting` et l'affichage inline de l'erreur API.
 */

export type DeleteConfirmVariant = 'event' | 'product' | 'category'

export interface DeleteConfirmDialogProps {
  /** Ouverture contrôlée. */
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: DeleteConfirmVariant
  /**
   * Callback de confirmation. Pour la variante `category` avec réassignation,
   * reçoit le `reassignToCategoryId` sélectionné. Peut être async : tant que la
   * promesse n'est pas résolue, l'état `deleting` reste actif.
   * Rejeter la promesse (ex. axios 404/409) affiche l'erreur inline.
   */
  onConfirm: (reassignToCategoryId?: string) => void | Promise<void>
  onCancel?: () => void
  /** Variante event : série récurrente → warning « seul cet événement ». */
  isRecurring?: boolean
  /** Variante category : nombre de produits référençant la catégorie. */
  linkedProductsCount?: number
  /** Variante category : id de la catégorie à supprimer (exclue du select). */
  categoryId?: string
}

/**
 * Extrait un code HTTP d'une erreur (axios ou générique) sans dépendre du type
 * axios ici. On lit `error.response.status` de façon défensive (pas de `any`).
 */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  variant,
  onConfirm,
  onCancel,
  isRecurring = false,
  linkedProductsCount = 0,
  categoryId,
}: DeleteConfirmDialogProps) {
  const t = useTranslations('common.deleteDialog')

  const [deleting, setDeleting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [reassignTo, setReassignTo] = React.useState<string | undefined>(undefined)

  const isCategory = variant === 'category'
  const needsReassign = isCategory && linkedProductsCount > 0

  // Ne fetch les catégories que pour la variante category avec produits liés et
  // dialog ouvert (évite un GET inutile pour event/product).
  const categoriesQuery = useCategories(open && needsReassign)

  // Cibles de réassignation : on exclut la catégorie en cours de suppression
  // (garde self-target) et les catégories système restent des cibles valides.
  const reassignTargets = React.useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.id !== categoryId),
    [categoriesQuery.data, categoryId],
  )

  const noOtherCategory = needsReassign && categoriesQuery.isSuccess && reassignTargets.length === 0

  // Reset de l'état local à chaque (ré)ouverture pour éviter qu'une erreur ou
  // une sélection d'une session précédente persiste.
  React.useEffect(() => {
    if (open) {
      setDeleting(false)
      setErrorMessage(null)
      setReassignTo(undefined)
    }
  }, [open])

  const confirmDisabled = deleting || (needsReassign && (noOtherCategory || !reassignTo))

  const handleConfirm = async () => {
    setErrorMessage(null)
    setDeleting(true)
    try {
      await onConfirm(needsReassign ? reassignTo : undefined)
      onOpenChange(false)
    } catch (error) {
      const status = httpStatusOf(error)
      // BR-CAT-002 : 404 (catégorie inexistante) géré inline. 409 = conflit de
      // réassignation (S10 #52). Autres → message générique.
      if (status === 404) setErrorMessage(t('errors.notFound'))
      else if (status === 409) setErrorMessage(t('errors.conflict'))
      else setErrorMessage(t('errors.generic'))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    if (deleting) return
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : handleCancel())}>
      <DialogContent
        className={cn(
          // Mobile : bottom sheet ancré en bas, pleine largeur, coins arrondis
          // haut. Swipe-down → Radix ferme via Escape/overlay/close (a11y).
          'top-auto right-0 bottom-0 left-0 max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
          // Desktop (sm+) : on rebascule sur le modal centré par défaut.
          'sm:top-[50%] sm:right-auto sm:bottom-auto sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle>{t(`${variant}.title`)}</DialogTitle>
          {/* Radix auto-câble aria-describedby sur DialogContent via ce nœud. */}
          <DialogDescription>{t(`${variant}.description`)}</DialogDescription>
        </DialogHeader>

        {/* Variante event : warning série récurrente. */}
        {variant === 'event' && isRecurring && (
          <div
            role="note"
            className="bg-muted text-muted-foreground flex items-start gap-2 rounded-md p-3 text-sm"
          >
            <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t('event.recurringWarning')}</span>
          </div>
        )}

        {/* Variante category : réassignation obligatoire des produits liés. */}
        {needsReassign && (
          <div className="space-y-2">
            <label
              htmlFor="reassign-select"
              className="text-foreground text-sm font-medium"
              data-testid="delete-reassign-label"
            >
              {t('category.reassignLabel')}
            </label>

            {noOtherCategory ? (
              <p role="note" className="text-muted-foreground text-sm">
                {t('category.noOtherCategory')}
              </p>
            ) : (
              <Select
                value={reassignTo}
                onValueChange={setReassignTo}
                disabled={deleting || categoriesQuery.isPending}
              >
                <SelectTrigger
                  id="reassign-select"
                  aria-label={t('category.reassignLabel')}
                  data-testid="delete-reassign-select"
                >
                  <SelectValue placeholder={t('category.reassignPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {reassignTargets.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Erreur API inline (404/409/générique). */}
        {errorMessage && (
          <p role="alert" className="text-destructive text-sm">
            {errorMessage}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={deleting}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            data-testid="delete-confirm-button"
          >
            {deleting && <Spinner label={t('deleting')} className="text-current" />}
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
