'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { buildDensityBuckets } from '@/components/timeline'
import type { FullCalendarEvent } from '@/types/event'

/**
 * #80 — Ruban de densité (hero, spec Designer §3). Densité = HAUTEUR de barre ∝
 * events/jour (PAS gradient). Couleur barre = couleur event du jour (`--evt-*`,
 * BR-EVE-009), jour vide = filet neutre. Ligne TODAY = `--color-accent`. Réutilise
 * `buildDensityBuckets` (lib.ts). Largeur fluide, `rangeDays` paramétrable (#83/#85).
 *
 * #83 — Mode `scrollable` (mobile portrait) : sur un écran étroit, 30 barres à
 * `flex-1` deviennent illisibles. Le mode scrollable donne à chaque barre une
 * largeur MINIMALE fixe (`minBarWidth`) et rend le rail scrollable horizontalement
 * (`overflow-x:auto`), avec un indicateur de scroll visible (dégradé de bord + hint
 * textuel). Aucun scroll horizontal CACHÉ (réserve Designer). Desktop inchangé.
 */
export interface DensityRibbonProps {
  events: FullCalendarEvent[]
  rangeDays?: number
  now?: Date
  locale: string
  /** #83 — Rend le rail scrollable-x avec barres à largeur mini fixe (mobile). */
  scrollable?: boolean
  /** #83 — Largeur mini d'une barre en mode scrollable (px). Défaut 12. */
  minBarWidth?: number
}

export const DensityRibbon: React.FC<DensityRibbonProps> = ({
  events,
  rangeDays = 30,
  now = new Date(),
  locale,
  scrollable = false,
  minBarWidth = 12,
}) => {
  const t = useTranslations('dashboard.density')
  const tm = useTranslations('dashboard.mobile')
  // Fenêtre glissante : les `rangeDays` derniers jours (aujourd'hui = dernier jour).
  const from = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - (rangeDays - 1))
    return d
  }, [now, rangeDays])

  const buckets = useMemo(
    () => buildDensityBuckets(events, from, now, rangeDays),
    [events, from, now, rangeDays],
  )

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale],
  )
  // #72 — Le `title` des barres expose un compteur d'événements : quantité →
  // séparateur de milliers localisé. C'est un ATTRIBUT texte : aucune classe DS
  // (`.mt-num`) n'y est applicable, seul le formatage joue.
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const rangeLabel = `${fmt.format(from)} — ${fmt.format(now)}`

  return (
    <section
      className="bg-surface border-rule flex flex-col gap-2 rounded-lg border p-4"
      data-testid="dashboard-density-ribbon"
      aria-label={t('label', { days: rangeDays })}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-ink-faint font-mono text-2xs tracking-widest uppercase">
          {t('eyebrow', { days: rangeDays })}
        </span>
        <span className="text-ink-muted font-mono text-2xs">{rangeLabel}</span>
      </div>
      {scrollable ? (
        // Rail scrollable-x : barres à largeur mini fixe, indicateur de scroll
        // (dégradé de bord droit + hint texte). Pas de scroll horizontal caché.
        <div className="relative">
          <div
            className="scrollbar-none flex h-24 items-end gap-px overflow-x-auto pr-6"
            role="img"
            aria-label={t('label', { days: rangeDays })}
            data-testid="dashboard-density-ribbon-scroll"
          >
            {buckets.map((b, i) => (
              <div
                key={i}
                className="relative h-full shrink-0"
                style={{ width: `${minBarWidth}px` }}
                data-testid={b.isToday ? 'dashboard-density-today' : undefined}
                title={`${fmt.format(b.date)} · ${nf.format(b.count)}`}
              >
                <div
                  className="absolute bottom-0 w-full rounded-xs"
                  style={{
                    height: `${Math.max(b.count > 0 ? 8 : 2, b.height * 100)}%`,
                    background: b.color ?? 'var(--color-rule-strong)',
                  }}
                />
                {b.isToday && (
                  <div className="bg-accent pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
                )}
              </div>
            ))}
          </div>
          {/* Dégradé de bord droit = indicateur visuel « il reste du contenu ». */}
          <div
            className="from-surface pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent"
            aria-hidden="true"
          />
          <span className="text-ink-faint mt-1 flex items-center justify-end gap-1 font-mono text-2xs">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {tm('scrollHint')}
          </span>
        </div>
      ) : (
        <div className="flex h-24 items-end gap-px" role="img" aria-label={t('label', { days: rangeDays })}>
          {buckets.map((b, i) => (
            <div
              key={i}
              className="relative flex-1"
              style={{ height: '100%' }}
              data-testid={b.isToday ? 'dashboard-density-today' : undefined}
              title={`${fmt.format(b.date)} · ${nf.format(b.count)}`}
            >
              <div
                className="absolute bottom-0 w-full rounded-xs"
                style={{
                  height: `${Math.max(b.count > 0 ? 8 : 2, b.height * 100)}%`,
                  background: b.color ?? 'var(--color-rule-strong)',
                }}
              />
              {b.isToday && (
                <div className="bg-accent pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default DensityRibbon
