'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Cursor } from '@/components/timeline/Cursor'
import { Ruler } from '@/components/timeline/Ruler'
import { contrastInk } from '@/lib/color'
import type { DurationUnit, RecurrenceUnit } from '@/types/event'
import { buildPreviewModel, type PreviewEventType, type PreviewSegment } from './previewTimeline'

/**
 * #315 — Aperçu live du formulaire d'événement : MINI-FRISE (handoff §6).
 *
 * Remplace le bloc coloré simple livré au Sprint 44 (écart assumé `DEC-S44-002`).
 * Rend, à l'échelle du drawer 452px : règle temporelle + marqueur TODAY,
 * occurrence pleine, connecteur pointillé + occurrence FANTÔME quand l'événement
 * est récurrent, et la légende « prochaine occurrence ».
 *
 * RÉUTILISATION (aucune réécriture de frise) :
 *   - `Ruler` (#47) — règle + `DateStamp`, avec `gutterPercent={0}` (prop additive
 *     #315 : pas de colonne « produits » dans un aperçu sans lanes) ;
 *   - `Cursor` (#47) — barre TODAY, même `gutterPercent={0}` pour rester aligné ;
 *   - classes DS `.mt-evt` / `.mt-evt--draft` (`ds/components/timeline.css`) pour
 *     la barre pleine et l'occurrence fantôme — c'est le traitement de barre
 *     canonique du handoff (« occurrence pleine + filet pointillé reliant des
 *     occurrences fantômes », `--mt-evt` / `--mt-evt-ink` = API du DS) ;
 *   - `.mt-tlv__today-badge` pour le badge TODAY, `.mt-recur` pour la récurrence.
 *
 * ⚠ `EventBar` (#47) n'est PAS réutilisé, volontairement : il porte en dur
 * `data-testid="timeline-event"` (les specs E2E comptent les barres de la frise
 * réelle) — un aperçu ouvert par-dessus la frise polluerait ces sélecteurs — et
 * son rendu par défaut monte `EventContent`, qui exige les contextes auth/i18n de
 * la page. La géométrie vient donc de `previewTimeline.ts` (fonctions pures).
 *
 * ⚠ PERF (BR-EVE-009) : ce composant ne débounce RIEN lui-même. Les valeurs
 * arrivent déjà débouncées à 150 ms depuis `EventEditForm` — les brancher sur les
 * `watch()` bruts recalculerait la géométrie à chaque frappe.
 *
 * Aucune couleur en dur : tokens DS uniquement (accent/rule/ink/surface),
 * theme-aware clair + sombre. La seule couleur littérale est celle CHOISIE par
 * l'utilisateur pour son événement (donnée, pas décoration).
 */
export interface EventPreviewTimelineProps {
  /** Titre saisi (déjà débouncé). Vide ⇒ libellé d'exemple. */
  title?: string
  /** Couleur hex VALIDÉE (`HEX_COLOR_REGEX`) ou `undefined` ⇒ accent du DS. */
  color?: string
  /** Nature de l'événement (BR-EVE-003) — domaine fermé, cf. `eventEditSchema.type`. */
  type?: PreviewEventType | null
  durationValue?: number | null
  durationUnit?: DurationUnit | null
  startDate?: string | null
  endDate?: string | null
  isRecurring?: boolean
  recurrenceUnit?: RecurrenceUnit | null
  /**
   * Libellé de récurrence déjà composé par le parent (« Récurrent · Mois »).
   * Rendu sous `data-testid="event-form-preview-recurrence"` — testid HISTORIQUE
   * (#300), consommé par les tests existants et par l'E2E #314 (S47).
   */
  recurrenceLabel?: string | null
  /** Référence « aujourd'hui » — injectable pour des tests déterministes. */
  now?: Date
}

/**
 * Style d'une barre. Les propriétés personnalisées `--mt-evt*` sont l'API
 * documentée du DS (`ds/components/timeline.css`) ; `React.CSSProperties`
 * (csstype) n'expose pas d'index signature pour les custom properties, d'où
 * l'assertion — seule justification acceptée pour ce cast.
 */
function barStyle(segment: PreviewSegment, color: string | undefined): React.CSSProperties {
  return {
    left: `${segment.leftPercent}%`,
    width: `${segment.widthPercent}%`,
    ...(color ? { '--mt-evt': color, '--mt-evt-ink': contrastInk(color) } : {}),
  } as React.CSSProperties
}

/** `YYYY-MM-DD` LOCAL (jamais `toISOString()`, qui bascule en UTC). */
function toLocalIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const EventPreviewTimeline: React.FC<EventPreviewTimelineProps> = ({
  title,
  color,
  type,
  durationValue,
  durationUnit,
  startDate,
  endDate,
  isRecurring = false,
  recurrenceUnit,
  recurrenceLabel,
  now,
}) => {
  const t = useTranslations('products.details')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // Référence stable : `new Date()` à chaque rendu ferait glisser la fenêtre et
  // le marqueur TODAY à chaque frappe.
  const [mountedNow] = React.useState(() => new Date())
  const reference = now ?? mountedNow

  const model = React.useMemo(
    () =>
      buildPreviewModel({
        startDate,
        endDate,
        type,
        durationValue,
        durationUnit,
        isRecurring,
        recurrenceUnit,
        now: reference,
      }),
    [startDate, endDate, type, durationValue, durationUnit, isRecurring, recurrenceUnit, reference],
  )

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  )

  const barLabel = title?.trim() || t('sampleEvent')

  return (
    <div
      className="border-rule bg-surface overflow-hidden rounded-lg border"
      data-testid="event-form-preview"
      role="group"
      aria-label={t('previewTimeline.label')}
    >
      <div className="relative" data-testid="event-form-preview-timeline">
        <div data-testid="event-form-preview-ruler">
          <Ruler days={model.ticks} locale={locale} now={reference} gutterPercent={0} />
        </div>

        {/* Lane unique : porte les occurrences (positions en % de la fenêtre). */}
        <div className="relative" style={{ height: 'var(--lane-height)' }}>
          {model.connector && (
            <div
              className="pointer-events-none absolute top-1/2 border-t-2 border-dashed"
              style={{
                left: `${model.connector.leftPercent}%`,
                width: `${model.connector.widthPercent}%`,
                borderColor: color ?? 'var(--color-rule-strong)',
              }}
              data-testid="event-form-preview-connector"
              aria-hidden="true"
            />
          )}

          {/* `--preview` : les barres de l'aperçu ne sont PAS cliquables — le
              modificateur neutralise le `cursor:pointer` + le hover brightness
              hérités de `.mt-evt` (affordance trompeuse, review S46). */}
          <div
            className="mt-evt mt-evt--preview"
            style={barStyle(model.main, color)}
            data-testid="event-form-preview-bar"
          >
            {barLabel}
          </div>

          {/* Occurrence fantôme : contour pointillé, pas de remplissage plein
              (handoff « traitement visuel des barres » — pas de trame de stries). */}
          {model.ghost && (
            <div
              className="mt-evt mt-evt--draft mt-evt--preview"
              style={barStyle(model.ghost, color)}
              data-testid="event-form-preview-ghost"
            >
              <span aria-hidden="true">↻</span>
              <span>{dateFormatter.format(model.ghost.start)}</span>
            </div>
          )}
        </div>

        <Cursor positionPercent={model.todayPercent} gutterPercent={0} />
        {model.todayPercent !== null && (
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: `${model.todayPercent}%` }}
          >
            <span className="mt-tlv__today-badge" data-testid="event-form-preview-today">
              {tCommon('buttons.today')}
            </span>
          </div>
        )}
      </div>

      {/* Légende « prochaine occurrence » + récurrence (testid historique #300). */}
      <div
        className="border-rule text-ink-muted flex flex-wrap items-center gap-2 border-t px-3 py-2 text-xs"
        data-testid="event-form-preview-legend"
      >
        <span>{t('previewTimeline.nextOccurrence')}</span>
        <time className="text-ink font-mono" dateTime={toLocalIso(model.nextOccurrence)}>
          {dateFormatter.format(model.nextOccurrence)}
        </time>
        {recurrenceLabel && (
          <span className="mt-recur" data-testid="event-form-preview-recurrence">
            {recurrenceLabel}
          </span>
        )}
      </div>
    </div>
  )
}

export default EventPreviewTimeline
