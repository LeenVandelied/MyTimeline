'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/contexts/AuthContext'
import { createDeleteAccountSchema, type DeleteAccountFormValues } from '@/lib/schemas/settings'
import type { ExportFormat } from '@/services/userService'

/**
 * #86 — Chapitre Compte : export des données (3 étapes) + suppression du compte
 * (2 étapes, confirmation par re-saisie du username -> DELETE /api/me, BR-AUT-001).
 *
 * Export & delete via hooks (`useSettings`). L'export dépend d'un endpoint backend
 * non livré (stub) : l'étape téléchargement affiche « à venir ». La suppression
 * utilise l'endpoint confirmé DELETE /api/me.
 */
type ExportStep = 'format' | 'confirm' | 'done'

export function AccountSection() {
  const t = useTranslations('settings')
  const tRoot = useTranslations()
  const { deleteAccount, exportData } = useSettings()
  const { logout, user } = useAuth()
  const router = useRouter()
  const locale = useLocale()

  /* -------------------------------- Export -------------------------------- */
  const [exportStep, setExportStep] = useState<ExportStep>('format')
  const [format, setFormat] = useState<ExportFormat>('json')

  const runExport = async () => {
    try {
      const blob = await exportData.mutateAsync(format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mytimeline-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
      setExportStep('done')
    } catch {
      // #NN — endpoint export non livré (stub) : on informe sans casser le flux.
      toast.error(t('account.export.comingSoon'))
      setExportStep('format')
    }
  }

  /* ------------------------------- Delete --------------------------------- */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'warn' | 'confirm'>('warn')

  const deleteForm = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(createDeleteAccountSchema(tRoot, user?.username ?? '')),
    defaultValues: { confirmUsername: '' },
  })

  const onDelete = async (values: DeleteAccountFormValues) => {
    try {
      await deleteAccount.mutateAsync(values.confirmUsername)
      toast.success(t('account.delete.done'))
      // Cookie effacé côté backend ; on nettoie l'état client puis on redirige.
      await logout()
      router.replace(`/${locale}/login`)
    } catch {
      deleteForm.setError('confirmUsername', { message: t('common.genericError') })
    }
  }

  const closeDeleteDialog = (open: boolean) => {
    setDeleteOpen(open)
    if (!open) {
      setDeleteStep('warn')
      deleteForm.reset({ confirmUsername: '' })
    }
  }

  return (
    <section aria-labelledby="account-heading" className="space-y-8">
      <div>
        <h2 id="account-heading" className="text-lg font-semibold">
          {t('account.title')}
        </h2>
        <p className="text-ink-muted text-sm">{t('account.subtitle')}</p>
      </div>

      {/* Export des données (3 étapes) */}
      <div className="border-rule max-w-md space-y-3 rounded-md border p-4">
        <h3 className="text-sm font-medium">{t('account.export.title')}</h3>
        <p className="text-ink-muted text-sm">{t('account.export.description')}</p>

        {exportStep === 'format' && (
          <div className="space-y-3" data-testid="export-step-format">
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger data-testid="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportStep('confirm')}
              data-testid="export-next"
            >
              {t('common.next')}
            </Button>
          </div>
        )}

        {exportStep === 'confirm' && (
          <div className="space-y-3" data-testid="export-step-confirm">
            <p className="text-sm">
              {t('account.export.confirm', { format: format.toUpperCase() })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setExportStep('format')}>
                {t('common.back')}
              </Button>
              <Button
                type="button"
                onClick={runExport}
                disabled={exportData.isPending}
                data-testid="export-confirm"
              >
                {exportData.isPending ? (
                  <Spinner label={t('account.export.generating')} />
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t('account.export.download')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {exportStep === 'done' && (
          <div className="space-y-2" data-testid="export-step-done">
            <p className="text-success text-sm">{t('account.export.done')}</p>
            <Button type="button" variant="ghost" onClick={() => setExportStep('format')}>
              {t('account.export.again')}
            </Button>
          </div>
        )}
      </div>

      {/* Suppression du compte (2 étapes) */}
      <div className="border-danger/40 bg-danger-soft/20 max-w-md space-y-3 rounded-md border p-4">
        <h3 className="text-danger flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
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

      <Dialog open={deleteOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent data-testid="delete-account-dialog">
          {deleteStep === 'warn' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-danger">{t('account.delete.warnTitle')}</DialogTitle>
                <DialogDescription>{t('account.delete.warnBody')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => closeDeleteDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteStep('confirm')}
                  data-testid="delete-account-continue"
                >
                  {t('common.continue')}
                </Button>
              </DialogFooter>
            </>
          )}

          {deleteStep === 'confirm' && (
            <Form {...deleteForm}>
              <form onSubmit={deleteForm.handleSubmit(onDelete)} data-testid="delete-account-form">
                <DialogHeader>
                  <DialogTitle className="text-danger">
                    {t('account.delete.confirmTitle')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('account.delete.confirmBody', { username: user?.username ?? '' })}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <FormField
                    control={deleteForm.control}
                    name="confirmUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('account.delete.usernameLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            data-testid="delete-account-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDeleteStep('warn')}>
                    {t('common.back')}
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={deleteAccount.isPending}
                    data-testid="delete-account-confirm"
                  >
                    {deleteAccount.isPending ? (
                      <Spinner label={t('account.delete.deleting')} />
                    ) : (
                      t('account.delete.confirmButton')
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
