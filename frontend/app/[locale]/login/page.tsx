'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
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
import { useAuth } from '@/hooks/useAuth'
import { createLoginSchema, type LoginFormValues } from '@/lib/schemas/auth'
import { LanguageSelector } from '@/components/ui/language-selector'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AppFooter } from '@/components/ui/footer-app'
import { useTranslations } from 'next-intl'

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations()
  const router = useRouter()
  const { login, loading, user } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const { locale } = use(params)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  useEffect(() => {
    if (user) {
      router.replace(`/${locale}/dashboard`)
    }
  }, [user, router, locale])

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null)
    try {
      await login(data.username, data.password)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setServerError(t('common.login.errors.invalidCredentials'))
      } else {
        setServerError(t('common.login.errors.generic'))
      }
    }
  }

  return (
    <div className="bg-bg text-ink relative flex min-h-screen flex-col">
      {/* #642 (DEC-S82-009) — la bascule de thème rejoint le sélecteur de langue
          dans le coin haut-droit, sur les 4 pages d'auth à l'identique. Deux
          boutons à icône seule de 36 px, `gap-1` : le bloc passe de 36 à 76 px
          de large dans un coin libre, sans croiser la carte (`max-w-md` centrée)
          — `e2e/sprint-77-theme-visual.spec.ts` capture la CARTE
          (`div.bg-surface.border-rule.max-w-md.rounded-lg`), pas ce coin, ses
          10 références restent donc valides.

          #656 — `relative` CI-DESSUS N'EST PAS DÉCORATIF. Sans lui, le bloc
          conteneur de cet `absolute` est le BLOC CONTENEUR INITIAL (aucun ancêtre
          positionné) : le coin restait ancré à l'origine du DOCUMENT à y=16 alors
          que `OfflineBanner` (`sticky`, DANS le flux, 32 px) poussait la page à
          y=32 — 16 px du visuel et 20 px de la cible tactile 44 px passaient sous
          la bannière. Ancré à la PAGE, le coin suit la poussée : y=48 bannière
          affichée, y=16 sans bannière (INCHANGÉ — le correctif est un no-op visuel
          tant que l'API répond). Mesuré par `e2e/sprint-96-auth-banner-overlap.spec.ts`
          (boîtes + `elementFromPoint`, bannière forcée par un 500 sur
          `/api/auth/me`) : les captures de `sprint-77` MASQUENT la bannière et ne
          peuvent donc PAS voir ce défaut. */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeToggle testId="auth-theme-toggle" />
        <LanguageSelector />
      </div>

      <div className="flex flex-grow items-center justify-center">
        <div className="bg-surface border-rule w-full max-w-md rounded-lg border p-6 shadow-xs">
          <h2 className="mb-6 text-center text-2xl font-bold">{t('common.login.title')}</h2>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
              data-testid="login-form"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.login.username')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe"
                        autoComplete="username"
                        data-testid="login-username"
                        {...field}
                        className="bg-surface-2 border-rule-emphasis"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.login.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        autoComplete="current-password"
                        data-testid="login-password"
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
                  data-testid="login-error"
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
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Spinner label={t('common.spinner.loading')} />
                    {t('common.login.loading')}
                  </>
                ) : (
                  t('common.login.submit')
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-ink-muted">
              <Link
                href={`/${locale}/forgot-password`}
                className="text-accent hover:text-accent-hover"
              >
                {t('common.login.forgotPassword')}
              </Link>
            </p>
            <p className="text-ink-muted mt-2">
              {t('common.login.noAccount')}{' '}
              <Link href={`/${locale}/register`} className="text-accent hover:text-accent-hover">
                {t('common.login.register')}
              </Link>
            </p>
            <p className="text-ink-muted mt-2">
              <Link href={`/${locale}`} className="text-accent hover:text-accent-hover">
                &larr; {t('common.navigation.backToHome')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
