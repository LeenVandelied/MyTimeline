'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import AddProductButton from '@/components/products/AddProductButton'
import { LanguageSelector } from '@/components/ui/language-selector'
import { AppFooter } from '@/components/ui/footer-app'
import { CalendarDays, LogOut } from 'lucide-react'
import { safeErrorMessage } from '@/lib/safe-error'
import { TimelineResponsive } from '@/components/timeline'
import { useDashboardData } from '@/hooks/useDashboardData'
import {
  GreetingHeader,
  DensityRibbon,
  WeekAgenda,
  KpiMarginalia,
  ProductList,
} from '@/components/dashboard'

/**
 * #80 — Dashboard desktop (Design System Graphite).
 *
 * La page ne fait plus QUE : garde d'authentification, shell (header auth +
 * footer) et composition des composants dashboard isolés. Aucune donnée n'est
 * chargée ici directement : `useDashboardData` (TanStack Query) est l'unique
 * source (produits + events + KPIs dérivés). Chaque bloc visuel est délégué à
 * un composant ≤ 80 lignes de `components/dashboard/` (réutilisés par #83/#85).
 */
export default function Dashboard() {
  const t = useTranslations()
  const locale = useLocale()
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const { events, products, kpis, isLoading, resources, refetch } = useDashboardData(user?.id)

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  const handleLogout = async () => {
    try {
      await logout()
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', safeErrorMessage(error))
    }
  }

  if (loading) {
    return (
      <div className="bg-bg flex h-screen items-center justify-center" data-testid="dashboard-loading">
        <div className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" role="status">
          <span className="sr-only">{t('common.loading.default')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="dashboard">
      <header className="bg-surface border-rule sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-accent h-5 w-5" />
            <span className="text-ink text-xs font-semibold tracking-tight">{t('dashboard.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-ink hover:bg-accent-soft flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('common.buttons.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <GreetingHeader name={user.username} />
          <AddProductButton onProductAdded={refetch} />
        </div>

        <DensityRibbon events={events} locale={locale} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <WeekAgenda events={events} locale={locale} variant="table" />
          <aside className="flex flex-col gap-6">
            <KpiMarginalia kpis={kpis} />
            <ProductList products={products} locale={locale} />
          </aside>
        </div>

        <section
          className="bg-surface border-rule rounded-lg border p-3"
          aria-label={t('dashboard.recentEvents.title')}
        >
          {isLoading ? (
            <div className="flex h-64 items-center justify-center" role="status">
              <span className="text-ink-muted text-xs">{t('common.loading.default')}</span>
            </div>
          ) : (
            <TimelineResponsive events={events} resources={resources} locale={locale} />
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
