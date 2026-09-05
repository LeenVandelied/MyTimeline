'use client'

import React, { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { X, Sun, Moon, LogOut } from 'lucide-react'
import { LanguageSelector } from '@/components/ui/language-selector'
import { Button } from '@/components/ui/button'
import { useFocusTrap } from '@/components/timeline/useFocusTrap'

/**
 * #83 — Drawer off-canvas mobile portrait. Panneau glissant depuis la droite,
 * ouvert par le bouton hamburger du header mobile. Contient : sélecteur de langue
 * (réutilise `LanguageSelector`), toggle de thème clair/sombre (`next-themes`) et
 * bouton de déconnexion.
 *
 * A11y (critère d'acceptation + réserve Designer) : `role="dialog"
 * aria-modal="true"` + `aria-labelledby`, FOCUS TRAP + restauration focus
 * (`useFocusTrap`, mutualisé S19), fermeture Escape + overlay + bouton fermer
 * (>= 44px). Le focus-trap gère aussi le focus initial. Motion `--ease-quart` sans
 * rebond (cf. `.mt-drawer` DS Graphite). `logout` NE purge aucun storage (DEC-S9-002).
 *
 * NB : composant présentationnel — `onLogout` est fourni par la page (garde le même
 * flux `logout()` + redirection `/${locale}/login` que le header desktop #80).
 */
export interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ open, onClose, onLogout }) => {
  const t = useTranslations('dashboard.mobile.drawer')
  const tc = useTranslations('common.buttons')
  const { resolvedTheme, setTheme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus-trap mutualisé (S19) + fermeture Escape via `onEscape` (#208 review).
  useFocusTrap(panelRef, open, onClose)

  if (!open) return null

  const isDark = resolvedTheme === 'dark'

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        data-testid="dashboard-mobile-drawer-overlay"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="bg-surface border-rule animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-[min(320px,85vw)] flex-col border-l duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-mobile-drawer-title"
        data-testid="dashboard-mobile-drawer"
      >
        <div className="border-rule flex items-center justify-between border-b px-4 py-3">
          <h2
            id="dashboard-mobile-drawer-title"
            className="text-ink text-xs font-semibold tracking-tight"
          >
            {t('title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            data-testid="dashboard-mobile-drawer-close"
            className="text-ink-muted border-rule hover:bg-accent-soft flex h-11 w-11 items-center justify-center rounded-sm border"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex flex-col gap-2">
            <span className="text-ink-faint font-mono text-2xs tracking-widest uppercase">
              {t('language')}
            </span>
            <LanguageSelector />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-ink-faint font-mono text-2xs tracking-widest uppercase">
              {t('theme')}
            </span>
            <Button
              variant="ghost"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              data-testid="dashboard-mobile-drawer-theme-toggle"
              aria-pressed={isDark}
              className="text-ink hover:bg-accent-soft border-rule flex items-center justify-start gap-2 border"
            >
              {isDark ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isDark ? t('themeLight') : t('themeDark')}</span>
            </Button>
          </div>
        </div>

        <div className="border-rule border-t p-4">
          <Button
            variant="ghost"
            onClick={onLogout}
            data-testid="dashboard-mobile-drawer-logout"
            className="text-ink hover:bg-accent-soft flex w-full items-center justify-start gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{tc('logout')}</span>
          </Button>
        </div>
      </div>
    </>
  )
}

export default MobileDrawer
