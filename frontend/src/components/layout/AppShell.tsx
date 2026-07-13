'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import {
  CalendarDays,
  LayoutDashboard,
  GanttChartSquare,
  Package,
  Plus,
  Settings,
  LogOut,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { LanguageSelector } from '@/components/ui/language-selector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { safeErrorMessage } from '@/lib/safe-error'

/**
 * #210 — Shell applicatif (handoff §8). Nav latérale persistante 248px
 * (`w-sidebar`, token `--sidebar-width`) enveloppant les segments connectés via
 * le layout de groupe de routes `app/[locale]/(app)/layout.tsx`.
 *
 * Responsive (décisions Designer, cf. briefing) :
 *  - `>= lg` (1024px, même seuil que `SettingsShell`) : sidebar persistante 248px
 *    (logo, nav Tableau de bord / Timeline / Produits, bouton Nouvel événement,
 *    langue, thème, profil avatar carré, réglages, déconnexion).
 *  - `< lg` : la sidebar est masquée (`hidden lg:flex`). Le shell DÉLÈGUE la nav
 *    mobile à l'écran enveloppé, qui conserve ses composants existants
 *    `CompactRail` (paysage) / `MobileDrawer` (portrait) — zéro duplication de
 *    logique nav, aucune réécriture. La tablette (`md`→`lg`) bascule donc en mode
 *    mobile (pas d'état sidebar repliable ce sprint — DEC).
 *
 * Lien actif : `aria-current="page"` + classe calquée sur `SettingsShell`
 * (`bg-accent-soft text-accent font-medium`), jamais la classe legacy `.is-active`.
 * Bouton Nouvel événement : `bg-primary` (Button défaut, graphite), overlay =
 * Dialog Radix minimal (le drawer 452px du handoff §6 est hors périmètre #210).
 */
type NavId = 'dashboard' | 'timeline' | 'products'

const NAV_ITEMS: { id: NavId; icon: LucideIcon }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'timeline', icon: GanttChartSquare },
  { id: 'products', icon: Package },
]

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const t = useTranslations('shell')
  const locale = useLocale()
  const pathname = usePathname() || ''
  const router = useRouter()
  const { user, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [showCreate, setShowCreate] = useState(false)

  const isDark = resolvedTheme === 'dark'

  const handleLogout = async () => {
    try {
      await logout()
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', safeErrorMessage(error))
    }
  }

  const displayName = user?.name || user?.username || ''
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || undefined

  return (
    <div className="bg-bg text-ink flex min-h-screen" data-testid="app-shell">
      {/* -------- Sidebar persistante 248px (desktop >= lg uniquement) -------- */}
      <aside
        className="bg-surface border-rule w-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r lg:flex"
        data-testid="shell-sidebar"
      >
        {/* Logo / marque */}
        <div className="border-rule flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <CalendarDays className="text-accent h-5 w-5" aria-hidden="true" />
          <span className="text-ink text-sm font-semibold tracking-tight">{t('brand')}</span>
        </div>

        {/* Bouton Nouvel événement (overlay) — primary graphite */}
        <div className="px-3 pt-4">
          <Button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full"
            data-testid="shell-sidebar-new-event-button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{t('newEvent')}</span>
          </Button>
        </div>

        {/* Navigation principale */}
        <nav
          aria-label={t('nav.aria')}
          className="flex flex-1 flex-col gap-1 px-3 pt-4"
          data-testid="shell-sidebar-nav"
        >
          {NAV_ITEMS.map(({ id, icon: Icon }) => {
            const href = `/${locale}/${id}`
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={id}
                href={href}
                aria-current={active ? 'page' : undefined}
                data-testid={`shell-sidebar-nav-link-${id}`}
                className={cn(
                  'flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'bg-accent-soft text-accent font-medium'
                    : 'text-ink-muted hover:bg-surface-2',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t(`nav.${id}`)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Pied : langue + thème + réglages + profil + déconnexion */}
        <div className="border-rule flex flex-col gap-2 border-t p-3">
          <div className="flex items-center justify-between">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
              aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
              data-testid="shell-sidebar-theme-toggle"
              className="text-ink-muted hover:bg-surface-2 focus-visible:ring-ring flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {isDark ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <Link
            href={`/${locale}/settings`}
            data-testid="shell-sidebar-settings-link"
            className="text-ink-muted hover:bg-surface-2 focus-visible:ring-ring flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t('settings')}</span>
          </Link>

          <div className="flex items-center gap-3 px-1 pt-1">
            {/* Avatar carré (rounded-sm) — override local, `avatar.tsx` inchangé. */}
            <Avatar
              className="rounded-sm"
              src={user?.avatarUrl ?? undefined}
              initials={initials}
              size="sm"
              data-testid="shell-sidebar-avatar"
            />
            <span className="text-ink min-w-0 flex-1 truncate text-sm font-medium">
              {displayName || t('profile')}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('logout')}
              title={t('logout')}
              data-testid="shell-sidebar-logout"
              className="text-ink-muted hover:bg-surface-2 focus-visible:ring-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* -------- Contenu de l'écran enveloppé -------- */}
      <main className="min-w-0 flex-1" data-testid="shell-main">
        {children}
      </main>

      {/* Overlay Nouvel événement — Dialog minimal (#210). Le formulaire complet
          (drawer 452px, handoff §6) est un follow-up. */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-surface border-rule" data-testid="shell-new-event-dialog">
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>{t('createDialog.description')}</DialogDescription>
          </DialogHeader>
          <p className="text-ink-muted text-sm">{t('createDialog.body')}</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AppShell
