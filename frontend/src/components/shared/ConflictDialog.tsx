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
import type { Event, EventEditFormValues } from '@/types/event'

/**
 * #77 / #231 — Dialog partagé de résolution de conflit d'édition concurrente (409,
 * optimistic locking @Version). Réutilise la primitive Dialog Radix du DS : role=dialog,
 * focus-trap et fermeture Échap sont fournis nativement par Radix.
 *
 * DEUX modes :
 *  - LEGACY (#77) : corps 409 plat `{"error":...}` ou entité serveur indisponible →
 *    on informe (« modifié ailleurs ») + UNE action « recharger » (`onReload`).
 *  - COMPARATIF (#231) : le corps 409 est ENRICHI (serverVersion + serverEvent). Quand
 *    `serverEvent` ET `localValues` sont fournis, on affiche un DIFF champ par champ
 *    (vos modifications vs version serveur, champs modifiés mis en évidence) + deux
 *    actions : « Garder mes modifications » (`onKeepMine`, re-soumet — le PATCH backend
 *    recharge l'état géré, pas de boucle de 409) et « Prendre la version serveur »
 *    (`onTakeServer`, abandonne le local + rafraîchit).
 *
 * Composant présentationnel pur : il ne détecte pas le 409 lui-même. L'appelant
 * (`EventContent` via `EventEditForm`) intercepte le 409, parse le corps enrichi et
 * pilote `open` + les callbacks.
 */

export interface ConflictDialogProps {
  /** Ouverture contrôlée par l'appelant (déclenchée sur 409 optimistic). */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** LEGACY : recharge les données à jour (invalidation ciblée ou reload). */
  onReload: () => void
  /**
   * Racine data-testid appliquée au conteneur du dialog. Défaut `conflict-dialog`.
   * `EventEditForm` passe `event-form-conflict` (tests existants #66).
   */
  testId?: string
  /**
   * COMPARATIF (#231) : état serveur GAGNANT (corps 409 enrichi). Présent + `localValues`
   * → bascule en mode comparatif. Absent → mode legacy (bouton « recharger »).
   */
  serverEvent?: Event
  /** COMPARATIF : valeurs locales soumises (celles de l'utilisateur) pour le diff. */
  localValues?: EventEditFormValues
  /** COMPARATIF : « Garder mes modifications » — re-soumet les valeurs locales. */
  onKeepMine?: () => void
  /** COMPARATIF : « Prendre la version serveur » — abandonne le local + rafraîchit. */
  onTakeServer?: () => void
  /**
   * Soumission en cours (409 → re-soumission keep-mine). Désactive TOUS les boutons
   * d'action pour empêcher un double-clic = 2 `updateEvent` concurrents. Défaut `false`.
   */
  isSubmitting?: boolean
}

/** Champs comparables local ↔ serveur (kind pilote la comparaison/affichage). */
const DIFF_FIELDS: ReadonlyArray<{
  key: string
  kind: 'bool' | 'text'
  pick: (v: EventEditFormValues | Event) => unknown
}> = [
  { key: 'title', kind: 'text', pick: (v) => (v as EventEditFormValues).title ?? (v as Event).title },
  { key: 'type', kind: 'text', pick: (v) => v.type },
  { key: 'durationValue', kind: 'text', pick: (v) => v.durationValue },
  { key: 'durationUnit', kind: 'text', pick: (v) => v.durationUnit },
  { key: 'isRecurring', kind: 'bool', pick: (v) => v.isRecurring },
  { key: 'recurrenceUnit', kind: 'text', pick: (v) => v.recurrenceUnit },
  { key: 'recurrenceEndDate', kind: 'text', pick: (v) => v.recurrenceEndDate },
  { key: 'startDate', kind: 'text', pick: (v) => v.startDate },
  { key: 'endDate', kind: 'text', pick: (v) => v.endDate },
  { key: 'color', kind: 'text', pick: (v) => v.color },
  { key: 'archived', kind: 'bool', pick: (v) => v.archived },
]

/** Normalise pour COMPARER (null/undefined -> '', tout le reste -> String). */
function normalize(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function ConflictDialog({
  open,
  onOpenChange,
  onReload,
  testId = 'conflict-dialog',
  serverEvent,
  localValues,
  onKeepMine,
  onTakeServer,
  isSubmitting = false,
}: ConflictDialogProps) {
  const t = useTranslations('common.conflictDialog')

  const isComparative = Boolean(serverEvent && localValues)

  const handleReload = () => {
    onReload()
    onOpenChange(false)
  }

  // Formate pour l'AFFICHAGE (bool -> oui/non, vide -> em dash).
  const fmt = (value: unknown, kind: 'bool' | 'text'): string => {
    if (kind === 'bool') return value ? t('yes') : t('no')
    if (value === null || value === undefined || value === '') return t('empty')
    return String(value)
  }

  // Diff : uniquement les champs réellement modifiés (booléens comparés en Boolean,
  // texte via normalisation). Sur un vrai conflit, au moins un champ diffère ; le
  // fallback `noChanges` couvre le cas (rare) d'éditions concurrentes identiques.
  const diffRows =
    isComparative && serverEvent && localValues
      ? DIFF_FIELDS.filter((f) => {
          const local = f.pick(localValues)
          const server = f.pick(serverEvent)
          return f.kind === 'bool'
            ? Boolean(local) !== Boolean(server)
            : normalize(local) !== normalize(server)
        })
      : []

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
          <DialogDescription>
            {isComparative ? t('comparativeDescription') : t('description')}
          </DialogDescription>
        </DialogHeader>

        {isComparative && (
          <div className="max-h-[45vh] overflow-y-auto" data-testid="conflict-dialog-diff">
            {/* En-têtes de colonnes (vos modifications vs version serveur). */}
            <div className="text-ink-muted grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 pb-2 text-xs font-medium">
              <span>{t('field')}</span>
              <span>{t('yourValue')}</span>
              <span>{t('serverValue')}</span>
            </div>

            {diffRows.length === 0 ? (
              <p className="text-ink-muted px-1 py-2 text-sm" data-testid="conflict-dialog-no-changes">
                {t('noChanges')}
              </p>
            ) : (
              <ul className="space-y-1">
                {diffRows.map((f) => (
                  <li
                    key={f.key}
                    data-testid="conflict-dialog-diff-row"
                    data-field={f.key}
                    // Champ modifié mis en évidence via token sémantique warning (clair+sombre).
                    className="border-warning bg-warning-soft grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm"
                  >
                    <span className="text-ink-muted truncate">{t(`fields.${f.key}`)}</span>
                    <span className="text-ink truncate font-medium" data-testid="conflict-dialog-diff-local">
                      {fmt(f.pick(localValues!), f.kind)}
                    </span>
                    <span className="text-ink truncate font-medium" data-testid="conflict-dialog-diff-server">
                      {fmt(f.pick(serverEvent!), f.kind)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {isComparative ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-rule-emphasis text-ink-muted hover:bg-surface-2"
                onClick={() => onTakeServer?.()}
                disabled={isSubmitting}
                data-testid="conflict-dialog-take-server"
              >
                {t('takeServer')}
              </Button>
              <Button
                type="button"
                className="bg-accent hover:bg-accent-hover text-accent-ink"
                onClick={() => onKeepMine?.()}
                disabled={isSubmitting}
                data-testid="conflict-dialog-keep-mine"
              >
                {t('keepMine')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-rule-emphasis text-ink-muted hover:bg-surface-2"
              >
                {t('dismiss')}
              </Button>
              <Button
                type="button"
                className="bg-accent hover:bg-accent-hover text-accent-ink"
                onClick={handleReload}
                disabled={isSubmitting}
                data-testid="conflict-dialog-reload"
              >
                {t('reload')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConflictDialog
