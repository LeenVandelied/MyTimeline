'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Check } from 'lucide-react'
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
import { createProfileSchema, type ProfileFormValues } from '@/lib/schemas/settings'
import { AvatarUpload } from './AvatarUpload'

/**
 * #86 — Chapitre Profil. Formulaire name/username/email (PATCH /api/me) +
 * upload/recadrage d'avatar. Découplé de la page : réutilisable en mobile (#87).
 *
 * L'avatar dépend de #75 (endpoint non livré) : l'upload est stubé côté service
 * -> on affiche un toast « à venir » plutôt que de bloquer le chapitre.
 */
export function ProfileSection() {
  const t = useTranslations('settings')
  const tRoot = useTranslations()
  const { user, updateProfile } = useSettings()
  const [saved, setSaved] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileSchema(tRoot)),
    defaultValues: {
      name: user?.name ?? '',
      username: user?.username ?? '',
      email: user?.email ?? '',
    },
  })

  // Réinitialise le formulaire quand le user d'AuthContext arrive/change.
  useEffect(() => {
    if (user) {
      form.reset({ name: user.name, username: user.username, email: user.email })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const onSubmit = async (values: ProfileFormValues) => {
    setSaved(false)
    form.clearErrors('root')
    try {
      await updateProfile.mutateAsync(values)
      setSaved(true)
      toast.success(t('profile.saved'))
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        form.setError('username', { message: t('profile.errors.usernameTaken') })
      } else {
        form.setError('root', { message: t('common.genericError') })
      }
    }
  }

  const onAvatarCropped = () => {
    // #75 non livré : le service rejette. On informe sans bloquer.
    toast.error(t('profile.avatar.comingSoon'))
  }

  return (
    <section aria-labelledby="profile-heading" className="space-y-6">
      <div>
        <h2 id="profile-heading" className="text-lg font-semibold">
          {t('profile.title')}
        </h2>
        <p className="text-ink-muted text-sm">{t('profile.subtitle')}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">{t('profile.avatar.title')}</h3>
        <AvatarUpload currentAvatarUrl={null} onCropped={onAvatarCropped} />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-md space-y-4"
          noValidate
          data-testid="profile-form"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('profile.name')}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" data-testid="profile-name" {...field} />
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
                <FormLabel>{t('profile.username')}</FormLabel>
                <FormControl>
                  <Input autoComplete="username" data-testid="profile-username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('profile.email')}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" data-testid="profile-email" {...field} />
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

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateProfile.isPending} data-testid="profile-submit">
              {updateProfile.isPending ? <Spinner label={t('common.saving')} /> : t('common.save')}
            </Button>
            {saved && !updateProfile.isPending && (
              <span className="text-success flex items-center gap-1 text-sm" role="status">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t('profile.saved')}
              </span>
            )}
          </div>
        </form>
      </Form>
    </section>
  )
}
