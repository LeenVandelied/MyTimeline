'use client'

import { useEffect, useState } from 'react'

import { ephemerisParts } from '@/lib/ephemeris'
import { toLocalIsoDate } from '@/lib/date-iso'
import { cn } from '@/lib/utils'

/**
 * #627 — Feuillet d'éphéméride de l'écran 404 (maquette `États système.dc.html`,
 * relevé `docs/memory/sprints/sprint-110/maquette-etats-systeme.md`) : jour de la
 * semaine, jour du mois en grand, mois + année en accent, « Semaine N ».
 *
 * DATE CALCULÉE APRÈS MONTAGE, JAMAIS PENDANT LE RENDU. `/_not-found` est
 * PRÉRENDU au build (décompte `Generating static pages`, cf.
 * `app/global-not-found.tsx`) : un `new Date()` pendant le rendu graverait le jour
 * du build dans le HTML servi, puis l'hydratation calculerait un autre jour →
 * date obsolète ET mismatch React. Le premier rendu (serveur comme client) est
 * donc NEUTRE — mêmes lignes, espaces insécables, dimensions réservées, aucun
 * saut de mise en page — puis l'effet pose la date du NAVIGATEUR.
 * `data-ephemeris-ready` sert de barrière nommée aux E2E (PIT-S83-001).
 *
 * DÉCORATIF (`aria-hidden`, cf. `ds/a11y-audit.md` « Cachet d'éphéméride
 * décoratif ») : l'information utile est portée par le titre de l'écran. Le
 * `<time dateTime>` suit malgré tout la convention DS d'une date affichée.
 *
 * TEXTE EN `ink-muted`, PAS `ink-faint` comme la maquette : `ink-faint` est
 * réservé au non-textuel (DEC-S97-001, ≤ 3,20:1). Tokens Graphite seulement →
 * le rendu sombre suit `.dark` sans variante.
 */

const NBSP = ' '

export interface EphemerisLeafProps {
  /** Locale BCP 47 des libellés (`fr`, `en`, `es`, `de`). */
  locale: string
  /** Libellé de semaine déjà traduit par l'appelant, ex. `(n) => t('week', { week: n })`. */
  formatWeek: (week: number) => string
  className?: string
}

/** Date du jour, `null` tant que le composant n'est pas monté (prérendu, SSR, 1er rendu). */
function useMountedToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => {
    setToday(new Date())
  }, [])
  return today
}

export function EphemerisLeaf({ locale, formatWeek, className }: EphemerisLeafProps) {
  const today = useMountedToday()
  const parts = today ? ephemerisParts(today, locale) : null

  return (
    <time
      aria-hidden="true"
      dateTime={today ? (toLocalIsoDate(today) ?? undefined) : undefined}
      data-testid="ephemeris-leaf"
      data-ephemeris-ready={parts ? 'true' : 'false'}
      className={cn(
        'border-rule-strong bg-bg flex w-[150px] shrink-0 flex-col items-center rounded-xl border px-2.5 py-4 text-center font-mono',
        className,
      )}
    >
      <span
        data-testid="ephemeris-weekday"
        className="text-ink-muted text-[10px] tracking-[.14em] uppercase"
      >
        {parts?.weekday ?? NBSP}
      </span>
      <span
        data-testid="ephemeris-day"
        className="text-ink mt-num my-1 text-[62px] leading-none font-semibold"
      >
        {parts?.day ?? NBSP}
      </span>
      <span
        data-testid="ephemeris-month"
        className="text-accent text-[11px] tracking-[.12em] uppercase"
      >
        {parts ? `${parts.month} ${parts.year}` : NBSP}
      </span>
      <span
        data-testid="ephemeris-week"
        className="border-rule text-ink-muted mt-2 w-full border-t pt-2 text-[9px] tracking-[.1em] uppercase"
      >
        {parts ? formatWeek(parts.isoWeek) : NBSP}
      </span>
    </time>
  )
}

export default EphemerisLeaf
