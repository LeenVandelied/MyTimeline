'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import { AppFooter } from '@/components/ui/footer-app'
import { SettingsShell } from '@/components/settings/SettingsShell'
import { MobileSettings } from '@/components/settings/mobile/MobileSettings'

/**
 * #86 — Page Réglages. 4 chapitres (Profil / Sécurité / Préférences / Compte)
 * via `SettingsShell` (>= 768px) ou le drill-down `MobileSettings` (< 768px).
 *
 * #299 — La page vit désormais SOUS le groupe de routes `(app)/` (URL inchangée,
 * un route group est transparent). Conséquences :
 *  - la nav verticale unique de l'application est la sidebar 248px d'`AppShell` ;
 *    `SettingsShell` a basculé sa nav de chapitres en onglets HORIZONTAUX (elle
 *    ne peut plus être une seconde sidebar) ;
 *  - la garde d'auth LOCALE a été SUPPRIMÉE : `AppShell` porte `useAuthGuard` et
 *    rend `app-shell-loading` AVANT de monter `children` (`AppShell.tsx:114-128`),
 *    donc cette page n'est jamais montée pour un anonyme. Le doublon n'ajoutait
 *    aucune défense, seulement un second spinner mort (`settings-loading`,
 *    référencé par 0 spec) ;
 *  - le `LanguageSelector` du header est SUPPRIMÉ : doublon de celui du pied de
 *    la sidebar (>= lg) et du champ `pref-language` du chapitre Préférences.
 *
 * `settings-back` est CONSERVÉ mais `lg:hidden` : sous 1024px la sidebar
 * d'`AppShell` est masquée, ce retour est alors la seule sortie vers le tableau
 * de bord. Au-dessus, la sidebar assure la navigation. Le `<h1>`, lui, reste
 * rendu à TOUS les paliers (un seul dans le DOM), aligné sur le panneau.
 */
export default function SettingsPage() {
  const t = useTranslations('settings')
  const locale = useLocale()
  // #87 — < 768px : drill-down mobile ; sinon coquille desktop #86. Même
  // convention que le dashboard (#85). Le hook rend `false` en SSR -> desktop
  // au premier paint, puis bascule mobile après hydratation (pas de double
  // montage des sections).
  const isMobile = useMediaQuery('(max-width: 767px)')

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col">
      <main className="flex-grow px-4 py-6 md:px-6 md:py-8" data-testid="settings-page">
        <div className="mx-auto w-full max-w-5xl">
          {/* Titre de page aligné sur le panneau : plus de bandeau `border-b`
              pleine largeur, le shell fournit déjà le cadre applicatif. */}
          <div className="mb-6 flex items-center gap-3" data-testid="settings-header">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t('backToDashboard')}
            >
              <Link href={`/${locale}/dashboard`} data-testid="settings-back">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
          </div>

          {isMobile ? <MobileSettings /> : <SettingsShell />}
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
