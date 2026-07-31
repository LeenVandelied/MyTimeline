'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useFocusTrap } from '@/components/timeline/useFocusTrap'

/**
 * #334 — Panneau off-canvas de la landing, ouvert par le burger du header sous `lg`.
 *
 * ⚠ #347 : le seuil était `md` (768 px) ; il est passé à `lg` (1024 px) parce que le
 * palier tablette 768–1023 px rendait la mise en page desktop complète et débordait de
 * 90 à 108 px selon la locale. Le `lg:hidden` de l'overlay ET celui du panneau ci-dessous
 * doivent rester synchronisés avec `LG_BREAKPOINT_QUERY` de `HeaderSection` : sinon le
 * focus-trap tourne sur un panneau masqué et avale l'Escape de toute la page.
 *
 * POURQUOI CE COMPOSANT EXISTE. À 375 px, le groupe droit du header (sélecteur de
 * langue + Connexion + Inscription) demandait 299 px (fr) / 305 px (de) pour 343 px
 * disponibles, logo compris — d'où 173 px de scroll horizontal. On bascule ici les
 * éléments secondaires (ancres de navigation, Connexion, sélecteur de langue) et on
 * ne garde dans le header que le logo, le CTA « Inscription » et ce burger.
 *
 * POURQUOI PAS `MobileDrawer`. `components/dashboard/MobileDrawer.tsx` est couplé au
 * dashboard (déconnexion, bascule de thème, clés `dashboard.mobile.drawer`). Le
 * généraliser dépassait le périmètre P1 de #334 : on le prend comme MODÈLE (overlay
 * `z-40` / panneau `z-50`, `role="dialog"` + `aria-modal` + `aria-labelledby`) et on
 * mutualise ce qui l'est déjà — `useFocusTrap` (#63/#208).
 *
 * A11y : focus-trap + focus initial + restauration du focus au déclencheur, fermeture
 * par Escape (via `onEscape`), par l'overlay, par le bouton fermer (44×44) et au clic
 * sur une ancre. Motion 200 ms sans rebond (DS Graphite : 120–280 ms).
 *
 * Les liens sont stylés PAR TOKENS et non via `.nav-link` (demande de la revue
 * design #334) : `.nav-link` porte le soulignement animé propre au header desktop.
 *
 * APPARIEMENT FOND/ENCRE AU SURVOL (invariant du Sprint 49, cf. `ui/button.tsx`).
 * Les ancres de navigation ne changent QUE leur surface au survol
 * (`hover:bg-accent-soft`) : l'encre de repos `text-ink` reste en place. La
 * version livrée posait aussi `hover:text-accent` — mesuré AU NAVIGATEUR à
 * 375 px, cela donnait `#1170e4` sur `#dbe9fc` = **3.83:1** en thème clair pour
 * du 15 px non gras (seuil WCAG 1.4.3 AA = 4.5:1) : NON CONFORME. En sombre le
 * même couplage mesurait 5.43:1, donc le défaut n'était visible que dans un seul
 * thème — d'où l'invariant plutôt que le rustinage au cas par cas.
 * Le CTA « Connexion » ci-dessous, lui, écrit LUI-MÊME les deux moitiés de la
 * paire sanctionnée (`hover:bg-accent` + `hover:text-accent-ink`, mesuré 4.71:1
 * en clair / 6.94:1 en sombre) et en assume donc les deux.
 * Garde-fou : `landing.hover-pairing.test.ts`.
 */
export interface LandingMobileMenuNavLink {
  href: string
  label: string
}

export interface LandingMobileMenuProps {
  open: boolean
  onClose: () => void
  locale: string
  navLinks: readonly LandingMobileMenuNavLink[]
}

/* Plus de classe de focus locale (#383) : l'indicateur est le contour
   `:focus-visible` du DS (`ds/tokens/base.css`), 2px accent à 2px d'offset.
   L'ancien `focus-visible:ring-offset-2` était posé SANS `ring-offset-color` :
   `--tw-ring-offset-color` vaut `#fff` par défaut, ce qui peignait une bande
   BLANCHE de 2px autour de chaque cible focalisée en mode sombre.
   `outline-offset` est transparent — il laisse voir le fond réel. */

export const LandingMobileMenu: React.FC<LandingMobileMenuProps> = ({
  open,
  onClose,
  locale,
  navLinks,
}) => {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus-trap mutualisé (#63) + fermeture Escape via `onEscape` (#208).
  useFocusTrap(panelRef, open, onClose)

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
        onClick={onClose}
        data-testid="landing-header-menu-overlay"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id="landing-header-menu"
        className="bg-surface border-rule animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-[min(320px,85vw)] flex-col border-l duration-200 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-header-menu-title"
        data-testid="landing-header-menu"
      >
        <div className="border-rule flex items-center justify-between border-b px-4 py-3">
          <h2
            id="landing-header-menu-title"
            className="text-ink text-xs font-semibold tracking-tight"
          >
            {t('common.landing.navigation.menuTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.landing.navigation.menuClose')}
            data-testid="landing-header-menu-close"
            className="text-ink-muted border-rule-emphasis hover:bg-accent-soft flex h-11 w-11 items-center justify-center rounded-sm border transition-colors duration-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* `overflow-y-auto` : sur un écran court (ou si les ancres se multiplient),
            la zone de navigation défile au lieu de repousser « Connexion » et le
            sélecteur de langue hors du panneau — ils restent atteignables (critère 2). */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="text-ink hover:bg-accent-soft flex min-h-11 items-center rounded-sm px-3 text-xs transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="border-rule flex flex-col gap-4 border-t p-4">
          <Link
            href={`/${locale}/login`}
            onClick={onClose}
            className="border-rule-emphasis text-accent hover:bg-accent hover:text-accent-ink flex min-h-11 items-center justify-center rounded-md border text-xs font-medium transition-colors duration-200"
          >
            {t('common.login.title')}
          </Link>
          <LanguageSelector />
        </div>
      </div>
    </>
  )
}

export default LandingMobileMenu
