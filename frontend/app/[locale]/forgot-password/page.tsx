'use client'

import { useState, use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'

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
import { forgotPassword } from '@/services/authService'
import { createForgotPasswordSchema, type ForgotPasswordData } from '@/lib/schemas/auth'
import { LanguageSelector } from '@/components/ui/language-selector'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AppFooter } from '@/components/ui/footer-app'
import { useTranslations } from 'next-intl'

export default function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { locale } = use(params)

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(createForgotPasswordSchema(t)),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordData) => {
    setLoading(true)
    setServerError(null)
    try {
      // #142 : la locale de la route choisit la langue de l'email de réinitialisation.
      await forgotPassword(data.email, locale)
      // BR-AUT-012 : message neutre quel que soit le retour (anti-fuite).
      setSubmitted(true)
    } catch {
      setServerError(t('common.forgotPassword.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      {/* #642 (DEC-S82-009) — la bascule de thème rejoint le sélecteur de langue
          dans le coin haut-droit, sur les 4 pages d'auth à l'identique. Deux
          boutons à icône seule de 36 px, `gap-1` : le bloc passe de 36 à 76 px
          de large dans un coin libre, sans croiser la carte (`max-w-md` centrée)
          — `e2e/sprint-77-theme-visual.spec.ts` capture la CARTE
          (`div.bg-surface.border-rule.max-w-md.rounded-lg`), pas ce coin, ses
          10 références restent donc valides. */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeToggle testId="auth-theme-toggle" />
        <LanguageSelector />
      </div>

      <div className="flex flex-grow items-center justify-center">
        <div className="bg-surface border-rule w-full max-w-md rounded-lg border p-6 shadow-xs">
          <h2 className="mb-2 text-center text-2xl font-bold">
            {t('common.forgotPassword.title')}
          </h2>
          <p className="text-ink-muted mb-6 text-center text-sm">
            {t('common.forgotPassword.description')}
          </p>

          {submitted ? (
            <p
              role="status"
              data-testid="forgot-neutral"
              className="text-success text-center text-sm font-medium"
            >
              {t('common.forgotPassword.neutralMessage')}
            </p>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
                data-testid="forgot-form"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.forgotPassword.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          data-testid="forgot-email"
                          placeholder={t('common.forgotPassword.emailPlaceholder')}
                          {...field}
                          className="bg-surface-2 border-rule-emphasis"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {serverError && (
                  <p
                    role="alert"
                    data-testid="forgot-error"
                    className="text-danger text-sm font-medium"
                  >
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="bg-accent text-accent-ink hover:bg-accent-hover w-full"
                  disabled={loading}
                  aria-busy={loading}
                  data-testid="forgot-submit"
                >
                  {loading ? (
                    <>
                      <Spinner label={t('common.spinner.loading')} />
                      {t('common.forgotPassword.loading')}
                    </>
                  ) : (
                    t('common.forgotPassword.submit')
                  )}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <p className="text-ink-muted">
              <Link href={`/${locale}/login`} className="text-accent hover:text-accent-hover">
                &larr; {t('common.forgotPassword.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
