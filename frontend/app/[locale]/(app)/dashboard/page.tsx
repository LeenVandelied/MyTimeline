'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import AddProductButton from '@/components/products/AddProductButton'
import { AppFooter } from '@/components/ui/footer-app'
import { CalendarDays, Menu } from 'lucide-react'
import { safeErrorMessage } from '@/lib/safe-error'
import { TimelineEditHost } from '@/components/timeline'
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
  CompactRail,
} from '@/components/dashboard'

/**
 * #80 — Dashboard desktop (Design System Graphite).
 * #83 — Variante mobile portrait (< 768px) : mise en page mobile-first
 * single-column (ordre : greeting > ruban scrollable > agenda compact jour+lendemain
 * > produits swipeables) + drawer off-canvas (langue / thème / déconnexion) ouvert
 * par le hamburger. Le rendu DESKTOP #80 est INCHANGÉ : les composants #80 sont
 * réutilisés (variantes / props), aucune donnée n'est chargée hors `useDashboardData`.
 *
 * #85 — Variante mobile PAYSAGE (orientation landscape, hauteur < 500px, largeur
 * > 667px) : rail vertical persistant 64px (`CompactRail`) au bord gauche +
 * contenu en 2 colonnes (CSS Grid) à droite. Le hamburger portrait est masqué
 * (remplacé par le rail). Aucun composant recréé : `CompactAgenda`, `DensityRibbon`
 * (scrollable), `ProductCarousel` réutilisés tels quels ; même source data
 * `useDashboardData` (pas de remount coûteux au switch d'orientation).
 *
 * Bascule via `useMediaQuery` (SSR-safe : rend `false` au 1er rendu → desktop par
 * défaut, pas de hydration mismatch). Le switch d'affichage est TERNAIRE :
 * paysage > portrait > desktop. Le header de l'écran est `md:hidden` depuis le
 * suivi de #298 (cf. son commentaire) : il ne porte plus que le titre d'écran et
 * le hamburger, lequel n'apparaît qu'en portrait (masqué en paysage, où le rail
 * vertical le remplace). Langue / réglages / déconnexion sont fournis par le pied
 * de la sidebar du shell dès `md`, et par le `MobileDrawer` en dessous.
 */
export default function Dashboard() {
  const t = useTranslations()
  const locale = useLocale()
  // #210 — Garde d'auth factorisée (defense-in-depth : le shell garde aussi,
  // la page conserve la sienne). `logout` reste lu via `useAuth`.
  const { user, loading } = useAuthGuard()
  const { logout } = useAuth()
  const router = useRouter()
  const { events, products, kpis, isLoading, resources, refetch } = useDashboardData(user?.id)
  const isMobile = useMediaQuery('(max-width: 767px)')
  // #85 — Paysage mobile : hauteur contrainte impose le rail vertical plutôt que
  // le hamburger portrait. Prioritaire sur `isMobile` dans le switch ternaire.
  const isLandscape = useMediaQuery('(orientation: landscape) and (max-height: 500px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  // #85 — Réf sur la colonne produits paysage (scroll ciblé sans querySelector DOM).
  const landscapeProductsRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      setDrawerOpen(false)
      await logout()
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', safeErrorMessage(error))
    }
  }

  // #85 — Handlers du rail paysage. `accueil` navigue vers la landing localisée ;
  // `produits` fait défiler vers la colonne produits (pas de route dédiée — les
  // produits vivent dans le dashboard).
  // Cible = `/${locale}`, route canonique de la landing (ADR-006).
  const handleHome = () => router.push(`/${locale}`)
  const handleProducts = () => {
    landscapeProductsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (loading) {
    return (
      <div
        className="bg-bg flex h-screen items-center justify-center"
        data-testid="dashboard-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
        >
          <span className="sr-only">{t('common.loading.default')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="dashboard">
      {/* #210, RÉVISÉ APRÈS #298 — Enveloppé par le shell applicatif
          (`(app)/layout.tsx`). L'`<aside>` du shell est `hidden md:flex` DEPUIS
          #298 : il est peint dès 768 px (icon-only 64px de 768 à 1023, déplié
          248px au-delà) et y fournit langue / thème / nav / réglages / profil /
          déconnexion. Le masquage à `lg` de ce header datait d'avant #298 : il
          était donc devenu FAUX, ce header restant peint EN MÊME TEMPS que la
          sidebar repliée sur toute la plage 768–1023, et ses contrôles
          `hidden md:flex` y dupliquant langue + réglages + déconnexion du pied
          de sidebar (défaut relevé par #298, corrigé ici).

          Ce header passe donc `md:hidden`, MIROIR EXACT du `hidden md:flex` de
          l'`<aside>` (même paire de classes que l'invariant #455 du shell).
          INVARIANT : exactement UNE chrome de navigation est peinte à toute
          largeur — `< md` ce header, `>= md` la sidebar du shell ; jamais zéro,
          jamais deux. Oracle : `e2e/sprint-73-tablet-sidebar.spec.ts`.

          CE QUE LE HEADER PORTE ENCORE, ET POURQUOI RIEN N'EST PERDU EN 768–1023 :
            · titre d'écran (`dashboard.title`) — au-dessus de `lg` ce header était
              DÉJÀ masqué, donc le titre y était déjà absent : le contexte de page
              est porté par l'`aria-current="page"` de la nav sidebar et par
              `GreetingHeader`. Aucune régression propre à la plage tablette ;
            · hamburger (#83) — déjà `md:hidden` sur SON PROPRE nœud, donc jamais
              peint au-dessus de 767 px : le masquer avec le header ne retire rien.
              Son `MobileDrawer` (langue / thème / déconnexion) reste le relais
              `< md`, la sidebar prenant le relais `>= md`.

          Les contrôles desktop (langue + lien Réglages + déconnexion) sont
          SUPPRIMÉS et non conservés : leur conteneur était `hidden md:flex` DANS
          un header désormais `md:hidden` — ils n'auraient plus pu être peints à
          AUCUNE largeur (famille PIT-S66-001 : une cible logée dans un conteneur
          responsive jamais peint, qu'aucun test ne voit disparaître). Leurs
          équivalents vivent dans le pied de sidebar (`shell-sidebar-settings-link`,
          `shell-sidebar-logout`, `LanguageSelector`) et dans le `MobileDrawer`. */}
      <header
        className="bg-surface border-rule sticky top-0 z-10 border-b md:hidden"
        data-testid="dashboard-header"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-accent h-5 w-5" />
            <span className="text-ink text-xs font-semibold tracking-tight">
              {t('dashboard.title')}
            </span>
          </div>
          {/* Hamburger mobile portrait — ouvre le drawer off-canvas (#83).
              #85 : masqué en paysage (remplacé par le rail vertical). */}
          {!isLandscape && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('dashboard.mobile.menu')}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              data-testid="dashboard-mobile-menu-button"
              className="text-ink hover:bg-accent-soft flex h-11 w-11 items-center justify-center rounded-sm md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {isLandscape ? (
        // -------- Mobile paysage : rail 64px + grille 2 colonnes (#85) --------
        <div className="flex flex-1 overflow-hidden" data-testid="dashboard-landscape">
          <CompactRail
            onHome={handleHome}
            onProducts={handleProducts}
            onLogout={handleLogout}
            activeId="home"
          />
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 overflow-y-auto px-4 py-4">
            {/* Colonne gauche : agenda compact jour + lendemain. */}
            <div className="min-w-0" data-testid="dashboard-landscape-agenda">
              <CompactAgenda events={events} />
            </div>
            {/* Colonne droite : ruban densité (scrollable) + produits. */}
            <div
              ref={landscapeProductsRef}
              className="flex min-w-0 flex-col gap-4"
              data-testid="dashboard-landscape-products"
            >
              <DensityRibbon events={events} locale={locale} scrollable />
              <ProductCarousel products={products} locale={locale} />
            </div>
          </div>
        </div>
      ) : isMobile ? (
        // -------- Mobile portrait single-column (#83) --------
        <div
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
        </div>
      ) : (
        // -------- Desktop (#80, inchangé) --------
        <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <GreetingHeader name={user.username} />
            <AddProductButton onProductAdded={refetch} />
          </div>

          <DensityRibbon events={events} locale={locale} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <WeekAgenda events={events} locale={locale} variant="table" />
            <aside className="flex flex-col gap-6">
              <KpiMarginalia kpis={kpis} locale={locale} />
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
              <TimelineEditHost events={events} resources={resources} locale={locale} />
            )}
          </section>
        </div>
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
