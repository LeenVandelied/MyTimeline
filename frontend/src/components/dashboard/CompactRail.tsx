'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Home, Package, LogOut, type LucideIcon } from 'lucide-react'

/**
 * #85 — Rail de navigation vertical compact (64px) du dashboard mobile PAYSAGE.
 *
 * En orientation paysage sur mobile (hauteur réduite), la nav portrait #83
 * (hamburger + drawer) est remplacée par ce rail persistant au bord gauche.
 * Icônes lucide SANS label visible → a11y OBLIGATOIRE (réserve Designer +
 * critère d'acceptation) : chaque item porte `aria-label` + `title` (tooltip),
 * `focus-visible:ring-2`, et est un vrai `<button>` (clavier natif Enter/Espace,
 * pas de `role`/`tabIndex`/`onKeyDown` custom à recâbler).
 *
 * Composant PRÉSENTATIONNEL (comme `MobileDrawer` #83) : les handlers sont
 * fournis par la page. Contenu minimum imposé : accueil, produits, déconnexion.
 * L'item actif (`activeId`) prend `--color-accent`, les autres `--color-ink-muted`.
 * Filet `--color-rule` à droite séparant rail / contenu, fond `--color-surface`.
 *
 * Tokens Graphite uniquement, theme-aware (clair + sombre) via classes DS.
 * `data-testid` contractuels (`dashboard-rail`, `dashboard-rail-item-<id>`) pour
 * l'E2E paysage #85.
 */
export interface CompactRailItem {
  id: string
  /** Clé i18n sous `dashboard.landscape.rail` pour aria-label + title. */
  labelKey: string
  icon: LucideIcon
  onSelect: () => void
}

export interface CompactRailProps {
  /** Handlers fournis par la page (navigation localisée / logout). */
  onHome: () => void
  onProducts: () => void
  onLogout: () => void
  /** Id de l'item actif (surbrillance accent). Défaut : 'home'. */
  activeId?: string
}

const RailButton: React.FC<{ item: CompactRailItem; active: boolean; label: string }> = ({
  item,
  active,
  label,
}) => {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={item.onSelect}
      aria-label={label}
      title={label}
      aria-current={active ? 'page' : undefined}
      data-testid={`dashboard-rail-item-${item.id}`}
      className={[
        'flex h-12 w-12 items-center justify-center rounded-sm',
        'hover:bg-accent-soft focus-visible:ring-focus focus-visible:ring-2 focus-visible:outline-none',
        'transition-colors duration-150',
        active ? 'text-accent' : 'text-ink-muted',
      ].join(' ')}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export const CompactRail: React.FC<CompactRailProps> = ({
  onHome,
  onProducts,
  onLogout,
  activeId = 'home',
}) => {
  const t = useTranslations('dashboard.landscape.rail')

  const items: CompactRailItem[] = [
    { id: 'home', labelKey: 'home', icon: Home, onSelect: onHome },
    { id: 'products', labelKey: 'products', icon: Package, onSelect: onProducts },
  ]

  return (
    <nav
      className="bg-surface border-rule flex w-16 shrink-0 flex-col items-center gap-2 border-r py-3"
      data-testid="dashboard-rail"
      aria-label={t('label')}
    >
      <div className="flex flex-1 flex-col items-center gap-2">
        {items.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            active={item.id === activeId}
            label={t(item.labelKey)}
          />
        ))}
      </div>

      {/* Déconnexion — pied du rail, même flux logout que MobileDrawer #83. */}
      <RailButton
        item={{ id: 'logout', labelKey: 'logout', icon: LogOut, onSelect: onLogout }}
        active={false}
        label={t('logout')}
      />
    </nav>
  )
}

export default CompactRail
