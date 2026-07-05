'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import type { DeleteAccountFlow } from './useDeleteAccountFlow'

/**
 * #87 — Contenu (2 étapes) du flux de suppression de compte, sans conteneur.
 * Rendu identique dans le Dialog desktop (#86, `AccountSection`) et le
 * BottomSheet mobile (#87). Reçoit le flux partagé (`useDeleteAccountFlow`) et
 * un callback `onCancel` que le conteneur mappe sur sa fermeture.
 *
 * `titleId`/`descriptionId` permettent au conteneur (Radix Title/Description ou
 * headings custom) de brancher `aria-labelledby`/`aria-describedby`. Les
 * `data-testid` (delete-account-*) sont conservés à l'identique de #86 pour ne
 * pas régresser la suite de tests existante.
 */
interface DeleteAccountStepsProps {
  flow: DeleteAccountFlow
  onCancel: () => void
  titleId?: string
  descriptionId?: string
}

export function DeleteAccountSteps({
  flow,
  onCancel,
  titleId,
  descriptionId,
}: DeleteAccountStepsProps) {
  const t = useTranslations('settings')

  if (flow.step === 'warn') {
    return (
      <div className="space-y-4" data-testid="delete-account-warn">
        <div className="space-y-1.5">
          <h2 id={titleId} className="text-danger text-lg font-semibold">
            {t('account.delete.warnTitle')}
          </h2>
          <p id={descriptionId} className="text-ink-muted text-sm">
            {t('account.delete.warnBody')}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={flow.goConfirm}
            data-testid="delete-account-continue"
          >
            {t('common.continue')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Form {...flow.form}>
      <form
        onSubmit={flow.form.handleSubmit(flow.submit)}
        className="space-y-4"
        data-testid="delete-account-form"
      >
        <div className="space-y-1.5">
          <h2 id={titleId} className="text-danger text-lg font-semibold">
            {t('account.delete.confirmTitle')}
          </h2>
          <p id={descriptionId} className="text-ink-muted text-sm">
            {t('account.delete.confirmBody', { username: flow.username })}
          </p>
        </div>
        <FormField
          control={flow.form.control}
          name="confirmUsername"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('account.delete.usernameLabel')}</FormLabel>
              <FormControl>
                <Input autoComplete="off" data-testid="delete-account-username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={flow.goWarn}>
            {t('common.back')}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={flow.isPending}
            data-testid="delete-account-confirm"
          >
            {flow.isPending ? (
              <Spinner label={t('account.delete.deleting')} />
            ) : (
              t('account.delete.confirmButton')
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default DeleteAccountSteps
