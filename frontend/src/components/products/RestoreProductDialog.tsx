'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { ArchiveRestore } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_BUTTON } from '@/lib/touchTarget'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

/**
 * #711 — Confirmation de DÉSARCHIVAGE d'un produit (onglet « Archivés » de `/products`).
 *
 * POURQUOI UN COMPOSANT DÉDIÉ plutôt qu'une variante de `DeleteConfirmDialog` (même
 * rationale qu'`events/ArchiveConfirmDialog`) : ce dernier est un dialog DESTRUCTIF (bouton
 * `variant="destructive"`, vocabulaire de suppression, `Select` de réassignation de
 * catégorie). Désarchiver ne détruit rien, cela RAMÈNE le produit : bouton de confirmation
 * primaire (sans `destructive`), annulation `outline`. Les primitives `ui/dialog` +
 * `ui/button` sont réutilisées telles quelles — même responsive (bottom sheet < 640px /
 * modal centré ≥ 640px) que les deux autres dialogs.
 *
 * Contrairement à `ArchiveConfirmDialog` (qui n'arme qu'un champ de formulaire), la
 * confirmation déclenche ICI l'appel réseau : `onConfirm` est asynchrone, le bouton passe en
 * attente, et un rejet (axios) s'affiche INLINE — 404 (produit plus archivé / disparu) avec un
 * message dédié, tout le reste en générique. Aucun toast ici : l'appelant l'émet au succès.
 * La fermeture est bloquée pendant l'attente (pas de double soumission, pas d'erreur perdue).
 */
export interface RestoreProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nom du produit ciblé, affiché dans la description. */
  productName: string
  /** Désarchivage ; DOIT rejeter en cas d'échec pour l'affichage inline. */
  onConfirm: () => Promise<void>
}

/** Code HTTP d'une erreur axios (lecture défensive, sans `any`). */
function httpStatusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    if (response && typeof response.status === 'number') return response.status
  }
  return undefined
}

export function RestoreProductDialog({
  open,
  onOpenChange,
  productName,
  onConfirm,
}: RestoreProductDialogProps) {
  const t = useTranslations('products.restoreDialog')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<'notFound' | 'generic' | null>(null)

  // Reset à chaque (ré)ouverture : une erreur d'une session précédente ne doit pas persister.
  React.useEffect(() => {
    if (open) {
      setPending(false)
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    setError(null)
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (caught) {
      setError(httpStatusOf(caught) === 404 ? 'notFound' : 'generic')
    } finally {
      setPending(false)
    }
  }

  const handleCancel = () => {
    if (pending) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : handleCancel())}>
      <DialogContent
        data-testid="product-restore-confirm"
        className={cn(
          'top-auto right-0 bottom-0 left-0 max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
          'sm:top-[50%] sm:right-auto sm:bottom-auto sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveRestore className="size-4 shrink-0" aria-hidden="true" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description', { name: productName })}</DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="text-destructive text-sm"
            data-testid="product-restore-error"
            data-kind={error}
          >
            {error === 'notFound' ? t('errors.notFound') : t('errors.generic')}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className={TOUCH_TARGET_BUTTON}
            onClick={handleCancel}
            disabled={pending}
            data-testid="product-restore-cancel"
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            className={TOUCH_TARGET_BUTTON}
            onClick={() => void handleConfirm()}
            disabled={pending}
            data-testid="product-restore-confirm-button"
          >
            {pending && <Spinner label={t('confirming')} className="text-current" />}
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RestoreProductDialog
