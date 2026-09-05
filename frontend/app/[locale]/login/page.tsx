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
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="flex flex-grow items-center justify-center">
        <div className="bg-surface w-full max-w-md rounded-lg p-6 shadow-lg">
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
