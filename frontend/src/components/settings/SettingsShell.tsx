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
 * #86 — Coquille des Réglages desktop (>= 768px) : navigation par chapitres
 * (Profil / Sécurité / Préférences / Compte) + panneau actif.
 *
 * #299 — La nav de chapitres était une colonne de 220px (`lg:grid-cols-[220px_1fr]`).
 * La page vivant désormais sous `(app)/`, la sidebar 248px d'`AppShell` est montée
 * au-dessus : deux navs VERTICALES côte à côte (468px, 37% de la largeur à 1280px,
 * pour 4 entrées). La nav bascule donc en barre d'ONGLETS HORIZONTALE en tête du
 * panneau. Le pattern tablist et TOUS les `data-testid` sont conservés.
 *
 * `overflow-x-auto` et non `flex-wrap` : le retour à la ligne casserait l'ordre
 * visuel du roving `tabIndex` (le focus sauterait d'une ligne à l'autre sans
 * rapport avec ←/→). Sur une barre étroite, on préfère un défilement horizontal.
 *
 * Pattern WAI-ARIA tablist (`role=tab`/`tabpanel`, aria-selected/controls) avec
 * navigation clavier ←/→ (primaires en orientation horizontale, cf. WAI-ARIA APG)
 * + ↑/↓ conservés en ALIAS (rétro-compat, `e2e/settings-navigation.spec.ts:51`
 * asserte `ArrowUp`) + Home/End. Les sections sont des composants autonomes
 * réutilisés tels quels par la variante mobile (#87), qui remplace cette coquille
 * par un drill-down.
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
    // ←/→ : primaires (tablist horizontal). ↑/↓ : alias conservés (#299).
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % CHAPTERS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      nextIndex = (index - 1 + CHAPTERS.length) % CHAPTERS.length
    else if (e.key === 'Home') nextIndex = 0
    else if (e.key === 'End') nextIndex = CHAPTERS.length - 1
    else return
    e.preventDefault()
    const next = CHAPTERS[nextIndex]
    setActive(next.id)
    document.getElementById(`settings-tab-${next.id}`)?.focus()
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <nav
        role="tablist"
        aria-label={t('nav.aria')}
        aria-orientation="horizontal"
        className="border-rule flex flex-row gap-1 overflow-x-auto border-b"
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
                // `h-11` : même hauteur d'item que la sidebar d'`AppShell`.
                // `shrink-0` : dans un conteneur `overflow-x-auto`, sans lui les
                // libellés longs (EN/DE) seraient compressés au lieu de défiler.
                'flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors',
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
