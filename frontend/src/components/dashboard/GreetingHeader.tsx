'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * #80 — Bandeau de salutation contextuelle du dashboard.
 *
 * Spec Designer (graphite-handoff §3, corrections OBLIGATOIRES) : bandeau fin,
 * texte éditorial en SENTENCE CASE, pas de gros titre display, pas d'emoji, pas
 * d'icône `Zap`, pas d'animation spring-rebond (héritées de l'ancien page.tsx =
 * anti-pattern). La salutation varie selon l'heure LOCALE du navigateur.
 *
 * Largeur fluide (100%) : les contraintes de largeur restent dans le parent
 * (page dashboard) pour permettre la réutilisation responsive #83/#85.
 */
export interface GreetingHeaderProps {
  name: string
  /** Injectable pour tests déterministes ; défaut = maintenant. */
  now?: Date
  variant?: 'full' | 'compact'
}

/** Renvoie la clé de tranche horaire (matin/après-midi/soir) selon l'heure locale. */
export function timeOfDayKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({
  name,
  now = new Date(),
  variant = 'full',
}) => {
  const t = useTranslations('dashboard.greeting')
  const slot = timeOfDayKey(now.getHours())

  return (
    <header
      className="border-rule flex flex-col gap-1 border-b pb-4"
      data-testid="dashboard-greeting"
    >
      <p
        className="text-ink-faint font-mono text-2xs tracking-widest uppercase"
        data-testid="dashboard-greeting-eyebrow"
      >
        {t('eyebrow')}
      </p>
      <h1 className="text-ink text-md font-medium tracking-tight">
        {t(slot, { name })}
      </h1>
      {variant === 'full' && (
        <p className="text-ink-muted text-xs">{t('subtitle')}</p>
      )}
    </header>
  )
}

export default GreetingHeader
