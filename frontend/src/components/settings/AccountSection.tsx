'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useDeleteAccountFlow } from './useDeleteAccountFlow'
import { DeleteAccountSteps } from './DeleteAccountSteps'
import { ExportDataFlow } from './ExportDataFlow'
import { BottomSheet } from './mobile/BottomSheet'

/**
 * #86 / #59 — Chapitre Compte : export des données RGPD (3 étapes, #59) +
 * suppression du compte (2 étapes, confirmation par re-saisie du username ->
 * DELETE /api/me, BR-AUT-001).
 *
 * L'export est délégué à `ExportDataFlow` (contrat backend figé #58 : formats sync
 * JSON/MARKDOWN + async ZIP/CSV avec polling). La suppression utilise l'endpoint
 * confirmé DELETE /api/me via `useDeleteAccountFlow`.
 */

/**
 * `deleteContainer` — conteneur du flux de suppression :
 *  - `'dialog'` (défaut) : Dialog centré Radix (desktop #86, rétro-compatible).
 *  - `'sheet'`  : BottomSheet ancrée bas (mobile #87). Même contenu partagé
 *    (`DeleteAccountSteps` + `useDeleteAccountFlow`), seul le conteneur change.
 */
interface AccountSectionProps {
  deleteContainer?: 'dialog' | 'sheet'
}

export function AccountSection({ deleteContainer = 'dialog' }: AccountSectionProps) {
  const t = useTranslations('settings')

  /* ------------------------------- Delete --------------------------------- */
  // #87 — Logique de suppression partagée (hook) rendue ici dans un Dialog
  // (desktop) et dans un BottomSheet côté mobile. Voir `useDeleteAccountFlow`.
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteFlow = useDeleteAccountFlow()

  const closeDeleteDialog = (open: boolean) => {
    setDeleteOpen(open)
    if (!open) deleteFlow.reset()
  }

  return (
    <section aria-labelledby="account-heading" className="space-y-8">
      <div>
        <h2 id="account-heading" className="text-lg font-semibold">
          {t('account.title')}
        </h2>
        <p className="text-ink-muted text-sm">{t('account.subtitle')}</p>
      </div>

      {/* Export des données RGPD (3 étapes) — #59 */}
      <ExportDataFlow />

      {/* Suppression du compte (2 étapes) */}
      <div className="border-danger/40 bg-danger-soft/20 max-w-md space-y-3 rounded-md border p-4">
        <h3 className="text-danger flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {t('account.delete.title')}
        </h3>
        <p className="text-ink-muted text-sm">{t('account.delete.description')}</p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          data-testid="delete-account-open"
        >
          {t('account.delete.button')}
        </Button>
      </div>

      {deleteContainer === 'sheet' ? (
        <BottomSheet
          open={deleteOpen}
          onClose={() => closeDeleteDialog(false)}
          title={t('account.delete.title')}
          testId="delete-account-sheet"
        >
          <DeleteAccountSteps flow={deleteFlow} onCancel={() => closeDeleteDialog(false)} />
        </BottomSheet>
      ) : (
        <Dialog open={deleteOpen} onOpenChange={closeDeleteDialog}>
          <DialogContent data-testid="delete-account-dialog">
            {/* Titre Radix requis pour l'a11y ; le titre visible (h2) est rendu
                par `DeleteAccountSteps` -> on masque celui-ci aux lecteurs. */}
            <DialogTitle className="sr-only">{t('account.delete.title')}</DialogTitle>
            <DeleteAccountSteps flow={deleteFlow} onCancel={() => closeDeleteDialog(false)} />
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
