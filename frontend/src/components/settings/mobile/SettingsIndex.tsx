'use client'

import { useTranslations } from 'next-intl'
import { User, ShieldCheck, SlidersHorizontal, UserCog, ChevronRight } from 'lucide-react'
import type { ChapterId } from './chapters'
import { MOBILE_CHAPTERS } from './chapters'

/**
 * #87 — Écran index du drill-down mobile Réglages (< 768px).
 *
 * Liste les 4 chapitres (Profil / Sécurité / Préférences / Compte) sous forme
 * de lignes tappables avec chevron. Chaque ligne navigue (push) vers l'écran
 * détail correspondant via `onSelect`. Purement présentationnel : la logique de
 * navigation (pile index/détail) vit dans `MobileSettings`.
 *
 * A11y : `<ul>/<li>` + `<button>` natifs (focus/clavier gratuits), chevron
 * décoratif `aria-hidden`.
 */
interface SettingsIndexProps {
  onSelect: (id: ChapterId) => void
}

const ICONS: Record<ChapterId, typeof User> = {
  profile: User,
  security: ShieldCheck,
  preferences: SlidersHorizontal,
  account: UserCog,
}

export function SettingsIndex({ onSelect }: SettingsIndexProps) {
  const t = useTranslations('settings')

  return (
    <ul className="divide-rule border-rule divide-y rounded-md border" data-testid="settings-index">
      {MOBILE_CHAPTERS.map((id) => {
        const Icon = ICONS[id]
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              data-testid={`settings-index-${id}`}
              className="hover:bg-surface-2 focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-4 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon className="text-ink-muted h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-ink flex-1 text-sm font-medium">{t(`nav.${id}`)}</span>
              <ChevronRight className="text-ink-faint h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default SettingsIndex
