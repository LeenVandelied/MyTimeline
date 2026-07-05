'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { User, ShieldCheck, SlidersHorizontal, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfileSection } from './ProfileSection'
import { SecuritySection } from './SecuritySection'
import { PreferencesSection } from './PreferencesSection'
import { AccountSection } from './AccountSection'

/**
 * #86 — Coquille des Réglages desktop (>= 1024px) : navigation verticale par
 * chapitres (Profil / Sécurité / Préférences / Compte) + panneau actif.
 *
 * Pattern WAI-ARIA tablist (`role=tab`/`tabpanel`, aria-selected/controls) avec
 * navigation clavier ↑/↓/Home/End. Les sections sont des composants autonomes
 * réutilisés tels quels par la variante mobile (#87) qui remplacera juste cette
 * coquille par un drill-down.
 */
type ChapterId = 'profile' | 'security' | 'preferences' | 'account'

const CHAPTERS: { id: ChapterId; icon: typeof User }[] = [
  { id: 'profile', icon: User },
  { id: 'security', icon: ShieldCheck },
  { id: 'preferences', icon: SlidersHorizontal },
  { id: 'account', icon: UserCog },
]

export function SettingsShell() {
  const t = useTranslations('settings')
  const [active, setActive] = useState<ChapterId>('profile')

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null
    if (e.key === 'ArrowDown') nextIndex = (index + 1) % CHAPTERS.length
    else if (e.key === 'ArrowUp') nextIndex = (index - 1 + CHAPTERS.length) % CHAPTERS.length
    else if (e.key === 'Home') nextIndex = 0
    else if (e.key === 'End') nextIndex = CHAPTERS.length - 1
    else return
    e.preventDefault()
    const next = CHAPTERS[nextIndex]
    setActive(next.id)
    document.getElementById(`settings-tab-${next.id}`)?.focus()
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[220px_1fr]">
      <nav
        role="tablist"
        aria-label={t('nav.aria')}
        aria-orientation="vertical"
        className="flex flex-col gap-1"
        data-testid="settings-tablist"
      >
        {CHAPTERS.map((chapter, i) => {
          const selected = chapter.id === active
          const Icon = chapter.icon
          return (
            <button
              key={chapter.id}
              id={`settings-tab-${chapter.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`settings-panel-${chapter.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(chapter.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              data-testid={`settings-tab-${chapter.id}`}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                selected
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-ink-muted hover:bg-surface-2',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(`nav.${chapter.id}`)}
            </button>
          )
        })}
      </nav>

      <div>
        {CHAPTERS.map((chapter) => (
          <div
            key={chapter.id}
            id={`settings-panel-${chapter.id}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${chapter.id}`}
            hidden={chapter.id !== active}
            tabIndex={0}
          >
            {chapter.id === active && (
              <>
                {chapter.id === 'profile' && <ProfileSection />}
                {chapter.id === 'security' && <SecuritySection />}
                {chapter.id === 'preferences' && <PreferencesSection />}
                {chapter.id === 'account' && <AccountSection />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
