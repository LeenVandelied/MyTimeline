'use client'

import { useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/components/ui/language-selector'
import { AppFooter } from '@/components/ui/footer-app'
import { SettingsShell } from '@/components/settings/SettingsShell'

/**
 * #86 — Page Réglages (desktop >= 1024px). 4 chapitres (Profil / Sécurité /
 * Préférences / Compte) via `SettingsShell`.
 *
 * Garde d'auth alignée sur le dashboard (#83) : redirection vers /login si non
 * authentifié une fois `AuthContext` réhydraté (`loading` false). La variante
 * mobile (#87) réutilisera `SettingsShell`/sections sans dupliquer cette garde.
 */
export default function SettingsPage() {
  const t = useTranslations('settings')
  const locale = useLocale()
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  if (loading || !user) {
    return (
      <div
        className="bg-bg flex h-screen items-center justify-center"
        data-testid="settings-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
          aria-label={t('loading')}
        />
      </div>
    )
  }

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <header className="border-rule flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label={t('backToDashboard')}>
            <Link href={`/${locale}/dashboard`} data-testid="settings-back">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
        </div>
        <LanguageSelector />
      </header>

      <main className="flex-grow px-6 py-8" data-testid="settings-page">
        <SettingsShell />
      </main>

      <AppFooter />
    </div>
  )
}
