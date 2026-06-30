'use client'

import { useState, use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { createRegisterFormSchema, type RegisterFormValues } from '@/lib/schemas/auth'
import { LanguageSelector } from '@/components/ui/language-selector'
import { AppFooter } from '@/components/ui/footer-app'
import { useTranslations } from 'next-intl'

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations()
  const router = useRouter()
  const { register, loading } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { locale } = use(params)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterFormSchema(t)),
    defaultValues: {
      email: '',
      name: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null)
    try {
      await register(data.name, data.username, data.email, data.password)
      setSuccess(true)
      router.push(`/${locale}/login`)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        // BR-AUT-001 : username déjà pris → message inline sous le champ username.
        form.setError('username', { message: t('common.register.errors.usernameTaken') })
      } else {
        setServerError(t('common.register.errors.generic'))
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
          <h2 className="mb-6 text-center text-2xl font-bold">{t('register.title')}</h2>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
              data-testid="register-form"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        data-testid="register-email"
                        placeholder={t('register.form.emailPlaceholder')}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.name')}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="name"
                        data-testid="register-name"
                        placeholder={t('register.form.namePlaceholder')}
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.username')}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="username"
                        data-testid="register-username"
                        placeholder={t('register.form.usernamePlaceholder')}
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        data-testid="register-password"
                        placeholder={t('register.form.passwordPlaceholder')}
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
                    <FormLabel>{t('register.form.confirmPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        data-testid="register-confirm-password"
                        placeholder={t('register.form.confirmPasswordPlaceholder')}
                        {...field}
                        className="bg-surface-2 border-rule-strong"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <p
                  role="alert"
                  data-testid="register-error"
                  className="text-danger text-sm font-medium"
                >
                  {serverError}
                </p>
              )}

              {success && (
                <p
                  role="status"
                  data-testid="register-success"
                  className="text-success text-sm font-medium"
                >
                  {t('common.register.success')}
                </p>
              )}

              <Button
                type="submit"
                className="bg-accent text-accent-ink hover:bg-accent-hover w-full"
                disabled={loading}
                aria-busy={loading}
                data-testid="register-submit"
              >
                {loading ? (
                  <>
                    <Spinner label={t('common.spinner.loading')} />
                    {t('register.form.submitting')}
                  </>
                ) : (
                  t('register.form.submit')
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-ink-muted">
              {t('register.form.alreadyAccount')}{' '}
              <Link href={`/${locale}/login`} className="text-accent hover:text-accent-hover">
                {t('register.form.loginLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
