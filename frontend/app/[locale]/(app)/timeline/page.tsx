'use client'

import { useTranslations, useLocale } from 'next-intl'
import { GanttChartSquare } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useDashboardData } from '@/hooks/useDashboardData'
import { TimelineEditHost } from '@/components/timeline'

/**
 * #301 — Écran frise/timeline COMPLET sous le shell applicatif (`(app)/layout.tsx`).
 *
 * Remplace le placeholder #210 : monte la frise chronologique RÉELLE
 * (`TimelineEditHost` → `TimelineResponsive` desktop / mobile portrait / mobile
 * paysage, livrées #55/#63/#64 + host d'édition S42) sous le point d'entrée nav
 * « Timeline » du shell. AUCUNE réécriture ni duplication des composants de frise :
 * cette page se borne à fournir la source de données agrégée et à monter le host
 * existant (celui-là même que le dashboard rend déjà).
 *
 * Source de données ([MEMORY:decision] #301) : frise GLOBALE multi-produits.
 * `useDashboardData` (agrégation canonique #80, adossée à `useProductsWithEvents`
 * #48) aplatit TOUS les produits de l'utilisateur en `events` (`FullCalendarEvent`,
 * archivés exclus — BR-EVE-011) + `resources` (UNE lane par produit). Réutilisé tel
 * quel → zéro duplication de la dérivation flatMap/mapToFullCalendarEvent. Le risque
 * « resources non dédupliquées » signalé au plan ne s'applique pas : `resources` =
 * `products.map` (clé `product.id` unique) → pas de collision de lane/position
 * dans `zoom.ts`.
 *
 * INVARIANT : `TimelineEditHost` DOIT vivre sous un `<AuthProvider>`
 * (`useEventEditConflict` → `useAuth`, cf. `TimelineEditHost.test.tsx`). Garanti
 * ici par les providers racine (`app/[locale]/layout.tsx`), exactement comme pour
 * le dashboard qui monte ce même host.
 *
 * Garde d'auth (defense-in-depth) calquée sur le dashboard : le shell garde déjà,
 * la page conserve la sienne (`useAuthGuard` → redirection `/login` si anonyme).
 */
export default function TimelinePage() {
  const t = useTranslations('shell.timeline')
  const locale = useLocale()
  // #301 — Garde d'auth factorisée (defense-in-depth : le shell garde aussi).
  const { user, loading } = useAuthGuard()
  const { events, resources, isLoading } = useDashboardData(user?.id)

  if (loading) {
    return (
      <div
        className="flex h-full min-h-screen items-center justify-center"
        data-testid="timeline-loading"
      >
        <div
          className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          role="status"
        >
          <span className="sr-only">{t('loading')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <section
      className="flex min-h-screen w-full flex-col gap-6 px-6 py-8"
      data-testid="timeline-screen"
    >
      <header className="flex flex-col gap-1">
        <span className="text-ink-faint font-mono text-2xs tracking-widest uppercase">
          {t('eyebrow')}
        </span>
        <h1 className="text-ink flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <GanttChartSquare className="text-accent h-6 w-6" aria-hidden="true" />
          {t('title')}
        </h1>
      </header>

      {isLoading ? (
        <div
          className="flex flex-1 items-center justify-center"
          data-testid="timeline-data-loading"
          role="status"
        >
          <span className="text-ink-muted text-xs">{t('loading')}</span>
        </div>
      ) : resources.length === 0 ? (
        <div
          className="border-rule text-ink-muted flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center"
          data-testid="timeline-empty"
        >
          <p className="text-ink text-sm font-medium">{t('emptyTitle')}</p>
          <p className="text-ink-muted text-sm">{t('emptyBody')}</p>
        </div>
      ) : (
        <div className="min-w-0 flex-1" data-testid="timeline-host">
          <TimelineEditHost events={events} resources={resources} locale={locale} />
        </div>
      )}
    </section>
  )
}
