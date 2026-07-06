'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

/**
 * #77 — Dialog partagé de résolution de conflit d'édition concurrente (409,
 * optimistic locking @Version). Réutilise la primitive Dialog Radix du DS
 * (comme `DeleteConfirmDialog` #65) : role=dialog, focus-trap et fermeture Échap
 * sont fournis nativement par Radix — pas de nouvelle primitive modale.
 *
 * Contrat 409 réel (#200, commit 276e3ca) : statut 409, corps PLAT
 * `{"error": "resource was modified concurrently, please retry"}`. Le backend
 * NE renvoie PAS serverVersion/yourVersion → aucune UI de diff serveur/local
 * possible ici. On informe l'utilisateur (« modifié ailleurs ») et on propose
 * UNE action : recharger les données à jour (`onReload`). La modale comparative
 * « garder mes modifications » vs « prendre la version serveur » est un
 * follow-up dépendant d'un enrichissement backend du corps 409 (RECOMMAND_FOLLOWUP).
 *
 * Composant présentationnel pur : il ne détecte pas le 409 lui-même. L'appelant
 * (ex. `EventContent`) intercepte le 409 sur sa mutation et pilote `open` +
 * `onReload` (invalidation ciblée TanStack Query côté appelant, cf. #77).
 */

export interface ConflictDialogProps {
  /** Ouverture contrôlée par l'appelant (déclenchée sur 409 optimistic). */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Recharge les données à jour (invalidation ciblée ou reload). */
  onReload: () => void
  /**
   * Racine data-testid appliquée au conteneur du dialog. Défaut
   * `conflict-dialog`. `EventEditForm` passe `event-form-conflict` pour
   * préserver les tests existants (#66) qui ciblent cette valeur.
   */
  testId?: string
}

export function ConflictDialog({
  open,
  onOpenChange,
  onReload,
  testId = 'conflict-dialog',
}: ConflictDialogProps) {
  const t = useTranslations('conflictDialog')

  const handleReload = () => {
    onReload()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // role="dialog" + focus-trap + Échap : natifs Radix (cf. ux-patterns §4).
        data-testid={testId}
        className={cn(
          // Mobile : bottom sheet ancré en bas. Desktop (sm+) : modal centré.
          'top-auto right-0 bottom-0 left-0 max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
          'sm:top-[50%] sm:right-auto sm:bottom-auto sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-5 shrink-0" aria-hidden="true" />
            {t('title')}
          </DialogTitle>
          {/* Radix auto-câble aria-describedby sur DialogContent via ce nœud. */}
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-rule-strong text-ink-muted hover:bg-surface-2"
          >
            {t('dismiss')}
          </Button>
          <Button
            type="button"
            className="bg-accent hover:bg-accent-hover text-accent-ink"
            onClick={handleReload}
            data-testid="conflict-dialog-reload"
          >
            {t('reload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConflictDialog
