'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { FullCalendarEvent } from '@/types/event'
import { parseLocalDate, toLocalIsoDate } from '@/lib/date-iso'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_BUTTON } from '@/lib/touchTarget'
import { EmptyState } from '@/components/shared/EmptyState'
import { useOpenCreateEvent } from '@/components/layout/CreateEventContext'
import { currentWeekEvents } from './kpis'

/**
 * #80 — Agenda de la semaine courante (spec Designer §3). Filets (pas de `<Card>`
 * shadcn) : date stamp mono + filet couleur event (BR-EVE-009) + titre + produit,
 * tri chronologique. Réutilise `getWeekRange`/`getEventsInRange`. `variant` table
 * (desktop) | stack (mobile #83/#85). Largeur fluide 100%.
 */
export interface WeekAgendaProps {
  events: FullCalendarEvent[]
  now?: Date
  locale: string
  variant?: 'table' | 'stack'
  /**
   * Review S90 — `false` quand l'utilisateur n'a AUCUN produit : l'état vide ne porte
   * alors pas de CTA « Ajouter un événement » (le drawer ne pourrait qu'expliquer
   * BR-EVE-002 ; l'état vide produits voisin porte déjà l'action utile).
   *
   * Défaut `true` : le CTA reste gouverné par le seul provider du shell pour tout
   * montage qui ne connaît pas les produits (tests, montages hors page). Le seul
   * montage qui les connaît, `dashboard/page.tsx`, passe la valeur explicitement, et
   * `dashboard/page.test.tsx` verrouille cette transmission dans les 3 branches.
   */
  canCreateEvent?: boolean
}

export const WeekAgenda: React.FC<WeekAgendaProps> = ({
  events,
  now = new Date(),
  locale,
  variant = 'table',
  canCreateEvent = true,
}) => {
  const t = useTranslations('dashboard.week')
  const openCreateEvent = useOpenCreateEvent()
  // #640 — même source que le compteur « … événements cette semaine » de `KpiMarginalia`.
  const weekEvents = useMemo(() => currentWeekEvents(events, now), [events, now])
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }),
    [locale],
  )

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dashboard-week-agenda"
      aria-label={t('label')}
    >
      {/* #575 — vrai titre de section et non plus un eyebrow mono (13px, capitales,
          `ink-faint`). Classes RÉFÉRENCE des 8 titres de section du produit :
            · `text-sm` = 17px, plus bas palier de l'échelle qui lit comme un titre,
              sous le `h1` du dashboard (`GreetingHeader`, `text-md` 21px) ;
            · `font-display font-semibold` : ce que la règle `h2` du DS pose déjà
              (`base.css`, `@layer base`), écrit ici pour que l'intention se lise ;
            · interligne : `text-sm` apparie un `line-height` (PIT-S53-001), mais sur
              un `h1..h6` la règle HORS layer de `base.css` le ramène à 1.08 — ce
              couple n'est donc sûr QUE sur un titre, pas sur un `<p>`/`<span>`.
          Pas d'eyebrow au-dessus : l'ancien ne portait que ce même libellé, aucune
          information (plage, compteur) à conserver.
          #664 — Maquette `Dashboard.dc.html` (relevé S109) : AUCUN sur-titre sur
          « Cette semaine » (absence voulue) ; à droite du titre, un compteur
          « {n} événements » (mono, `ink-muted`, sans capitales) = lignes affichées.
          Ce n'est pas un sur-titre : ni `.mt-eyebrow`, ni capitales. Taille : 11 px
          maquette → `text-2xs` (13 px), plus bas palier de l'échelle du DS. Pas de
          compteur dans l'état vide (son message dit déjà « rien »).
          `min-w-0` + `whitespace-nowrap` + `flex-wrap` : en `de`, un titre long passe
          à la ligne au lieu de pousser le compteur hors de la carte. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-ink font-display min-w-0 text-sm font-semibold">{t('title')}</h2>
        {weekEvents.length > 0 && (
          <p
            className="text-ink-muted text-2xs font-mono whitespace-nowrap"
            data-testid="dashboard-week-count"
          >
            {t('count', { count: weekEvents.length })}
          </p>
        )}
      </div>
      {weekEvents.length === 0 ? (
        // #630 — État vide partagé (compact) + CTA « Ajouter un événement » qui ouvre
        // LE drawer du shell (`useOpenCreateEvent`). Hors shell (null), aucun bouton
        // plutôt qu'un bouton inerte. Review S90 : sans produit (`canCreateEvent`
        // false), aucun bouton non plus — plus de détour par un drawer bloqué.
        <EmptyState
          compact
          title={t('empty')}
          action={
            openCreateEvent && canCreateEvent ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={TOUCH_TARGET_BUTTON}
                // #605 — enveloppé : le MouseEvent ne doit pas devenir `options`.
                onClick={() => openCreateEvent()}
                data-testid="dashboard-week-agenda-empty-cta"
              >
                {t('emptyCta')}
              </Button>
            ) : undefined
          }
          testId="dashboard-week-agenda-empty"
        />
      ) : (
        <ul className="flex flex-col" data-variant={variant}>
          {weekEvents.map((event) => (
            <li
              key={event.id}
              className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
              data-testid={`dashboard-week-agenda-row-${event.id}`}
            >
              {/* #72 — `.mt-date--long` (DS i18n.css §7) : mono + tabular-nums +
                  `unicode-bidi:isolate` + `nowrap`. Sa `font-size:13px` est la
                  valeur EXACTE de `--text-2xs` → aucun delta de taille. On ne pose
                  PAS `.mt-date--short` : elle force `uppercase` + 11px, un
                  traitement qui relève d'un arbitrage Designer (cf. rapport #72). */}
              {/* #518 — `toLocalIsoDate` REMPLACE `toISOString()`. `dayFmt` rend
                  `{weekday, day}` dans le fuseau du navigateur ; `toISOString()`
                  bascule en UTC et pouvait donc nommer un AUTRE jour que le libellé
                  peint juste à côté (Paris UTC+2 : « mer. 24 » ↔ `2026-06-23T22:00Z`).
                  Il levait en outre une `RangeError` sur une date invalide, là où
                  l'helper rend `null` et l'attribut est simplement omis. */}
              <time
                className="text-ink-muted mt-date--long w-16 shrink-0"
                dateTime={toLocalIsoDate(parseLocalDate(event.start)) ?? undefined}
              >
                {dayFmt.format(parseLocalDate(event.start))}
              </time>
              <span
                className="h-6 w-0.5 shrink-0 rounded-full"
                style={{ background: event.color ?? 'var(--color-rule-strong)' }}
                aria-hidden="true"
              />
              <span className="text-ink min-w-0 flex-1 truncate text-xs font-medium">
                {event.title}
              </span>
              <span className="text-ink-muted text-2xs hidden truncate sm:inline">
                {event.extendedProps.productName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default WeekAgenda
