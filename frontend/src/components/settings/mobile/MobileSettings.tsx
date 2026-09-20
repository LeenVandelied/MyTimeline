'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { ProfileSection } from '../ProfileSection'
import { SecuritySection } from '../SecuritySection'
import { PreferencesSection } from '../PreferencesSection'
import { AccountSection } from '../AccountSection'
import { SettingsIndex } from './SettingsIndex'
import type { ChapterId } from './chapters'

/**
 * #87 — Coquille mobile (< 768px) des Réglages : navigation drill-down.
 *
 * Deux vues : l'index (liste des 4 chapitres) et un écran détail (push/back).
 * `active === null` -> index ; sinon la section correspondante. Le bouton retour
 * (←) du header ramène à l'index. On RÉUTILISE les sections #86 telles quelles ;
 * seul le chapitre Compte passe `deleteContainer="sheet"` pour rendre la
 * suppression en BottomSheet (au lieu du Dialog desktop).
 *
 * Cette coquille remplace `SettingsShell` (tablist desktop) : la page monte l'une
 * OU l'autre selon le breakpoint (pas de double montage).
 */
const SECTIONS: Record<ChapterId, React.ReactNode> = {
  profile: <ProfileSection />,
  security: <SecuritySection />,
  preferences: <PreferencesSection />,
  account: <AccountSection deleteContainer="sheet" />,
}

export function MobileSettings() {
  const t = useTranslations('settings')
  const [active, setActive] = useState<ChapterId | null>(null)

  if (active === null) {
    return (
      <div className="mx-auto w-full max-w-md" data-testid="mobile-settings-index-view">
        <SettingsIndex onSelect={setActive} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md" data-testid={`mobile-settings-detail-${active}`}>
      <div className="mb-4 flex items-center gap-2">
        {/* #633 — cible tactile 44x44 (WCAG 2.5.5) : `h-11 w-11` = `--space-11` = 44px.
            On AGRANDIT la boîte visuelle plutôt que d'ajouter un `::before` d'expansion
            (motif `.mt-zoom__btn`) : ce dernier sert aux barres d'outils DENSES où le
            visuel doit rester petit ; ici l'en-tête ne porte que ce bouton et un titre
            court, rien ne contraint la largeur. Mêmes classes que le bouton fermer du
            `BottomSheet` voisin (BottomSheet.tsx:181) — une seule façon de dessiner un
            bouton-icône bordé sur les surfaces mobiles des réglages. */}
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-label={t('mobile.backToIndex')}
          data-testid="mobile-settings-back"
          className="border-rule text-ink-muted -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="text-ink-muted text-sm font-medium">{t(`nav.${active}`)}</span>
      </div>
      {SECTIONS[active]}
    </div>
  )
}

export default MobileSettings
