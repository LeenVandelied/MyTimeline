'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import AddProductButton from '@/components/products/AddProductButton'
import { LanguageSelector } from '@/components/ui/language-selector'
import { AppFooter } from '@/components/ui/footer-app'
import { CalendarDays, LogOut, Menu } from 'lucide-react'
import { safeErrorMessage } from '@/lib/safe-error'
import { TimelineResponsive } from '@/components/timeline'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  GreetingHeader,
  DensityRibbon,
  WeekAgenda,
  KpiMarginalia,
  ProductList,
  CompactAgenda,
  ProductCarousel,
  MobileDrawer,
} from '@/components/dashboard'

/**
 * #80 — Dashboard desktop (Design System Graphite).
 * #83 — Variante mobile portrait (< 768px) : mise en page mobile-first
 * single-column (ordre : greeting > ruban scrollable > agenda compact jour+lendemain
 * > produits swipeables) + drawer off-canvas (langue / thème / déconnexion) ouvert
 * par le hamburger. Le rendu DESKTOP #80 est INCHANGÉ : les composants #80 sont
 * réutilisés (variantes / props), aucune donnée n'est chargée hors `useDashboardData`.
 *
 * Bascule via `useMediaQuery` (SSR-safe : rend `false` au 1er rendu → desktop par
 * défaut, pas de hydration mismatch). Les contrôles header desktop (langue + logout)
 * sont masqués sur mobile (`hidden md:flex`), remplacés par le hamburger (`md:hidden`).
 */
export default function Dashboard() {
  const t = useTranslations()
  const locale = useLocale()
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const { events, products, kpis, isLoading, resources, refetch } = useDashboardData(user?.id)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  const handleLogout = async () => {
    try {
      setDrawerOpen(false)
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
          {/* Contrôles desktop (langue + logout) — masqués sur mobile portrait. */}
          <div className="hidden items-center gap-3 md:flex">
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
          {/* Hamburger mobile — ouvre le drawer off-canvas (#83). */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('dashboard.mobile.menu')}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            data-testid="dashboard-mobile-menu-button"
            className="text-ink hover:bg-accent-soft focus-visible:ring-focus flex h-11 w-11 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {isMobile ? (
        // -------- Mobile portrait single-column (#83) --------
        <main
          className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6"
          data-testid="dashboard-mobile-portrait"
        >
          <div className="flex items-start justify-between gap-4">
            <GreetingHeader name={user.username} variant="compact" />
            <AddProductButton onProductAdded={refetch} />
          </div>

          <DensityRibbon events={events} locale={locale} scrollable />

          <CompactAgenda events={events} />

          <ProductCarousel products={products} locale={locale} />
        </main>
      ) : (
        // -------- Desktop (#80, inchangé) --------
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
      )}

      <AppFooter />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}
