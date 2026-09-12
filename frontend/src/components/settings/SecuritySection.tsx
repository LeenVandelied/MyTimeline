'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { useSettings } from '@/hooks/useSettings'
import { useSessionManager } from '@/hooks/useSessionManager'
import { createChangePasswordSchema, type ChangePasswordFormValues } from '@/lib/schemas/settings'
import { PasswordStrength } from './PasswordStrength'
import { SessionList } from './SessionList'

/**
 * #86 — Chapitre Sécurité : changement de mot de passe (avec indicateur de force)
 * + liste des sessions actives (révocation individuelle + « toutes les autres »).
 * Logique via hooks (`useSettings`, `useSessionManager`) — réutilisable mobile (#87).
 */
export function SecuritySection() {
  const t = useTranslations('settings')
  const tRoot = useTranslations()
  const { changePassword } = useSettings()
  const { sessions, isLoading, isError, revokeOne, revokeOthers } = useSessionManager()

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(createChangePasswordSchema(tRoot)),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  })

  const newPassword = form.watch('newPassword')

  const onSubmit = async (values: ChangePasswordFormValues) => {
    form.clearErrors('root')
    try {
      await changePassword.mutateAsync({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      toast.success(t('security.password.changed'))
      form.reset({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        form.setError('oldPassword', { message: t('security.password.wrongOld') })
      } else {
        form.setError('root', { message: t('common.genericError') })
      }
    }
  }

  const [revokingId, setRevokingId] = useState<string | null>(null)

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    try {
      await revokeOne.mutateAsync(id)
      toast.success(t('security.sessions.revoked'))
    } catch {
      toast.error(t('common.genericError'))
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeOthers = async () => {
    try {
      await revokeOthers.mutateAsync()
      toast.success(t('security.sessions.revokedOthers'))
    } catch {
      toast.error(t('common.genericError'))
    }
  }

  return (
    <section aria-labelledby="security-heading" className="space-y-8">
      <div>
        <h2 id="security-heading" className="text-lg font-semibold">
          {t('security.title')}
        </h2>
        <p className="text-ink-muted text-sm">{t('security.subtitle')}</p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">{t('security.password.title')}</h3>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-md space-y-4"
            noValidate
            data-testid="password-form"
          >
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.password.old')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      data-testid="password-old"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.password.new')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      data-testid="password-new"
                      {...field}
                    />
                  </FormControl>
                  <PasswordStrength password={newPassword} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.password.confirm')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      data-testid="password-confirm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-danger text-sm" role="alert">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button type="submit" disabled={changePassword.isPending} data-testid="password-submit">
              {changePassword.isPending ? (
                <Spinner label={t('common.saving')} />
              ) : (
                t('security.password.submit')
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">{t('security.sessions.title')}</h3>
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          isError={isError}
          revokingId={revokingId}
          onRevoke={handleRevoke}
          onRevokeOthers={handleRevokeOthers}
          isRevokingOthers={revokeOthers.isPending}
        />
      </div>
    </section>
  )
}
