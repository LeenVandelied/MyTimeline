'use client'

import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getEventsInRange } from '@/components/timeline'
import type { FullCalendarEvent } from '@/types/event'
import { Button } from '@/components/ui/button'
import { TOUCH_TARGET_BUTTON } from '@/lib/touchTarget'
import { EmptyState } from '@/components/shared/EmptyState'
import { useOpenCreateEvent } from '@/components/layout/CreateEventContext'

/**
 * #83 — Agenda compact mobile portrait : liste verticale des événements du JOUR
 * courant + du LENDEMAIN (PAS la semaine complète — critère d'acceptation). Le
 * dashboard desktop (#80) conserve `WeekAgenda variant="table"` ; ce composant est
 * la variante compacte dédiée pour l'espace vertical réduit du portrait.
 *
 * Réutilise `getEventsInRange` (lib.ts, même helper que `WeekAgenda`). Filets DS
 * Graphite (pas de `<Card>`), filet couleur event (BR-EVE-009), tri chronologique
 * assuré par `getEventsInRange`. Sépare jour / lendemain par un intertitre mono.
 * `data-testid` contractuels pour l'E2E #85. Largeur fluide 100%.
 *
 * NB : pas de `locale` — les lignes n'affichent pas de date formatée (le groupe
 * jour/lendemain porte l'info temporelle via un intertitre i18n) ; on évite un
 * prop mort. Si un affichage d'heure par ligne devient nécessaire, réintroduire
 * `locale` + `Intl.DateTimeFormat` comme dans `WeekAgenda`.
 */
export interface CompactAgendaProps {
  events: FullCalendarEvent[]
  now?: Date
  /**
   * Review S90 — `false` sans aucun produit : pas de CTA dans l'état vide (le carousel
   * produits voisin porte l'action). Défaut `true`, même contrat que `WeekAgenda`.
   */
  canCreateEvent?: boolean
}

/** Bornes [00:00, 23:59:59.999] d'un jour donné. */
function dayBounds(base: Date): { start: Date; end: Date } {
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const AgendaRow: React.FC<{ event: FullCalendarEvent }> = ({ event }) => (
  <li
    className="border-rule flex items-center gap-3 border-b py-2 last:border-b-0"
    data-testid={`dashboard-compact-agenda-row-${event.id}`}
  >
    <span
      className="h-6 w-0.5 shrink-0 rounded-full"
      style={{ background: event.color ?? 'var(--color-rule-strong)' }}
      aria-hidden="true"
    />
    <span className="text-ink min-w-0 flex-1 truncate text-xs font-medium">{event.title}</span>
    <span className="text-ink-muted text-2xs shrink-0 truncate">
      {event.extendedProps.productName}
    </span>
  </li>
)

export const CompactAgenda: React.FC<CompactAgendaProps> = ({
  events,
  now = new Date(),
  canCreateEvent = true,
}) => {
  const t = useTranslations('dashboard.mobile.compactAgenda')
  const openCreateEvent = useOpenCreateEvent()

  const today = useMemo(() => dayBounds(now), [now])
  const tomorrow = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return dayBounds(base)
  }, [now])

  const todayEvents = useMemo(
    () => getEventsInRange(events, today.start, today.end),
    [events, today],
  )
  const tomorrowEvents = useMemo(
    () => getEventsInRange(events, tomorrow.start, tomorrow.end),
    [events, tomorrow],
  )

  const isEmpty = todayEvents.length === 0 && tomorrowEvents.length === 0

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="dashboard-compact-agenda"
      aria-label={t('label')}
    >
      {/* #575 — vrai titre de section (cf. `WeekAgenda`). Les intertitres
          « Aujourd'hui » / « Demain » plus bas RESTENT en mono capitales : ce sont
          des en-têtes de groupe, l'usage que la charte réserve à ce style.
          #664 — Maquette `Mobile Dashboard.dc.html` (relevé S109) : AUCUN sur-titre
          (absence voulue) ; compteur à droite du titre. La maquette compte « cette
          semaine » ; ce composant n'affiche QUE aujourd'hui + demain, donc il compte
          CE QU'IL MONTRE (pas la semaine). Forme longue « {n} événements » et non
          l'abréviation « évén. » de la maquette : aucune abréviation stable dans les
          4 langues (de « Ereign. » n'existe pas), un lecteur d'écran la lit telle
          quelle, et la place ne manque pas. Même classes que `WeekAgenda`. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-ink font-display min-w-0 text-sm font-semibold">{t('title')}</h2>
        {!isEmpty && (
          <p
            className="text-ink-muted text-2xs font-mono whitespace-nowrap"
            data-testid="dashboard-compact-agenda-count"
          >
            {/* `getEventsInRange` filtre sur la date de DÉBUT : un événement n'est
                jamais dans les deux groupes, la somme ne compte donc aucun doublon. */}
            {t('count', { count: todayEvents.length + tomorrowEvents.length })}
          </p>
        )}
      </div>
      {isEmpty ? (
        // #630 — Miroir mobile de `WeekAgenda` : état vide compact + CTA qui ouvre le
        // drawer du shell (absent hors shell, et absent sans produit — review S90).
        // `emptyTitle` (instruction, « rien aujourd'hui NI demain ») est distinct de
        // `emptyToday`, constat court du seul sous-groupe « Aujourd'hui » vide.
        <EmptyState
          compact
          title={t('emptyTitle')}
          action={
            openCreateEvent && canCreateEvent ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={TOUCH_TARGET_BUTTON}
                // #605 — enveloppé : le MouseEvent ne doit pas devenir `options`.
                onClick={() => openCreateEvent()}
                data-testid="dashboard-compact-agenda-empty-cta"
              >
                {t('emptyCta')}
              </Button>
            ) : undefined
          }
          testId="dashboard-compact-agenda-empty"
        />
      ) : (
        <>
          <div className="flex flex-col gap-1" data-testid="dashboard-compact-agenda-today">
            <span className="mt-eyebrow">{t('today')}</span>
            {todayEvents.length === 0 ? (
              // #701 — `emptyToday` et PAS `empty`/`emptyTitle` : on n'est ici que si
              // `isEmpty` est faux, donc demain porte forcément des events. Dire
              // « ni demain » (ancien libellé) mentait à l'utilisateur.
              <p className="text-ink-muted text-2xs">{t('emptyToday')}</p>
            ) : (
              <ul className="flex flex-col">
                {todayEvents.map((event) => (
                  <AgendaRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </div>
          {/* #701 — PAS de défaut symétrique ici : quand demain est vide, le groupe
              n'est pas rendu du tout, donc aucun message mensonger. L'asymétrie de
              traitement (« Rien aujourd'hui » affiché / groupe demain masqué) est
              délibérée : aujourd'hui est l'ancre du composant. */}
          {tomorrowEvents.length > 0 && (
            <div className="flex flex-col gap-1" data-testid="dashboard-compact-agenda-tomorrow">
              <span className="mt-eyebrow">{t('tomorrow')}</span>
              <ul className="flex flex-col">
                {tomorrowEvents.map((event) => (
                  <AgendaRow key={event.id} event={event} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default CompactAgenda
