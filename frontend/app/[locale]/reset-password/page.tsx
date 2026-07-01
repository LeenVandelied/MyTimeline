'use client'

import { Suspense, useState, use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

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
import { resetPassword } from '@/services/authService'
import { createResetPasswordFormSchema, type ResetPasswordFormValues } from '@/lib/schemas/auth'
import { LanguageSelector } from '@/components/ui/language-selector'
import { AppFooter } from '@/components/ui/footer-app'
import { useTranslations } from 'next-intl'

/**
 * #53 — Sous-composant client lisant `useSearchParams()` (token du lien email).
 * Extrait pour être enveloppé dans `<Suspense>` par la page : sans frontière
 * Suspense, `next build` casse (CSR bailout) sur la lecture des query params.
 */
function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(createResetPasswordFormSchema(t)),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true)
    setServerError(null)
    try {
      await resetPassword(token, data.newPassword)
      setDone(true)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setServerError(t('common.resetPassword.errors.invalidToken'))
      } else {
        setServerError(t('common.resetPassword.errors.generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p role="status" data-testid="reset-success" className="text-success text-sm font-medium">
          {t('common.resetPassword.success')}
        </p>
        <Link
          href={`/${locale}/login`}
          className="text-accent hover:text-accent-hover inline-block"
          data-testid="reset-go-login"
        >
          {t('common.resetPassword.goToLogin')}
        </Link>
      </div>
    )
  }

  if (!token) {
    return (
      <p
        role="alert"
        data-testid="reset-missing-token"
        className="text-danger text-center text-sm font-medium"
      >
        {t('common.resetPassword.missingToken')}
      </p>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
        data-testid="reset-form"
      >
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.resetPassword.newPassword')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  data-testid="reset-password"
                  placeholder={t('common.resetPassword.newPasswordPlaceholder')}
                  {...field}
                  className="bg-surface-2 border-rule-strong"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.resetPassword.confirmPassword')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  data-testid="reset-confirm-password"
                  placeholder={t('common.resetPassword.confirmPasswordPlaceholder')}
                  {...field}
                  className="bg-surface-2 border-rule-strong"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p role="alert" data-testid="reset-error" className="text-danger text-sm font-medium">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          className="bg-accent text-accent-ink hover:bg-accent-hover w-full"
          disabled={loading}
          aria-busy={loading}
          data-testid="reset-submit"
        >
          {loading ? (
            <>
              <Spinner label={t('common.spinner.loading')} />
              {t('common.resetPassword.loading')}
            </>
          ) : (
            t('common.resetPassword.submit')
          )}
        </Button>
      </form>
    </Form>
  )
}

export default function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations()
  const { locale } = use(params)

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="flex flex-grow items-center justify-center">
        <div className="bg-surface w-full max-w-md rounded-lg p-6 shadow-lg">
          <h2 className="mb-2 text-center text-2xl font-bold">{t('common.resetPassword.title')}</h2>
          <p className="text-ink-muted mb-6 text-center text-sm">
            {t('common.resetPassword.description')}
          </p>

          <Suspense
            fallback={
              <div className="flex justify-center py-4">
                <Spinner label={t('common.spinner.loading')} />
              </div>
            }
          >
            <ResetPasswordForm locale={locale} />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-ink-muted">
              <Link href={`/${locale}/login`} className="text-accent hover:text-accent-hover">
                &larr; {t('common.resetPassword.goToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
