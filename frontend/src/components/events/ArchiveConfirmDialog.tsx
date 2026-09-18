'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Archive } from 'lucide-react'

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
 * #230 — Confirmation d'ARCHIVAGE d'un événement (BR-EVE-011 / BR-EVE-013).
 *
 * POURQUOI UN COMPOSANT DÉDIÉ plutôt qu'une 4e variante de `DeleteConfirmDialog` :
 * ce dernier est un dialog DESTRUCTIF (bouton `variant="destructive"`, états
 * `deleting`, gestion d'erreur API 404/409 inline, `Select` de réassignation de
 * catégorie). L'archivage n'est ni destructif ni réseau : il n'écrit rien, il
 * n'arme qu'un champ du formulaire (`archived`), que le PATCH portera au submit.
 * Y greffer une variante non destructive aurait fait diverger la sémantique du
 * composant partagé (le bouton rouge notamment). Les primitives `ui/dialog` +
 * `ui/button` sont, elles, réutilisées telles quelles — même responsive
 * (bottom sheet < 640px / modal centré ≥ 640px) que `DeleteConfirmDialog`.
 *
 * ⚠ BR-EVE-011 — le quota d'events actifs par tier est une ANTICIPATION non
 * implémentée (`PlanPolicy.canCreateEvent` est un no-op) et AUCUN chiffre de quota
 * n'est exposé par l'API. Le message parle donc d'EFFET (« ne comptera plus parmi
 * tes événements actifs »), jamais d'un compteur « N/20 » ni d'un tier : afficher
 * un plafond ici serait inventer une donnée inexistante.
 *
 * Aucun état interne : ouverture et issue sont pilotées par le parent
 * (`EventEditForm`), qui ne bascule `archived` qu'après `onConfirm`.
 */
export interface ArchiveConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Confirmation : le parent bascule alors `archived` à `true`. */
  onConfirm: () => void
}

export function ArchiveConfirmDialog({ open, onOpenChange, onConfirm }: ArchiveConfirmDialogProps) {
  const t = useTranslations('products.archiveDialog')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="event-archive-confirm"
        className={cn(
          // Mobile : bottom sheet. Desktop (sm+) : modal centré. Mêmes classes que
          // `DeleteConfirmDialog` — un seul vocabulaire de dialog dans l'app.
          'top-auto right-0 bottom-0 left-0 max-w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
          'sm:top-[50%] sm:right-auto sm:bottom-auto sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg',
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="size-4 shrink-0" aria-hidden="true" />
            {t('title')}
          </DialogTitle>
          {/* Radix câble automatiquement `aria-describedby` sur ce nœud : l'effet
              quota (BR-EVE-011) est donc annoncé à l'ouverture du dialog. */}
          <DialogDescription>{t('quotaEffect')}</DialogDescription>
        </DialogHeader>

        <ul className="text-ink-muted list-disc space-y-1 pl-5 text-sm">
          {/* BR-EVE-013 : l'archivage est réversible (PATCH), et #307 a livré la
              surface qui le rend atteignable — on le DIT, pour que l'archivage ne
              se lise pas comme une suppression déguisée. */}
          <li data-testid="event-archive-confirm-reversible">{t('reversible')}</li>
          {/* Conséquence immédiate et VISIBLE de la confirmation (#230, 3e volet) :
              les autres champs passent en lecture seule. */}
          <li data-testid="event-archive-confirm-readonly">{t('readOnly')}</li>
        </ul>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="event-archive-cancel"
          >
            {t('cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} data-testid="event-archive-confirm-button">
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ArchiveConfirmDialog
